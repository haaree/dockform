import { useState, type CSSProperties } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const baseInputStyle: CSSProperties = {
  width: '100%',
  padding: '10px 40px 10px 13px',
  borderRadius: 6,
  border: '1px solid var(--border)',
  fontSize: 14,
  background: 'var(--surface)',
  color: 'var(--text)',
  outline: 'none',
};

interface PasswordInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  style?: CSSProperties;
}

export function PasswordInput({ value, onChange, placeholder = '••••••••', style }: PasswordInputProps) {
  const [visible, setVisible] = useState(false);

  return (
    <div style={{ position: 'relative' }}>
      <input
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        style={{ ...baseInputStyle, ...style }}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        tabIndex={-1}
        aria-label={visible ? 'Hide password' : 'Show password'}
        style={{
          position: 'absolute',
          right: 10,
          top: '50%',
          transform: 'translateY(-50%)',
          background: 'none',
          border: 'none',
          padding: 4,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--muted)',
          cursor: 'pointer',
        }}
      >
        {visible ? <EyeOff size={16} /> : <Eye size={16} />}
      </button>
    </div>
  );
}
