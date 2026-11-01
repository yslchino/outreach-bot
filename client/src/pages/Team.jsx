import { useState } from "react";
import { api } from "../api";
import { useAction, useResource } from "../hooks";
import { Badge, Field, Icon, Loading, Modal, PageHeader, ResourceError } from "../components/UI";
function MemberForm({
  member,
  onClose,
  notify,
  changed
}) {
  const [displayName, setDisplayName] = useState(member?.displayName || ""),
    [username, setUsername] = useState(""),
    [password, setPassword] = useState(""),
    [role, setRole] = useState(member?.role || "operator"),
    [active, setActive] = useState(member?.active ?? true);
  const {
    busy,
    perform
  } = useAction(notify);
  return <Modal title={member ? "Manage team member" : "Add team member"} subtitle="Set account details and workspace permissions." onClose={onClose}>
    <form className="modal-content" onSubmit={async e => {
      e.preventDefault();
      const body = {
        displayName,
        role,
        ...(member ? {
          active
        } : {
          username
        }),
        ...(password ? {
          password
        } : {})
      };
      if (await perform(() => api(member ? "/auth/users/" + member.id : "/auth/users", {
        method: member ? "PATCH" : "POST",
        body
      }), member ? "Team member updated. Existing sessions revoked." : "Team member added.")) {
        changed();
        onClose();
      }
    }}>
      <Field label="Full name"><input required maxLength={100} value={displayName} onChange={e => setDisplayName(e.target.value)} /></Field>
      {!member && <Field label="Username"><input required maxLength={80} autoComplete="off" value={username} onChange={e => setUsername(e.target.value)} /></Field>}
      <Field label={member ? "Reset password (optional)" : "Initial password"} hint="At least 12 characters. Share directly with this team member."><input required={!member} minLength={12} maxLength={72} type="password" autoComplete="new-password" value={password} onChange={e => setPassword(e.target.value)} /></Field>
      <Field label="Workspace role"><select value={role} onChange={e => setRole(e.target.value)}><option value="admin">Administrator — approve campaigns & manage users</option><option value="operator">Operator — manage leads & prepare drafts</option><option value="viewer">Viewer — read-only access</option></select></Field>
      {member && <label className="checkbox-label"><input type="checkbox" checked={active} onChange={e => setActive(e.target.checked)} /> Account enabled</label>}
      <button className="button primary full" disabled={busy}>{busy ? "Saving…" : member ? "Save changes" : "Add member"}</button>
    </form>
  </Modal>;
}
export default function Team({
  user,
  version,
  notify,
  changed
}) {
  const [member, setMember] = useState(null),
    [adding, setAdding] = useState(false);
  const {
    data,
    loading,
    error,
    reload
  } = useResource("/auth/users", version);
  return <><PageHeader title="Team" description="Manage workspace accounts and access permissions."><button className="button primary" disabled={data?.length >= 5} onClick={() => setAdding(true)}><Icon name="plus" size={17} /> Add member</button></PageHeader>

    <section className="panel"><div className="panel-heading"><h2>Workspace members</h2><span className="muted">{data?.length || 0} / 5 seats</span></div>{error ? <ResourceError message={error} retry={reload} /> : loading || !data ? <Loading /> : <div className="table-scroll"><table><thead><tr><th>Member</th><th>Role</th><th>Status</th><th>Seat</th><th /></tr></thead><tbody>{data.map(m => <tr key={m.id}><td><div className="person-cell"><span className="avatar">{m.displayName.slice(0, 2).toUpperCase()}</span><div><strong>{m.displayName}{m.id === user.id ? " (you)" : ""}</strong><small>{m.username}</small></div></div></td><td><Badge value={m.role} /></td><td><Badge value={m.active ? "active" : "disabled"} /></td><td className="muted">0{m.seat}</td><td><button className="text-button" disabled={m.id === user.id} onClick={() => setMember(m)}>Manage</button></td></tr>)}</tbody></table></div>}
    </section><details className="role-reference"><summary>Role permissions</summary><dl><div><dt>Administrator</dt><dd>Approve campaigns, manage accounts, and reconcile send outcomes.</dd></div><div><dt>Operator</dt><dd>Import leads, verify contacts, and prepare drafts.</dd></div><div><dt>Viewer</dt><dd>View leads, messages, and campaign progress.</dd></div></dl></details><p className="muted small-text">Disabling an account or changing its role revokes its sessions. Your own access must be changed by another administrator. Disabled accounts retain their seat and history.</p>
    {(adding || member) && <MemberForm member={member} onClose={() => {
      setAdding(false);
      setMember(null);
    }} notify={notify} changed={changed} />}
  </>;
}
