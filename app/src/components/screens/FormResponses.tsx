import { useState } from 'react';
import { ArrowLeft, Download, ChevronDown, ChevronUp, Image as ImageIcon, FileText } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { downloadHTMLReport } from '../../lib/exportReport';
import { downloadExcelReport } from '../../lib/exportExcel';

export default function FormResponses() {
  const viewingFormId = useStore((s) => s.viewingFormId);
  const forms = useStore((s) => s.forms);
  const responses = useStore((s) => s.responses);
  const setNav = useStore((s) => s.setNav);
  const accent = useStore((s) => s.accent);
  const winWidth = useStore((s) => s.winWidth);

  const form = forms.find(f => f.id === viewingFormId);
  const formResponses = responses.filter(r => r.formId === viewingFormId);
  const fieldDefs = form?.fieldDefs || [];
  const isMobile = winWidth < 720;

  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [imageModal, setImageModal] = useState<string | null>(null);

  if (!form) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
        Form not found.
        <button onClick={() => setNav('forms')} style={{ marginLeft: 12, color: accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Back</button>
      </div>
    );
  }

  const [showExportMenu, setShowExportMenu] = useState(false);

  const downloadReport = () => {
    downloadHTMLReport(form.name, form.description || '', fieldDefs, formResponses);
    setShowExportMenu(false);
  };

  const downloadExcel = () => {
    downloadExcelReport(form.name, form.description || '', fieldDefs, formResponses);
    setShowExportMenu(false);
  };

  const renderValue = (fieldId: string, type: string) => {
    const val = expandedResponse?.values?.[fieldId] || '';
    if (!val) return <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Not answered</span>;
    if (val.startsWith('data:image')) {
      return (
        <img src={val} alt="Uploaded" onClick={() => setImageModal(val)}
          style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)' }} />
      );
    }
    if (val.startsWith('data:')) {
      return <span style={{ color: accent, fontWeight: 500 }}>[File attached]</span>;
    }
    if (type === 'rating') {
      const n = parseInt(val) || 0;
      return <span>{'★'.repeat(n)}{'☆'.repeat(5 - n)} ({n}/5)</span>;
    }
    if (type === 'toggle') {
      return <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, fontWeight: 600, background: val === 'true' ? '#DCFCE7' : '#FEE2E2', color: val === 'true' ? '#15803D' : '#DC2626' }}>{val === 'true' ? 'Yes' : 'No'}</span>;
    }
    return <span>{val.replace(/\|\|/g, ', ')}</span>;
  };

  const expandedResponse = formResponses.find(r => r.id === expandedId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ height: 52, minHeight: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', background: 'var(--surface)' }}>
        <button type="button" onClick={() => setNav('forms')}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
          <ArrowLeft size={17} />
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{form.name}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formResponses.length} responses</div>
        </div>
        <div style={{ position: 'relative' }}>
          <button type="button" onClick={() => setShowExportMenu(!showExportMenu)}
            style={{ height: 32, padding: '0 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Download size={13} /> Export All
          </button>
          {showExportMenu && (
            <div style={{ position: 'absolute', top: 38, right: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.18)', zIndex: 999, minWidth: 200 }}>
              <button onClick={downloadReport}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
                <FileText size={14} /> Download Report (PDF)
              </button>
              <button onClick={downloadExcel}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
                <Download size={14} /> Download Excel (CSV)
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 16 : 24 }}>
        {formResponses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)', fontSize: 14 }}>No responses yet.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 800, margin: '0 auto' }}>
            {formResponses.map((r, idx) => {
              const isOpen = expandedId === r.id;
              return (
                <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  <button type="button" onClick={() => setExpandedId(isOpen ? null : r.id)}
                    style={{ width: '100%', padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12, background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: `${accent}20`, color: accent, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0 }}>
                      {idx + 1}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{r.submittedBy}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.plant} · {r.date}</div>
                    </div>
                    {r.values && Object.values(r.values).some(v => v.startsWith('data:image')) && (
                      <ImageIcon size={14} color={accent} style={{ flexShrink: 0 }} />
                    )}
                    {isOpen ? <ChevronUp size={16} color="var(--muted)" /> : <ChevronDown size={16} color="var(--muted)" />}
                  </button>

                  {isOpen && r.values && (
                    <div style={{ borderTop: '1px solid var(--border)', padding: '16px' }}>
                      {fieldDefs.filter(f => !f.hidden).map(f => (
                        <div key={f.id} style={{ marginBottom: 14 }}>
                          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{f.label}</div>
                          <div style={{ fontSize: 14, color: 'var(--text)' }}>{renderValue(f.id, f.type)}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {imageModal && (
        <div onClick={() => setImageModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20, cursor: 'pointer' }}>
          <img src={imageModal} alt="Full size" style={{ maxWidth: '90%', maxHeight: '90%', borderRadius: 12, objectFit: 'contain' }} />
        </div>
      )}
    </div>
  );
}
