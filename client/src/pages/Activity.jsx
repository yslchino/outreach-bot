import { dateTime } from "../format";
import { useState } from "react";
import { api } from "../api";
import { useAction, useResource } from "../hooks";
import { Badge, Empty, Field, Loading, MessageBody, Modal, PageHeader, Pagination, ResourceError } from "../components/UI";
function ResolveMessage({
  message,
  notify,
  onDone
}) {
  const [outcome, setOutcome] = useState(""),
    [note, setNote] = useState(""),
    [providerId, setProviderId] = useState(""),
    [acceptedAt, setAcceptedAt] = useState("");
  const {
    busy,
    perform
  } = useAction(notify);
  return <form className="resolution-form" onSubmit={async e => {
    e.preventDefault();
    if (!window.confirm("Record this verified provider outcome? Only choose not sent if provider records confirm no acceptance.")) return;
    if (await perform(() => api("/messages/" + message._id + "/resolve", {
      method: "POST",
      body: {
        outcome,
        note,
        providerId,
        acceptedAt: acceptedAt ? new Date(acceptedAt).toISOString() : undefined
      }
    }), "Outcome recorded. No automatic resend was triggered.")) onDone();
  }}>
    <h3>Reconcile with provider records</h3><p className="muted">Check your provider's logs first. This records the result; it does not resend.</p>
    <Field label="Verified outcome"><select required value={outcome} onChange={e => setOutcome(e.target.value)}><option value="">Choose an outcome</option><option value="accepted">Provider accepted this message</option><option value="not_sent">Provider confirms it was not sent</option></select></Field>
    {outcome === "accepted" && <Field label="Provider message ID"><input required value={providerId} onChange={e => setProviderId(e.target.value)} /></Field>}
    {outcome === "accepted" && <Field label="Acceptance time from provider records"><input required type="datetime-local" value={acceptedAt} onChange={e => setAcceptedAt(e.target.value)} /></Field>}
    <Field label="Evidence / reconciliation note"><textarea required minLength={10} maxLength={1000} rows={3} value={note} onChange={e => setNote(e.target.value)} placeholder="Record which provider logs you checked and what they showed." /></Field><button className="button primary small" disabled={busy}>Record outcome</button>
  </form>;
}
export default function Activity({
  version,
  changed,
  notify,
  user
}) {
  const [status, setStatus] = useState(""),
    [page, setPage] = useState(1),
    [selected, setSelected] = useState(null);
  const {
    data,
    loading,
    error,
    reload
  } = useResource("/messages?" + new URLSearchParams({
    status,
    page
  }), version);
  return <><PageHeader title="Message activity" description="Review drafts, send attempts, and delivery outcomes." />
    <section className="panel"><div className="table-toolbar"><div><h2>Message journal</h2><p className="muted small-text">Provider acceptance and delivery are tracked separately.</p></div><select aria-label="Message status" value={status} onChange={e => {
          setStatus(e.target.value);
          setPage(1);
        }}><option value="">All outcomes</option>{["draft", "queued", "processing", "accepted", "failed", "uncertain", "skipped"].map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></div>
    {error ? <ResourceError message={error} retry={reload} /> : loading || !data ? <Loading /> : !data.items.length ? <Empty icon="activity" title="No messages yet" description="Messages appear after a campaign is created." /> : <><div className="table-scroll"><table><thead><tr><th>Recipient</th><th>Subject</th><th>Type</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{data.items.map(message => <tr key={message._id}><td><strong>{message.recipientName || message.to}</strong><small>{message.to}</small></td><td className="subject-cell">{message.subject}</td><td>{message.kind === "followup" ? "Follow-up" : "Initial"}</td><td><Badge value={message.status} />{message.deliveryStatus !== "unknown" && <small>{message.deliveryStatus}</small>}</td><td className="nowrap muted">{dateTime(message.updatedAt)}</td><td><button className="text-button" onClick={() => setSelected(message)}>View email</button></td></tr>)}</tbody></table></div><Pagination data={data} onPage={setPage} /></>}
    </section>
    {selected && <Modal title="Message details" subtitle={selected.to} onClose={() => setSelected(null)} wide><div className="modal-content"><MessageBody message={selected} />{selected.status === "uncertain" && user.role === "admin" && <ResolveMessage message={selected} notify={notify} onDone={() => {
          setSelected(null);
          changed();
        }} />}</div></Modal>}
  </>;
}
