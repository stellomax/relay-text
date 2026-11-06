// Read the first sheet of an Excel (.xlsx) file in the browser, with no extra library.
// An .xlsx file is a zip of XML files: we unzip the few we need and read the cells as text.

type Entry = { name: string; method: number; size: number; offset: number };

function entries(buf: Uint8Array): Entry[] {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  // Find the end-of-central-directory record (searching back from the end).
  let eocd = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 66000); i--) {
    if (v.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error("not a zip");
  const count = v.getUint16(eocd + 10, true);
  let p = v.getUint32(eocd + 16, true);
  const out: Entry[] = [];
  const dec = new TextDecoder();
  for (let k = 0; k < count; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) break;
    const method = v.getUint16(p + 10, true);
    const size = v.getUint32(p + 20, true);
    const nameLen = v.getUint16(p + 28, true);
    const extraLen = v.getUint16(p + 30, true);
    const commentLen = v.getUint16(p + 32, true);
    const offset = v.getUint32(p + 42, true);
    out.push({ name: dec.decode(buf.subarray(p + 46, p + 46 + nameLen)), method, size, offset });
    p += 46 + nameLen + extraLen + commentLen;
  }
  return out;
}

async function inflate(data: Uint8Array): Promise<Uint8Array> {
  const inflater = new DecompressionStream("deflate-raw") as unknown as TransformStream<Uint8Array, Uint8Array>;
  const stream = new Blob([data as unknown as BlobPart]).stream().pipeThrough(inflater);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readEntry(buf: Uint8Array, e: Entry): Promise<string> {
  const v = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  const nameLen = v.getUint16(e.offset + 26, true);
  const extraLen = v.getUint16(e.offset + 28, true);
  const start = e.offset + 30 + nameLen + extraLen;
  const raw = buf.subarray(start, start + e.size);
  const bytes = e.method === 0 ? raw : await inflate(raw);
  return new TextDecoder().decode(bytes);
}

const unescape = (s: string) =>
  s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
    .replace(/&amp;/g, "&");

// All the <t> text inside one shared string or inline string (rich text has several runs).
const textOf = (xml: string) => [...xml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)].map((m) => unescape(m[1])).join("");

// "C12" → column index 2
function colIndex(ref: string): number {
  const letters = (ref.match(/^[A-Z]+/) || ["A"])[0];
  let n = 0;
  for (const ch of letters) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export async function readXlsx(data: ArrayBuffer): Promise<string[][]> {
  const buf = new Uint8Array(data);
  const list = entries(buf);
  const get = async (name: string) => {
    const e = list.find((x) => x.name === name);
    return e ? readEntry(buf, e) : "";
  };

  // Which file is the first sheet? (workbook.xml lists sheets in tab order; the rels file gives each one's path.)
  const wb = await get("xl/workbook.xml");
  const rels = await get("xl/_rels/workbook.xml.rels");
  const firstRid = (wb.match(/<sheet\b[^>]*\br:id="([^"]+)"/) || [])[1];
  let path = "";
  if (firstRid) {
    const rel = [...rels.matchAll(/<Relationship\b[^>]*>/g)].map((m) => m[0]).find((r) => r.includes(`Id="${firstRid}"`));
    const target = rel && (rel.match(/Target="([^"]+)"/) || [])[1];
    if (target) path = target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`;
  }
  if (!path || !list.some((x) => x.name === path)) {
    path = list.map((x) => x.name).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort()[0] || "";
  }
  if (!path) throw new Error("no sheet");

  const shared = [...(await get("xl/sharedStrings.xml")).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => textOf(m[1]));
  const sheet = await get(path);

  // Rows keep their place (blank rows stay as empty rows), so row numbers in messages match the spreadsheet.
  const rows: string[][] = [];
  for (const rm of sheet.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>|<row\b([^>]*)\/>/g)) {
    const rnum = Number(((rm[1] || rm[3] || "").match(/\br="(\d+)"/) || [])[1]) || rows.length + 1;
    while (rows.length < rnum - 1) rows.push([]);
    const row: string[] = [];
    let next = 0;
    for (const cm of (rm[2] || "").matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const attrs = cm[1];
      const body = cm[2] || "";
      const ref = (attrs.match(/\br="([A-Z]+\d+)"/) || [])[1];
      const i = ref ? colIndex(ref) : next;
      const type = (attrs.match(/\bt="([^"]+)"/) || [])[1];
      const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      let val = "";
      if (type === "s") val = shared[Number(v)] ?? "";
      else if (type === "inlineStr") val = textOf(body);
      else if (v != null) val = unescape(v);
      while (row.length < i) row.push("");
      row[i] = val.trim();
      next = i + 1;
    }
    rows.push(row);
  }
  // trailing empty rows aren't needed
  while (rows.length && !rows[rows.length - 1].some((c) => c)) rows.pop();
  return rows;
}
