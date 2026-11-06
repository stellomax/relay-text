import { ChevronLeft } from "@/components/icons";
import { LANGUAGES } from "@/lib/languages";

// How to bulk upload parents: download the template, fill it in, save as CSV, upload.
export default function UploadHelp() {
  const langs = LANGUAGES.map((l) => l.name);
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
          Add a whole class, grade or school at once. Upload the list your school already has, or fill in our template. Excel and CSV
          files both work.
        </p>

        <div className="help-callout">
          <strong>We’ll do your first upload with you.</strong> Email{" "}
          <a href="mailto:relay@stellomark.com">relay@stellomark.com</a> and our team will help you get the list out of your system
          and into Relay.
        </div>

        <section className="help-step">
          <span className="help-num">1</span>
          <div>
            <h2>Get your list</h2>
            <p>
              <strong>Easiest: export it from your student information system</strong> (Infinite Campus, PowerSchool, Skyward, Synergy,
              Aeries or another). Run a student or guardian contact report, save it as Excel or CSV, and upload it as it is. One row per
              student with Guardian 1 and Guardian 2 columns is fine. Include these if you can:
            </p>
            <ul className="help-list">
              <li>Student first and last name</li>
              <li>Each parent or guardian’s name and <strong>mobile (cell) number</strong></li>
              <li>
                <strong>Home language</strong> or language of correspondence (codes like SPA or VIE are fine)
              </li>
              <li>School name, if the file covers more than one school</li>
            </ul>
            <p>
              <strong>Or start from our template:</strong> an Excel file with the columns set up and a dropdown for languages.
            </p>
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
            <h2>Using the template? Fill it in, one parent per row</h2>
            <p>Start on row 2 and keep the headings in row 1. Then save it (Excel format is fine, no need to convert).</p>
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
                    <td>The language they read best. Pick from the dropdown arrow, or type a language that isn’t listed. Blank means English.</td>
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
            <h2>Upload it to Relay</h2>
            <ol className="help-list">
              <li>
                Go to <strong>Manage Parents</strong> and click <strong>Upload Parents</strong>.
              </li>
              <li>Choose the school these parents belong to (skipped if your file has a School column).</li>
              <li>Click the upload box and pick your Excel or CSV file.</li>
              <li>
                If Relay can’t tell which column is which, it asks once (for example, “which column is the mobile number?”) and remembers
                your answer for next time.
              </li>
              <li>
                If a language in your file isn’t recognized (like “Somali-Maay” or a district code), Relay lists each one so you can say
                what it is, once, instead of fixing every row.
              </li>
              <li>
                Check the summary. Rows with a problem (for example a missing phone number) are listed with the reason. Fix them in your file
                and upload again later.
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
              <strong>Brothers and sisters:</strong> if the same parent number appears on several rows (one per child), Relay keeps one
              entry for that parent with all of their children.
            </li>
            <li>
              <strong>Two parents for one student?</strong> Each parent with a mobile number gets their own entry, in their own language
              if your file has one for them.
            </li>
            <li>
              <strong>Home and work numbers:</strong> Relay uses the cell or mobile number first. Home phones are used only when there’s
              no mobile number; emergency contacts are left out.
            </li>
            <li>
              <strong>No language?</strong> Parents with a blank language are set to English. You can change anyone later on the Parents
              list.
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
