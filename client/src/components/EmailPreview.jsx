import { useState } from "react";
import { Modal } from "./UI";

export default function EmailPreview({ preview, unsaved, onClose }) {
  const [plainText, setPlainText] = useState(false);
  // Email content stays in an opaque, script-free document with no network access.
  const document = '<!doctype html><html><head><meta charset="utf-8">' +
    '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    '<style>body{margin:20px;overflow-wrap:anywhere}</style></head><body>' + preview.html + '</body></html>';
  return <Modal title="Preview email" subtitle={unsaved ? "Includes unsaved edits. Nothing is saved or sent." : "Saved draft with the current sending identity and footer. Nothing is sent."} onClose={onClose} wide>
    <div className="modal-content email-preview">
      <dl className="email-preview-headers">
        {[["From", preview.from], ["Reply-to", preview.replyTo], ["To", preview.to], ["Subject", preview.subject]].map(([label, value]) =>
          <div key={label}><dt>{label}</dt><dd>{value || "Not configured"}</dd></div>)}
      </dl>
      {preview.missingFields.length > 0 && <p className="inline-warning" role="status">Configure before sending: {preview.missingFields.join(", ")}.</p>}
      <div className="email-preview-toolbar"><span className="muted small-text">{plainText ? "Plain text" : "Formatted email"}</span>
        <button className="button secondary small" onClick={() => setPlainText(value => !value)}>{plainText ? "Show formatted email" : "Show plain text"}</button>
      </div>
      {plainText ? <pre className="email-preview-text">{preview.text}</pre> :
        <iframe className="email-preview-frame" title="Rendered email preview" sandbox="" referrerPolicy="no-referrer" srcDoc={document} />}
      <div className="modal-actions"><button className="button secondary" onClick={onClose}>Back to draft</button></div>
    </div>
  </Modal>;
}
