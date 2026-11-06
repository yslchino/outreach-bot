import { useState } from "react";
import { api } from "../api";
import { useResource } from "../hooks";
export default function OutlookConnection({ user, notify, changed, version }) {
  const { data, error, reload } = useResource("/outlook/status", version);
  const [busy, setBusy] = useState(false);
  async function act(action) {
    setBusy(true);
    try {
      const result = await api("/outlook/" + action, { method: "POST", body: {} });
      if (action === "connect") { window.location.assign(result.url); return; }
      notify(action === "scan" ? `Checked ${result.checked} contacts · ${result.replies} replies · ${result.optOuts} opt-outs` : "Outlook disconnected.");
      reload(); changed();
    } catch (err) { notify(err.message, "error"); }
    finally { setBusy(false); }
  }
  return <section className="panel">
    <div className="panel-heading"><div><h2>Outlook reply inbox</h2><p>Read-only access to identify campaign replies and opt-outs.</p></div></div>
    <div className="outlook-connection-content">
    {error && <p className="inline-error">{error}</p>}
    {!data && !error && <p className="muted">Loading connection…</p>}
    {data && <>
      <p>{data.connected ? `Connected to ${data.email}` : "No Outlook mailbox connected."}</p>
      <p className="muted small-text">{!data.configured ? "Microsoft application credentials must be configured on the server before connecting." :
        "Connection does not enable campaign sending. Scheduled scans require background processing; Scan replies runs one check now."}</p>
      {data.lastScanAt && <p className="muted small-text">Last successful scan: {new Date(data.lastScanAt).toLocaleString()}</p>}
      {data.lastScanStatus === "error" && <p className="inline-warning">The latest scan failed. Retry or reconnect before relying on reply detection.</p>}
      {user.role === "admin" && <div className="outlook-connection-actions">
        <button className="button secondary" disabled={busy || !data.configured} onClick={() => act("connect")}>{data.connected ? "Reconnect Outlook" : "Connect Outlook"}</button>
        {data.connected && <>
          <button className="button secondary" disabled={busy || !data.configured} onClick={() => act("scan")}>Scan replies</button>
          <button className="button secondary" disabled={busy} onClick={() => act("disconnect")}>Disconnect</button>
        </>}
      </div>}
    </>}
    </div>
  </section>;
}
