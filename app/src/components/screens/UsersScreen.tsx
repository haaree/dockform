import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Search, MoreHorizontal, Trash2, Edit3, CheckCircle2, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal, ModalField, ModalButtons } from '../ui/Modal';
import { api } from '../../lib/api';

const AVAILABILITY_LABELS: Record<string, { label: string; bg: string; fg: string }> = {
  free: { label: 'Free', bg: '#DCFCE7', fg: '#15803D' },
  assigned: { label: 'Assigned', bg: '#FEF3C7', fg: '#92400E' },
  off_shift: { label: 'Off Shift', bg: '#F3F4F6', fg: '#6B7280' },
};

function AvailabilityBadge({ status }: { status?: string }) {
  const s = AVAILABILITY_LABELS[status || 'free'] || AVAILABILITY_LABELS.free;
  return (
    <span style={{ display: 'inline-block', padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: s.bg, color: s.fg }}>
      {s.label}
    </span>
  );
}

export default function UsersScreen() {
  const storeUsers = useStore((s) => s.users);
  const accent = useStore((s) => s.accent);
  const winWidth = useStore((s) => s.winWidth);
  const isDockformAdmin = useStore((s) => s.isDockformAdmin);
  const [search, setSearch] = useState('');
  const [menuId, setMenuId] = useState<string | number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: '', roleId: '', department: '', plantId: '', departmentId: '', teamId: '' });
  const [apiUsers, setApiUsers] = useState<any[] | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  // Org-structure lookups for the Edit User modal's real dropdowns (plant/department/team/role)
  // instead of free-typed strings that never matched a real Plant/Department/Team/Role row.
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([]);
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [teams, setTeams] = useState<{ id: string; name: string }[]>([]);

  const [allTrades, setAllTrades] = useState<{ id: string; name: string }[]>([]);
  const [selectedTradeIds, setSelectedTradeIds] = useState<Set<string>>(new Set());
  const [newTradeName, setNewTradeName] = useState('');

  const activeCompanyId = useStore((s) => s.activeCompanyId);
  const isMobile = winWidth < 720;

  const fetchUsers = useCallback(() => {
    api.getUsers().then(setApiUsers).catch(() => setApiUsers(null));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  // Roles are needed by both Invite (openAdd) and Edit (openEdit) -- fetched once here rather
  // than per-open, so Invite's Role dropdown isn't empty the way it would be if roles were
  // only loaded inside openEdit.
  useEffect(() => { api.getRoles().then(setRoles).catch(() => {}); }, []);

  const toggleTrade = (id: string) => {
    setSelectedTradeIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleAddTrade = async () => {
    if (!newTradeName.trim()) return;
    try {
      const trade = await api.createTrade(newTradeName.trim());
      setAllTrades((prev) => [...prev, trade].sort((a, b) => a.name.localeCompare(b.name)));
      setNewTradeName('');
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to add trade');
    }
  };

  const users = apiUsers || storeUsers;
  const companyUsers = activeCompanyId ? users.filter((u: any) => !u.companyId || u.companyId === activeCompanyId) : users;
  const filtered = companyUsers.filter((u: any) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm({ name: '', email: '', role: '', roleId: '', department: '', plantId: '', departmentId: '', teamId: '' }); setShowAdd(true); };

  const openEdit = (u: any) => {
    setForm({ name: u.name, email: u.email, role: u.role, roleId: u.roleId || '', department: u.department, plantId: u.plantId || '', departmentId: u.departmentId || '', teamId: u.teamId || '' });
    setEditId(u.id);
    setMenuId(null);
    setSelectedTradeIds(new Set((u.trades || []).map((t: any) => t.id)));
    Promise.all([api.getPlants(), api.getDepartments(), api.getTeams(), api.getTrades()])
      .then(([p, d, t, tr]) => { setPlants(p); setDepartments(d); setTeams(t); setAllTrades(tr); })
      .catch(() => {});
  };
  const closeForm = () => { setShowAdd(false); setEditId(null); };

  const handleApprove = async (user: any) => {
    await api.updateUserStatus(user.id, 'active');
    api.sendAccountApprovedEmail(user.email, user.name, 'Standard');
    fetchUsers();
  };

  const handleReject = async (user: any) => {
    await api.updateUserStatus(user.id, 'suspended');
    api.sendAccountSuspendedEmail(user.email, user.name);
    fetchUsers();
  };

  const handleDelete = async (user: any) => {
    setMenuId(null);
    try {
      await api.deleteUser(user.id);
      fetchUsers();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to delete user');
    }
  };

  const handleSave = async () => {
    if (!form.name || !form.email) return;
    setEditSaving(true);
    try {
      if (editId !== null) {
        await api.updateUserDetails(editId as string, {
          fullName: form.name, email: form.email,
          roleId: form.roleId || undefined,
          plantId: form.plantId, departmentId: form.departmentId, teamId: form.teamId,
        });
        await api.setUserTrades(editId as string, Array.from(selectedTradeIds));
        setEditId(null);
        fetchUsers();
      } else {
        await api.inviteUser(form.email, form.name, form.roleId || undefined);
        setShowAdd(false);
        fetchUsers();
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'Failed to save user');
    } finally {
      setEditSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: isMobile ? 16 : '24px 32px', flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: isMobile ? 10 : 16, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text)' }}>Users</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{companyUsers.length} users in your workspace</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ position: 'relative' }}>
            <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search users…"
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 30px', fontSize: 13, color: 'var(--text)', width: isMobile ? '100%' : 220, outline: 'none' }} />
          </div>
          <button onClick={openAdd}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: accent, border: 'none', borderRadius: 8, padding: '9px 16px', fontSize: 13, fontWeight: 600, color: '#fff', cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <UserPlus size={15} /> Invite User
          </button>
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? 16 : '24px 32px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['User', 'Email', 'Role', 'Department', 'Trades', 'Availability', 'Status', 'Actions'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--muted)', padding: '12px 20px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 28, height: 28, borderRadius: '50%', background: user.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>{user.initials}</div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted)' }}>{user.email}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted)' }}>{user.role}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted)' }}>{user.department}</td>
                  <td style={{ padding: '12px 20px' }}>
                    {(user.trades || []).length === 0 ? (
                      <span style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>None</span>
                    ) : (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 200 }}>
                        {user.trades.map((t: any) => (
                          <span key={t.id} style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10, background: 'var(--surface2)', color: 'var(--text)', border: '1px solid var(--border)' }}>{t.name}</span>
                        ))}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '12px 20px' }}><AvailabilityBadge status={user.availabilityStatus} /></td>
                  <td style={{ padding: '12px 20px' }}><StatusBadge status={user.status} /></td>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, position: 'relative' }}>
                      {user.status === 'pending' && isDockformAdmin ? (
                        <>
                          <button onClick={() => handleApprove(user)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#15803D', cursor: 'pointer' }}>
                            <CheckCircle2 size={13} /> Approve
                          </button>
                          <button onClick={() => handleReject(user)}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#EF4444', cursor: 'pointer' }}>
                            <XCircle size={13} /> Reject
                          </button>
                        </>
                      ) : (
                        <>
                          <button onClick={() => openEdit(user)}
                            style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                            Edit
                          </button>
                          <button onClick={() => setMenuId(menuId === user.id ? null : user.id)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', cursor: 'pointer' }}>
                            <MoreHorizontal size={15} />
                          </button>
                          {menuId === user.id && (
                            <div style={{ position: 'absolute', right: 0, top: 36, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 12px rgba(0,0,0,.15)', zIndex: 20, minWidth: 150, overflow: 'hidden' }}>
                              <button onClick={() => openEdit(user)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
                                <Edit3 size={14} /> Edit User
                              </button>
                              <button onClick={() => handleDelete(user)}
                                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: '#EF4444', cursor: 'pointer', textAlign: 'left' }}>
                                <Trash2 size={14} /> Delete User
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>No users match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {(showAdd || editId !== null) && (
        <Modal title={editId !== null ? 'Edit User' : 'Invite User'} onClose={closeForm} width={480}>
          <ModalField label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="John Doe" />
          <ModalField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="john@acme.com" type="email" />

          <div style={{ marginBottom: 14 }}>
            <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>Role</label>
            <select value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}
              style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}>
              <option value="">Select…</option>
              {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {editId !== null && (
            <>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>Plant</label>
                <select value={form.plantId} onChange={(e) => setForm({ ...form, plantId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}>
                  <option value="">None</option>
                  {plants.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>Department</label>
                <select value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}>
                  <option value="">None</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>Team</label>
                <select value={form.teamId} onChange={(e) => setForm({ ...form, teamId: e.target.value })}
                  style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}>
                  <option value="">None</option>
                  {teams.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>

              <div style={{ marginBottom: 6 }}>
                <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>Trades</label>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 8 }}>
                  Determines which work permits this person can be auto-assigned to.
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 10, maxHeight: 160, overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px' }}>
                  {allTrades.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--muted)', fontStyle: 'italic' }}>No trades defined yet — add one below.</div>}
                  {allTrades.map((t) => (
                    <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={selectedTradeIds.has(t.id)} onChange={() => toggleTrade(t.id)} />
                      {t.name}
                    </label>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                  <input value={newTradeName} onChange={(e) => setNewTradeName(e.target.value)} placeholder="Add a new trade…"
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddTrade(); } }}
                    style={{ flex: 1, padding: '8px 10px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
                  <button type="button" onClick={handleAddTrade}
                    style={{ padding: '8px 14px', fontSize: 12.5, fontWeight: 600, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text)', cursor: 'pointer' }}>
                    Add
                  </button>
                </div>
              </div>
            </>
          )}

          <ModalButtons onCancel={closeForm} onSave={handleSave} saveLabel={editSaving ? 'Saving…' : (editId !== null ? 'Update' : 'Invite')} accent={accent} disabled={!form.name || !form.email || editSaving} />
        </Modal>
      )}
    </div>
  );
}
