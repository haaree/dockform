import { X } from 'lucide-react';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
}

export function Modal({ title, onClose, children, width = 420 }: ModalProps) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 16 }}
    >
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 24, width, maxWidth: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>{title}</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 4, borderRadius: 4 }}><X size={18} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  type?: string;
  options?: string[];
}

export function ModalField({ label, value, onChange, placeholder, type, options }: FieldProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={{ fontSize: 13, fontWeight: 500, color: 'var(--muted)', marginBottom: 6, display: 'block' }}>{label}</label>
      {options ? (
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}
        >
          <option value="">Select…</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type || 'text'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          style={{ width: '100%', padding: '9px 12px', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}
        />
      )}
    </div>
  );
}

interface ButtonRowProps {
  onCancel: () => void;
  onSave: () => void;
  saveLabel?: string;
  accent: string;
  disabled?: boolean;
}

export function ModalButtons({ onCancel, onSave, saveLabel = 'Save', accent, disabled }: ButtonRowProps) {
  return (
    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 20 }}>
      <button onClick={onCancel} style={{ padding: '8px 16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
      <button onClick={onSave} disabled={disabled} style={{ padding: '8px 16px', background: disabled ? 'var(--border)' : 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.6 : 1 }}>{saveLabel}</button>
    </div>
  );
}
