import { useState } from "react";
import { useResource } from "../hooks";
import { Pagination } from "./UI";
const labels = { processed: "Matched", unmatched: "Unmatched · review", needs_review: "Review content", processing: "Processing", pending: "Pending", failed: "Processing failed" };
export default function ResendReceiving({ settings, version }) {
  const [page, setPage] = useState(1);
  const { data, error, reload } = useResource("/inbound?page=" + page, version);
  return <section className="panel resend-receiving-panel">
    <div className="panel-heading"><div><h2>Resend reply inbox</h2><p>Campaign replies and opt-outs, with no Microsoft connection required.</p></div></div>
    <div className="outlook-connection-content">
      <p><strong>{settings.resendReceivingAddress || "Reply address not configured"}</strong></p>
      <p className="muted small-text">{settings.resendReceivingEnabled ? "Receiving activated in server configuration. Live delivery must also be verified." : "Receiving awaits domain, DNS, and webhook setup. Campaign sending remains disabled."}</p>
      <p className="muted small-text">{settings.resendWebhookConfigured ? "Webhook signing secret configured." : "Webhook signing secret not configured."} Outlook forwarding is off.</p>
      <button className="button secondary" onClick={reload}>Refresh replies</button>
      {error && <p className="inline-error">{error}</p>}
      {data?.total === 0 && <p className="muted">No received messages yet.</p>}
    </div>
    {data?.items.length > 0 && <>
      <div className="table-scroll"><table><thead><tr><th>Sender / subject</th><th>Result</th><th>Received</th></tr></thead>
        <tbody>{data.items.map(item => <tr key={item._id}><td><strong>{item.sender || "Unknown sender"}</strong><small>{item.subject || "No subject"}</small>
          {item.preview && <details><summary>View text</summary><p style={{ whiteSpace: "pre-wrap" }}>{item.preview}</p></details>}</td>
          <td>{item.optOut ? "Opted out" : labels[item.status] || item.status}</td>
          <td>{item.receivedAt ? new Date(item.receivedAt).toLocaleString() : "Pending"}</td></tr>)}</tbody></table></div>
      <Pagination data={data} onPage={setPage} />
    </>}
  </section>;
}
