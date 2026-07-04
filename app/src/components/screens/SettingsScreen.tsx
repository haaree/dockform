import { useStore } from '../../store/useStore';
import { ACCENT_PRESETS } from '../../lib/theme';

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: 20,
      }}
    >
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
        {description && (
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3 }}>{description}</div>
        )}
      </div>
      {children}
    </div>
  );
}

function PrefRow({
  label, defaultValue, options, last,
}: {
  label: string;
  defaultValue: string;
  options: string[];
  last?: boolean;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 0',
        borderBottom: last ? 'none' : '1px solid var(--border)',
        gap: 16,
      }}
    >
      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{label}</span>
      <select
        defaultValue={defaultValue}
        style={{
          background: 'var(--surface2)',
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '7px 10px',
          fontSize: 13,
          color: 'var(--text)',
          outline: 'none',
          minWidth: 160,
        }}
      >
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export default function SettingsScreen() {
  const accent = useStore((s) => s.accent);
  const dark = useStore((s) => s.dark);
  const setAccent = useStore((s) => s.setAccent);
  const toggleDark = useStore((s) => s.toggleDark);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontSize: 21, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)' }}>Settings</h1>
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>
          Manage your platform preferences and appearance.
        </p>
      </div>

      <div style={{ maxWidth: 640, display: 'flex', flexDirection: 'column', gap: 20, width: '100%' }}>
        <Card title="Accent Color" description="Choose the primary accent color used across the platform.">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
            {ACCENT_PRESETS.map((preset) => {
              const selected = preset.color.toLowerCase() === accent.toLowerCase();
              return (
                <button
                  key={preset.color}
                  onClick={() => setAccent(preset.color)}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 8,
                    background: selected ? `${preset.color}1A` : 'transparent',
                    border: selected ? `2px solid ${preset.color}` : '2px solid transparent',
                    borderRadius: 10,
                    padding: '12px 6px',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: '50%',
                      background: preset.color,
                      display: 'block',
                    }}
                  />
                  <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--text)', textAlign: 'center' }}>
                    {preset.name}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        <Card title="Dark Mode">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>Enable dark mode</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
                Switch the interface to a darker color scheme.
              </div>
            </div>
            <button
              onClick={toggleDark}
              aria-pressed={dark}
              style={{
                position: 'relative',
                width: 42,
                height: 23,
                borderRadius: 999,
                border: 'none',
                background: dark ? accent : 'var(--border)',
                cursor: 'pointer',
                flexShrink: 0,
                transition: 'background 0.2s ease',
              }}
            >
              <span
                style={{
                  position: 'absolute',
                  top: 2,
                  left: 2,
                  width: 19,
                  height: 19,
                  borderRadius: '50%',
                  background: '#fff',
                  transform: dark ? 'translateX(19px)' : 'translateX(0)',
                  transition: 'transform 0.2s ease',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
                }}
              />
            </button>
          </div>
        </Card>

        <Card title="Platform Preferences" description="Configure regional and formatting defaults.">
          <div>
            <PrefRow label="Language" defaultValue="English (US)" options={['English (US)', 'English (UK)', 'Hindi', 'Tamil', 'Spanish', 'French']} />
            <PrefRow label="Timezone" defaultValue="Asia/Kolkata (IST)" options={['Asia/Kolkata (IST)', 'UTC', 'America/New_York (ET)', 'Europe/London (GMT)', 'Asia/Singapore (SGT)']} />
            <PrefRow label="Date Format" defaultValue="DD/MM/YYYY" options={['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']} />
            <PrefRow label="Number Format" defaultValue="1,234.56" options={['1,234.56', '1.234,56', '1 234.56']} last />
          </div>
        </Card>
      </div>
    </div>
  );
}
