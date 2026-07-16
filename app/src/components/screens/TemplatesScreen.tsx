import { useMemo } from 'react';
import {
  Search, Shield, Sparkles, X, Zap, Check, Trash2,
  FlaskConical, Factory, UtensilsCrossed, Building2, GraduationCap, School,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getBuiltInPacks } from '../../data/templatePacks';
import type { TemplatePack } from '../../store/types';

// One illustration identity per sub-category: an icon + a gradient, used as the visual
// header on each card instead of a real photo (no image asset pipeline in this app).
const SUBCATEGORY_ART: Record<string, { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; gradient: string }> = {
  'Chemical & Pharma': { icon: FlaskConical, gradient: 'linear-gradient(135deg, #0EA5E9, #6366F1)' },
  'Manufacturing & Engineering': { icon: Factory, gradient: 'linear-gradient(135deg, #F59E0B, #DC2626)' },
  'Food & Catering': { icon: UtensilsCrossed, gradient: 'linear-gradient(135deg, #16A34A, #059669)' },
  'General & Facilities': { icon: Building2, gradient: 'linear-gradient(135deg, #64748B, #334155)' },
  'CBSE': { icon: GraduationCap, gradient: 'linear-gradient(135deg, #7C3AED, #4F46E5)' },
  'State Board': { icon: School, gradient: 'linear-gradient(135deg, #7C3AED, #A855F7)' },
  'Custom': { icon: Sparkles, gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)' },
};
const DEFAULT_ART = { icon: Shield, gradient: 'linear-gradient(135deg, #6B7280, #374151)' };

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
  const packIndustryFilter = useStore((s) => s.packIndustryFilter);
  const packSubCategoryFilter = useStore((s) => s.packSubCategoryFilter);
  const activatePack = useStore((s) => s.activatePack);
  const setPreviewPackId = useStore((s) => s.setPreviewPackId);
  const setPackSearch = useStore((s) => s.setPackSearch);
  const setPackIndustryFilter = useStore((s) => s.setPackIndustryFilter);
  const setPackSubCategoryFilter = useStore((s) => s.setPackSubCategoryFilter);
  const deleteCustomPack = useStore((s) => s.deleteCustomPack);

  const ghost = dark ? '#303036' : '#E4E4E7';
  const isMobile = winWidth < 720;

  const allPacks = useMemo(() => [...getBuiltInPacks(), ...customPacks], [customPacks]);

  const industries = useMemo(() => {
    const set = new Set(allPacks.map((p) => p.industry));
    return ['All', ...Array.from(set)];
  }, [allPacks]);

  const subCategories = useMemo(() => {
    if (packIndustryFilter === 'All') return [];
    const set = new Set(allPacks.filter((p) => p.industry === packIndustryFilter).map((p) => p.subCategory));
    return ['All', ...Array.from(set)];
  }, [allPacks, packIndustryFilter]);

  const filtered = useMemo(() => {
    let packs = allPacks;
    if (packIndustryFilter !== 'All') packs = packs.filter((p) => p.industry === packIndustryFilter);
    if (packSubCategoryFilter !== 'All') packs = packs.filter((p) => p.subCategory === packSubCategoryFilter);
    const q = packSearch.toLowerCase();
    if (q) packs = packs.filter((p) =>
      p.name.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q) || p.chips.some((c) => c.toLowerCase().includes(q))
    );
    return packs;
  }, [allPacks, packIndustryFilter, packSubCategoryFilter, packSearch]);

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

      {/* Industry filters */}
      <div style={{ padding: isMobile ? '14px 16px 0' : '14px 32px 0', display: 'flex', gap: 8, flexWrap: 'wrap', flexShrink: 0, overflowX: 'auto' }}>
        {industries.map((d) => (
          <button
            key={d}
            onClick={() => setPackIndustryFilter(d)}
            style={{
              padding: '7px 15px', fontSize: 12.5, fontWeight: 700, borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap',
              background: d === packIndustryFilter ? accent : (dark ? '#1C1C1E' : '#FFFFFF'),
              color: d === packIndustryFilter ? '#fff' : (dark ? '#9CA3AF' : '#6B7280'),
              border: `1px solid ${d === packIndustryFilter ? accent : ghost}`,
            }}
          >
            {d}
          </button>
        ))}
      </div>

      {/* Sub-category filters (only once an industry is selected) */}
      {subCategories.length > 0 && (
        <div style={{ padding: isMobile ? '10px 16px 0' : '10px 32px 0', display: 'flex', gap: 6, flexWrap: 'wrap', flexShrink: 0, overflowX: 'auto' }}>
          {subCategories.map((sc) => (
            <button
              key={sc}
              onClick={() => setPackSubCategoryFilter(sc)}
              style={{
                padding: '5px 11px', fontSize: 11.5, fontWeight: 600, borderRadius: 20, cursor: 'pointer', whiteSpace: 'nowrap',
                background: sc === packSubCategoryFilter ? `${accent}18` : 'transparent',
                color: sc === packSubCategoryFilter ? accent : 'var(--muted)',
                border: `1px solid ${sc === packSubCategoryFilter ? accent : ghost}`,
              }}
            >
              {sc}
            </button>
          ))}
        </div>
      )}

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

function PackCard({ pack, isActive, accent, dark, ghost, onActivate, onPreview, onDelete }: {
  pack: TemplatePack; isActive: boolean; accent: string; dark: boolean; ghost: string;
  onActivate: () => void; onPreview: () => void; onDelete?: () => void;
}) {
  const art = SUBCATEGORY_ART[pack.subCategory] || DEFAULT_ART;
  const ArtIcon = art.icon;

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${isActive ? accent : ghost}`, borderRadius: 10, overflow: 'hidden',
      boxShadow: isActive ? `0 0 0 3px ${accent}22` : '0 1px 3px rgba(0,0,0,.04)',
    }}>
      <div style={{ position: 'relative', height: 84, background: art.gradient, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <ArtIcon size={40} style={{ color: 'rgba(255,255,255,.9)' }} />
        <div style={{ position: 'absolute', top: 8, left: 8, fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(0,0,0,.28)', color: '#fff', letterSpacing: '0.3px' }}>{pack.subCategory}</div>
        {isActive && (
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#DCFCE7', color: '#15803D', whiteSpace: 'nowrap' }}>
            <Check size={11} /> Active
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>{pack.name}</div>
        <p style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 10, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 1, WebkitBoxOrient: 'vertical' as const }}>{pack.description}</p>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 500, color: 'var(--muted)' }}>{pack.fields.length} fields</span>
          <span style={{ fontSize: 10, color: 'var(--muted)' }}>·</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: accent }}>{pack.tag}</span>
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
