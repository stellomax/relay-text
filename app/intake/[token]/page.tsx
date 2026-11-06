"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import LegalPage from "@/components/LegalPage";
import { formatPhoneInput } from "@/lib/phone";
import {
  AUTH_FIELDS,
  AUTHORIZATION_TEXT,
  fieldProblem,
  MAX_FILE_MB,
  progress,
  SECTIONS,
  submitProblems,
  UPLOAD_LABELS,
  type Answers,
  type Field,
  type UploadKind,
} from "@/lib/intake";

type FileRow = { path: string; name: string; kind: UploadKind; size: number; uploaded_at: string };
type Loaded = { district_name: string; answers: Answers; files: FileRow[]; status: string; submitted_at: string | null; updated_at: string };
type Save = { state: "idle" | "saving" | "saved" | "error"; at?: string };

const GROUP_BEFORE: Record<string, string> = {
  rep1_first: "Contact 1 (required)",
  rep2_first: "Contact 2 (recommended)",
  notice_contact: "Other contacts",
};

const time = (iso?: string) => (iso ? new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }) : "");
const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

// Public: the district onboarding intake form. The private link is the key. Saves as you type,
// so several people (business office, IT, family engagement) can fill in their parts over several visits.
export default function IntakePage() {
  const { token } = useParams<{ token: string }>();
  const base = `/api/intake/${encodeURIComponent(token)}`;
  const [data, setData] = useState<Loaded | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [files, setFiles] = useState<FileRow[]>([]);
  const [loadError, setLoadError] = useState("");
  const [save, setSave] = useState<Save>({ state: "idle" });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [showAll, setShowAll] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const dirty = useRef<Answers>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetch(base, { cache: "no-store" })
      .then(async (r) => {
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "This link isn't working.");
        const i = d.intake as Loaded;
        setData(i);
        setAnswers(i.answers || {});
        setFiles(i.files || []);
        if (i.status !== "draft") setSubmittedAt(i.submitted_at || i.updated_at);
        setSave({ state: "idle", at: i.updated_at });
      })
      .catch((e) => setLoadError(e.message));
  }, [base]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const changes = dirty.current;
    if (!Object.keys(changes).length) return true;
    dirty.current = {};
    setSave({ state: "saving" });
    try {
      const r = await fetch(base, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers: changes }) });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error);
      setSave({ state: "saved", at: d.updated_at });
      return true;
    } catch {
      dirty.current = { ...changes, ...dirty.current }; // try these again next time
      setSave({ state: "error" });
      return false;
    }
  }, [base]);

  // Save before the page closes.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (Object.keys(dirty.current).length) {
        flush();
        e.preventDefault();
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [flush]);

  function setValue(id: string, value: string) {
    setAnswers((a) => ({ ...a, [id]: value }));
    dirty.current[id] = value;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(flush, 1200);
  }

  async function submit() {
    setShowAll(true);
    setSubmitError("");
    const problems = submitProblems(answers);
    if (Object.keys(problems).length) {
      setSubmitError(`${Object.keys(problems).length} answer${Object.keys(problems).length === 1 ? "" : "s"} still needed (marked in red).`);
      document.querySelector(".intake-bad")?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setSubmitting(true);
    await flush();
    const r = await fetch(base, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ answers }) });
    const d = await r.json().catch(() => ({}));
    setSubmitting(false);
    if (!r.ok) return setSubmitError(d.error || "Couldn't submit. Please try again.");
    setSubmittedAt(d.submitted_at);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  if (loadError) {
    return (
      <LegalPage title="District onboarding" updated={false}>
        <p className="join-error">{loadError}</p>
        <p>Questions? Email relay@stellomark.com.</p>
      </LegalPage>
    );
  }
  if (!data) {
    return (
      <LegalPage title="District onboarding" updated={false}>
        <p>Loading…</p>
      </LegalPage>
    );
  }

  const locked = !!submittedAt;
  const { done, total } = progress(answers);

  if (locked) {
    return (
      <LegalPage title="Thank you" updated={false}>
        <p className="join-teacher">
          {data.district_name}’s onboarding form was submitted
          {submittedAt ? ` on ${new Date(submittedAt).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}` : ""}.
        </p>
        <p>
          Relay will review your answers and follow up on anything marked “Not sure.” Next, Relay registers the district with Twilio
          and the mobile carriers. Reviews take about 3 weeks or more, and we’ll keep you posted along the way.
        </p>
        <p>Need to change something? Email relay@stellomark.com and we’ll reopen the form.</p>
      </LegalPage>
    );
  }

  const problem = (f: Field) => {
    const p = fieldProblem(f, answers[f.id] || "");
    if (!p) return "";
    if (p === "Required") return showAll ? "Required" : "";
    return touched[f.id] || showAll ? p : "";
  };

  const renderField = (f: Field) => {
    const v = answers[f.id] || "";
    const p = f.id.startsWith("rep2_") && !showAll ? "" : problem(f);
    const common = {
      id: f.id,
      value: v,
      onBlur: () => {
        setTouched((t) => ({ ...t, [f.id]: true }));
        flush();
      },
    };
    let input: React.ReactNode;
    if (f.type === "long") {
      input = <textarea {...common} rows={3} onChange={(e) => setValue(f.id, e.target.value)} />;
    } else if (f.type === "choice") {
      input = (
        <select {...common} onChange={(e) => setValue(f.id, e.target.value)}>
          <option value="">Choose…</option>
          {(f.options || []).map((o) => (
            <option key={o}>{o}</option>
          ))}
        </select>
      );
    } else {
      input = (
        <input
          {...common}
          type={f.type === "email" ? "email" : f.type === "url" ? "url" : "text"}
          inputMode={f.type === "phone" ? "tel" : f.type === "ein" || f.type === "zip" ? "numeric" : undefined}
          maxLength={f.type === "state" ? 2 : undefined}
          autoCapitalize={f.type === "state" ? "characters" : undefined}
          onChange={(e) => {
            let x = e.target.value;
            if (f.type === "phone") x = formatPhoneInput(x, v);
            if (f.type === "state") x = x.toUpperCase();
            setValue(f.id, x);
          }}
        />
      );
    }
    return (
      <div key={f.id}>
        {GROUP_BEFORE[f.id] && <h3 className="intake-group">{GROUP_BEFORE[f.id]}</h3>}
        <label className={p ? "intake-bad" : ""} htmlFor={f.id}>
          <span>
            {f.label}
            {f.required && <span className="intake-req"> *</span>}
          </span>
          {input}
          {p ? <span className="join-hint bad">{p}</span> : f.hint ? <span className="join-hint">{f.hint}</span> : null}
        </label>
      </div>
    );
  };

  return (
    <LegalPage title="District onboarding" updated={false}>
      <div className="intake">
        <p className="join-teacher">
          For <strong>{data.district_name}</strong>
        </p>
        <p>
          Relay needs this information to register texting in your district’s name, so texts to parents come from your district and reach
          them reliably. U.S. mobile carriers require every organization that sends texts to be registered and approved first. Approval takes
          about 3 weeks or more after you submit, and no texts can be sent until then.
        </p>
        <ul>
          <li>Several people can fill in their parts using this same link. Your answers save automatically.</li>
          <li>Questions marked * are required. If you don’t know an answer, write “Not sure” and Relay will follow up.</li>
          <li>Keep this link private: anyone with it can see and change the answers. Questions? relay@stellomark.com</li>
        </ul>

        <div className="intake-status" aria-live="polite">
          <span>
            {done} of {total} answered
          </span>
          <span className={save.state === "error" ? "bad" : ""}>
            {save.state === "saving"
              ? "Saving…"
              : save.state === "error"
                ? "Not saved. Check your connection."
                : save.at
                  ? `Saved ${time(save.at)}`
                  : ""}
          </span>
        </div>

        <form className="join-form" onSubmit={(e) => e.preventDefault()}>
          {SECTIONS.map((s) => (
            <section key={s.id} className="intake-section">
              <h2>{s.title}</h2>
              {s.intro && <p className="intake-intro">{s.intro}</p>}
              {s.fields.map(renderField)}
              {(s.uploads || []).map((k) => (
                <Uploads key={k} kind={k} base={base} files={files.filter((f) => f.kind === k)} onChange={setFiles} />
              ))}
            </section>
          ))}

          <section className="intake-section">
            <h2>7. Authorization</h2>
            <p className="intake-intro">To be completed by someone who can authorize texting in the district’s name.</p>
            {AUTH_FIELDS.map(renderField)}
            <label className={`consent ${showAll && answers.auth_agree !== "yes" ? "intake-bad" : ""}`}>
              <input type="checkbox" checked={answers.auth_agree === "yes"} onChange={(e) => setValue("auth_agree", e.target.checked ? "yes" : "")} />
              <span>{AUTHORIZATION_TEXT}</span>
            </label>
            <Uploads kind="other" base={base} files={files.filter((f) => f.kind === "other")} onChange={setFiles} />
          </section>

          {submitError && <p className="join-error">{submitError}</p>}
          <button type="button" className="ios-button" onClick={submit} disabled={submitting}>
            {submitting ? "Submitting…" : "Submit to Relay"}
          </button>
          <p className="legal-small">After you submit, the form is locked. Email relay@stellomark.com to make changes.</p>
        </form>
      </div>
    </LegalPage>
  );
}

function Uploads({ kind, base, files, onChange }: { kind: UploadKind; base: string; files: FileRow[]; onChange: (f: FileRow[]) => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const pick = useRef<HTMLInputElement>(null);

  async function upload(file: File) {
    setError("");
    if (file.size > MAX_FILE_MB * 1024 * 1024) return setError(`Files can be up to ${MAX_FILE_MB} MB.`);
    setBusy(true);
    try {
      const post = async (body: object) => {
        const r = await fetch(`${base}/files`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.error || "Upload failed.");
        return d;
      };
      const start = await post({ action: "start", name: file.name, type: file.type, size: file.size, kind });
      const form = new FormData();
      form.append("cacheControl", "3600");
      form.append("", file);
      const put = await fetch(start.uploadUrl, { method: "PUT", body: form, headers: { "x-upsert": "false" } });
      if (!put.ok) throw new Error("Upload failed. Please try again.");
      const d = await post({ action: "done", path: start.path, name: file.name, kind });
      onChange(d.files);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setBusy(false);
      if (pick.current) pick.current.value = "";
    }
  }

  async function remove(path: string) {
    const r = await fetch(`${base}/files?path=${encodeURIComponent(path)}`, { method: "DELETE" });
    const d = await r.json().catch(() => ({}));
    if (r.ok) onChange(d.files);
    else setError(d.error || "Couldn't remove the file.");
  }

  return (
    <div className="intake-upload">
      <span className="intake-upload-label">Attach: {UPLOAD_LABELS[kind]}</span>
      {files.map((f) => (
        <div key={f.path} className="intake-file">
          <span>
            {f.name} <span className="muted">({kb(f.size)})</span>
          </span>
          <button type="button" className="link" onClick={() => remove(f.path)}>
            Remove
          </button>
        </div>
      ))}
      <input
        ref={pick}
        type="file"
        hidden
        accept=".pdf,.png,.jpg,.jpeg,.svg,.csv,.doc,.docx,.xls,.xlsx"
        onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])}
      />
      <button type="button" className="intake-attach" onClick={() => pick.current?.click()} disabled={busy}>
        {busy ? "Uploading…" : files.length ? "+ Attach another file" : "+ Attach a file"}
      </button>
      {error && <span className="join-hint bad">{error}</span>}
    </div>
  );
}
