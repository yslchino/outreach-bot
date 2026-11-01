import { dateTime } from "../format";
import { useResource } from "../hooks";
import { Badge, Empty, Icon, Loading, PageHeader, ResourceError, Stat } from "../components/UI";

export default function Overview({ version, navigate, settings, user }) {
  const { data, loading, error, reload } = useResource("/overview", version);
  if (error) return <ResourceError message={error} retry={reload} />;
  if (loading || !data) return <Loading />;

  return (
    <>
      <PageHeader title="Overview" description="Campaign activity and items requiring attention.">
        {user.role !== "viewer" && <button className="button primary" onClick={() => navigate("campaigns")}><Icon name="plus" size={16} /> New campaign</button>}
      </PageHeader>
      <div className="stats-grid" aria-label="Workspace totals">
        <Stat label="Leads" value={data.leads} detail="Total contacts" />
        <Stat label="Accepted emails" value={data.accepted} detail="Accepted by provider" />
        <Stat label="Replies" value={data.replies} detail="Contacts who replied" />
        <Stat label="Drafts" value={data.drafts} detail="Awaiting review" />
      </div>
      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading"><div><h2>Recent messages</h2><p>Latest updates across all campaigns</p></div><button className="text-button" onClick={() => navigate("activity")}>View activity <Icon name="chevron" size={14} /></button></div>
          {!data.recent.length ? (
            <Empty title="No messages yet" description="Import leads and create a campaign to prepare your first drafts." icon="mail">
              {user.role !== "viewer" && <button className="button secondary" onClick={() => navigate("leads")}>Import leads</button>}
            </Empty>
          ) : (
            <div className="table-scroll">
              <table className="recent-table">
                <thead><tr><th>Recipient / subject</th><th>Status</th><th className="right">Updated</th></tr></thead>
                <tbody>{data.recent.map(message => (
                  <tr key={message._id}>
                    <td><strong>{message.recipientName || message.to}</strong><small>{message.subject}</small></td>
                    <td><Badge value={message.status} /></td>
                    <td className="right nowrap muted">{dateTime(message.updatedAt)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
        <aside className="stack">
          <section className="panel">
            <div className="panel-heading"><h2>Review queue</h2></div>
            <button className="review-queue-row" onClick={() => navigate("campaigns")}>
              <span><strong>Campaign drafts</strong><small>Review saved messages before approval</small></span>
              <span className="queue-count">{data.drafts}</span><Icon name="chevron" size={15} />
            </button>
            <button className="review-queue-row" onClick={() => navigate("activity")}>
              <span><strong>Unconfirmed sends</strong><small>Reconcile against provider records</small></span>
              <span className={`queue-count ${data.uncertain ? "needs-attention" : ""}`}>{data.uncertain}</span><Icon name="chevron" size={15} />
            </button>
          </section>
          <section className="panel capacity-card">
            <div className="panel-heading"><h2>Usage & limits</h2><button className="text-button" onClick={() => navigate("settings")}>Settings</button></div>
            <div className="usage-label"><span>Daily send attempts</span><strong>{data.dailyUsed} <span>/ {data.dailyLimit}</span></strong></div>
            <div className="progress" role="progressbar" aria-label="Daily send attempts" aria-valuenow={data.dailyUsed} aria-valuemin={0} aria-valuemax={data.dailyLimit}><span style={{ width: Math.min(100, data.dailyUsed / data.dailyLimit * 100) + "%" }} /></div>
            <p>Failed attempts count toward the daily limit.</p>
            <div className="divider" />
            <div className="key-value"><span>AI drafts this month</span><strong>{data.aiUsed} / {data.aiLimit}</strong></div>
            <div className="key-value"><span>Email sending</span><Badge value={settings?.sendingEnabled ? "active" : "disabled"}>{settings?.sendingEnabled ? "Enabled" : "Disabled"}</Badge></div>
          </section>
        </aside>
      </div>
      <div className="workspace-footer"><span>GET Logistics LLC · Shared workspace</span><span>{settings?.timezone}</span></div>
    </>
  );
}
