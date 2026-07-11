import { useState, useEffect, useCallback } from 'react';
import { UserPlus, Search, MoreHorizontal, Trash2, Edit3, CheckCircle2, XCircle } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal, ModalField, ModalButtons } from '../ui/Modal';
import { api } from '../../lib/api';

export default function UsersScreen() {
  const storeUsers = useStore((s) => s.users);
  const accent = useStore((s) => s.accent);
  const winWidth = useStore((s) => s.winWidth);
  const updateUser = useStore((s) => s.updateUser);
  const isDockformAdmin = useStore((s) => s.isDockformAdmin);
  const [search, setSearch] = useState('');
  const [menuId, setMenuId] = useState<string | number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<string | number | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: '', department: '' });
  const [apiUsers, setApiUsers] = useState<any[] | null>(null);

  const activeCompanyId = useStore((s) => s.activeCompanyId);
  const isMobile = winWidth < 720;

  const fetchUsers = useCallback(() => {
    api.getUsers().then(setApiUsers).catch(() => setApiUsers(null));
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  const users = apiUsers || storeUsers;
  const companyUsers = activeCompanyId ? users.filter((u: any) => !u.companyId || u.companyId === activeCompanyId) : users;
  const filtered = companyUsers.filter((u: any) =>
    (u.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.role || '').toLowerCase().includes(search.toLowerCase()) ||
    (u.department || '').toLowerCase().includes(search.toLowerCase())
  );

  const openAdd = () => { setForm({ name: '', email: '', role: '', department: '' }); setShowAdd(true); };
  const openEdit = (u: any) => { setForm({ name: u.name, email: u.email, role: u.role, department: u.department }); setEditId(u.id); setMenuId(null); };
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
    if (editId !== null) {
      updateUser(editId as string, { name: form.name, email: form.email, role: form.role, department: form.department });
      setEditId(null);
    } else {
      await api.inviteUser(form.email, form.name);
      setShowAdd(false);
      fetchUsers();
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
                {['User', 'Email', 'Role', 'Department', 'Status', 'Actions'].map((h) => (
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
                <tr><td colSpan={6} style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>No users match your search.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      </div>

      {(showAdd || editId !== null) && (
        <Modal title={editId !== null ? 'Edit User' : 'Invite User'} onClose={closeForm}>
          <ModalField label="Full Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="John Doe" />
          <ModalField label="Email" value={form.email} onChange={(v) => setForm({ ...form, email: v })} placeholder="john@acme.com" type="email" />
          <ModalField label="Role" value={form.role} onChange={(v) => setForm({ ...form, role: v })} options={['Admin', 'Editor', 'Auditor', 'Viewer']} />
          <ModalField label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} options={['Engineering', 'Operations', 'Quality', 'Safety', 'HR', 'Maintenance']} />
          <ModalButtons onCancel={closeForm} onSave={handleSave} saveLabel={editId !== null ? 'Update' : 'Invite'} accent={accent} disabled={!form.name || !form.email} />
        </Modal>
      )}
    </div>
  );
}
