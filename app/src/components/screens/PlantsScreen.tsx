import { useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal, ModalField, ModalButtons } from '../ui/Modal';

export default function PlantsScreen() {
  const plants = useStore((s) => s.plants);
  const companies = useStore((s) => s.companies);
  const accent = useStore((s) => s.accent);
  const addPlant = useStore((s) => s.addPlant);
  const winWidth = useStore((s) => s.winWidth);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', company: '', location: '', capacity: '' });

  const isMobile = winWidth < 720;
  const pad = isMobile ? '16px' : '24px 32px';
  const filtered = plants.filter((p) => { const q = search.toLowerCase(); return !q || p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q) || p.company.toLowerCase().includes(q); });

  const handleSave = () => {
    if (!form.name || !form.code) return;
    addPlant(form.name, form.code, form.company, form.location, form.capacity);
    setForm({ name: '', code: '', company: '', location: '', capacity: '' });
    setShowAdd(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: pad, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 18 : 21, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>Plants</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{plants.length} plants across all companies</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}>
          <Search size={13} color="var(--muted)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search plants…" style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: isMobile ? '100%' : 170, outline: 'none' }} />
        </div>
        <button onClick={() => setShowAdd(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
          <Plus size={14} /> New Plant
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: pad }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr style={{ background: 'var(--surface2)' }}>
                {['Plant', 'Code', 'Company', 'Location', 'Capacity', 'Status'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{p.name}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{p.code}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{p.company}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{p.location}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{p.capacity}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {showAdd && (
        <Modal title="New Plant" onClose={() => setShowAdd(false)}>
          <ModalField label="Plant Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Chennai Manufacturing Plant" />
          <ModalField label="Plant Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="PLT-XX01" />
          <ModalField label="Company" value={form.company} onChange={(v) => setForm({ ...form, company: v })} options={companies.map(c => c.name)} />
          <ModalField label="Location" value={form.location} onChange={(v) => setForm({ ...form, location: v })} placeholder="City, State" />
          <ModalField label="Capacity" value={form.capacity} onChange={(v) => setForm({ ...form, capacity: v })} placeholder="450 workers" />
          <ModalButtons onCancel={() => setShowAdd(false)} onSave={handleSave} saveLabel="Create Plant" accent={accent} disabled={!form.name || !form.code} />
        </Modal>
      )}
    </div>
  );
}
