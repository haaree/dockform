import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal, ModalField, ModalButtons } from '../ui/Modal';

export default function RolesScreen() {
  const roles = useStore((s) => s.roles);
  const accent = useStore((s) => s.accent);
  const addRole = useStore((s) => s.addRole);
  const winWidth = useStore((s) => s.winWidth);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', description: '' });

  const isMobile = winWidth < 720;
  const pad = isMobile ? '16px' : '24px 32px';
  const filtered = roles.filter((r) => { const q = search.toLowerCase(); return !q || r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q); });

  const handleSave = () => { if (!form.name) return; addRole(form.name, form.description); setForm({ name: '', description: '' }); setShowAdd(false); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: pad, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 18 : 21, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>Roles</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{roles.length} roles defined</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}>
          <Search size={13} color="var(--muted)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search roles…" style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: isMobile ? '100%' : 170, outline: 'none' }} />
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
          <Plus size={14} /> New Role
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: pad }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--surface2)' }}>
                {['Role', 'Description', 'Users', 'Key Permissions', 'Status'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{r.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{r.description}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{r.users}</td>
                    <td style={{ padding: '12px 16px', fontSize: 12, color: 'var(--muted)' }}>{r.permissions}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showAdd && (
        <Modal title="New Role" onClose={() => setShowAdd(false)}>
          <ModalField label="Role Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Shift Supervisor" />
          <ModalField label="Description" value={form.description} onChange={(v) => setForm({ ...form, description: v })} placeholder="Manages shift operations" />
          <ModalButtons onCancel={() => setShowAdd(false)} onSave={handleSave} saveLabel="Create Role" accent={accent} disabled={!form.name} />
        </Modal>
      )}
    </div>
  );
}
