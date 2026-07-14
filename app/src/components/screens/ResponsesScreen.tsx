import { useState, useEffect, useRef } from 'react';
import { Search, Download, Eye, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../ui/StatusBadge';
import { api } from '../../lib/api';
import { downloadHTMLReport } from '../../lib/exportReport';
import { downloadExcelReport } from '../../lib/exportExcel';
import { downloadAuditReport } from '../../lib/exportAuditReport';
import { formatDate } from '../../lib/format';
import { FileText } from 'lucide-react';
import type { ResponseItem } from '../../store/types';

const PAGE_SIZE = 20;

// The store's response list is metadata-only (no field values), so exports fetch their own
// full-values set for just the one form being exported rather than reading the shared array.
async function exportReport(formId: string) {
  const { forms } = useStore.getState();
  const form = forms.find(f => f.id === formId);
  if (!form) return;
  const formResponses = await api.getFullResponsesForForm(formId);
  downloadHTMLReport(form.name, form.description || '', form.fieldDefs || [], formResponses);
}

async function exportExcel(formId: string) {
  const { forms } = useStore.getState();
  const form = forms.find(f => f.id === formId);
  if (!form) return;
  const formResponses = await api.getFullResponsesForForm(formId);
  downloadExcelReport(form.name, form.description || '', form.fieldDefs || [], formResponses);
}

async function exportAudit(formId: string) {
  const { forms, companies, activeCompanyId } = useStore.getState();
  const form = forms.find(f => f.id === formId);
  if (!form) return;
  const formResponses = await api.getFullResponsesForForm(formId);
  const companyName = companies.find(c => c.id === (form.companyId || activeCompanyId))?.name || 'Company';
  downloadAuditReport(form.name, form.description || '', form.fieldDefs || [], formResponses, companyName);
}

export default function ResponsesScreen() {
  const viewFormResponses = useStore((s) => s.viewFormResponses);
  const winWidth = useStore((s) => s.winWidth);
  const isMobile = winWidth < 720;
  const pad = isMobile ? '16px' : '24px 32px';

  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<ResponseItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  // Debounce the search box so every keystroke doesn't trigger its own request.
  useEffect(() => {
    const t = setTimeout(() => { setSearch(searchInput); setPage(1); }, 300);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    api.getResponsesPage({ page, limit: PAGE_SIZE, search })
      .then((data) => { if (!cancelled) { setItems(data.items); setTotal(data.total); } })
      .catch((err) => { if (!cancelled) setLoadError(err?.message || 'Failed to load responses'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [page, search]);

  useEffect(() => {
    if (menuId === null) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuId]);

  const handleMenuClick = (e: React.MouseEvent, responseId: string) => {
    e.stopPropagation();
    if (menuId === responseId) { setMenuId(null); return; }
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 180 });
    setMenuId(responseId);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: pad, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.5px' }}>Responses</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>{total} form submissions received</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}>
          <Search size={13} color="var(--muted)" />
          <input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Search responses…" style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: isMobile ? '100%' : 170, outline: 'none' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: pad }}>
        {loadError ? (
          <div style={{ textAlign: 'center', padding: 48, color: '#DC2626', fontSize: 13.5 }}>{loadError}</div>
        ) : (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10 }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    {['Form', 'Submitted By', 'Plant', 'Date', 'Status', ''].map((h, i) => (
                      <th key={i} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {!loading && items.length === 0 && (
                    <tr><td colSpan={6} style={{ padding: '32px 16px', textAlign: 'center', color: 'var(--muted)', fontSize: 13.5 }}>
                      {search ? 'No responses match your search.' : 'No responses yet.'}
                    </td></tr>
                  )}
                  {items.map((r) => (
                    <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{r.form}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{r.submittedBy}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{r.plant}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{formatDate(r.date)}</td>
                      <td style={{ padding: '12px 16px' }}><StatusBadge status={r.status} /></td>
                      <td style={{ padding: '12px 16px' }}>
                        {r.formId && (
                          <button onClick={(e) => handleMenuClick(e, r.id)}
                            style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', cursor: 'pointer' }}>
                            <MoreHorizontal size={15} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {!loadError && total > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '16px 0' }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)', color: page <= 1 ? 'var(--muted)' : 'var(--text)', cursor: page <= 1 ? 'default' : 'pointer' }}>
              <ChevronLeft size={13} /> Prev
            </button>
            <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
              style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 12.5, fontWeight: 600, border: '1px solid var(--border)', borderRadius: 7, background: 'var(--surface)', color: page >= totalPages ? 'var(--muted)' : 'var(--text)', cursor: page >= totalPages ? 'default' : 'pointer' }}>
              Next <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {menuId !== null && (() => {
        const r = items.find(r => r.id === menuId);
        if (!r || !r.formId) return null;
        return (
          <div ref={menuRef} style={{
            position: 'fixed', top: menuPos.top, left: menuPos.left,
            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,.18)', zIndex: 999, minWidth: 180,
          }}>
            <button onClick={() => { viewFormResponses(r.formId); setMenuId(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
              <Eye size={14} /> View All Responses
            </button>
            <button onClick={() => { exportReport(r.formId); setMenuId(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
              <FileText size={14} /> Download Report (PDF)
            </button>
            <button onClick={() => { exportExcel(r.formId); setMenuId(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
              <Download size={14} /> Download Excel (CSV)
            </button>
            <button onClick={() => { exportAudit(r.formId); setMenuId(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left', borderTop: '1px solid var(--border)' }}>
              <FileText size={14} /> Audit Report (Single Page)
            </button>
          </div>
        );
      })()}
    </div>
  );
}
