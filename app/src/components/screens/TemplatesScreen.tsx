import { useMemo } from 'react';
import { Search, Shield, CheckCircle, ShieldCheck, Settings, Lock, Users, Globe, Sparkles, X, Zap, Check, Trash2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { legibleAccent } from '../../lib/theme';
import { getBuiltInPacks } from '../../data/templatePacks';
import type { TemplatePack } from '../../store/types';

const DOMAIN_ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  'Legal & Compliance': Shield,
  'Quality Management': CheckCircle,
  'Health & Safety': ShieldCheck,
  'Maintenance': Settings,
  'Security': Lock,
  'Human Resources': Users,
  'Environment': Globe,
  'Custom': Sparkles,
};

const TYPE_LABELS: Record<string, string> = {
  textbox: 'Text', textarea: 'Textarea', richtext: 'Rich Text', number: 'Number', currency: 'Currency',
  percent: 'Percent', date: 'Date', time: 'Time', datetime: 'DateTime', dropdown: 'Dropdown',
  multiselect: 'Multi-Sel', checkbox: 'Checkbox', radio: 'Radio', toggle: 'Toggle', lookup: 'Lookup',
  formula: 'Formula', image: 'Image', camera: 'Camera', video: 'Video', audio: 'Audio', upload: 'File',
  signature: 'Signature', gps: 'GPS', qr: 'QR', barcode: 'Barcode', email: 'Email', phone: 'Phone',
  url: 'URL', rating: 'Rating', color: 'Color', hidden: 'Hidden', system: 'System', ai: 'AI',
};

export default function TemplatesScreen() {
  const accent = useStore((s) => s.accent);
  const dark = useStore((s) => s.dark);
  const winWidth = useStore((s) => s.winWidth);
  const customPacks = useStore((s) => s.customPacks);
  const activePackId = useStore((s) => s.activePackId);
  const previewPackId = useStore((s) => s.previewPackId);
  const packSearch = useStore((s) => s.packSearch);
  const packDomainFilter = useStore((s) => s.packDomainFilter);
  const activatePack = useStore((s) => s.activatePack);
  const setPreviewPackId = useStore((s) => s.setPreviewPackId);
  const setPackSearch = useStore((s) => s.setPackSearch);
  const setPackDomainFilter = useStore((s) => s.setPackDomainFilter);
  const deleteCustomPack = useStore((s) => s.deleteCustomPack);

  const taccent = legibleAccent(accent, dark);
  const ghost = dark ? '#303036' : '#E4E4E7';
  const isMobile = winWidth < 720;

  const allPacks = useMemo(() => [...getBuiltInPacks(), ...customPacks], [customPacks]);

  const domains = useMemo(() => {
    const set = new Set(allPacks.map((p) => p.domain));
    return ['All', ...Array.from(set)];
  }, [allPacks]);

  const filtered = useMemo(() => {
    let packs = allPacks;
    if (packDomainFilter !== 'All') packs = packs.filter((p) => p.domain === packDomainFilter);
    const q = packSearch.toLowerCase();
    if (q) packs = packs.filter((p) =>
      p.name.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q) || p.chips.some((c) => c.toLowerCase().includes(q))
    );
    return packs;
  }, [allPacks, packDomainFilter, packSearch]);

  const previewPack = previewPackId ? allPacks.find((p) => p.id === previewPackId) : null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: isMobile ? 16 : '24px 32px', flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.5px' }}>Templates</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>Pre-built compliance templates — activate and customise in the Form Builder</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}>
          <Search size={13} color="var(--muted)" />
          <input value={packSearch} onChange={(e) => setPackSearch(e.target.value)} placeholder="Search templates…" style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: isMobile ? '100%' : 180, outline: 'none' }} />
        </div>
      </div>

      {/* Domain filters */}
      <div style={{ padding: isMobile ? '14px 16px 0' : '14px 32px 0', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, overflowX: 'auto' }}>
        {domains.map((d) => (
          <button
            key={d}
            onClick={() => setPackDomainFilter(d)}
            style={{
              padding: '6px 13px', fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
              background: d === packDomainFilter ? accent : (dark ? '#1C1C1E' : '#FFFFFF'),
              color: d === packDomainFilter ? '#fff' : (dark ? '#9CA3AF' : '#6B7280'),
              border: `1px solid ${d === packDomainFilter ? accent : ghost}`,
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Content: grid + preview panel */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 16 : '24px 32px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {filtered.map((pack) => (
              <PackCard
                key={pack.id}
                pack={pack}
                isActive={activePackId === pack.id}
                accent={accent}
                taccent={taccent}
                dark={dark}
                ghost={ghost}
                onActivate={() => activatePack(pack)}
                onPreview={() => setPreviewPackId(pack.id)}
                onDelete={pack.isCustom ? () => deleteCustomPack(pack.id) : undefined}
              />
            ))}
          </div>
        </div>

        {/* Preview panel */}
        {previewPack && (
          <PreviewPanel
            pack={previewPack}
            dark={dark}
            ghost={ghost}
            onClose={() => setPreviewPackId(null)}
            onActivate={() => activatePack(previewPack)}
          />
        )}
      </div>
    </div>
  );
}

function PackCard({ pack, isActive, accent, taccent, dark, ghost, onActivate, onPreview, onDelete }: {
  pack: TemplatePack; isActive: boolean; accent: string; taccent: string; dark: boolean; ghost: string;
  onActivate: () => void; onPreview: () => void; onDelete?: () => void;
}) {
  const DomainIcon = DOMAIN_ICONS[pack.domain] || Shield;

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${isActive ? accent : ghost}`, borderRadius: 10, overflow: 'hidden',
      boxShadow: isActive ? `0 0 0 3px ${accent}22` : '0 1px 3px rgba(0,0,0,.04)',
    }}>
      <div style={{ padding: '20px 20px 16px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 8, background: `${taccent}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: taccent }}>
            <DomainIcon size={16} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 5, lineHeight: 1.3 }}>{pack.name}</div>
            <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${taccent}18`, color: taccent, whiteSpace: 'nowrap', letterSpacing: '0.3px' }}>{pack.tag}</span>
          </div>
          {isActive && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#DCFCE7', color: '#15803D', whiteSpace: 'nowrap', flexShrink: 0 }}>
              <Check size={11} /> Active
            </div>
          )}
        </div>
        <p style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 14 }}>{pack.description}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{pack.fields.length} fields</span>
          <span style={{ fontSize: 11, color: 'var(--muted)' }}>{pack.domain}</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onActivate} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 14px', fontSize: 12, fontWeight: isActive ? 700 : 600, borderRadius: 7, cursor: 'pointer',
            background: isActive ? '#DCFCE7' : accent, color: isActive ? '#15803D' : '#fff', border: isActive ? '1px solid #86EFAC' : 'none',
          }}>
            {isActive ? '✓ Activated' : 'Use This Pack'}
          </button>
          <button onClick={onPreview} style={{
            display: 'inline-flex', alignItems: 'center', gap: 5, padding: '7px 12px', fontSize: 12, fontWeight: 500,
            background: dark ? '#28282C' : '#FFFFFF', color: dark ? '#E5E7EB' : '#374151', border: `1px solid ${ghost}`, borderRadius: 7, cursor: 'pointer',
          }}>
            Preview fields
          </button>
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 7,
              background: 'transparent', border: `1px solid ${ghost}`, borderRadius: 7, cursor: 'pointer', color: '#EF4444',
            }}>
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
      <div style={{ borderTop: '1px solid var(--border)', padding: '10px 20px', display: 'flex', gap: 5, flexWrap: 'wrap' }}>
        {pack.chips.map((chip) => (
          <span key={chip} style={{ fontSize: 10, fontWeight: 500, padding: '3px 8px', borderRadius: 20, background: dark ? '#28282C' : '#F4F4F5', color: dark ? '#9CA3AF' : '#6B7280' }}>
            {chip}
          </span>
        ))}
      </div>
    </div>
  );
}

function PreviewPanel({ pack, dark, ghost, onClose, onActivate }: {
  pack: TemplatePack; dark: boolean; ghost: string; onClose: () => void; onActivate: () => void;
}) {
  return (
    <div style={{ width: 340, flexShrink: 0, borderLeft: `1px solid ${ghost}`, background: dark ? '#161618' : '#FAFAF8', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{ padding: '16px 18px', borderBottom: `1px solid ${ghost}`, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: '0.8px', color: dark ? '#52525B' : '#A1A1AA', marginBottom: 5 }}>Pack Preview</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{pack.name}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: `${pack.color}18`, color: pack.color }}>{pack.tag}</span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>{pack.fields.length} fields</span>
          </div>
        </div>
        <button onClick={onClose} style={{ padding: 4, background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', alignItems: 'center' }}>
          <X size={16} />
        </button>
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 0' }}>
        {pack.fields.map((f, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 18px', borderBottom: `1px solid ${dark ? '#1C1C1E' : '#F4F4F5'}` }}>
            <div style={{ width: 24, height: 24, borderRadius: 6, background: dark ? '#242426' : '#F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--muted)', marginTop: 1, fontSize: 10 }}>
              {(TYPE_LABELS[f.type] || f.type).charAt(0)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{f.label}</div>
              <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{TYPE_LABELS[f.type] || f.type}{f.required ? ' · Required' : ''}</div>
            </div>
          </div>
        ))}
      </div>
      <div style={{ padding: '14px 18px', borderTop: `1px solid ${ghost}`, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)', lineHeight: 1.5, marginBottom: 2 }}>
          Activating this pack will load all {pack.fields.length} fields into the Form Builder. You can add, edit, or remove any field.
        </div>
        <button onClick={onActivate} style={{
          width: '100%', padding: 10, background: pack.color, color: '#fff', border: 'none', borderRadius: 8,
          fontSize: 13, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}>
          <Zap size={14} /> Activate This Pack
        </button>
      </div>
    </div>
  );
}
