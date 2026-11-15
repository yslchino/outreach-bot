import ContactFilters from "../components/ContactFilters";
import EmailPreview from "../components/EmailPreview";
import { dateTime } from "../format";
import { useEffect, useRef, useState } from "react";
import { api } from "../api";
import { useAction, useResource } from "../hooks";
import { Badge, Empty, Field, Icon, Loading, Modal, PageHeader, Pagination, ResourceError } from "../components/UI";
function CampaignBuilder({
  onClose,
  onCreated,
  notify
}) {
  const [step, setStep] = useState(1),
    [name, setName] = useState(""),
    [subject, setSubject] = useState(""),
    [context, setContext] = useState(""),
    [audience, setAudience] = useState("shipper"),
    [selected, setSelected] = useState([]),
    [region, setRegion] = useState(""),
    [state, setState] = useState(""),
    [industry, setIndustry] = useState(""),
    [q, setQ] = useState(""),
    [page, setPage] = useState(1);
  const {
    busy,
    perform
  } = useAction(notify);
  const {
    data,
    loading,
    error,
    reload
  } = useResource("/contacts?" + new URLSearchParams({
    audience,
    status: "new",
    region, state, industry,
    q,
    page
  }));
  async function submit(event) {
    event.preventDefault();
    if (step === 1) {
      setStep(2);
      return;
    }
    const result = await perform(() => api("/campaigns", {
      method: "POST",
      body: {
        name,
        subject,
        context,
        audience,
        contactIds: selected
      }
    }), "Campaign created. Review your drafts before approval.");
    if (result) onCreated(result._id);
  }
  return <Modal title="New campaign" subtitle="Set the audience and subject, then select recipients." onClose={onClose} wide>
    <form className="modal-content" onSubmit={submit}><div className="stepper"><span className={step === 1 ? "current" : ""}>01 · Campaign details</span><span className={step === 2 ? "current" : ""}>02 · Select leads</span><span>03 · Review drafts</span></div>
      {step === 1 ? <><Field label="Campaign name"><input required autoFocus placeholder="e.g. Pacific Northwest shippers" value={name} maxLength={120} onChange={e => setName(e.target.value)} /></Field><div className="audience-options">{[["shipper", "Shippers", "Freight customers and shipping contacts."], ["carrier", "Carriers", "Carrier contacts and capacity partners."]].map(([value, label, description]) => <button key={value} type="button" className={`audience-option ${audience === value ? "selected" : ""}`} onClick={() => {
            setAudience(value);
            setRegion(""); setState(""); setIndustry("");
            setSelected([]);
            setPage(1);
          }}><Icon name={value === "shipper" ? "campaigns" : "leads"} /><strong>{label}</strong><span>{description}</span></button>)}</div>
        <Field label="Email subject"><input required placeholder="A quick introduction from GET Logistics" value={subject} maxLength={200} onChange={e => setSubject(e.target.value)} /></Field>
        <Field label="Drafting context" hint="Optional. Use facts you can verify; avoid unsupported promises."><textarea rows={3} maxLength={2000} value={context} onChange={e => setContext(e.target.value)} placeholder="Relevant services, lanes, or account details" /></Field>
        <div className="modal-actions"><button type="button" className="button secondary" onClick={onClose}>Cancel</button><button className="button primary">Choose leads <Icon name="arrow" size={16} /></button></div></> : <><div className="selection-heading"><div><h3>Choose your recipients</h3><p className="muted">Only new leads are available. Verify addresses before launch.</p></div><Badge value="draft">{selected.length} selected</Badge></div>
          <div className="search-input"><Icon name="search" size={17} /><input aria-label="Search available leads" placeholder="Search available leads…" value={q} onChange={e => {
            setQ(e.target.value);
            setPage(1);
          }} /></div>
          <ContactFilters prefix="Campaign" region={region} state={state} industry={industry} onChange={values => { setRegion(values.region); setState(values.state); setIndustry(values.industry); setSelected([]); setPage(1); }} />
          <p className="muted small-text">Changing region, state, or industry clears selected recipients.</p>
          {error ? <ResourceError message={error} retry={reload} /> : loading || !data ? <Loading /> : !data.items.length ? <Empty icon="leads" title="No new leads in this audience" description="Import a list in the Lead workspace, or choose another audience." /> : <div className="lead-picker">{data.items.map(lead => <label className={`lead-choice ${selected.includes(lead._id) ? "chosen" : ""}`} key={lead._id}><input type="checkbox" checked={selected.includes(lead._id)} disabled={Boolean(lead.outreachCampaign) || !selected.includes(lead._id) && selected.length >= 100} onChange={e => setSelected(prev => e.target.checked ? [...prev, lead._id] : prev.filter(id => id !== lead._id))} /><div><strong>{lead.name || lead.email}</strong><small>{lead.company || lead.email}{lead.state ? " · " + lead.state : ""}{lead.region ? " · " + lead.region : ""}</small></div><span className="muted small-text">{lead.emailVerified ? "Verified" : "Unverified"}</span></label>)}</div>}
          <Pagination data={data} onPage={setPage} /><div className="modal-actions"><button type="button" className="button secondary" onClick={() => setStep(1)}>Back</button><button className="button primary" disabled={busy || !selected.length}>{busy ? "Preparing drafts…" : "Create " + selected.length + " drafts"}</button></div>
        </>}
    </form>
  </Modal>;
}
function DraftEditor({
  message,
  campaign,
  notify,
  onSaved,
  canWrite,
  settings,
  leaveGuardRef,
  position,
  total,
  onNavigate,
  nextId
}) {
  const [subject, setSubject] = useState(message.subject),
    [body, setBody] = useState(message.body),
    [preview, setPreview] = useState(null);
  const {
    busy,
    perform
  } = useAction(notify);
  const editable = canWrite && message.status === "draft" && campaign.status === "draft";
  const dirty = editable && (subject !== message.subject || body !== message.body);
  useEffect(() => {
    leaveGuardRef.current = () => ({ busy, dirty });
    return () => { leaveGuardRef.current = () => ({ busy: false, dirty: false }); };
  }, [busy, dirty, leaveGuardRef]);
  useEffect(() => {
    if (!dirty) return;
    const warn = event => { event.preventDefault(); event.returnValue = ""; };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);
  async function save(next = false) {
    const result = await perform(() => api("/campaigns/" + campaign._id + "/messages/" + message._id, {
      method: "PATCH", body: { subject, body }
    }), "Draft saved.");
    // Navigation follows the confirmed save; failure must leave the editor intact.
    if (result) onSaved(next ? nextId : message._id);
  }

  return <div className="draft-editor"><nav className="draft-navigation" aria-label="Message review">
    <span>{message.status === "draft" ? "Draft" : "Message"} {position + 1} of {total}</span>
    <div className="button-row"><button className="button secondary small" disabled={busy || position === 0} onClick={() => onNavigate(position - 1)}>Previous</button>
      <button className="button secondary small" disabled={busy || position === total - 1} onClick={() => onNavigate(position + 1)}>Next</button></div>
    </nav><div className="draft-header"><div><div className="mini-label">{message.kind === "followup" ? "FOLLOW-UP DRAFT" : "INITIAL OUTREACH"}</div><h3>{message.recipientName || message.to}</h3><p>{message.to}</p></div><div className="button-row">
      {message.status === "draft" && campaign.status === "draft" && <button className="button secondary small" disabled={busy || !subject.trim() || !body.trim()} onClick={async () => {
        const result = await perform(() => api("/campaigns/" + campaign._id + "/messages/" + message._id + "/preview", {
          method: "POST",
          body: editable ? { subject, body } : {}
        }));
        if (result) setPreview(result);
      }}>Preview email</button>}
      <Badge value={message.status} /></div></div>
    {editable ? <><Field label="Subject"><input disabled={busy} value={subject} maxLength={200} onChange={e => setSubject(e.target.value)} /></Field><Field label="Message"><textarea className="email-editor" rows={12} disabled={busy} value={body} maxLength={12000} onChange={e => setBody(e.target.value)} /></Field><div className="editor-footer"><span><span className={`draft-save-status ${dirty ? "unsaved" : ""}`} role="status">{dirty ? "Unsaved changes" : "Saved"}</span> · {body.split(/\s+/).filter(Boolean).length} words</span><div className="button-row"><button className="button secondary small" disabled={busy || !settings?.aiEnabled} title={!settings?.aiEnabled ? "Enable AI in server configuration first" : "Uses one monthly AI draft"} onClick={async () => {
            if (dirty && !window.confirm("Replace your unsaved text with an AI draft?")) return;
            if (await perform(() => api("/campaigns/" + campaign._id + "/messages/" + message._id + "/generate", {
              method: "POST"
            }), "AI draft ready for review.")) onSaved(message._id);
          }}><Icon name="spark" size={15} /> AI draft</button><button className="button secondary small" disabled={busy || !dirty || !body.trim() || !subject.trim()} onClick={() => save()}>Save draft</button>
          {nextId && <button className="button primary small" disabled={busy || !body.trim() || !subject.trim()} onClick={() => save(true)}>Save &amp; next</button>}</div></div></> : <><h4>{message.subject}</h4><div className="email-body">{message.body}</div>{message.error && <p className="inline-warning">{message.error}</p>}<div className="message-foot">Accepted: {dateTime(message.acceptedAt)} · Delivery: {message.deliveryStatus || "unknown"}</div></>}
    {preview && <EmailPreview preview={preview} unsaved={dirty} onClose={() => setPreview(null)} />}
  </div>;
}
function CampaignDetail({
  id,
  onClose,
  notify,
  changed,
  user,
  settings
}) {
  const {
    data,
    error,
    loading,
    reload
  } = useResource("/campaigns/" + id);
  const [selected, setSelected] = useState(null);
  const leaveGuardRef = useRef(() => ({ busy: false, dirty: false }));
  const [editorRevision, setEditorRevision] = useState(0);
  const [pendingLeave, setPendingLeave] = useState(null);
  const [approvalSelection, setApprovalSelection] = useState(null);
  const [resumeOpen, setResumeOpen] = useState(false);
  const {
    busy,
    perform
  } = useAction(notify);
  const refresh = () => {
    reload();
    changed();
  };
  const requestLeave = action => {
    const editor = leaveGuardRef.current();
    if (busy || editor.busy) {
      notify("Wait for the current draft action to finish.", "error");
      return;
    }
    if (editor.dirty) setPendingLeave({ action });
    else action();
  };
  const close = () => requestLeave(onClose);
  const reviewRefresh = () => requestLeave(() => {
    setEditorRevision(value => value + 1);
    refresh();
  });

  if (error) return <Modal title="Campaign" onClose={onClose}><ResourceError message={error} retry={reload} /></Modal>;
  if (loading || !data) return <Modal title="Campaign" onClose={onClose} wide><Loading /></Modal>;
  const message = data.messages.find(m => m._id === selected) || data.messages.find(m => m.status === "draft") || data.messages[0];
  const position = data.messages.findIndex(m => m._id === message?._id);
  const navigate = index => {
    if (data.messages[index] && index !== position) requestLeave(() => setSelected(data.messages[index]._id));
  };
  const saved = nextId => { setSelected(nextId); refresh(); };
  const admin = user.role === "admin";
  const drafts = data.messages.filter(item => item.status === "draft");
  const approvalIds = (approvalSelection || []).filter(messageId => drafts.some(item => item._id === messageId));
  return <><Modal title={data.name} subtitle={data.audience + " campaign · " + data.total + " messages"} onClose={close} wide>
    <div className="campaign-detail-top"><Badge value={data.status} /><div className="button-row">
      {admin && data.status === "draft" && <button className="button primary small" disabled={busy || !settings?.sendingEnabled} onClick={async () => {
          const editor = leaveGuardRef.current();
          if (editor.busy || editor.dirty) {
            notify("Save or discard your current edits before approving the campaign.", "error");
            return;
          }
          setApprovalSelection([message?.status === "draft" ? message._id : drafts[0]?._id].filter(Boolean));
        }}><Icon name="campaigns" size={15} /> Approve drafts</button>}
      {admin && ["queued", "running", "paused"].includes(data.status) && <button className="button secondary small" disabled={busy} onClick={async () => {
          if (data.status === "paused") { setResumeOpen(true); return; }
          if (await perform(() => api("/campaigns/" + id + "/action", {
            method: "POST", body: { action: "pause" }
          }), "Campaign paused.")) refresh();
        }}>{data.status === "paused" ? "Review & resume" : "Pause"}</button>}
      {user.role !== "viewer" && data.status === "completed" && <button className="button secondary small" disabled={busy} onClick={async () => {
          const result = await perform(() => api("/campaigns/" + id + "/followups", {
            method: "POST"
          }));
          if (result) {
            notify(result.created + " follow-up drafts prepared. Only unreplied leads older than three days qualify.", "success");
            refresh();
          }
        }}>Prepare due follow-ups</button>}
      <button className="button secondary small" disabled={busy} onClick={reviewRefresh}>Refresh</button>
    </div></div>
    {data.pauseReason && <p className="inline-warning" role="status">Campaign paused for review: {data.pauseReason}</p>}
    {!settings?.sendingEnabled && <div className="draft-mode-note"><Icon name="team" size={16} /> Sending is disabled. Drafts can be reviewed and saved.</div>}
    {["queued", "running"].includes(data.status) && !settings?.jobsEnabled && <div className="draft-mode-note">Background jobs are disabled. Approved messages remain queued.</div>}
    {!admin && data.status === "draft" && <div className="draft-mode-note">An administrator must approve this campaign before it can send.</div>}
    {message ? <div className="review-layout"><aside className="recipient-list"><div className="mini-label">RECIPIENTS</div>{data.messages.map(m => <button key={m._id} className={message._id === m._id ? "selected" : ""} onClick={() => navigate(data.messages.indexOf(m))} aria-current={message._id === m._id ? "true" : undefined}><strong>{m.recipientName || m.to}</strong><span>{m.company || m.to}</span><Badge value={m.status} /></button>)}</aside><DraftEditor key={message._id + message.updatedAt + editorRevision} message={message} campaign={data} notify={notify} onSaved={saved} canWrite={user.role !== "viewer"} settings={settings} leaveGuardRef={leaveGuardRef} position={position} total={data.messages.length} onNavigate={navigate} nextId={data.messages[position + 1]?._id} /></div> : <Empty title="No messages in this campaign" description="This campaign was interrupted during creation. Create another campaign with your leads." />}
  </Modal>
    {approvalSelection !== null && <Modal title="Approve selected drafts" subtitle="Only checked saved drafts will enter the sending queue." onClose={() => { if (!busy) setApprovalSelection(null); }}>
      <div className="modal-content">
        <p>From: {settings?.sender || "Not configured"}<br />Reply-to: {settings?.replyTo || "Not configured"}</p>
        <div className="button-row" role="group" aria-label="Draft selection presets">
          {[1, 5, 10].map(size => <button key={size} type="button" className="button secondary small" disabled={busy || drafts.length < size}
            aria-pressed={approvalIds.length === size && drafts.slice(0, size).every(item => approvalIds.includes(item._id))}
            title={drafts.length < size ? "Only " + drafts.length + " drafts available" : "Select the first " + size + " saved drafts in review order"}
            onClick={() => setApprovalSelection(drafts.slice(0, size).map(item => item._id))}>Select {size}</button>)}
        </div>
        <p className="muted small-text">Presets select the first drafts in review order. Check the recipients below before approving.</p>
        <fieldset disabled={busy} className="approval-list"><legend>Choose saved drafts</legend>
          {drafts.map(item => <label key={item._id} className="checkbox-label"><input type="checkbox" checked={approvalIds.includes(item._id)} onChange={event => setApprovalSelection(previous => event.target.checked ? [...previous, item._id] : previous.filter(messageId => messageId !== item._id))} />
            <span><strong>{item.recipientName || item.to}</strong><br />{item.to}<br />{item.subject}</span></label>)}
        </fieldset>
        <p role="status">{approvalIds.length} selected · {drafts.length - approvalIds.length} will remain drafts.</p>
        <p>{settings?.jobsEnabled ? "Selected messages can send as soon as you approve them." : "Background jobs are disabled. Selected messages will remain queued until jobs are enabled."}</p>
        <div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => setApprovalSelection(null)}>Cancel</button>
          <button className="button primary" disabled={busy || !settings?.sendingEnabled || !approvalIds.length} onClick={async () => {
            if (leaveGuardRef.current().dirty || leaveGuardRef.current().busy) { notify("Save or discard your current edits before approving drafts.", "error"); return; }
            if (await perform(() => api("/campaigns/" + id + "/launch", { method: "POST", body: { confirmed: true, messageIds: approvalIds } }), "Selected drafts approved and queued.")) {
              setApprovalSelection(null); refresh();
            }
          }}>Approve &amp; queue {approvalIds.length}</button></div>
      </div>
    </Modal>}
    {resumeOpen && <Modal title="Resume queued messages" onClose={() => { if (!busy) setResumeOpen(false); }}>
      <div className="modal-content"><p>{data.pauseReason || "This campaign was paused."}</p>
        <p>Review provider records and resolve every uncertain or processing message first. Resuming allows only already queued messages to continue; failed messages are not retried and drafts stay unapproved.</p>
        <div className="modal-actions"><button className="button secondary" disabled={busy} onClick={() => setResumeOpen(false)}>Keep paused</button>
          <button className="button primary" disabled={busy || !settings?.sendingEnabled} onClick={async () => {
            if (await perform(() => api("/campaigns/" + id + "/action", { method: "POST", body: { action: "resume", confirmed: true } }), "Campaign resumed.")) { setResumeOpen(false); refresh(); }
          }}>Resume queued messages</button></div>
      </div>
    </Modal>}
    {pendingLeave && <Modal title="Unsaved draft changes" subtitle="Save your draft first, or discard your edits to continue." onClose={() => setPendingLeave(null)}>
      <div className="modal-content"><p>Your changes have not been saved.</p>
        <div className="modal-actions"><button className="button secondary" autoFocus onClick={() => setPendingLeave(null)}>Keep editing</button>
          <button className="button danger" onClick={() => {
            const action = pendingLeave.action;
            setPendingLeave(null);
            action();
          }}>Discard changes</button></div>
      </div>
    </Modal>}
  </>;
}
export default function Campaigns({ version, changed, notify, user, settings }) {
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const { data, loading, error, reload } = useResource("/campaigns", version);
  const campaigns = (data || []).filter(campaign => {
    const matchesSearch = (campaign.name + " " + campaign.subject).toLowerCase().includes(query.trim().toLowerCase());
    const matchesStatus = status === "all" || (status === "active" ? ["queued", "running", "paused"].includes(campaign.status) : campaign.status === status);
    return matchesSearch && matchesStatus;
  });

  return (
    <>
      <PageHeader title="Campaigns" description="Prepare, review, and monitor outreach campaigns.">
        {user.role !== "viewer" && <button className="button primary" onClick={() => setCreating(true)}><Icon name="plus" size={16} /> New campaign</button>}
      </PageHeader>
      <section className="panel">
        <div className="table-toolbar campaign-toolbar">
          <div className="search-input"><Icon name="search" size={17} /><input aria-label="Search campaigns" placeholder="Search campaigns…" value={query} onChange={e => setQuery(e.target.value)} /></div>
          <select aria-label="Campaign status" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="all">All statuses</option><option value="draft">Draft</option>
            <option value="active">In progress</option><option value="completed">Completed</option>
          </select>
        </div>
        {error ? <ResourceError message={error} retry={reload} /> : loading || !data ? <Loading /> : !campaigns.length ? (
          <Empty icon="campaigns" title={data.length ? "No matching campaigns" : "No campaigns yet"}
            description={data.length ? "Change the search or status filter." : "Create a campaign to select recipients and prepare drafts."}>
            {!data.length && user.role !== "viewer" && <button className="button secondary" onClick={() => setCreating(true)}>New campaign</button>}
          </Empty>
        ) : (
          <>
            <div className="table-scroll">
              <table className="campaign-table">
                <thead><tr><th>Campaign</th><th>Audience</th><th>Status</th><th className="right">Messages</th><th>Accepted</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead>
                <tbody>{campaigns.map(campaign => (
                  <tr key={campaign._id}>
                    <td className="campaign-name-cell"><button className="table-link" onClick={() => setSelected(campaign._id)}>{campaign.name}</button><small>{campaign.subject}</small></td>
                    <td className="capitalize">{campaign.audience === "shipper" ? "Shippers" : "Carriers"}</td>
                    <td><Badge value={campaign.status} /></td>
                    <td className="right numeric">{campaign.total}</td>
                    <td className="numeric">{campaign.counts.accepted || 0} <span className="muted">/ {campaign.total}</span></td>
                    <td className="nowrap muted">{dateTime(campaign.updatedAt || campaign.createdAt)}</td>
                    <td className="right"><button className="button small secondary" aria-label={(campaign.status === "draft" ? "Review " : "Open ") + campaign.name} onClick={() => setSelected(campaign._id)}>{campaign.status === "draft" ? "Review" : "Open"}</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
            <div className="table-footer">{campaigns.length} of {data.length} campaigns · Administrator approval required before sending</div>
          </>
        )}
      </section>
      {creating && <CampaignBuilder onClose={() => setCreating(false)} onCreated={id => { setCreating(false); setSelected(id); changed(); }} notify={notify} />}
      {selected && <CampaignDetail key={selected} id={selected} onClose={() => setSelected(null)} notify={notify} changed={changed} user={user} settings={settings} />}
    </>
  );
}
