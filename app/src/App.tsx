import { useState, useEffect, type CSSProperties } from 'react';
import { Menu, Search, Check, Users } from 'lucide-react';
import { useStore } from './store/useStore';
import { getThemeVars } from './lib/theme';
import { Sidebar } from './components/layout/Sidebar';
import { AuthScreen } from './components/layout/AuthScreen';
import Dashboard from './components/screens/Dashboard';
import FormsScreen from './components/screens/FormsScreen';
import FormBuilder from './components/screens/FormBuilder';
import FormFiller from './components/screens/FormFiller';
import FormResponses from './components/screens/FormResponses';
import TemplatesScreen from './components/screens/TemplatesScreen';
import ResponsesScreen from './components/screens/ResponsesScreen';
import ReportsScreen from './components/screens/ReportsScreen';
import UsersScreen from './components/screens/UsersScreen';
import CompaniesScreen from './components/screens/CompaniesScreen';
import PlantsScreen from './components/screens/PlantsScreen';
import DepartmentsScreen from './components/screens/DepartmentsScreen';
import TeamsScreen from './components/screens/TeamsScreen';
import RolesScreen from './components/screens/RolesScreen';
import PermissionsScreen from './components/screens/PermissionsScreen';
import SettingsScreen from './components/screens/SettingsScreen';
import PlaceholderScreen from './components/screens/PlaceholderScreen';

function SaveTemplateModal() {
  const show = useStore((s) => s.showSaveTemplateModal);
  const name = useStore((s) => s.saveTemplateName);
  const setShow = useStore((s) => s.setShowSaveTemplateModal);
  const setName = useStore((s) => s.setSaveTemplateName);
  const fields = useStore((s) => s.fields);
  const currentFormName = useStore((s) => s.currentFormName);
  const saveAsTemplate = useStore((s) => s.saveAsTemplate);

  if (!show) return null;

  const handleSave = () => {
    if (!name.trim() || fields.length === 0) return;
    saveAsTemplate({
      id: 'custom_' + Math.random().toString(36).slice(2, 8),
      name: name.trim(),
      description: `Custom template created from "${currentFormName}"`,
      domain: 'Custom', tag: 'Custom Template', color: '#2563EB',
      chips: ['Custom'],
      fields: fields.map(({ id: _, ...rest }) => rest),
      isCustom: true,
    });
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}
      onClick={() => setShow(false)}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 380, maxWidth: '90%' }}>
        <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Save as Template</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Save the current form as a reusable template in your library.</div>
        <label style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.6px', marginBottom: 4, display: 'block' }}>Template Name</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Fire Safety Audit Template"
          style={{ width: '100%', padding: '8px 11px', border: '1px solid var(--border)', borderRadius: 7, fontSize: 13, color: 'var(--text)', background: 'var(--bg)', outline: 'none', marginBottom: 14 }}
        />
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => setShow(false)} style={{ padding: '7px 14px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} style={{ padding: '7px 14px', background: 'var(--accent)', color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Save Template</button>
        </div>
      </div>
    </div>
  );
}

function ScreenSwitch() {
  const nav = useStore((s) => s.nav);

  switch (nav) {
    case 'dashboard': return <Dashboard />;
    case 'forms': return <FormsScreen />;
    case 'builder': return <FormBuilder />;
    case 'fill': return <FormFiller />;
    case 'form-responses': return <FormResponses />;
    case 'packs': return <TemplatesScreen />;
    case 'responses': return <ResponsesScreen />;
    case 'reports': return <ReportsScreen />;
    case 'users': return <UsersScreen />;
    case 'companies': return <CompaniesScreen />;
    case 'plants': return <PlantsScreen />;
    case 'departments': return <DepartmentsScreen />;
    case 'teams': return <TeamsScreen />;
    case 'roles': return <RolesScreen />;
    case 'permissions': return <PermissionsScreen />;
    case 'settings': return <SettingsScreen />;
    case 'help': return <PlaceholderScreen title="Help Center" />;
    default: return <Dashboard />;
  }
}

function AssignUsersModal() {
  const show = useStore((s) => s.showAssignModal);
  const users = useStore((s) => s.users);
  const selectedIds = useStore((s) => s.assignModalUserIds);
  const toggleAssignUser = useStore((s) => s.toggleAssignUser);
  const setShowAssignModal = useStore((s) => s.setShowAssignModal);
  const setAssignModalUserIds = useStore((s) => s.setAssignModalUserIds);
  const publishForm = useStore((s) => s.publishForm);
  const accent = useStore((s) => s.accent);
  const [search, setSearch] = useState('');

  if (!show) return null;

  const activeUsers = users.filter(u => u.status === 'active');
  const filtered = activeUsers.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handlePublish = () => {
    publishForm(selectedIds);
  };

  const handleClose = () => {
    setShowAssignModal(false);
    setAssignModalUserIds([]);
    setSearch('');
  };

  const selectAll = () => {
    if (selectedIds.length === activeUsers.length) {
      setAssignModalUserIds([]);
    } else {
      setAssignModalUserIds(activeUsers.map(u => u.id));
    }
  };

  return (
    <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 440, maxWidth: '92%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Users size={18} color={accent} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Assign Users & Publish</div>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Select which users can access and fill out this form. Only assigned users will see it.</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', marginBottom: 12 }}>
          <Search size={13} color="var(--muted)" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
            style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: '100%', outline: 'none' }} />
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{selectedIds.length} user{selectedIds.length !== 1 ? 's' : ''} selected</span>
          <button onClick={selectAll} style={{ fontSize: 11, color: accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
            {selectedIds.length === activeUsers.length ? 'Deselect All' : 'Select All'}
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8 }}>
          {filtered.map(user => {
            const selected = selectedIds.includes(user.id);
            return (
              <button key={user.id} onClick={() => toggleAssignUser(user.id)}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: selected ? `${accent}10` : 'transparent', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                <div style={{ width: 20, height: 20, borderRadius: 5, border: selected ? 'none' : '2px solid var(--border)', background: selected ? accent : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {selected && <Check size={12} color="#fff" strokeWidth={3} />}
                </div>
                <div style={{ width: 30, height: 30, borderRadius: '50%', background: user.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, flexShrink: 0 }}>
                  {user.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{user.name}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{user.email} · {user.role} · {user.department}</div>
                </div>
              </button>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ padding: 20, textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>No users found</div>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={handleClose} style={{ padding: '8px 16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handlePublish} style={{ padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {selectedIds.length > 0 ? `Publish & Assign (${selectedIds.length})` : 'Publish to All'}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const isAuthed = useStore((s) => s.isAuthed);
  const accent = useStore((s) => s.accent);
  const dark = useStore((s) => s.dark);
  const winWidth = useStore((s) => s.winWidth);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setWinWidth = useStore((s) => s.setWinWidth);
  const toggleSidebar = useStore((s) => s.toggleSidebar);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setWinWidth]);

  const themeVars = getThemeVars(accent, dark) as CSSProperties;
  const isMobile = winWidth < 720;

  if (!isAuthed) {
    return <AuthScreen />;
  }

  return (
    <div
      style={{
        ...themeVars,
        display: 'flex',
        height: '100dvh',
        fontFamily: "'Inter', system-ui, sans-serif",
        background: 'var(--bg)',
        color: 'var(--text)',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      <Sidebar />

      {isMobile && !sidebarOpen && (
        <button
          onClick={toggleSidebar}
          style={{
            position: 'absolute', top: 14, left: 14, zIndex: 20,
            width: 34, height: 34, borderRadius: 8,
            background: 'var(--surface)', border: '1px solid var(--border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--text)',
          }}
        >
          <Menu size={18} />
        </button>
      )}

      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative', padding: isMobile ? '56px 12px 12px' : 0 }}>
        <ScreenSwitch />
      </div>

      <SaveTemplateModal />
      <AssignUsersModal />
    </div>
  );
}

export default App;
