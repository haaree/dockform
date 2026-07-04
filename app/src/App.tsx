import { useEffect, type CSSProperties } from 'react';
import { Menu } from 'lucide-react';
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
        height: '100vh',
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
    </div>
  );
}

export default App;
