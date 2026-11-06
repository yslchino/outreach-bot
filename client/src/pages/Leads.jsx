import ImportDialog from "../components/ImportDialog";
import ContactFilters from "../components/ContactFilters";
import { useState } from "react";
import { api } from "../api";
import { useAction, useResource } from "../hooks";
import { Badge, Empty, Field, Icon, Loading, MessageBody, Modal, PageHeader, Pagination, ResourceError } from "../components/UI";
function LeadDetail({
  id,
  onClose,
  notify,
  onChanged,
  canWrite
}) {
  const {
    data,
    error,
    loading,
    reload
  } = useResource("/contacts/" + id + "/history");
  const [editing, setEditing] = useState(false);
  if (error) return <Modal title="Lead details" onClose={onClose}><ResourceError message={error} retry={reload} /></Modal>;
  if (loading || !data) return <Modal title="Lead details" onClose={onClose}><Loading /></Modal>;
  return <Modal title={data.contact.name || data.contact.email} subtitle={data.contact.email + " · " + (data.contact.company || "No company")} onClose={onClose} wide>
    <div className="modal-content">{data.contact.replyPreview && <section className="panel"><h3>Latest matched reply</h3><strong>{data.contact.replySubject || "No subject"}</strong><p style={{ whiteSpace: "pre-wrap" }}>{data.contact.replyPreview}</p></section>}<div className="detail-strip"><Badge value={data.suppression ? "suppressed" : data.contact.replied ? "replied" : data.contact.status} /><span>{data.contact.emailVerified ? "Address verified" : "Address unverified"}</span><span>Source: {data.contact.source || "Legacy import"}</span><span>{[data.contact.region, data.contact.state].filter(Boolean).join(" · ") || "Location not recorded"}</span><span>{data.contact.permission === "business_contact" ? "Cold business contact · not opted in" : data.contact.permission === "opted_in" ? "Opted in" : "Classification not recorded"}</span>{data.contact.verificationMethod === "user_reported" && <span>Verification reported by a team member</span>}</div>
      {canWrite && !editing && <div className="button-row"><button className="button secondary small" onClick={() => setEditing(true)}>Edit & verify lead</button></div>}
      {editing && <EditLead contact={data.contact} notify={notify} onDone={() => {
        setEditing(false);
        reload();
        onChanged();
      }} />}
      <h3 className="section-label">Message history</h3>{data.messages.length ? data.messages.map(m => <MessageBody key={m._id} message={m} />) : <Empty title="No outreach yet" description="Messages will appear here once a campaign is prepared." />}
      {canWrite && <LeadActions data={data} notify={notify} onChanged={() => {
        reload();
        onChanged();
      }} />}
    </div>
  </Modal>;
}
function EditLead({
  contact,
  notify,
  onDone
}) {
  const [name, setName] = useState(contact.name || ""),
    [company, setCompany] = useState(contact.company || ""),
    [permission, setPermission] = useState(contact.permission || "unknown"),
    [verified, setVerified] = useState(contact.emailVerified || false);
  const {
    busy,
    perform
  } = useAction(notify);
  return <form className="edit-lead" onSubmit={async e => {
    e.preventDefault();
    if (await perform(() => api("/contacts/" + contact._id, {
      method: "PATCH",
      body: {
        name,
        company,
        permission,
        emailVerified: verified
      }
    }), "Lead updated.")) onDone();
  }}>
    <div className="form-grid"><Field label="Name"><input required value={name} onChange={e => setName(e.target.value)} /></Field><Field label="Company"><input value={company} onChange={e => setCompany(e.target.value)} /></Field></div>
    <Field label="Contact permission"><select value={permission} onChange={e => setPermission(e.target.value)}><option value="unknown">Unknown — needs review</option><option value="opted_in">Explicitly opted in</option><option value="business_contact">Business contact — provider review required</option></select></Field>
    <label className="checkbox-label"><input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} /> I independently checked this email address.</label>
    <button className="button primary small" disabled={busy}>{busy ? "Saving…" : "Save lead"}</button>
  </form>;
}
function LeadActions({
  data,
  notify,
  onChanged
}) {
  const {
    busy,
    perform
  } = useAction(notify);
  return <div className="lead-actions"><h3>Conversation controls</h3><p className="muted">A reply or suppression stops queued follow-ups for this lead.</p><div className="button-row">
    <button className="button secondary small" disabled={busy || data.contact.replied} onClick={async () => {
        if (await perform(() => api("/contacts/" + data.contact._id, {
          method: "PATCH",
          body: {
            replied: true
          }
        }), "Lead marked as replied.")) onChanged();
      }}>Mark replied</button>
    <button className="button danger small" disabled={busy || Boolean(data.suppression)} onClick={async () => {
        if (!window.confirm("Suppress this address across all campaigns?")) return;
        if (await perform(() => api("/suppressions", {
          method: "POST",
          body: {
            email: data.contact.email,
            reason: "opt_out"
          }
        }), "Address suppressed.")) onChanged();
      }}>{data.suppression ? "Suppressed" : "Suppress address"}</button>
  </div></div>;
}
export default function Leads({
  version,
  changed,
  notify,
  user
}) {
  const [q, setQ] = useState(""),
    [audience, setAudience] = useState(""),
    [status, setStatus] = useState(""),
    [region, setRegion] = useState(""),
    [state, setState] = useState(""),
    [industry, setIndustry] = useState(""),
    [page, setPage] = useState(1),
    [importOpen, setImportOpen] = useState(false),
    [selected, setSelected] = useState(null);
  const canWrite = user.role !== "viewer";
  const {
    data,
    loading,
    error,
    reload
  } = useResource("/contacts?" + new URLSearchParams({
    q,
    audience,
    status,
    region, state, industry,
    page
  }), version);
  return <>
    <PageHeader title="Leads" description="Manage contacts, verification, and outreach history.">{canWrite && <button className="button primary" onClick={() => setImportOpen(true)}><Icon name="upload" size={17} /> Import leads</button>}</PageHeader>
    <section className="panel"><div className="table-toolbar"><div className="search-input"><Icon name="search" size={17} /><input aria-label="Search leads" placeholder="Search names, companies, or emails…" value={q} onChange={e => {
            setQ(e.target.value);
            setPage(1);
          }} /></div><select aria-label="Audience" value={audience} onChange={e => {
          setAudience(e.target.value);
          setPage(1);
        }}><option value="">All audiences</option><option value="shipper">Shippers</option><option value="carrier">Carriers</option></select><select aria-label="Lead status" value={status} onChange={e => {
          setStatus(e.target.value);
          setPage(1);
        }}><option value="">All statuses</option><option value="new">New leads</option><option value="sent">Contacted</option><option value="replied">Replied</option></select></div>
      <ContactFilters region={region} state={state} industry={industry} version={version} onChange={values => { setRegion(values.region); setState(values.state); setIndustry(values.industry); setPage(1); }} />
      {error ? <ResourceError message={error} retry={reload} /> : loading || !data ? <Loading /> : !data.items.length ? <Empty icon="leads" title={q || status || audience || region || state || industry ? "No matching leads" : "No leads yet"} description={q || status || audience ? "Try a different search or filter." : "Import a shipper or carrier contact list to get started."} /> : <><div className="table-scroll"><table><thead><tr><th>Contact</th><th>Company</th><th>Location</th><th>Industry</th><th>Audience</th><th>Verification</th><th>Status</th><th /></tr></thead><tbody>{data.items.map(lead => <tr key={lead._id}><td><div className="person-cell"><span className="avatar">{(lead.name || lead.email).slice(0, 2).toUpperCase()}</span><div><strong>{lead.name || "Unnamed lead"}</strong><small>{lead.email}</small></div></div></td><td>{lead.company || "—"}{lead.city && <small>{lead.city}</small>}</td><td>{lead.state || "Missing state"}<small>{lead.region || "No region"}</small></td><td>{lead.industry || "—"}</td><td><span className="capitalize">{lead.audience || "Unassigned"}</span></td><td><span className={lead.emailVerified ? "verified-label" : "muted"}>{lead.emailVerified ? "Verified" : "Needs review"}</span></td><td><Badge value={lead.replied ? "replied" : lead.status === "pending" ? "new" : lead.status} /></td><td><button className="icon-button" aria-label={"View " + lead.email} onClick={() => setSelected(lead._id)}><Icon name="chevron" size={17} /></button></td></tr>)}</tbody></table></div><Pagination data={data} onPage={setPage} /></>}
    </section>
    {importOpen && <ImportDialog onClose={() => setImportOpen(false)} onImported={changed} notify={notify} />}
    {selected && <LeadDetail key={selected} id={selected} onClose={() => setSelected(null)} notify={notify} onChanged={changed} canWrite={canWrite} />}
  </>;
}
