import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal, ModalField, ModalButtons } from '../ui/Modal';

export default function DepartmentsScreen() {
  const departments = useStore((s) => s.departments);
  const plants = useStore((s) => s.plants);
  const accent = useStore((s) => s.accent);
  const addDepartment = useStore((s) => s.addDepartment);
  const winWidth = useStore((s) => s.winWidth);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', plant: '' });

  const isMobile = winWidth < 720;
  const pad = isMobile ? '16px' : '24px 32px';
  const filtered = departments.filter((d) => { const q = search.toLowerCase(); return !q || d.name.toLowerCase().includes(q) || d.plant.toLowerCase().includes(q); });

  const handleSave = () => { if (!form.name || !form.plant) return; addDepartment(form.name, form.plant); setForm({ name: '', plant: '' }); setShowAdd(false); };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: pad, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.5px' }}>Departments</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>{departments.length} departments configured</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}>
          <Search size={13} color="var(--muted)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search departments…" style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: isMobile ? '100%' : 170, outline: 'none' }} />
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
          <Plus size={14} /> New Department
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: pad }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Department', 'Plant', 'Department Head', 'Headcount', 'Status'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((d) => (
                  <tr key={d.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{d.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{d.plant}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{d.head}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{d.headcount}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={d.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showAdd && (
        <Modal title="New Department" onClose={() => setShowAdd(false)}>
          <ModalField label="Department Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Quality Assurance" />
          <ModalField label="Plant" value={form.plant} onChange={(v) => setForm({ ...form, plant: v })} options={plants.map(p => p.name)} />
          <ModalButtons onCancel={() => setShowAdd(false)} onSave={handleSave} saveLabel="Create Department" accent={accent} disabled={!form.name || !form.plant} />
        </Modal>
      )}
    </div>
  );
}
