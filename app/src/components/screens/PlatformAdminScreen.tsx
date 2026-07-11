import { useState, useEffect, useCallback } from 'react';
import { Search, CheckCircle2, Ban, RotateCcw } from 'lucide-react';
import { StatusBadge } from '../ui/StatusBadge';
import { api } from '../../lib/api';

interface PlatformCompany {
  id: string;
  name: string;
  code: string;
  type: string;
  plants: number;
  employees: number;
  status: string;
}

export default function PlatformAdminScreen() {
  const [companies, setCompanies] = useState<PlatformCompany[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchCompanies = useCallback(() => {
    api.getCompanies().then((data) => { setCompanies(data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  const filtered = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase()) || c.code.toLowerCase().includes(search.toLowerCase())
  );

  const setStatus = async (id: string, status: string) => {
    await api.updateCompanyStatus(id, status);
    fetchCompanies();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '24px 32px', flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: 24, fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text)' }}>Companies</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
            {companies.length} {companies.length === 1 ? 'company' : 'companies'} on the platform
          </p>
        </div>
        <div style={{ position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search companies…"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px 8px 30px', fontSize: 13, color: 'var(--text)', width: 240, outline: 'none' }}
          />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: '24px 32px' }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Company', 'Code', 'Plants', 'Users', 'Status', 'Actions'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--muted)', padding: '12px 20px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => (
                  <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 20px', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.name}</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted)' }}>{c.code}</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted)' }}>{c.plants}</td>
                    <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted)' }}>{c.employees}</td>
                    <td style={{ padding: '12px 20px' }}><StatusBadge status={c.status} /></td>
                    <td style={{ padding: '12px 20px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {c.status === 'pending' && (
                          <>
                            <button onClick={() => setStatus(c.id, 'active')}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#DCFCE7', border: '1px solid #BBF7D0', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#15803D', cursor: 'pointer' }}>
                              <CheckCircle2 size={13} /> Approve
                            </button>
                            <button onClick={() => setStatus(c.id, 'suspended')}
                              style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#EF4444', cursor: 'pointer' }}>
                              <Ban size={13} /> Reject
                            </button>
                          </>
                        )}
                        {c.status === 'active' && (
                          <button onClick={() => setStatus(c.id, 'suspended')}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                            <Ban size={13} /> Suspend
                          </button>
                        )}
                        {c.status === 'suspended' && (
                          <button onClick={() => setStatus(c.id, 'active')}
                            style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                            <RotateCcw size={13} /> Reactivate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && filtered.length === 0 && (
                  <tr><td colSpan={6} style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>No companies found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
