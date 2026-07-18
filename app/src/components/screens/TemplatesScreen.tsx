import { useMemo, useRef, useState, useEffect } from 'react';
import {
  Search, Shield, Sparkles, Trash2, SlidersHorizontal, Check, X,
  FlaskConical, Factory, UtensilsCrossed, Building2,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import { getBuiltInPacks } from '../../data/templatePacks';
import type { TemplatePack } from '../../store/types';

// One illustration identity per sub-category: an icon + a gradient, used as the visual
// header on each card when the pack has no real photo of its own.
const SUBCATEGORY_ART: Record<string, { icon: React.ComponentType<{ size?: number; style?: React.CSSProperties }>; gradient: string }> = {
  'Chemical & Pharma': { icon: FlaskConical, gradient: 'linear-gradient(135deg, #0EA5E9, #6366F1)' },
  'Manufacturing & Engineering': { icon: Factory, gradient: 'linear-gradient(135deg, #F59E0B, #DC2626)' },
  'Food & Catering': { icon: UtensilsCrossed, gradient: 'linear-gradient(135deg, #16A34A, #059669)' },
  'General & Facilities': { icon: Building2, gradient: 'linear-gradient(135deg, #64748B, #334155)' },
  'Custom': { icon: Sparkles, gradient: 'linear-gradient(135deg, #2563EB, #1D4ED8)' },
};
const DEFAULT_ART = { icon: Shield, gradient: 'linear-gradient(135deg, #6B7280, #374151)' };

export default function TemplatesScreen() {
  const accent = useStore((s) => s.accent);
  const dark = useStore((s) => s.dark);
  const winWidth = useStore((s) => s.winWidth);
  const customPacks = useStore((s) => s.customPacks);
  const activePackId = useStore((s) => s.activePackId);
  const packSearch = useStore((s) => s.packSearch);
  const packSubCategoryFilter = useStore((s) => s.packSubCategoryFilter);
  const activatePack = useStore((s) => s.activatePack);
  const setPackSearch = useStore((s) => s.setPackSearch);
  const setPackSubCategoryFilter = useStore((s) => s.setPackSubCategoryFilter);
  const deleteCustomPack = useStore((s) => s.deleteCustomPack);

  const ghost = dark ? '#303036' : '#E4E4E7';
  const isMobile = winWidth < 720;

  const [showFilters, setShowFilters] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!showFilters) return;
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setShowFilters(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showFilters]);

  const allPacks = useMemo(() => [...getBuiltInPacks(), ...customPacks], [customPacks]);

  const subCategories = useMemo(() => {
    const set = new Set(allPacks.map((p) => p.subCategory));
    return Array.from(set);
  }, [allPacks]);

  const filtered = useMemo(() => {
    let packs = allPacks;
    if (packSubCategoryFilter !== 'All') packs = packs.filter((p) => p.subCategory === packSubCategoryFilter);
    const q = packSearch.toLowerCase();
    if (q) packs = packs.filter((p) =>
      p.name.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q) || p.chips.some((c) => c.toLowerCase().includes(q))
    );
    return packs;
  }, [allPacks, packSubCategoryFilter, packSearch]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: isMobile ? 16 : '24px 32px', flexShrink: 0, borderBottom: '1px solid var(--border)' }}>
        <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.5px' }}>Templates</h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4, marginBottom: 18 }}>Pre-built compliance templates — activate and customise in the Form Builder</p>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '9px 14px', flex: isMobile ? '1 1 100%' : '0 1 320px', minWidth: 200 }}>
            <Search size={14} color="var(--muted)" />
            <input value={packSearch} onChange={(e) => setPackSearch(e.target.value)} placeholder="Search checklists, forms…" style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13.5, width: '100%', outline: 'none' }} />
          </div>
          <button
            type="button"
            style={{ height: 38, padding: '0 18px', borderRadius: 8, border: 'none', background: accent, color: '#fff', fontSize: 13.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}
          >
            Search
          </button>

          <div ref={filterRef} style={{ position: 'relative' }}>
            <button
              onClick={() => setShowFilters((v) => !v)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 7, height: 38, padding: '0 14px', borderRadius: 8, cursor: 'pointer',
                background: packSubCategoryFilter !== 'All' ? `${accent}14` : 'var(--surface)',
                border: `1px solid ${packSubCategoryFilter !== 'All' ? accent : 'var(--border)'}`,
                color: packSubCategoryFilter !== 'All' ? accent : 'var(--text)', fontSize: 13, fontWeight: 600,
              }}
            >
              <SlidersHorizontal size={14} /> Filters{packSubCategoryFilter !== 'All' ? ' (1)' : ''}
            </button>
            {showFilters && (
              <div style={{ position: 'absolute', top: '100%', left: 0, marginTop: 6, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, boxShadow: '0 8px 24px rgba(0,0,0,.14)', zIndex: 50, minWidth: 220, padding: 8 }}>
                <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--muted)', padding: '6px 10px 4px' }}>Category</div>
                {['All', ...subCategories].map((sc) => (
                  <button
                    key={sc}
                    onClick={() => { setPackSubCategoryFilter(sc); setShowFilters(false); }}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', padding: '8px 10px', borderRadius: 6,
                      background: sc === packSubCategoryFilter ? `${accent}12` : 'transparent', border: 'none', cursor: 'pointer',
                      color: sc === packSubCategoryFilter ? accent : 'var(--text)', fontSize: 13, fontWeight: sc === packSubCategoryFilter ? 600 : 500, textAlign: 'left',
                    }}
                  >
                    {sc}
                    {sc === packSubCategoryFilter && <Check size={13} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {packSubCategoryFilter !== 'All' && (
            <>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 38, padding: '0 12px', borderRadius: 20, border: `1px solid ${accent}`, background: `${accent}12`, color: accent, fontSize: 12.5, fontWeight: 600 }}>
                {packSubCategoryFilter}
                <button onClick={() => setPackSubCategoryFilter('All')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: accent, display: 'flex' }}>
                  <X size={12} />
                </button>
              </span>
              <button onClick={() => setPackSubCategoryFilter('All')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 12.5, fontWeight: 600 }}>
                Clear all
              </button>
            </>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 16 : '24px 32px' }}>
        <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
          {packSubCategoryFilter === 'All' ? 'Browse all' : packSubCategoryFilter} <span style={{ fontWeight: 500, color: 'var(--muted)', fontSize: 14 }}>{filtered.length} result{filtered.length !== 1 ? 's' : ''}</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {filtered.map((pack) => (
            <PackCard
              key={pack.id}
              pack={pack}
              isActive={activePackId === pack.id}
              accent={accent}
              ghost={ghost}
              onActivate={() => activatePack(pack)}
              onDelete={pack.isCustom ? () => deleteCustomPack(pack.id) : undefined}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function PackCard({ pack, isActive, accent, ghost, onActivate, onDelete }: {
  pack: TemplatePack; isActive: boolean; accent: string; ghost: string;
  onActivate: () => void; onDelete?: () => void;
}) {
  const art = SUBCATEGORY_ART[pack.subCategory] || DEFAULT_ART;
  const ArtIcon = art.icon;

  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${isActive ? accent : ghost}`, borderRadius: 10, overflow: 'hidden',
      boxShadow: isActive ? `0 0 0 3px ${accent}22` : '0 1px 3px rgba(0,0,0,.04)',
    }}>
      <div style={{ position: 'relative', height: 148, background: pack.image ? undefined : art.gradient, overflow: 'hidden' }}>
        {pack.image ? (
          <img src={pack.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <ArtIcon size={40} style={{ color: 'rgba(255,255,255,.9)' }} />
          </div>
        )}
        <div style={{ position: 'absolute', top: 10, left: 10, fontSize: 9.5, fontWeight: 700, padding: '3px 8px', borderRadius: 4, background: 'rgba(0,0,0,.4)', color: '#fff', letterSpacing: '0.3px' }}>{pack.subCategory}</div>
        {isActive && (
          <div style={{ position: 'absolute', top: 10, right: 10, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#DCFCE7', color: '#15803D', whiteSpace: 'nowrap' }}>
            <Check size={11} /> Active
          </div>
        )}
      </div>
      <div style={{ padding: '14px 16px' }}>
        <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>{pack.name}</div>
        <p style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4, marginBottom: 14, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const }}>{pack.description}</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={onActivate} style={{
            flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '8px 14px', fontSize: 12.5, fontWeight: isActive ? 700 : 600, borderRadius: 7, cursor: 'pointer',
            background: isActive ? '#DCFCE7' : accent, color: isActive ? '#15803D' : '#fff', border: isActive ? '1px solid #86EFAC' : 'none',
          }}>
            {isActive ? '✓ Activated' : 'Use This Template'}
          </button>
          {onDelete && (
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 8,
              background: 'transparent', border: `1px solid ${ghost}`, borderRadius: 7, cursor: 'pointer', color: '#EF4444',
            }}>
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
