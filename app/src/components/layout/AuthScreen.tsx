import { useState, type CSSProperties, type FormEvent } from 'react';
import { Info, Clock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getThemeVars } from '../../lib/theme';

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
      {children}
    </label>
  );
}

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  fontSize: 14,
  background: 'var(--surface)',
  color: 'var(--text)',
  outline: 'none',
};

export function AuthScreen() {
  const authMode = useStore((s) => s.authMode);
  const authEmail = useStore((s) => s.authEmail);
  const authPassword = useStore((s) => s.authPassword);
  const authError = useStore((s) => s.authError);
  const dark = useStore((s) => s.dark);
  const accent = useStore((s) => s.accent);
  const setAuthMode = useStore((s) => s.setAuthMode);
  const setAuthField = useStore((s) => s.setAuthField);
  const setAuthError = useStore((s) => s.setAuthError);
  const setAuth = useStore((s) => s.setAuth);

  const [fullName, setFullName] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const isSignup = authMode === 'signup';
  const themeVars = getThemeVars(accent, dark) as CSSProperties;

  const [loading, setLoading] = useState(false);
  const [pendingMessage, setPendingMessage] = useState('');

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!authEmail || !authPassword) {
      setAuthError('Please enter both email and password.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('Password must be at least 6 characters.');
      return;
    }
    if (isSignup && authPassword !== confirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }
    setAuthError('');
    setLoading(true);
    try {
      const { api, setToken } = await import('../../lib/api');
      if (isSignup) {
        const res = await api.signup(authEmail, authPassword, fullName || undefined);
        if (res.pending) {
          setPendingMessage(res.message || 'Your account is pending admin approval.');
          return;
        }
        setToken(res.token);
        useStore.setState({ currentUserName: res.user?.fullName || fullName || '' });
        setAuth(true);
        useStore.setState({ onboardingComplete: false, onboardingStep: 0 });
      } else {
        const res = await api.login(authEmail, authPassword);
        setToken(res.token);
        useStore.setState({ currentUserName: res.user?.fullName || '' });
        setAuth(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Authentication failed';
      setAuthError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        ...themeVars,
        minHeight: '100vh',
        width: '100%',
        background: 'var(--bg)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'auto',
        padding: '40px 0',
      }}
    >
      <div style={{ maxWidth: 400, width: '100%', padding: 20 }}>
        {/* Brand block */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <img src="/icon.png" alt="DockForm" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 12 }} />
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, color: 'var(--text)' }}>DockForm</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>No-Code Forms & Checklists. Built for Industry.</div>
        </div>

        {/* Card */}
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 14,
            padding: '32px 28px',
            boxShadow: dark ? undefined : '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)',
          }}
        >
          {pendingMessage ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <Clock size={40} color={accent} style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Account Pending</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>{pendingMessage}</div>
              <button
                type="button"
                onClick={() => { setPendingMessage(''); setAuthMode('login'); }}
                style={{ background: accent, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
              >
                Back to Sign In
              </button>
            </div>
          ) : (<>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>
            {isSignup ? 'Create your account' : 'Welcome back'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>
            {isSignup ? 'Get started with DockForm in seconds.' : 'Sign in to continue to your workspace.'}
          </div>

          {authError && (
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                background: dark ? '#3F1D1D' : '#FEF2F2',
                border: `1px solid ${dark ? '#7F1D1D' : '#FECACA'}`,
                borderRadius: 8,
                padding: '10px 12px',
                marginBottom: 16,
              }}
            >
              <Info size={14} color="#EF4444" style={{ marginTop: 1, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#EF4444' }}>{authError}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {isSignup && (
                <div>
                  <Label>Full Name</Label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jane Doe"
                    style={inputStyle}
                  />
                </div>
              )}
              <div>
                <Label>Work Email</Label>
                <input
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthField('authEmail', e.target.value)}
                  placeholder="you@company.com"
                  style={inputStyle}
                />
              </div>
              <div>
                <Label>Password</Label>
                <input
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthField('authPassword', e.target.value)}
                  placeholder="••••••••"
                  style={inputStyle}
                />
              </div>
              {isSignup && (
                <div>
                  <Label>Confirm Password</Label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    style={inputStyle}
                  />
                </div>
              )}
            </div>

            {!isSignup && (
              <div style={{ textAlign: 'right', marginTop: 10, marginBottom: 18 }}>
                <a href="#" style={{ fontSize: 12, color: accent, textDecoration: 'none' }}>
                  Forgot password?
                </a>
              </div>
            )}
            {isSignup && <div style={{ marginTop: 20 }} />}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: accent,
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 8,
                padding: '11px 0',
                fontWeight: 600,
                fontSize: 14,
                cursor: loading ? 'default' : 'pointer',
                opacity: loading ? 0.7 : 1,
              }}
            >
              {loading ? 'Please wait…' : isSignup ? 'Create Account' : 'Sign In'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 20, fontSize: 13, color: 'var(--muted)' }}>
            {isSignup ? 'Already have an account? ' : "Don't have an account? "}
            <button
              type="button"
              onClick={() => setAuthMode(isSignup ? 'login' : 'signup')}
              style={{
                border: 'none',
                background: 'transparent',
                color: accent,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                padding: 0,
              }}
            >
              {isSignup ? 'Sign in' : 'Sign up'}
            </button>
          </div>
          </>)}
        </div>
      </div>
    </div>
  );
}
