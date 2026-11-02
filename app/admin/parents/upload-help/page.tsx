import { ChevronLeft } from "@/components/icons";
import { LANGUAGES } from "@/lib/languages";

// How to bulk upload parents: download the template, fill it in, save as CSV, upload.
export default function UploadHelp() {
  const langs = LANGUAGES.filter((l) => l.code !== "en").map((l) => l.name);
  return (
    <div className="settings">
      <header className="settings-bar">
        <a className="back-btn text" href="/admin/parents">
          <ChevronLeft /> Parents
        </a>
        <div className="settings-title">How to Bulk Upload</div>
        <span />
      </header>

      <div className="settings-body help-body">
        <h1 className="help-title">How to bulk upload parents</h1>
        <p className="help-lead">
          Add a whole class, grade or school at once in four steps. It takes about 10 minutes the first time.
        </p>

        <section className="help-step">
          <span className="help-num">1</span>
          <div>
            <h2>Download the template</h2>
            <p>It’s an Excel file with the right columns already set up, and a dropdown for languages.</p>
            <a className="template-card" href="/relay-parents-template.xlsx" download>
              <span className="template-icon">XLSX</span>
              <span>
                <strong>Download the Excel template</strong>
                <span className="ios-row-hint">relay-parents-template.xlsx · works in Excel, Google Sheets and Numbers</span>
              </span>
            </a>
          </div>
        </section>

        <section className="help-step">
          <span className="help-num">2</span>
          <div>
            <h2>Fill it in: one parent per row</h2>
            <p>Start on row 2 and keep the headings in row 1.</p>
            <div className="table-wrap">
              <table className="staff-table help-table">
                <thead>
                  <tr>
                    <th>
                      <span className="th-plain">Column</span>
                    </th>
                    <th>
                      <span className="th-plain">What to put in it</span>
                    </th>
                    <th>
                      <span className="th-plain">Example</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="col-name">Parent Name</td>
                    <td>The parent or guardian’s name</td>
                    <td>Maria Lopez</td>
                  </tr>
                  <tr>
                    <td className="col-name">Student Name</td>
                    <td>Their child. More than one? Separate the names with commas.</td>
                    <td>Sofia Lopez, Mateo Lopez</td>
                  </tr>
                  <tr>
                    <td className="col-name">Phone</td>
                    <td>The parent’s mobile number (it must be able to receive texts)</td>
                    <td>(303) 555-1234</td>
                  </tr>
                  <tr>
                    <td className="col-name">Language</td>
                    <td>The language they read best. Click the cell and pick from the dropdown arrow, or type a language that isn’t listed.</td>
                    <td>Spanish</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <details className="help-more">
              <summary>Languages in the dropdown</summary>
              <p>{langs.join(", ")}. Any other language can be typed in by name, like “Tongan” or “Mam”.</p>
            </details>
          </div>
        </section>

        <section className="help-step">
          <span className="help-num">3</span>
          <div>
            <h2>Save it as a CSV file</h2>
            <p>Relay reads CSV files. Make sure the <strong>Parents</strong> sheet is showing, then:</p>
            <ul className="help-list">
              <li>
                <strong>Excel (Windows):</strong> File → Save As → in “Save as type”, choose <strong>CSV UTF-8 (Comma delimited)</strong> → Save. If
                Excel warns that some features will be lost, click <strong>Yes</strong> or <strong>Keep Current Format</strong>.
              </li>
              <li>
                <strong>Excel (Mac):</strong> File → Save As → File Format: <strong>CSV UTF-8 (Comma delimited)</strong> → Save.
              </li>
              <li>
                <strong>Google Sheets:</strong> File → Download → <strong>Comma-separated values (.csv)</strong>.
              </li>
              <li>
                <strong>Numbers (Mac):</strong> File → Export To → <strong>CSV</strong> → Next → Save.
              </li>
            </ul>
            <p className="help-note">Choose “CSV UTF-8” when you see it. It keeps accents and other alphabets (é, ñ, ü) correct.</p>
          </div>
        </section>

        <section className="help-step">
          <span className="help-num">4</span>
          <div>
            <h2>Upload it to Relay</h2>
            <ol className="help-list">
              <li>
                Go to <strong>Manage Parents</strong> and click <strong>Upload CSV</strong>.
              </li>
              <li>Choose the school these parents belong to.</li>
              <li>Click the upload box and pick the CSV file you saved.</li>
              <li>
                Check the summary. Any rows with a problem (for example a missing phone number) are listed with the reason. Fix them in your
                file and upload again later.
              </li>
              <li>
                Tick the box confirming these parents agreed to receive texts, then click <strong>Add Parents</strong>.
              </li>
            </ol>
            <a className="ios-button big help-cta" href="/admin/parents?upload=1">
              Go to Upload
            </a>
          </div>
        </section>

        <section className="help-faq">
          <h2>Good to know</h2>
          <ul className="help-list">
            <li>
              <strong>Uploading more than one file is fine.</strong> If a phone number is already on the list for that school, Relay updates
              that parent instead of adding them twice. It uses the new name and language and adds any new students, so a parent with
              children in two classes ends up as one entry with both children.
            </li>
            <li>
              <strong>Same parent, different schools:</strong> each school keeps its own list, so the parent appears once in each school.
            </li>
            <li>
              <strong>Using your own spreadsheet?</strong> That’s fine too. It just needs columns headed Parent Name, Student Name, Phone and
              Language, in any order.
            </li>
            <li>
              <strong>Made a mistake?</strong> Fix the row in your file and upload it again, or click Edit next to the parent on the Parents
              list.
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}
