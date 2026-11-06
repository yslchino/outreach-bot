import { Icon, PageHeader, Badge } from "../components/UI";
import OutlookConnection from "../components/OutlookConnection";
import ResendReceiving from "../components/ResendReceiving";
export default function Settings({
  settings,
  user, notify, changed, version
}) {
  if (!settings) return null;
  const integrations = [["mail", "Email delivery", settings.providerConfigured, settings.provider === "disabled" ? "No sending provider selected" : settings.provider.toUpperCase() + " credentials configured"], ["activity", "Resend delivery events", settings.resendWebhookConfigured, "Tracks delivery, bounces, and complaints through a signed webhook"], ["spark", "Claude drafting", settings.aiEnabled, settings.aiLimit + " draft requests per month · web search off"], ["clock", "Background processing", settings.jobsEnabled, "Durable queue · manual approval before sending"]];
  return <><PageHeader title="Settings" description="Integration configuration, sending identity, and workspace limits." />
    <div className="settings-grid"><section className="panel"><div className="panel-heading"><div><h2>Connections</h2><p>Configuration status, not a live connectivity test</p></div><Icon name="settings" /></div>{integrations.map(([icon, title, ready, description]) => <div className="integration-row" key={title}><span className="integration-icon"><Icon name={icon} /></span><div><strong>{title}</strong><p>{description}</p></div><Badge value={ready ? "configured" : "disabled"} /></div>)}</section>
      <section className="panel"><div className="panel-heading"><h2>Operating limits</h2></div><div className="setting-value"><span>Monthly budget target</span><strong>$50 <small>USD</small></strong></div><div className="setting-value"><span>Workspace seats</span><strong>5</strong></div><div className="setting-value"><span>Daily send attempts</span><strong>{settings.dailyLimit}</strong></div><div className="setting-value"><span>Business timezone</span><strong className="small-value">{settings.timezone}</strong></div><p className="muted small-text">The budget target is a planning allowance. Provider invoices and usage charges are not synchronized here.</p></section>
      <section className="panel"><div className="panel-heading"><h2>Sending identity</h2><Badge value={settings.sendingEnabled ? "active" : "disabled"} /></div><div className="identity-field"><span>From</span><strong>{settings.sender || "Not configured"}</strong></div><div className="identity-field"><span>Reply-to</span><strong>{settings.replyTo || "Not configured"}</strong></div><div className="identity-field"><span>Business postal address</span><strong>{settings.postalAddressConfigured ? "Configured" : "Required before sending"}</strong></div></section>
      {settings.replyProvider === "resend" ? <ResendReceiving settings={settings} version={version} /> :
        <OutlookConnection user={user} notify={notify} changed={changed} version={version} />}
      <section className="panel configuration-note"><Icon name="team" size={27} /><h2>Configuration management</h2><p>Credentials, sending switches, and provider settings are managed on the server. Secrets never appear in this dashboard.</p><p>{user.role === "admin" ? "Use the setup guide and .env.example to configure a separate development environment before deployment." : "Ask your administrator to update connections or sending settings."}</p></section>
    </div>
  </>;
}
