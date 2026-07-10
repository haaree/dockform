import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal, ModalField, ModalButtons } from '../ui/Modal';

export default function TeamsScreen() {
  const teams = useStore((s) => s.teams);
  const departments = useStore((s) => s.departments);
  const accent = useStore((s) => s.accent);
  const addTeam = useStore((s) => s.addTeam);
  const winWidth = useStore((s) => s.winWidth);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', department: '' });

  const isMobile = winWidth < 720;
  const pad = isMobile ? '16px' : '24px 32px';
  const filtered = teams.filter((t) => { const q = search.toLowerCase(); return !q || t.name.toLowerCase().includes(q) || t.department.toLowerCase().includes(q); });

  const handleSave = () => { if (!form.name || !form.department) return; addTeam(form.name, form.department); setForm({ name: '', department: '' }); setShowAdd(false); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: pad, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.5px' }}>Teams</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>{teams.length} teams configured</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}>
          <Search size={13} color="var(--muted)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search teams…" style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: isMobile ? '100%' : 170, outline: 'none' }} />
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
          <Plus size={14} /> New Team
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: pad }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Team', 'Department', 'Team Lead', 'Members', 'Status'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((t) => (
                  <tr key={t.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{t.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{t.department}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{t.lead}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{t.members}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={t.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showAdd && (
        <Modal title="New Team" onClose={() => setShowAdd(false)}>
          <ModalField label="Team Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Assembly Line 2" />
          <ModalField label="Department" value={form.department} onChange={(v) => setForm({ ...form, department: v })} options={departments.map(d => d.name)} />
          <ModalButtons onCancel={() => setShowAdd(false)} onSave={handleSave} saveLabel="Create Team" accent={accent} disabled={!form.name || !form.department} />
        </Modal>
      )}
    </div>
  );
}
