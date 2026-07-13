import type { FormField } from '../store/types';
import { formatDate } from './format';

interface ResponseData {
  submittedBy: string;
  plant: string;
  date: string;
  values?: Record<string, string>;
}

export function downloadExcelReport(formName: string, description: string, fieldDefs: FormField[], formResponses: ResponseData[]) {
  const now = new Date().toLocaleString();
  const visibleFields = fieldDefs.filter(f => !f.hidden);

  const headerCells = ['#', 'Submitted By', 'Plant', 'Date', ...visibleFields.map(f =>
    `<th style="padding:8px 12px;font-size:11px;font-weight:700;color:#374151;background:#f1f5f9;border:1px solid #e2e8f0;white-space:nowrap;text-align:left;">${f.label}${f.required ? ' <span style="color:#ef4444;">*</span>' : ''}</th>`
  )].map((h, i) => i < 4
    ? `<th style="padding:8px 12px;font-size:11px;font-weight:700;color:#374151;background:#e2e8f0;border:1px solid #cbd5e1;white-space:nowrap;text-align:left;">${h}</th>`
    : h
  ).join('');

  const rows = formResponses.map((r, i) => {
    const vals = r.values || {};
    const metaCells = [
      `<td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:12px;font-weight:700;color:#374151;text-align:center;background:#f8fafc;">${i + 1}</td>`,
      `<td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:12px;color:#1f2937;">${r.submittedBy}</td>`,
      `<td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:12px;color:#1f2937;">${r.plant}</td>`,
      `<td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:12px;color:#6b7280;white-space:nowrap;">${formatDate(r.date)}</td>`,
    ];

    const fieldCells = visibleFields.map(f => {
      const v = vals[f.id] || '';
      let display: string;
      if (!v) {
        display = '<span style="color:#9ca3af;font-style:italic;">—</span>';
      } else if (f.type === 'beforeafter') {
        try {
          const ba = JSON.parse(v);
          display = `<div style="display:flex;gap:4px;">${ba.before ? `<img src="${ba.before}" style="max-width:80px;max-height:80px;border-radius:4px;" />` : ''}${ba.after ? `<img src="${ba.after}" style="max-width:80px;max-height:80px;border-radius:4px;" />` : ''}</div>`;
        } catch { display = v; }
      } else if (f.type === 'photochecklist') {
        try {
          const data = JSON.parse(v);
          const attempts = data.attempts || [];
          const latest = attempts[attempts.length - 1];
          const satisfied = latest?.results?.filter((r: any) => r.found).length ?? 0;
          const total = latest?.results?.length ?? 0;
          display = `${latest?.photo ? `<img src="${latest.photo}" style="max-width:80px;max-height:80px;border-radius:4px;" />` : ''} ${total ? `${satisfied}/${total} satisfied` : ''}`;
        } catch { display = v; }
      } else if (v.startsWith('data:image')) {
        display = `<img src="${v}" style="max-width:160px;max-height:120px;border-radius:4px;border:1px solid #e2e8f0;display:block;" />`;
      } else if (v.startsWith('data:')) {
        display = '<span style="color:#2563eb;font-size:11px;">[File]</span>';
      } else if (f.type === 'toggle') {
        const yes = v === 'true';
        display = `<span style="display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:${yes ? '#dcfce7' : '#fee2e2'};color:${yes ? '#15803d' : '#dc2626'};">${yes ? 'Yes' : 'No'}</span>`;
      } else if (f.type === 'rating') {
        const n = parseInt(v) || 0;
        display = `<span style="font-size:14px;letter-spacing:1px;">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span>`;
      } else {
        display = v.replace(/\|\|/g, ', ').replace(/</g, '&lt;');
      }
      return `<td style="padding:8px 12px;border:1px solid #e2e8f0;font-size:12px;color:#1f2937;vertical-align:top;">${display}</td>`;
    }).join('');

    const bg = i % 2 === 0 ? '' : 'background:#f8fafc;';
    return `<tr style="${bg}">${metaCells.join('')}${fieldCells}</tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${formName} — Excel Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; color: #1f2937; }
  table { border-collapse: collapse; }
  @media print {
    body { background: #fff; }
    .no-print { display: none !important; }
    .sheet { box-shadow: none !important; margin: 0 !important; border-radius: 0 !important; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div style="max-width:100%;padding:24px 20px;">

  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;flex-wrap:wrap;">
    <div style="width:36px;height:36px;border-radius:9px;background:#1a3f8f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;">D</div>
    <div style="flex:1;min-width:200px;">
      <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">DockForm Excel Report</div>
      <div style="font-size:18px;font-weight:700;color:#111827;">${formName}</div>
      ${description ? `<div style="font-size:12px;color:#6b7280;margin-top:2px;">${description}</div>` : ''}
    </div>
    <div style="font-size:12px;color:#6b7280;text-align:right;">
      <div><strong style="color:#374151;">${formResponses.length}</strong> responses · <strong style="color:#374151;">${visibleFields.length}</strong> fields</div>
      <div style="margin-top:2px;">Generated: ${now}</div>
    </div>
  </div>

  <div class="no-print" style="margin-bottom:16px;display:flex;gap:10px;">
    <button onclick="window.print()" style="padding:8px 18px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer;">Print / Save as PDF</button>
  </div>

  <div class="sheet" style="background:#fff;border-radius:10px;box-shadow:0 1px 6px rgba(0,0,0,.08);overflow-x:auto;">
    <table style="width:100%;min-width:${4 * 120 + visibleFields.length * 150}px;">
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  </div>

  <div style="text-align:center;padding:20px;font-size:11px;color:#9ca3af;">
    Generated by DockForm · ${now}
  </div>
</div>
</body>
</html>`;

  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${formName.replace(/[^a-z0-9]+/gi, '_')}_excel_report.html`;
  a.click();
  URL.revokeObjectURL(url);
}
