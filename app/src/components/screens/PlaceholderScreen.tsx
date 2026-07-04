import { Factory } from 'lucide-react';
import { useStore } from '../../store/useStore';

export default function PlaceholderScreen({ title }: { title: string }) {
  const setNav = useStore((s) => s.setNav);

  return (
    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, height: '100%', minHeight: 400 }}>
      <Factory size={48} color="var(--muted)" />
      <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)', marginTop: 10 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)' }}>This module is coming in the next phase</div>
      <button
        onClick={() => setNav('forms')}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', marginTop: 4,
          background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
        }}
      >
        Go to Forms
      </button>
    </div>
  );
}
