import { Upload } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { StatusBadge } from '../ui/StatusBadge';
import { toCSV, downloadCSV } from '../../lib/csv';
import { formatDate } from '../../lib/format';

export default function ReportsScreen() {
  const responses = useStore((s) => s.responses);
  const accent = useStore((s) => s.accent);

  const downloadRow = (r: typeof responses[0]) => {
    const headers = ['Form', 'Submitted By', 'Plant', 'Date', 'Status'];
    const row = [r.form, r.submittedBy, r.plant, r.date, r.status];
    downloadCSV(r.form.replace(/[^a-z0-9]+/gi, '_') + '.csv', toCSV(headers, [row]));
  };

  const downloadAll = () => {
    const headers = ['Form', 'Submitted By', 'Plant', 'Date', 'Status'];
    const rows = responses.map((r) => [r.form, r.submittedBy, r.plant, r.date, r.status]);
    downloadCSV('All_Responses_Report.csv', toCSV(headers, rows));
  };

  const winWidth = useStore((s) => s.winWidth);
  const isMobile = winWidth < 720;
  const pad = isMobile ? '16px' : '24px 32px';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: pad, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.5px' }}>Reports</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>Export completed checklists and submissions as Excel-compatible reports</p>
        </div>
        <button onClick={downloadAll} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <Upload size={14} /> Export All as Excel
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'auto', padding: pad }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Form / Checklist', 'Submitted By', 'Plant', 'Date', 'Status', 'Report'].map((h) => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 16px', fontSize: 12, fontWeight: 500, color: 'var(--muted)', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {responses.map((r) => (
                <tr key={r.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>{r.form}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{r.submittedBy}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--text)' }}>{r.plant}</td>
                  <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{formatDate(r.date)}</td>
                  <td style={{ padding: '12px 16px' }}><StatusBadge status={r.status} /></td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => downloadRow(r)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5, padding: '6px 12px', fontSize: 12, fontWeight: 600,
                        background: accent, color: '#fff', border: 'none', borderRadius: 7, cursor: 'pointer',
                      }}
                    >
                      <Upload size={12} /> Download
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
