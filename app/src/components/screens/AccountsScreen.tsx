import { useState } from 'react';
import { Search, CheckCircle, XCircle, Edit3, Building2, Factory, Users, Calendar } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../ui/StatusBadge';
import { Modal, ModalButtons } from '../ui/Modal';
import type { AccountSubscription } from '../../store/types';

export default function AccountsScreen() {
  const accounts = useStore((s) => s.accounts);
  const accent = useStore((s) => s.accent);
  const winWidth = useStore((s) => s.winWidth);
  const activateAccount = useStore((s) => s.activateAccount);
  const suspendAccount = useStore((s) => s.suspendAccount);
  const updateAccountSubscription = useStore((s) => s.updateAccountSubscription);

  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [sub, setSub] = useState<AccountSubscription>({
    maxCompanies: 1, maxPlantsPerCompany: 1, freeUsersPerPlant: 4,
    accountExpiry: '', plan: 'trial', multiCompany: false, multiPlant: false,
  });

  const isMobile = winWidth < 720;
  const pad = isMobile ? '16px' : '24px 32px';

  const filtered = accounts.filter(a => {
    const q = search.toLowerCase();
    return !q || a.name.toLowerCase().includes(q) || a.email.toLowerCase().includes(q) || a.role.toLowerCase().includes(q);
  });

  const openEdit = (acc: typeof accounts[0]) => {
    setSub({ ...acc.subscription });
    setEditId(acc.id);
  };

  const handleActivate = () => {
    if (editId === null) return;
    const acc = accounts.find(a => a.id === editId);
    activateAccount(editId, sub);
    setEditId(null);
    if (acc) {
      import('../../lib/api').then(({ api }) => {
        api.sendAccountApprovedEmail(acc.email, acc.name, sub.plan || 'trial');
      });
    }
  };

  const handleUpdate = () => {
    if (editId === null) return;
    updateAccountSubscription(editId, sub);
    setEditId(null);
  };

  const editAccount = accounts.find(a => a.id === editId);
  const isNewActivation = editAccount?.status === 'pending';

  const labelStyle = { display: 'block' as const, fontSize: 11, fontWeight: 700 as const, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 4 };
  const fieldInputStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid var(--border)', fontSize: 13,
    background: 'var(--surface)', color: 'var(--text)', outline: 'none',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: pad, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 18 : 21, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)' }}>Account Management</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{accounts.length} accounts · {accounts.filter(a => a.status === 'pending').length} pending approval</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}>
          <Search size={13} color="var(--muted)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search accounts…"
            style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: isMobile ? '100%' : 200, outline: 'none' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: pad }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 900, margin: '0 auto' }}>
          {filtered.map(acc => (
            <div key={acc.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap' }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: acc.status === 'pending' ? '#FEF3C7' : acc.status === 'active' ? '#DCFCE7' : '#FEE2E2', color: acc.status === 'pending' ? '#92400E' : acc.status === 'active' ? '#15803D' : '#DC2626', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                  {acc.name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2)}
                </div>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{acc.name}</span>
                    <StatusBadge status={acc.status} />
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>
                    {acc.email} · {acc.role} · {acc.phone || 'No phone'}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text)' }}>
                      <Building2 size={11} /> {acc.companiesUsed}/{acc.subscription.maxCompanies} companies
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text)' }}>
                      <Factory size={11} /> {acc.plantsUsed}/{acc.subscription.maxPlantsPerCompany} plants/co
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: 'var(--surface2)', color: 'var(--text)' }}>
                      <Users size={11} /> {acc.subscription.freeUsersPerPlant} users/plant
                    </span>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: acc.subscription.plan === 'trial' ? '#FEF3C7' : '#DCFCE7', color: acc.subscription.plan === 'trial' ? '#92400E' : '#15803D' }}>
                      {acc.subscription.plan}
                    </span>
                    {acc.subscription.accountExpiry && (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: new Date(acc.subscription.accountExpiry) < new Date() ? '#FEE2E2' : 'var(--surface2)', color: new Date(acc.subscription.accountExpiry) < new Date() ? '#DC2626' : 'var(--text)' }}>
                        <Calendar size={11} /> Expires {acc.subscription.accountExpiry}
                      </span>
                    )}
                    {acc.subscription.multiCompany && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#EFF6FF', color: '#2563EB' }}>Multi-Company</span>
                    )}
                    {acc.subscription.multiPlant && (
                      <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 8px', borderRadius: 6, background: '#F0FDF4', color: '#16A34A' }}>Multi-Plant</span>
                    )}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  {acc.status === 'pending' && (
                    <button onClick={() => openEdit(acc)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, border: 'none', background: accent, color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <CheckCircle size={13} /> Approve
                    </button>
                  )}
                  {acc.status === 'active' && (
                    <>
                      <button onClick={() => openEdit(acc)}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <Edit3 size={13} /> Edit Plan
                      </button>
                      <button onClick={() => { suspendAccount(acc.id); import('../../lib/api').then(({ api }) => { api.sendAccountSuspendedEmail(acc.email, acc.name); }); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: '#EF4444', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                        <XCircle size={13} /> Suspend
                      </button>
                    </>
                  )}
                  {acc.status === 'suspended' && (
                    <button onClick={() => openEdit(acc)}
                      style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '7px 14px', borderRadius: 7, border: 'none', background: '#16A34A', color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                      <CheckCircle size={13} /> Reactivate
                    </button>
                  )}
                </div>
              </div>
              <div style={{ padding: '0 20px 12px', fontSize: 11, color: 'var(--muted)' }}>
                Signed up: {acc.createdAt}
              </div>
            </div>
          ))}

          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)', fontSize: 14 }}>No accounts match your search.</div>
          )}
        </div>
      </div>

      {editId !== null && editAccount && (
        <Modal title={isNewActivation ? `Approve: ${editAccount.name}` : `Edit Plan: ${editAccount.name}`} onClose={() => setEditId(null)}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '10px 14px', background: 'var(--surface2)', borderRadius: 8, fontSize: 12, color: 'var(--muted)' }}>
              <strong style={{ color: 'var(--text)' }}>{editAccount.email}</strong> · {editAccount.role} · Signed up {editAccount.createdAt}
            </div>

            <div>
              <label style={labelStyle}>Plan</label>
              <select value={sub.plan} onChange={e => setSub({ ...sub, plan: e.target.value as AccountSubscription['plan'] })} style={{ ...fieldInputStyle, cursor: 'pointer' }}>
                <option value="trial">Trial</option>
                <option value="starter">Starter</option>
                <option value="professional">Professional</option>
                <option value="enterprise">Enterprise</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                <input type="checkbox" checked={sub.multiCompany} onChange={e => setSub({ ...sub, multiCompany: e.target.checked, maxCompanies: e.target.checked ? Math.max(sub.maxCompanies, 2) : 1 })} />
                Multi-Company
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
                <input type="checkbox" checked={sub.multiPlant} onChange={e => setSub({ ...sub, multiPlant: e.target.checked, maxPlantsPerCompany: e.target.checked ? Math.max(sub.maxPlantsPerCompany, 2) : 1 })} />
                Multi-Plant
              </label>
            </div>

            {sub.multiCompany && (
              <div>
                <label style={labelStyle}>Max Companies</label>
                <input type="number" min={1} max={100} value={sub.maxCompanies} onChange={e => setSub({ ...sub, maxCompanies: parseInt(e.target.value) || 1 })} style={fieldInputStyle} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Currently using: {editAccount.companiesUsed}</div>
              </div>
            )}

            {sub.multiPlant && (
              <div>
                <label style={labelStyle}>Max Plants per Company</label>
                <input type="number" min={1} max={50} value={sub.maxPlantsPerCompany} onChange={e => setSub({ ...sub, maxPlantsPerCompany: parseInt(e.target.value) || 1 })} style={fieldInputStyle} />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Currently using: {editAccount.plantsUsed}</div>
              </div>
            )}

            <div>
              <label style={labelStyle}>Free Users per Plant</label>
              <input type="number" min={1} max={50} value={sub.freeUsersPerPlant} onChange={e => setSub({ ...sub, freeUsersPerPlant: parseInt(e.target.value) || 4 })} style={fieldInputStyle} />
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Default: 4 free users per plant</div>
            </div>

            <div>
              <label style={labelStyle}>Account Expiry Date</label>
              <input type="date" value={sub.accountExpiry} onChange={e => setSub({ ...sub, accountExpiry: e.target.value })} style={fieldInputStyle} />
              {!sub.accountExpiry && <div style={{ fontSize: 11, color: '#D97706', marginTop: 3 }}>No expiry set — account will not expire</div>}
            </div>

            <div style={{ padding: '10px 14px', background: '#F0FDF4', borderRadius: 8, fontSize: 12, color: '#16A34A', fontWeight: 500 }}>
              Summary: {sub.plan} plan · {sub.maxCompanies} compan{sub.maxCompanies > 1 ? 'ies' : 'y'} · {sub.maxPlantsPerCompany} plant{sub.maxPlantsPerCompany > 1 ? 's' : ''}/co · {sub.freeUsersPerPlant} users/plant
              {sub.accountExpiry ? ` · Expires ${sub.accountExpiry}` : ' · No expiry'}
            </div>
          </div>

          <ModalButtons
            onCancel={() => setEditId(null)}
            onSave={isNewActivation ? handleActivate : handleUpdate}
            saveLabel={isNewActivation ? 'Approve & Activate' : 'Update Plan'}
            accent={accent}
          />
        </Modal>
      )}
    </div>
  );
}
