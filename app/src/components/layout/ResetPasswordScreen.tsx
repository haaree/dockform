import { useState, type CSSProperties, type FormEvent } from 'react';
import { Info, CheckCircle2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getThemeVars } from '../../lib/theme';
import { api } from '../../lib/api';
import { PasswordInput } from '../ui/PasswordInput';

export function ResetPasswordScreen({ token }: { token: string }) {
  const dark = useStore((s) => s.dark);
  const accent = useStore((s) => s.accent);
  const themeVars = getThemeVars(accent, dark) as CSSProperties;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 6) { setError('Password must be at least 6 characters.'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match.'); return; }
    setError('');
    setLoading(true);
    try {
      await api.resetPassword(token, password);
      setDone(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  const goToLogin = () => {
    window.history.replaceState({}, '', window.location.pathname);
    window.location.reload();
  };

  return (
    <div style={{ ...themeVars, minHeight: '100vh', width: '100%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'auto', padding: '40px 0' }}>
      <div style={{ maxWidth: 400, width: '100%', padding: 20 }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 28 }}>
          <img src="/icon.png" alt="DockForm" style={{ width: 56, height: 56, borderRadius: 14, marginBottom: 12 }} />
          <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: -0.4, color: 'var(--text)' }}>DockForm</div>
        </div>

        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '32px 28px', boxShadow: dark ? undefined : '0 1px 3px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.04)' }}>
          {done ? (
            <div style={{ textAlign: 'center', padding: '12px 0' }}>
              <CheckCircle2 size={40} color="#15803D" style={{ marginBottom: 16 }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Password Reset</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>Your password has been updated. You can now sign in.</div>
              <button onClick={goToLogin} style={{ background: accent, color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Back to Sign In
              </button>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Reset your password</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 24 }}>Choose a new password for your account.</div>

              {error && (
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, background: dark ? '#3F1D1D' : '#FEF2F2', border: `1px solid ${dark ? '#7F1D1D' : '#FECACA'}`, borderRadius: 8, padding: '10px 12px', marginBottom: 16 }}>
                  <Info size={14} color="#EF4444" style={{ marginTop: 1, flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#EF4444' }}>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>New Password</label>
                    <PasswordInput value={password} onChange={setPassword} />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>Confirm Password</label>
                    <PasswordInput value={confirmPassword} onChange={setConfirmPassword} />
                  </div>
                </div>

                <button type="submit" disabled={loading} style={{ width: '100%', marginTop: 20, background: accent, color: '#FFFFFF', border: 'none', borderRadius: 8, padding: '11px 0', fontWeight: 600, fontSize: 14, cursor: loading ? 'default' : 'pointer', opacity: loading ? 0.7 : 1 }}>
                  {loading ? 'Please wait…' : 'Reset Password'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
