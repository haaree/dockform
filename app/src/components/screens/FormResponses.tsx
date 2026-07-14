import { useState, useEffect, type ReactNode } from 'react';
import { ArrowLeft, Download, ChevronDown, ChevronUp, Image as ImageIcon, FileText, CalendarClock, CheckCircle, Clock, AlertCircle, Table2, LayoutList } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { api } from '../../lib/api';
import type { ResponseItem, FormField } from '../../store/types';
import { downloadHTMLReport } from '../../lib/exportReport';
import { downloadExcelReport, sectionMembers } from '../../lib/exportExcel';
import { downloadAuditReport } from '../../lib/exportAuditReport';
import { formatDate } from '../../lib/format';

const EMPTY_CELL = <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>—</span>;

// Renders one field's value as a React node (not an HTML string) so the grid never needs
// dangerouslySetInnerHTML — field values are user-submitted data (any authenticated filler
// can POST arbitrary strings), so injecting them as raw HTML in a live, authenticated screen
// would be stored XSS. Deliberately text-only summaries rather than inline thumbnails: a
// dense grid of images would also multiply the render/transfer cost on forms with legacy
// embedded (non-R2) photos.
function renderGridCell(f: FormField, v: string): ReactNode {
  if (!v) return EMPTY_CELL;
  if (f.type === 'beforeafter') {
    try {
      const ba = JSON.parse(v);
      const parts = [ba.before && 'Before', ba.after && 'After'].filter(Boolean);
      return parts.length ? `[Photos: ${parts.join(', ')}]` : EMPTY_CELL;
    } catch { return '[Photo]'; }
  }
  if (f.type === 'photochecklist') {
    try {
      const data = JSON.parse(v);
      const attempts = data.attempts || [];
      const latest = attempts[attempts.length - 1];
      const satisfied = latest?.results?.filter((r: any) => r.found).length ?? 0;
      const total = latest?.results?.length ?? 0;
      return total ? `${satisfied}/${total} satisfied` : '[Photo]';
    } catch { return '[Photo]'; }
  }
  if (v.startsWith('data:image') || (v.startsWith('/api/files/') && /\.(png|jpe?g|gif|webp)$/i.test(v))) return '[Photo]';
  if (v.startsWith('data:') || v.startsWith('/api/files/')) return '[File]';
  if (f.type === 'toggle') {
    const yes = v === 'true';
    return <span style={{ padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 600, background: yes ? '#DCFCE7' : '#FEE2E2', color: yes ? '#15803D' : '#DC2626' }}>{yes ? 'Yes' : 'No'}</span>;
  }
  if (f.type === 'rating') {
    const n = parseInt(v) || 0;
    return `${'★'.repeat(n)}${'☆'.repeat(5 - n)}`;
  }
  return v.replace(/\|\|/g, ', ');
}

// One column in the grid view. A non-repeating field (or a non-section field) is one column;
// a repeating Section expands into N columns per member field ("Area 1 - Checklist",
// "Area 2 - Checklist", ...) up to the most instances seen across the loaded responses —
// same "columns are real, filterable spreadsheet cells" model as a normal field, just scoped
// to one instance index instead of the whole response.
interface GridColumn {
  key: string;
  header: string;
  render: (values: Record<string, string>) => ReactNode;
}

function buildGridColumns(fieldDefs: FormField[], responses: ResponseItem[]): GridColumn[] {
  // Only repeatable-section members need excluding from the flat column pass — their data
  // lives inside the marker's JSON instance array, not under their own id. Non-repeatable
  // section members store flat under their own id same as any other field, so they DO need
  // a plain column (mirrors the same repeatableMemberIds rule downloadExcelReport uses).
  const repeatableMemberIds = new Set<string>();
  fieldDefs.forEach((f) => { if (f.type === 'section' && f.repeatable) sectionMembers(fieldDefs, f).forEach(m => repeatableMemberIds.add(m.id)); });

  const columns: GridColumn[] = [];
  for (const f of fieldDefs) {
    if (f.hidden) continue;
    if (f.type === 'section') continue; // markers aren't columns; only repeatable ones contribute below
    if (repeatableMemberIds.has(f.id)) continue;
    columns.push({
      key: f.id,
      header: f.label || f.id,
      render: (values) => renderGridCell(f, values[f.id] || ''),
    });
  }

  // Walk again to find repeatable section markers and expand them into numbered columns.
  for (let i = 0; i < fieldDefs.length; i++) {
    const f = fieldDefs[i];
    if (f.type !== 'section' || !f.repeatable) continue;
    const members = sectionMembers(fieldDefs, f).filter(m => !m.hidden);
    if (members.length === 0) continue;

    let maxInstances = 0;
    for (const r of responses) {
      try {
        const instances = JSON.parse(r.values?.[f.id] || '[]');
        if (Array.isArray(instances)) maxInstances = Math.max(maxInstances, instances.length);
      } catch { /* empty */ }
    }
    if (maxInstances === 0) maxInstances = 1;

    // Repeatable-section columns are appended after the flat pass rather than spliced in at
    // the marker's original position — their members are excluded from `columns` entirely
    // (they're not real fields there), so there's no anchor column to insert relative to.
    for (let inst = 0; inst < maxInstances; inst++) {
      for (const m of members) {
        columns.push({
          key: `${f.id}::${inst}::${m.id}`,
          header: `${f.label || 'Item'} ${inst + 1} - ${m.label || m.id}`,
          render: (values) => {
            let instances: { id: string; values: Record<string, string> }[] = [];
            try { instances = JSON.parse(values[f.id] || '[]'); } catch { /* empty */ }
            const instance = instances[inst];
            if (!instance) return EMPTY_CELL;
            return renderGridCell(m, instance.values[m.id] || '');
          },
        });
      }
    }
  }

  return columns;
}

// Read-only spreadsheet-style view: one row per response, one column per form field (repeating
// Sections expand into numbered per-instance columns). Cell rendering reuses the same
// renderCellDisplay the Excel export uses, so a value can never look different between the
// grid and the exported file.
function GridView({ fieldDefs, responses }: { fieldDefs: FormField[]; responses: ResponseItem[] }) {
  const columns = buildGridColumns(fieldDefs, responses);
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'auto', maxHeight: '100%' }}>
      <table style={{ borderCollapse: 'collapse', fontSize: 12.5, minWidth: '100%' }}>
        <thead>
          <tr>
            <th style={{ position: 'sticky', top: 0, left: 0, zIndex: 2, background: 'var(--surface2)', textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', borderBottom: '1px solid var(--border)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' }}>#</th>
            <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface2)', textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Submitted By</th>
            <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface2)', textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Date</th>
            <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface2)', textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>Status</th>
            {columns.map((c) => (
              <th key={c.key} style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--surface2)', textAlign: 'left', padding: '8px 12px', fontSize: 11, fontWeight: 700, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{c.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {responses.map((r, idx) => (
            <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
              <td style={{ position: 'sticky', left: 0, background: 'var(--surface)', padding: '8px 12px', color: 'var(--muted)', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{idx + 1}</td>
              <td style={{ padding: '8px 12px', color: 'var(--text)', whiteSpace: 'nowrap' }}>{r.submittedBy}</td>
              <td style={{ padding: '8px 12px', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{formatDate(r.date)}</td>
              <td style={{ padding: '8px 12px', whiteSpace: 'nowrap' }}>{r.status}</td>
              {columns.map((c) => (
                <td key={c.key} style={{ padding: '8px 12px', color: 'var(--text)', verticalAlign: 'top', maxWidth: 260, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.render(r.values || {})}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getPeriodsForSchedule(schedule: { frequency: string; startDate: string }, responsesDates: string[]) {
  const now = new Date();
  const start = new Date(schedule.startDate);
  const periods: { label: string; key: string; status: 'completed' | 'due' | 'upcoming' | 'overdue' }[] = [];

  const parsedDates = responsesDates.map(d => new Date(d));

  if (schedule.frequency === 'monthly') {
    const startMonth = start.getFullYear() * 12 + start.getMonth();
    const endMonth = now.getFullYear() * 12 + now.getMonth();
    for (let m = startMonth; m <= endMonth + 2; m++) {
      const year = Math.floor(m / 12);
      const month = m % 12;
      const key = `${year}-${String(month + 1).padStart(2, '0')}`;
      const label = `${MONTH_NAMES[month]} ${year}`;
      const hasResponse = parsedDates.some(d => d.getFullYear() === year && d.getMonth() === month);
      const isPast = m < now.getFullYear() * 12 + now.getMonth();
      const isCurrent = m === now.getFullYear() * 12 + now.getMonth();
      const status = hasResponse ? 'completed' : isPast ? 'overdue' : isCurrent ? 'due' : 'upcoming';
      periods.push({ label, key, status });
    }
  } else if (schedule.frequency === 'quarterly') {
    const startQ = start.getFullYear() * 4 + Math.floor(start.getMonth() / 3);
    const endQ = now.getFullYear() * 4 + Math.floor(now.getMonth() / 3);
    for (let q = startQ; q <= endQ + 1; q++) {
      const year = Math.floor(q / 4);
      const quarter = q % 4;
      const key = `${year}-Q${quarter + 1}`;
      const label = `Q${quarter + 1} ${year}`;
      const qMonths = [quarter * 3, quarter * 3 + 1, quarter * 3 + 2];
      const hasResponse = parsedDates.some(d => d.getFullYear() === year && qMonths.includes(d.getMonth()));
      const isPast = q < now.getFullYear() * 4 + Math.floor(now.getMonth() / 3);
      const isCurrent = q === now.getFullYear() * 4 + Math.floor(now.getMonth() / 3);
      const status = hasResponse ? 'completed' : isPast ? 'overdue' : isCurrent ? 'due' : 'upcoming';
      periods.push({ label, key, status });
    }
  } else if (schedule.frequency === 'yearly') {
    for (let y = start.getFullYear(); y <= now.getFullYear() + 1; y++) {
      const key = `${y}`;
      const label = `${y}`;
      const hasResponse = parsedDates.some(d => d.getFullYear() === y);
      const isPast = y < now.getFullYear();
      const isCurrent = y === now.getFullYear();
      const status = hasResponse ? 'completed' : isPast ? 'overdue' : isCurrent ? 'due' : 'upcoming';
      periods.push({ label, key, status });
    }
  } else if (schedule.frequency === 'weekly') {
    const getWeekKey = (d: Date) => {
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const week = Math.ceil(((d.getTime() - jan1.getTime()) / 86400000 + jan1.getDay() + 1) / 7);
      return `${d.getFullYear()}-W${week}`;
    };
    const current = new Date(start);
    const limit = new Date(now);
    limit.setDate(limit.getDate() + 14);
    while (current <= limit) {
      const key = getWeekKey(current);
      const weekStart = new Date(current);
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      const label = `${MONTH_NAMES[weekStart.getMonth()]} ${weekStart.getDate()} - ${weekEnd.getDate()}`;
      const hasResponse = parsedDates.some(d => getWeekKey(d) === key);
      const isPast = weekEnd < now;
      const isCurrent = weekStart <= now && now <= weekEnd;
      const status = hasResponse ? 'completed' : isPast ? 'overdue' : isCurrent ? 'due' : 'upcoming';
      if (!periods.find(p => p.key === key)) periods.push({ label, key, status });
      current.setDate(current.getDate() + 7);
    }
  }

  return periods;
}

export default function FormResponses() {
  const viewingFormId = useStore((s) => s.viewingFormId);
  const forms = useStore((s) => s.forms);
  const setNav = useStore((s) => s.setNav);
  const accent = useStore((s) => s.accent);
  const winWidth = useStore((s) => s.winWidth);
  const companies = useStore((s) => s.companies);
  const activeCompanyId = useStore((s) => s.activeCompanyId);

  const form = forms.find(f => f.id === viewingFormId);
  const fieldDefs = form?.fieldDefs || [];
  const isMobile = winWidth < 720;
  const isScheduled = form?.schedule && form.schedule.frequency !== 'once';

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cards' | 'grid'>('cards');

  // The shared store's response list is metadata-only (no field values) so it stays cheap
  // everywhere it's used for counts/status. This screen actually renders and exports field
  // values (photos, signatures, checklist results), so it fetches its own full set for just
  // this one form instead.
  const [formResponses, setFormResponses] = useState<ResponseItem[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    if (!viewingFormId) return;
    let cancelled = false;
    setLoadingResponses(true);
    setLoadError('');
    api.getFullResponsesForForm(viewingFormId)
      .then((data) => { if (!cancelled) setFormResponses(data); })
      .catch((err) => { if (!cancelled) setLoadError(err?.message || 'Failed to load responses'); })
      .finally(() => { if (!cancelled) setLoadingResponses(false); });
    return () => { cancelled = true; };
  }, [viewingFormId]);

  if (!form) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)' }}>
        Form not found.
        <button onClick={() => setNav('forms')} style={{ marginLeft: 12, color: accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Back</button>
      </div>
    );
  }

  if (loadingResponses) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 13.5 }}>
        Loading responses…
      </div>
    );
  }

  if (loadError) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', gap: 10 }}>
        <div style={{ color: '#DC2626', fontSize: 13.5 }}>{loadError}</div>
        <button onClick={() => setNav('forms')} style={{ color: accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Back</button>
      </div>
    );
  }

  const downloadReport = () => {
    downloadHTMLReport(form.name, form.description || '', fieldDefs, displayedResponses);
    setShowExportMenu(false);
  };

  const downloadExcel = () => {
    downloadExcelReport(form.name, form.description || '', fieldDefs, displayedResponses);
    setShowExportMenu(false);
  };

  const downloadAudit = () => {
    const companyName = companies.find(c => c.id === (form.companyId || activeCompanyId))?.name || 'Company';
    downloadAuditReport(form.name, form.description || '', fieldDefs, displayedResponses, companyName);
    setShowExportMenu(false);
  };

  const periods = isScheduled ? getPeriodsForSchedule(form.schedule!, formResponses.map(r => r.date)) : [];
  const completedCount = periods.filter(p => p.status === 'completed').length;
  const overdueCount = periods.filter(p => p.status === 'overdue').length;

  const displayedResponses = selectedPeriod
    ? formResponses.filter(r => {
        const d = new Date(r.date);
        if (selectedPeriod.includes('-Q')) {
          const [y, q] = selectedPeriod.split('-Q');
          const quarter = parseInt(q) - 1;
          return d.getFullYear() === parseInt(y) && Math.floor(d.getMonth() / 3) === quarter;
        }
        if (selectedPeriod.includes('-W')) {
          return true;
        }
        if (selectedPeriod.includes('-')) {
          const [y, m] = selectedPeriod.split('-');
          return d.getFullYear() === parseInt(y) && d.getMonth() === parseInt(m) - 1;
        }
        return d.getFullYear() === parseInt(selectedPeriod);
      })
    : formResponses;

  const renderValue = (fieldId: string, type: string) => {
    const val = expandedResponse?.values?.[fieldId] || '';
    if (!val) return <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Not answered</span>;
    if (type === 'beforeafter') {
      try {
        const ba = JSON.parse(val);
        return (
          <div>
            <div style={{ display: 'flex', gap: 8 }}>
              {ba.before && <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>BEFORE</div>
                <img src={ba.before} alt="Before" onClick={() => setImageModal(ba.before)} style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)' }} />
                {ba.beforeDesc && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{ba.beforeDesc}</div>}
              </div>}
              {ba.after && <div style={{ flex: 1 }}>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>AFTER</div>
                <img src={ba.after} alt="After" onClick={() => setImageModal(ba.after)} style={{ width: '100%', maxHeight: 160, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)' }} />
                {ba.afterDesc && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>{ba.afterDesc}</div>}
              </div>}
            </div>
            {ba.observation && <div style={{ fontSize: 12, color: 'var(--text)', marginTop: 8, padding: '8px 10px', background: 'var(--surface2)', borderRadius: 6, borderLeft: '3px solid var(--border)' }}><strong>Observation:</strong> {ba.observation}</div>}
          </div>
        );
      } catch { /* fall through */ }
    }
    if (type === 'photochecklist') {
      try {
        const data = JSON.parse(val);
        const items = data.items || [];
        const attempts = data.attempts || [];
        const latest = attempts[attempts.length - 1];
        if (!latest) return <span style={{ color: 'var(--muted)', fontStyle: 'italic' }}>Not answered</span>;
        return (
          <div>
            <img src={latest.photo} alt="Checklist photo" onClick={() => setImageModal(latest.photo)}
              style={{ width: '100%', maxHeight: 200, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: '1px solid var(--border)', marginBottom: 8 }} />
            {latest.error && <div style={{ fontSize: 12, color: '#DC2626' }}>{latest.error}</div>}
            {items.map((item: any) => {
              const r = (latest.results || []).find((res: any) => res.itemId === item.id);
              if (!r) return null;
              return (
                <div key={item.id} style={{ fontSize: 12, color: 'var(--text)', marginTop: 4 }}>
                  {r.found ? '✅' : '❌'} <strong>{item.text}</strong> <span style={{ color: 'var(--muted)' }}>({item.direction === 'absent' ? 'must be absent' : 'must be present'})</span> — <span style={{ color: 'var(--muted)' }}>{r.note}</span>
                </div>
              );
            })}
            {attempts.length > 1 && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 6 }}>{attempts.length} attempts total</div>}
          </div>
        );
      } catch { /* fall through */ }
    }
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

  const statusColors: Record<string, { bg: string; color: string; icon: typeof CheckCircle }> = {
    completed: { bg: '#DCFCE7', color: '#15803D', icon: CheckCircle },
    due: { bg: '#FEF3C7', color: '#92400E', icon: Clock },
    overdue: { bg: '#FEE2E2', color: '#DC2626', icon: AlertCircle },
    upcoming: { bg: '#F3F4F6', color: '#6B7280', icon: Clock },
  };

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
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>
            {formResponses.length} responses
            {isScheduled && <> · <CalendarClock size={10} style={{ verticalAlign: 'middle' }} /> {form.schedule!.frequency}</>}
          </div>
        </div>
        <div style={{ display: 'inline-flex', border: '1px solid var(--border)', borderRadius: 7, overflow: 'hidden' }}>
          <button type="button" onClick={() => setViewMode('cards')} title="Card view"
            style={{ height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', background: viewMode === 'cards' ? 'var(--surface2)' : 'var(--surface)', color: viewMode === 'cards' ? 'var(--text)' : 'var(--muted)', cursor: 'pointer' }}>
            <LayoutList size={15} />
          </button>
          <button type="button" onClick={() => setViewMode('grid')} title="Grid (spreadsheet) view"
            style={{ height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', borderLeft: '1px solid var(--border)', background: viewMode === 'grid' ? 'var(--surface2)' : 'var(--surface)', color: viewMode === 'grid' ? 'var(--text)' : 'var(--muted)', cursor: 'pointer' }}>
            <Table2 size={15} />
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <button type="button" onClick={() => setShowExportMenu(!showExportMenu)}
            style={{ height: 32, padding: '0 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Download size={13} /> Export{selectedPeriod ? ' Period' : ' All'}
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
              <button onClick={downloadAudit}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left', borderTop: '1px solid var(--border)' }}>
                <FileText size={14} /> Audit Report (Single Page)
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 16 : 24 }}>
        {isScheduled && periods.length > 0 && (
          <div style={{ maxWidth: 800, margin: '0 auto 20px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <CalendarClock size={15} color={accent} />
                <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Schedule Tracker</span>
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 11, color: 'var(--muted)' }}>
                <span><strong style={{ color: '#15803D' }}>{completedCount}</strong> completed</span>
                {overdueCount > 0 && <span><strong style={{ color: '#DC2626' }}>{overdueCount}</strong> overdue</span>}
                <span><strong style={{ color: 'var(--text)' }}>{periods.length}</strong> total</span>
              </div>
            </div>

            {selectedPeriod && (
              <button onClick={() => setSelectedPeriod(null)}
                style={{ marginBottom: 10, fontSize: 11, color: accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
                ← Show all responses
              </button>
            )}

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {periods.map(p => {
                const sc = statusColors[p.status];
                const Icon = sc.icon;
                const isSelected = selectedPeriod === p.key;
                return (
                  <button key={p.key} onClick={() => setSelectedPeriod(isSelected ? null : p.key)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 7,
                      border: isSelected ? `2px solid ${accent}` : '1px solid var(--border)',
                      background: isSelected ? `${accent}10` : sc.bg, color: sc.color,
                      fontSize: 11, fontWeight: 600, cursor: 'pointer',
                    }}>
                    <Icon size={11} /> {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {displayedResponses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 48, color: 'var(--muted)', fontSize: 14 }}>
            {selectedPeriod ? 'No responses for this period.' : 'No responses yet.'}
          </div>
        ) : viewMode === 'grid' ? (
          <GridView fieldDefs={fieldDefs} responses={displayedResponses} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, maxWidth: 800, margin: '0 auto' }}>
            {displayedResponses.map((r, idx) => {
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
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.plant} · {formatDate(r.date)}</div>
                    </div>
                    {r.values && Object.values(r.values).some(v => v.startsWith('data:image') || (v.startsWith('{') && v.includes('"before"'))) && (
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
