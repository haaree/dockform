import { useState, useEffect, type CSSProperties } from 'react';
import { Menu, Search, Check, Users, CalendarClock } from 'lucide-react';
import type { FormSchedule } from './store/types';
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
import OnboardingWizard from './components/screens/OnboardingWizard';
import AccountsScreen from './components/screens/AccountsScreen';

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
    case 'accounts': return <AccountsScreen />;
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
  const [tab, setTab] = useState<'users' | 'schedule'>('users');
  const [frequency, setFrequency] = useState<FormSchedule['frequency']>('once');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDay, setDueDay] = useState(28);
  const [scheduleTime, setScheduleTime] = useState('09:00');

  if (!show) return null;

  const activeUsers = users.filter(u => u.status === 'active');
  const filtered = activeUsers.filter(u =>
    !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handlePublish = () => {
    const schedule: FormSchedule | undefined = frequency !== 'once' ? { frequency, startDate, dueDay, time: scheduleTime } : undefined;
    const formName = useStore.getState().currentFormName;
    publishForm(selectedIds, schedule);
    if (selectedIds.length > 0) {
      const state = useStore.getState();
      const allUsers = state.users;
      const currentForm = state.forms.find(f => f.name === formName);
      import('./lib/api').then(({ api }) => {
        selectedIds.forEach(uid => {
          const u = allUsers.find(usr => usr.id === uid);
          if (u) api.sendFormAssignedEmail(u.email, u.name, formName, 'DockForm Admin', currentForm?.id);
        });
      });
    }
  };

  const handleClose = () => {
    setShowAssignModal(false);
    setAssignModalUserIds([]);
    setSearch('');
    setTab('users');
    setFrequency('once');
  };

  const selectAll = () => {
    if (selectedIds.length === activeUsers.length) {
      setAssignModalUserIds([]);
    } else {
      setAssignModalUserIds(activeUsers.map(u => u.id));
    }
  };

  const freqLabel: Record<string, string> = { once: 'One-time', daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', yearly: 'Yearly' };
  const selectStyle: React.CSSProperties = { height: 34, borderRadius: 7, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, padding: '0 10px', width: '100%', outline: 'none' };
  const inputStyle = selectStyle;

  return (
    <div onClick={handleClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 480, maxWidth: '92%', maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <Users size={18} color={accent} />
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Publish Form</div>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 16, borderBottom: '1px solid var(--border)' }}>
          {(['users', 'schedule'] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '8px 0', background: 'none', border: 'none', borderBottom: tab === t ? `2px solid ${accent}` : '2px solid transparent', color: tab === t ? accent : 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
              {t === 'users' ? <><Users size={13} /> Assign Users</> : <><CalendarClock size={13} /> Schedule</>}
            </button>
          ))}
        </div>

        {tab === 'users' && (
          <>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>Select which users can access and fill out this form.</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', marginBottom: 10 }}>
              <Search size={13} color="var(--muted)" />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search users…"
                style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: '100%', outline: 'none' }} />
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{selectedIds.length} user{selectedIds.length !== 1 ? 's' : ''} selected</span>
              <button onClick={selectAll} style={{ fontSize: 11, color: accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                {selectedIds.length === activeUsers.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', marginBottom: 16, border: '1px solid var(--border)', borderRadius: 8, maxHeight: 260 }}>
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
          </>
        )}

        {tab === 'schedule' && (
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>Set up recurring schedules for audits, inspections, and compliance checks.</div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>Frequency</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                {(['once', 'daily', 'weekly', 'monthly', 'quarterly', 'yearly'] as const).map(f => (
                  <button key={f} onClick={() => setFrequency(f)}
                    style={{ padding: '8px 0', borderRadius: 7, border: frequency === f ? `2px solid ${accent}` : '1px solid var(--border)', background: frequency === f ? `${accent}10` : 'var(--bg)', color: frequency === f ? accent : 'var(--text)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                    {freqLabel[f]}
                  </button>
                ))}
              </div>
            </div>

            {frequency !== 'once' && (
              <>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>Start Date</label>
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} style={inputStyle} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>Email Reminder Time</label>
                    <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} style={inputStyle} />
                  </div>
                </div>

                {(frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') && (
                  <div style={{ marginBottom: 14 }}>
                    <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block' }}>Due by day of month</label>
                    <select value={dueDay} onChange={e => setDueDay(Number(e.target.value))} style={selectStyle}>
                      {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                        <option key={d} value={d}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'}</option>
                      ))}
                    </select>
                  </div>
                )}

                <div style={{ background: `${accent}08`, border: `1px solid ${accent}30`, borderRadius: 8, padding: 12, marginBottom: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, color: accent, marginBottom: 4 }}>Schedule Summary</div>
                  <div style={{ fontSize: 12, color: 'var(--text)' }}>
                    This form will be due <strong>{frequency}</strong> starting from <strong>{new Date(startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</strong>. Email reminder at <strong>{scheduleTime}</strong>
                    {(frequency === 'monthly' || frequency === 'quarterly' || frequency === 'yearly') && <>, due by the <strong>{dueDay}{dueDay === 1 ? 'st' : dueDay === 2 ? 'nd' : dueDay === 3 ? 'rd' : 'th'}</strong> of each period</>}.
                    {selectedIds.length > 0 && <> Assigned to <strong>{selectedIds.length}</strong> user{selectedIds.length !== 1 ? 's' : ''}.</>}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', flexShrink: 0 }}>
          <button onClick={handleClose} style={{ padding: '8px 16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handlePublish} style={{ padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            {frequency !== 'once'
              ? `Publish & Schedule${selectedIds.length > 0 ? ` (${selectedIds.length})` : ''}`
              : selectedIds.length > 0 ? `Publish & Assign (${selectedIds.length})` : 'Publish to All'}
          </button>
        </div>
      </div>
    </div>
  );
}

function App() {
  const isAuthed = useStore((s) => s.isAuthed);
  const onboardingComplete = useStore((s) => s.onboardingComplete);
  const accent = useStore((s) => s.accent);
  const dark = useStore((s) => s.dark);
  const winWidth = useStore((s) => s.winWidth);
  const sidebarOpen = useStore((s) => s.sidebarOpen);
  const setWinWidth = useStore((s) => s.setWinWidth);
  const toggleSidebar = useStore((s) => s.toggleSidebar);
  const isDockformAdmin = useStore((s) => s.isDockformAdmin);
  const currentUserEmail = useStore((s) => s.authEmail);
  const accounts = useStore((s) => s.accounts);
  const logout = useStore((s) => s.logout);

  const fillForm = useStore((s) => s.fillForm);

  useEffect(() => {
    const handleResize = () => setWinWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [setWinWidth]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('signup') === 'true' && !isAuthed) {
      useStore.setState({ authMode: 'signup' });
      window.history.replaceState({}, '', window.location.pathname);
    }
  }, [isAuthed]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fillId = params.get('fill');
    if (fillId && isAuthed && onboardingComplete) {
      const id = parseInt(fillId);
      if (!isNaN(id)) {
        const state = useStore.getState();
        const form = state.forms.find(f => f.id === id);
        if (form) {
          const isAdm = state.currentUserRole === 'Admin' || state.currentUserRole === 'admin';
          const hasAccess = isAdm || !form.assignedUserIds || form.assignedUserIds.length === 0 || (state.currentUserId && form.assignedUserIds.includes(state.currentUserId));
          if (hasAccess) fillForm(id);
        }
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, [isAuthed, onboardingComplete, fillForm]);

  const themeVars = getThemeVars(accent, dark) as CSSProperties;
  const isMobile = winWidth < 720;

  if (!isAuthed) {
    return <AuthScreen />;
  }

  if (!onboardingComplete) {
    return <OnboardingWizard />;
  }

  const pendingAccount = !isDockformAdmin && accounts.find(a => a.email === currentUserEmail && a.status === 'pending');

  if (pendingAccount) {
    return (
      <div style={{ ...themeVars, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Inter', system-ui, sans-serif", background: 'var(--bg)' }}>
        <div style={{ maxWidth: 440, width: '100%', padding: 20, textAlign: 'center' }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px', fontSize: 28 }}>⏳</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Account Pending Approval</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 24 }}>
            Thank you for signing up, <strong>{pendingAccount.name}</strong>! Your account is currently under review by the DockForm team. You'll receive an email at <strong>{pendingAccount.email}</strong> once your account is approved.
          </p>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16, marginBottom: 24, textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>Your Details</div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}><strong>Name:</strong> {pendingAccount.name}</div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}><strong>Email:</strong> {pendingAccount.email}</div>
            <div style={{ fontSize: 13, color: 'var(--text)', marginBottom: 6 }}><strong>Role:</strong> {pendingAccount.role}</div>
            <div style={{ fontSize: 13, color: 'var(--text)' }}><strong>Submitted:</strong> {pendingAccount.createdAt}</div>
          </div>
          <button onClick={logout} style={{ padding: '10px 24px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Sign Out
          </button>
        </div>
      </div>
    );
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
