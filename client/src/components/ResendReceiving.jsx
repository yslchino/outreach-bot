import { useState } from "react";
import { useResource } from "../hooks";
import { Empty, Loading, Pagination, ResourceError } from "./UI";
const labels = { processed: "Matched", unmatched: "Unmatched · review", needs_review: "Review content", processing: "Processing", pending: "Pending", failed: "Processing failed" };
export default function ResendReceiving({ settings, version, showMessages = true, showConfiguration = true, onOpenInbox }) {
  const [page, setPage] = useState(1);
  const { data, error, loading, reload } = useResource(showMessages ? "/inbound?page=" + page : null, version);
  return <section className="panel resend-receiving-panel">
    <div className="panel-heading"><div><h2>{showMessages ? "Received messages" : "Reply receiving"}</h2><p>{showMessages ? settings.resendReceivingAddress || "Reply address not configured" : "Resend configuration for campaign replies and opt-outs."}</p></div>
      {showMessages && <button className="button secondary small" onClick={reload}>Refresh replies</button>}
    </div>
    {showConfiguration && <div className="outlook-connection-content">
      <p><strong>{settings.resendReceivingAddress || "Reply address not configured"}</strong></p>
      <p className="muted small-text">{settings.resendReceivingEnabled ? "Receiving activated in server configuration. Live delivery must also be verified." : "Receiving awaits domain, DNS, and webhook setup. Campaign sending remains disabled."}</p>
      <p className="muted small-text">{settings.resendWebhookConfigured ? "Webhook signing secret configured." : "Webhook signing secret not configured."} Outlook forwarding is off.</p>
      {onOpenInbox && <button className="button secondary" onClick={onOpenInbox}>Open inbox</button>}
    </div>}
    {showMessages && (error ? <ResourceError message={error} retry={reload} /> : loading || !data ? <Loading /> : data.total === 0 ?
      <Empty icon="inbox" title="No received messages yet" description="Incoming replies and opt-outs will appear here." /> : <>
      <div className="table-scroll"><table><thead><tr><th>Sender / subject</th><th>Result</th><th>Received</th></tr></thead>
        <tbody>{data.items.map(item => <tr key={item._id}><td><strong>{item.sender || "Unknown sender"}</strong><small>{item.subject || "No subject"}</small>
          {item.preview && <details><summary>View text</summary><p style={{ whiteSpace: "pre-wrap" }}>{item.preview}</p></details>}</td>
          <td>{item.optOut ? "Opted out" : labels[item.status] || item.status}</td>
          <td>{item.receivedAt ? new Date(item.receivedAt).toLocaleString() : "Pending"}</td></tr>)}</tbody></table></div>
      <Pagination data={data} onPage={setPage} />
    </>)}
  </section>;
}
