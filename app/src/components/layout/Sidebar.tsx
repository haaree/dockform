import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  PanelLeft, Search, LayoutDashboard, FileText, BookOpen, CheckCircle,
  Upload, Users, Building2, Factory, Layers, UsersRound, Shield, Key,
  Settings, HelpCircle, ArrowLeft, ChevronDown, UserCheck,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getThemeVars, legibleAccent } from '../../lib/theme';

interface NavItemDef {
  key: string;
  label: string;
  icon: React.ComponentType<{ size?: number | string }>;
}

const PLATFORM: NavItemDef[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'forms', label: 'Forms', icon: FileText },
  { key: 'packs', label: 'Templates', icon: BookOpen },
  { key: 'responses', label: 'Responses', icon: CheckCircle },
  { key: 'reports', label: 'Reports', icon: Upload },
  { key: 'users', label: 'Users', icon: Users },
  { key: 'companies', label: 'Companies', icon: Building2 },
];

const STRUCTURE: NavItemDef[] = [
  { key: 'plants', label: 'Plants', icon: Factory },
  { key: 'departments', label: 'Departments', icon: Layers },
  { key: 'teams', label: 'Teams', icon: UsersRound },
  { key: 'roles', label: 'Roles', icon: Shield },
  { key: 'permissions', label: 'Permissions', icon: Key },
];

const SYSTEM: NavItemDef[] = [
  { key: 'accounts', label: 'Accounts', icon: UserCheck },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'help', label: 'Help', icon: HelpCircle },
];

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        fontSize: 9.5,
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: 0.9,
        color: 'var(--muted)',
        padding: '14px 12px 6px',
      }}
    >
      {children}
    </div>
  );
}

export function Sidebar() {
  const nav = useStore((s) => s.nav);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const dark = useStore((s) => s.dark);
  const accent = useStore((s) => s.accent);
  const winWidth = useStore((s) => s.winWidth);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const setNav = useStore((s) => s.setNav);
  const logout = useStore((s) => s.logout);
  const isDockformAdmin = useStore((s) => s.isDockformAdmin);
  const companies = useStore((s) => s.companies);
  const activeCompanyId = useStore((s) => s.activeCompanyId);
  const setActiveCompany = useStore((s) => s.setActiveCompany);

  const [search, setSearch] = useState('');
  const [showCompanyPicker, setShowCompanyPicker] = useState(false);
  const activeCompany = companies.find(c => c.id === activeCompanyId);

  const isMobile = winWidth < 720;
  const collapsed = !isMobile && !sidebarOpen;
  const accentText = legibleAccent(accent, dark);

  if (isMobile && !sidebarOpen) return null;

  const width = collapsed ? 54 : 220;

  const themeVars = getThemeVars(accent, dark) as CSSProperties;

  const renderSection = (label: string, items: NavItemDef[]) => (
    <div>
      {!collapsed && <SectionLabel>{label}</SectionLabel>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, padding: '0 8px' }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = nav === item.key;
          return (
            <button
              key={item.key}
              type="button"
              title={collapsed ? item.label : undefined}
              onClick={() => {
                setNav(item.key);
                if (isMobile) toggleSidebar();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                justifyContent: collapsed ? 'center' : 'flex-start',
                width: '100%',
                padding: collapsed ? '9px 0' : '9px 10px',
                borderRadius: 7,
                border: 'none',
                background: active ? `${accent}1A` : 'transparent',
                color: active ? accentText : 'var(--text)',
                fontSize: 13,
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              <Icon size={16} />
              {!collapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <>
      {isMobile && sidebarOpen && (
        <div
          onClick={toggleSidebar}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,.35)',
            zIndex: 49,
          }}
        />
      )}
      <div
        style={{
          ...themeVars,
          width,
          minWidth: width,
          height: '100%',
          background: 'var(--surface)',
          borderRight: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.2s ease',
          position: isMobile ? 'fixed' : 'relative',
          top: 0,
          left: 0,
          zIndex: isMobile ? 50 : 'auto',
          boxShadow: isMobile ? '0 0 24px rgba(0,0,0,.25)' : undefined,
          overflow: 'hidden',
        }}
      >
        {/* Brand block */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: collapsed ? '14px 0' : '14px 12px',
            justifyContent: collapsed ? 'center' : 'space-between',
            borderBottom: '1px solid var(--border)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
            <img src="/favicon.png" alt="DockForm" style={{ width: 28, height: 28, borderRadius: 8, flexShrink: 0 }} />
            {!collapsed && (
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                DockForm
              </span>
            )}
          </div>
          {!collapsed && (
            <button
              type="button"
              onClick={toggleSidebar}
              title="Collapse sidebar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
                flexShrink: 0,
              }}
            >
              <PanelLeft size={16} />
            </button>
          )}
        </div>

        {collapsed && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
            <button
              type="button"
              onClick={toggleSidebar}
              title="Expand sidebar"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                background: 'transparent',
                color: 'var(--muted)',
                cursor: 'pointer',
                padding: 4,
                borderRadius: 6,
              }}
            >
              <PanelLeft size={16} />
            </button>
          </div>
        )}

        {/* Company label for regular users */}
        {!collapsed && !isDockformAdmin && activeCompany && (
          <div style={{ padding: '8px 12px 0' }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px',
              borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)',
            }}>
              <Building2 size={14} color={accent} />
              <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeCompany.name}
              </span>
            </div>
          </div>
        )}

        {/* Company switcher — DockForm admin only */}
        {!collapsed && isDockformAdmin && (
          <div style={{ padding: '8px 12px 0', position: 'relative' }}>
            <button
              type="button"
              onClick={() => setShowCompanyPicker(!showCompanyPicker)}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 8, border: '1px solid var(--border)',
                background: 'var(--surface2)', cursor: 'pointer', color: 'var(--text)',
              }}
            >
              <Building2 size={14} color={accent} />
              <span style={{ flex: 1, fontSize: 12, fontWeight: 600, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {activeCompany?.name || 'All Companies'}
              </span>
              <ChevronDown size={12} color="var(--muted)" />
            </button>
            {showCompanyPicker && (
              <div style={{
                position: 'absolute', left: 12, right: 12, top: 44, background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.18)',
                zIndex: 100, overflow: 'hidden',
              }}>
                <button
                  onClick={() => { setActiveCompany(null); setShowCompanyPicker(false); }}
                  style={{
                    width: '100%', padding: '9px 12px', background: activeCompanyId === null ? `${accent}15` : 'none',
                    border: 'none', fontSize: 12, fontWeight: activeCompanyId === null ? 700 : 500,
                    color: activeCompanyId === null ? accent : 'var(--text)', cursor: 'pointer', textAlign: 'left',
                    borderBottom: '1px solid var(--border)',
                  }}
                >
                  All Companies
                </button>
                {companies.filter(c => c.status === 'active').map(c => (
                  <button key={c.id}
                    onClick={() => { setActiveCompany(c.id); setShowCompanyPicker(false); }}
                    style={{
                      width: '100%', padding: '9px 12px', background: activeCompanyId === c.id ? `${accent}15` : 'none',
                      border: 'none', borderBottom: '1px solid var(--border)', fontSize: 12,
                      fontWeight: activeCompanyId === c.id ? 700 : 500,
                      color: activeCompanyId === c.id ? accent : 'var(--text)', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Search box */}
        {!collapsed && (
          <div style={{ padding: '10px 12px' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                background: 'var(--surface2)',
                border: '1px solid var(--border)',
                borderRadius: 8,
                padding: '6px 8px',
              }}
            >
              <Search size={14} color="var(--muted)" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search"
                style={{
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  fontSize: 12.5,
                  color: 'var(--text)',
                  width: '100%',
                }}
              />
            </div>
          </div>
        )}

        {/* Nav sections */}
        <div style={{ flex: 1, overflowY: 'auto', paddingBottom: 8 }}>
          {renderSection('Platform', PLATFORM)}
          {renderSection('Structure', STRUCTURE)}
          {renderSection('System', isDockformAdmin ? SYSTEM : SYSTEM.filter(s => s.key !== 'accounts'))}
        </div>

        {/* User profile footer */}
        <div
          style={{
            borderTop: '1px solid var(--border)',
            padding: collapsed ? '10px 0' : '10px 12px',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            justifyContent: collapsed ? 'center' : 'flex-start',
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: '50%',
              background: accent,
              color: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700,
              flexShrink: 0,
            }}
          >
            SC
          </div>
          {!collapsed && (
            <>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: 'var(--text)',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                  }}
                >
                  Sarah Chen
                </div>
                <div style={{ fontSize: 10, color: 'var(--muted)' }}>Administrator</div>
              </div>
              <button
                type="button"
                title="Settings"
                onClick={() => setNav('settings')}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                }}
              >
                <Settings size={14} />
              </button>
              <button
                type="button"
                title="Sign out"
                onClick={logout}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--muted)',
                  cursor: 'pointer',
                  padding: 4,
                  borderRadius: 6,
                }}
              >
                <ArrowLeft size={14} />
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}
