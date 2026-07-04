import { useMemo, useState } from 'react';
import { Search, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal, ModalField, ModalButtons } from '../ui/Modal';

export default function CompaniesScreen() {
  const companies = useStore((s) => s.companies);
  const accent = useStore((s) => s.accent);
  const addCompany = useStore((s) => s.addCompany);
  const winWidth = useStore((s) => s.winWidth);
  const [search, setSearch] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', type: 'Standalone' });

  const isMobile = winWidth < 720;
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return companies;
    return companies.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || c.type.toLowerCase().includes(q));
  }, [companies, search]);

  const handleSave = () => {
    if (!form.name || !form.code) return;
    addCompany(form.name, form.code, form.type);
    setForm({ name: '', code: '', type: 'Standalone' });
    setShowAdd(false);
  };

  return (
    <div style={{ padding: isMobile ? 0 : 24 }}>
      <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between', marginBottom: isMobile ? 14 : 20, gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div>
          <div style={{ fontSize: 21, fontWeight: 700, letterSpacing: -0.5, color: 'var(--text)' }}>Companies</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>{companies.length} {companies.length === 1 ? 'company' : 'companies'} in your organization</div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', minWidth: isMobile ? 'unset' : 220, flex: isMobile ? 1 : 'unset' }}>
            <Search size={14} color="var(--muted)" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search companies…"
              style={{ border: 'none', outline: 'none', background: 'transparent', fontSize: 13, color: 'var(--text)', width: '100%' }} />
          </div>
          <button type="button" onClick={() => setShowAdd(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: accent, color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <Plus size={15} /> New Company
          </button>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead style={{ background: 'var(--surface2)' }}>
              <tr>
                {['Company', 'Code', 'Type', 'Plants', 'Employees', 'Status'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{c.name}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{c.code}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{c.type}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{c.plants}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{c.employees.toLocaleString()}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={c.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>No companies found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showAdd && (
        <Modal title="New Company" onClose={() => setShowAdd(false)}>
          <ModalField label="Company Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} placeholder="Acme Industries" />
          <ModalField label="Company Code" value={form.code} onChange={(v) => setForm({ ...form, code: v })} placeholder="ACM-005" />
          <ModalField label="Type" value={form.type} onChange={(v) => setForm({ ...form, type: v })} options={['Parent Company', 'Subsidiary', 'Joint Venture', 'Standalone']} />
          <ModalButtons onCancel={() => setShowAdd(false)} onSave={handleSave} saveLabel="Create Company" accent={accent} disabled={!form.name || !form.code} />
        </Modal>
      )}
    </div>
  );
}
