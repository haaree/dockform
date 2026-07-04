import { useState, useEffect, useRef } from 'react';
import { Search, Download, Eye, MoreHorizontal } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../ui/StatusBadge';
import { downloadHTMLReport } from '../../lib/exportReport';
import { downloadExcelReport } from '../../lib/exportExcel';
import { FileText } from 'lucide-react';

function exportReport(formId: number) {
  const { forms, responses } = useStore.getState();
  const form = forms.find(f => f.id === formId);
  if (!form) return;
  const formResponses = responses.filter(r => r.formId === formId);
  downloadHTMLReport(form.name, form.description || '', form.fieldDefs || [], formResponses);
}

function exportExcel(formId: number) {
  const { forms, responses } = useStore.getState();
  const form = forms.find(f => f.id === formId);
  if (!form) return;
  const formResponses = responses.filter(r => r.formId === formId);
  downloadExcelReport(form.name, form.description || '', form.fieldDefs || [], formResponses);
}

export default function ResponsesScreen() {
  const responses = useStore((s) => s.responses);
  const viewFormResponses = useStore((s) => s.viewFormResponses);
  const [search, setSearch] = useState('');
  const [menuId, setMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menuId === null) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuId]);

  const filtered = responses.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.form.toLowerCase().includes(q) || r.submittedBy.toLowerCase().includes(q);
  });

  const handleMenuClick = (e: React.MouseEvent, responseId: number) => {
    e.stopPropagation();
    if (menuId === responseId) { setMenuId(null); return; }
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 180 });
    setMenuId(responseId);
  };

  const winWidth = useStore((s) => s.winWidth);
  const isMobile = winWidth < 720;
  const pad = isMobile ? '16px' : '24px 32px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: pad, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 18 : 21, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.5px' }}>Responses</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{responses.length} form submissions received</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}>
          <Search size={13} color="var(--muted)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search responses…" style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: isMobile ? '100%' : 170, outline: 'none' }} />
        </div>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: pad }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Form', 'Submitted By', 'Plant', 'Date', 'Status', ''].map((h, i) => (
                    <th key={i} style={{ textAlign: 'left', padding: '10px 16px', fontSize: 11, fontWeight: 600, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{r.form}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{r.submittedBy}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{r.plant}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{r.date}</td>
                    <td style={{ padding: '12px 16px' }}><StatusBadge status={r.status} /></td>
                    <td style={{ padding: '12px 16px' }}>
                      {r.formId && r.formId > 0 && (
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
      </div>

      {menuId !== null && (() => {
        const r = responses.find(r => r.id === menuId);
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
          </div>
        );
      })()}
    </div>
  );
}
