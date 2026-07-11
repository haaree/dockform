import { useEffect } from 'react';
import { FileText, Users, CheckCircle, Send } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { legibleAccent } from '../../lib/theme';
import { StatusBadge } from '../ui/StatusBadge';

function StatCard({
  label, value, change, icon, iconColor,
}: {
  label: string;
  value: string | number;
  change: string;
  icon: React.ReactNode;
  iconColor: string;
}) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: '22px 24px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--muted)' }}>{label}</span>
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 8,
            background: `${iconColor}12`,
            color: iconColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {icon}
        </div>
      </div>
      <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: '-1.5px', color: 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{change}</div>
    </div>
  );
}

export default function Dashboard() {
  const allForms = useStore((s) => s.forms);
  const allUsers = useStore((s) => s.users);
  const activeCompanyId = useStore((s) => s.activeCompanyId);
  const accent = useStore((s) => s.accent);
  const dark = useStore((s) => s.dark);
  const setNav = useStore((s) => s.setNav);
  const editForm = useStore((s) => s.editForm);
  const winWidth = useStore((s) => s.winWidth);
  const currentUserName = useStore((s) => s.currentUserName);
  const currentUserId = useStore((s) => s.currentUserId);
  const currentUserRole = useStore((s) => s.currentUserRole);
  const refreshForms = useStore((s) => s.refreshForms);

  useEffect(() => { refreshForms(); }, [refreshForms]);

  const isAdmin = currentUserRole === 'Admin' || currentUserRole === 'admin';
  const companyForms = activeCompanyId ? allForms.filter(f => !f.companyId || f.companyId === activeCompanyId) : allForms;
  const forms = isAdmin ? companyForms : companyForms.filter(f =>
    !f.assignedUserIds || f.assignedUserIds.length === 0 || (currentUserId && f.assignedUserIds.includes(currentUserId as string))
  );
  const users = activeCompanyId ? allUsers.filter(u => !u.companyId || u.companyId === activeCompanyId) : allUsers;
  const accentText = legibleAccent(accent, dark);
  const activeUsers = users.filter((u) => u.status === 'active').length;
  const totalResponses = forms.reduce((sum, f) => sum + f.responses, 0);
  const publishedForms = forms.filter((f) => f.status === 'published').length;

  const isMobile = winWidth < 720;
  const gridCols = isMobile ? 'repeat(2,1fr)' : winWidth < 1080 ? 'repeat(2,1fr)' : 'repeat(4,1fr)';
  const pad = isMobile ? '16px' : '32px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: `${isMobile ? 16 : 32}px ${pad} ${isMobile ? 12 : 20}px`, flexShrink: 0 }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text)' }}>Dashboard</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 6 }}>
          Welcome back, {currentUserName?.split(' ')[0] || 'there'} — here's your platform overview.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: isMobile ? 10 : 16, padding: `0 ${pad} ${isMobile ? 16 : 24}px`, flexShrink: 0 }}>
        <StatCard
          label="Total Forms"
          value={forms.length}
          change={`+${forms.length} created`}
          icon={<FileText size={16} />}
          iconColor={accentText}
        />
        <StatCard
          label="Active Users"
          value={activeUsers}
          change="All active today"
          icon={<Users size={16} />}
          iconColor="#059669"
        />
        <StatCard
          label="Total Responses"
          value={totalResponses}
          change="+12 this week"
          icon={<CheckCircle size={16} />}
          iconColor="#8B5CF6"
        />
        <StatCard
          label="Published"
          value={publishedForms}
          change={`of ${forms.length} forms`}
          icon={<Send size={16} />}
          iconColor="#F59E0B"
        />
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: `0 ${pad} ${pad}` }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 12,
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Recent Forms</span>
          <button
            onClick={() => setNav('forms')}
            style={{
              background: 'none',
              border: 'none',
              fontSize: 12.5,
              fontWeight: 600,
              color: accentText,
              cursor: 'pointer',
            }}
          >
            View all →
          </button>
        </div>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Category', 'Fields', 'Responses', 'Status', 'Updated', ''].map((h) => (
                  <th
                    key={h}
                    style={{
                      textAlign: 'left',
                      fontSize: 11,
                      fontWeight: 600,
                      color: 'var(--muted)',
                      textTransform: 'uppercase',
                      letterSpacing: '0.03em',
                      padding: '10px 20px',
                      borderBottom: '1px solid var(--border)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {forms.map((form) => (
                <tr key={form.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div
                        style={{
                          width: 30,
                          height: 30,
                          borderRadius: 8,
                          background: `${accentText}1A`,
                          color: accentText,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <FileText size={15} />
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{form.name}</span>
                    </div>
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted)' }}>{form.category}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted)' }}>{form.fields}</td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted)' }}>{form.responses}</td>
                  <td style={{ padding: '12px 20px' }}>
                    <StatusBadge status={form.status} />
                  </td>
                  <td style={{ padding: '12px 20px', fontSize: 13, color: 'var(--muted)' }}>{form.updated}</td>
                  <td style={{ padding: '12px 20px', textAlign: 'right' }}>
                    <button
                      onClick={() => editForm(form.id)}
                      style={{
                        background: 'var(--surface2)',
                        border: '1px solid var(--border)',
                        borderRadius: 6,
                        padding: '5px 12px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: 'var(--text)',
                        cursor: 'pointer',
                      }}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </div>
    </div>
  );
}
