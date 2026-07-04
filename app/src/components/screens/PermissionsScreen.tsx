import { Check, X, Save } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function PermissionsScreen() {
  const roles = useStore((s) => s.roles);
  const selectedPermRole = useStore((s) => s.selectedPermRole);
  const permissionsByRole = useStore((s) => s.permissionsByRole);
  const permsDirty = useStore((s) => s.permsDirty);
  const setPermRole = useStore((s) => s.setPermRole);
  const togglePermission = useStore((s) => s.togglePermission);
  const savePermissions = useStore((s) => s.savePermissions);
  const accent = useStore((s) => s.accent);
  const dark = useStore((s) => s.dark);
  const winWidth = useStore((s) => s.winWidth);

  const perms = permissionsByRole[selectedPermRole] || [];
  const activeRoleName = roles.find((r) => r.permKey === selectedPermRole)?.name || '';
  const ghost = dark ? '#303036' : '#E4E4E7';
  const isMobile = winWidth < 720;
  const pad = isMobile ? '16px' : '24px 32px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: pad, flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: isMobile ? 18 : 21, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>Permissions</h1>
            <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>
              Select a role, then click any cell to grant or revoke that access
            </p>
          </div>
          <button
            onClick={savePermissions}
            disabled={!permsDirty}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '9px 20px', background: permsDirty ? accent : 'var(--border)',
              color: permsDirty ? '#fff' : 'var(--muted)', border: 'none', borderRadius: 8,
              fontSize: 13, fontWeight: 600, cursor: permsDirty ? 'pointer' : 'default',
              opacity: permsDirty ? 1 : 0.5,
            }}
          >
            <Save size={14} /> Save Changes
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
          {roles.map((r) => (
            <button
              key={r.permKey}
              onClick={() => setPermRole(r.permKey)}
              style={{
                padding: '7px 14px', fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: 'pointer',
                background: selectedPermRole === r.permKey ? accent : (dark ? '#1C1C1E' : '#FFFFFF'),
                color: selectedPermRole === r.permKey ? '#fff' : (dark ? '#9CA3AF' : '#6B7280'),
                border: `1px solid ${selectedPermRole === r.permKey ? accent : ghost}`,
              }}
            >
              {r.name}
            </button>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: isMobile ? '12px 16px' : '20px 32px' }}>
        <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 12, fontWeight: 500 }}>
          Editing permissions for <strong style={{ color: accent, fontWeight: 700 }}>{activeRoleName}</strong>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Module', 'View', 'Create', 'Edit', 'Delete'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 11, fontWeight: 700, color: 'var(--text)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {perms.map((row) => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '14px 16px', fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{row.module}</td>
                    {(['view', 'create', 'edit', 'delete'] as const).map((action) => (
                      <td key={action} style={{ padding: '14px 16px' }}>
                        <button
                          onClick={() => togglePermission(selectedPermRole, row.id, action)}
                          title={row[action] ? 'Click to revoke' : 'Click to grant'}
                          style={{
                            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                            width: 32, height: 32, borderRadius: 8, border: '2px solid', cursor: 'pointer', padding: 0,
                            background: row[action] ? `${accent}20` : (dark ? '#1C1C1E' : '#F9FAFB'),
                            borderColor: row[action] ? accent : (dark ? '#3F3F46' : '#D1D5DB'),
                            color: row[action] ? accent : (dark ? '#71717A' : '#9CA3AF'),
                          }}
                        >
                          {row[action] ? <Check size={16} strokeWidth={2.5} /> : <X size={16} strokeWidth={2} />}
                        </button>
                      </td>
                    ))}
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
