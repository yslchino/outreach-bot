import { useState } from "react";
import { api } from "../api";
import { useAction } from "../hooks";
import { Badge, Field, Icon, Modal, Pagination } from "./UI";

export default function ImportDialog({ onClose, onImported, notify }) {
  const [file, setFile] = useState(null);
  const [source, setSource] = useState("");
  const [audience, setAudience] = useState("shipper");
  const [permission, setPermission] = useState("unknown");
  const [verified, setVerified] = useState(false);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const { busy, perform } = useAction(notify);

  async function stage(event) {
    event.preventDefault();
    const form = new FormData();
    form.append("file", file);
    form.append("source", source);
    form.append("audience", audience);
    form.append("permission", permission);
    form.append("verified", String(verified));
    const response = await perform(() => api("/contacts/import/preview", { method: "POST", body: form }));
    if (response) setPreview(response);
  }
  async function loadPage(page) {
    const response = await perform(() => api("/contacts/import/" + preview.id + "?page=" + page));
    if (!response) return;
    if (response.status === "completed") { setResult(response.result); onImported(); }
    else setPreview(response);
  }
  async function confirm() {
    const response = await perform(() => api("/contacts/import/" + preview.id + "/confirm",
      { method: "POST", body: { confirmed: true } }), "Contact import complete.");
    if (response) { setResult(response); onImported(); }
  }
  const classification = preview?.permission === "business_contact" ? "Cold business contacts (not opted in)" :
    preview?.permission === "opted_in" ? "Explicitly opted in" : "Not recorded";

  return (
    <Modal title={result ? "Import complete" : preview ? "Review import" : "Import leads"}
      subtitle="No messages are generated or sent during import." onClose={onClose} wide={Boolean(preview && !result)}>
      {result ? (
        <div className="modal-content">
          <div className="import-results"><strong>{result.created}</strong><span>contacts added</span></div>
          <p className="muted">{result.existing} existing contacts unchanged · {result.suppressed || 0} suppressed addresses skipped · {result.duplicates} duplicate rows skipped</p>
          {result.errors.length > 0 && <p className="inline-warning">{result.errors.length} invalid rows were not imported.</p>}
          <div className="modal-actions"><button className="button primary" onClick={onClose}>Done</button></div>
        </div>
      ) : preview ? (
        <div className="modal-content">
          <div className="import-summary" aria-label="Import summary">
            {[[preview.summary.totalRows, "Source rows"], [preview.summary.newContacts, "New contacts"],
              [preview.summary.existing, "Already saved"], [preview.summary.suppressed, "Suppressed"]].map(([value, label]) => (
              <div key={label}><strong>{value}</strong><span>{label}</span></div>
            ))}
          </div>
          <dl className="import-metadata">
            <div><dt>Source</dt><dd>{preview.source} · {preview.sheetName}</dd></div>
            <div><dt>Classification</dt><dd>{classification}</dd></div>
            <div><dt>Verification</dt><dd>{preview.verified ? "Reported verified by you" : "Not verified"}</dd></div>
          </dl>
          {(preview.summary.missingState > 0 || preview.summary.transportation > 0 || preview.summary.sheetCount > 1) && (
            <div className="inline-warning">
              {preview.summary.missingState > 0 && <p>{preview.summary.missingState} contacts have no state. They will remain available under Missing state.</p>}
              {preview.audience === "shipper" && preview.summary.transportation > 0 && <p>{preview.summary.transportation} contacts are listed as Transportation. Review their fit as shippers before campaign selection.</p>}
              {preview.summary.sheetCount > 1 && <p>Only the first worksheet is included: {preview.sheetName}.</p>}
            </div>
          )}
          <details className="role-reference"><summary>Column mapping, duplicates, and errors</summary>
            <dl>{Object.entries(preview.summary.columns).map(([field, column]) => (
              <div key={field}><dt>{field.replace(/([A-Z])/g, " $1")}</dt><dd>{column}</dd></div>
            ))}</dl>
            <p className="import-note">{preview.summary.duplicates} duplicate rows skipped · {preview.summary.errors.length} invalid rows</p>
            {preview.summary.errors.slice(0, 20).map(error => <p className="import-note" key={error.row}>Row {error.row}: {error.error}</p>)}
          </details>
          <div className="table-scroll">
            <table className="import-preview-table">
              <thead><tr><th>Row</th><th>Contact</th><th>Company</th><th>Region</th><th>State</th><th>Industry</th><th>Import status</th></tr></thead>
              <tbody>{preview.items.map(contact => (
                <tr key={contact.email}><td>{contact.sourceRow}</td><td><strong>{contact.name}</strong><small>{contact.email}</small></td>
                  <td>{contact.company || "—"}</td><td>{contact.region || "—"}</td><td>{contact.state || "Missing"}</td>
                  <td>{contact.industry || "—"}</td><td><Badge value={contact.disposition} /></td></tr>
              ))}</tbody>
            </table>
          </div>
          <Pagination data={preview} onPage={page => { if (!busy) loadPage(page); }} />
          <div className="modal-actions">
            <button className="button secondary" disabled={busy} onClick={() => setPreview(null)}>Back</button>
            <button className="button secondary" disabled={busy} onClick={() => loadPage(preview.page)}>Refresh status</button>
            <button className="button primary" disabled={busy || preview.status === "importing"} onClick={confirm}>
              {busy ? "Processing…" : preview.summary.newContacts ? "Import " + preview.summary.newContacts + " contacts" : "Finish import"}
            </button>
          </div>
        </div>
      ) : (
        <form className="modal-content" onSubmit={stage}>
          <label className="upload-zone"><Icon name="upload" size={27} /><strong>{file?.name || "Choose a spreadsheet"}</strong>
            <span>.xlsx or .csv · Up to 1 MB and 2,000 data rows</span>
            <input required type="file" accept=".xlsx,.csv" onChange={event => {
              const selected = event.target.files[0]; setFile(selected);
              if (!source && selected) setSource(selected.name);
            }} />
          </label>
          <p className="muted small-text import-note">Supports Email, Company, First Name, Last Name, Region, State, and Industry columns.</p>
          <Field label="Lead source"><input required value={source} maxLength={300} onChange={event => setSource(event.target.value)} /></Field>
          <Field label="Audience"><select value={audience} onChange={event => setAudience(event.target.value)}>
            <option value="shipper">Shippers</option><option value="carrier">Carriers</option>
          </select></Field>
          <Field label="Contact classification"><select value={permission} onChange={event => setPermission(event.target.value)}>
            <option value="unknown">Not recorded</option><option value="business_contact">Cold business contacts (not opted in)</option>
            <option value="opted_in">Explicitly opted in to GET Logistics emails</option>
          </select></Field>
          <label className="checkbox-label"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} />
            I confirm these contacts have been verified. Record this as my verification, separately from opt-in.
          </label>
          <button className="button primary full" disabled={busy || !file}>{busy ? "Checking file…" : "Preview import"}</button>
        </form>
      )}
    </Modal>
  );
}
