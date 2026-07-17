import type { FormField } from '../store/types';
import { formatDate } from './format';
import { buildInlineImageMap, applyInlineImageMap } from './imageInline';

interface ResponseData {
  submittedBy: string;
  assignedToName?: string | null;
  status?: string;
  plant: string;
  date: string;
  values?: Record<string, string>;
}

// Given the full ordered field list and a section marker field, returns the member
// fields that belong to it (the run of ordinary fields up to the next section marker).
function sectionMembers(allFields: FormField[], marker: FormField): FormField[] {
  const idx = allFields.findIndex(f => f.id === marker.id);
  if (idx === -1) return [];
  const members: FormField[] = [];
  for (let i = idx + 1; i < allFields.length && allFields[i].type !== 'section'; i++) members.push(allFields[i]);
  return members;
}

function renderFieldDisplay(f: FormField, v: string, allFields: FormField[]): string {
  if (!v) return '<span style="color:#9ca3af;font-style:italic;">Not answered</span>';
  if (f.type === 'beforeafter') {
    try {
      const ba = JSON.parse(v);
      return `<div style="display:flex;gap:8px;margin-top:4px;">${ba.before ? `<div style="flex:1;"><img src="${ba.before}" style="max-width:100%;max-height:180px;border-radius:6px;border:1px solid #e5e7eb;" />${ba.beforeDesc ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">${ba.beforeDesc}</div>` : ''}</div>` : ''}${ba.after ? `<div style="flex:1;"><img src="${ba.after}" style="max-width:100%;max-height:180px;border-radius:6px;border:1px solid #e5e7eb;" />${ba.afterDesc ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">${ba.afterDesc}</div>` : ''}</div>` : ''}</div>${ba.observation ? `<div style="margin-top:6px;padding:8px;background:#f9fafb;border-radius:6px;font-size:12px;color:#374151;"><strong>Observation:</strong> ${ba.observation}</div>` : ''}`;
    } catch { return v; }
  }
  if (f.type === 'photochecklist') {
    try {
      const data = JSON.parse(v);
      const items = data.items || [];
      const attempts = data.attempts || [];
      const latest = attempts[attempts.length - 1];
      const rows = items.map((item: any) => {
        const r = (latest?.results || []).find((res: any) => res.itemId === item.id);
        if (!r) return '';
        return `<div style="font-size:12px;color:#374151;">${r.found ? '✅' : '❌'} <strong>${item.text}</strong> (${item.direction === 'absent' ? 'must be absent' : 'must be present'}) — ${r.note}</div>`;
      }).join('');
      return `${latest?.photo ? `<img src="${latest.photo}" style="max-width:250px;max-height:180px;border-radius:6px;border:1px solid #e5e7eb;margin-bottom:6px;" />` : ''}${rows}${attempts.length > 1 ? `<div style="font-size:11px;color:#9ca3af;margin-top:4px;">${attempts.length} attempts total</div>` : ''}`;
    } catch { return v; }
  }
  if (f.type === 'section' && f.repeatable) {
    try {
      const instances: { id: string; values: Record<string, string>; label?: string }[] = JSON.parse(v);
      const members = sectionMembers(allFields, f).filter(sf => !sf.hidden);
      if (instances.length === 0) return '<span style="color:#9ca3af;font-style:italic;">None added</span>';
      if (f.tableLayout) {
        return `<table style="border-collapse:collapse;font-size:12px;width:100%;"><thead><tr>
          <th style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;">${f.label}</th>
          ${members.map(sf => `<th style="padding:6px 10px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;">${sf.label}</th>`).join('')}
        </tr></thead><tbody>${instances.map(inst => `
          <tr>
            <td style="padding:6px 10px;border:1px solid #e5e7eb;font-weight:600;white-space:nowrap;">${inst.label || '—'}</td>
            ${members.map(sf => `<td style="padding:6px 10px;border:1px solid #e5e7eb;">${renderFieldDisplay(sf, inst.values[sf.id] || '', allFields)}</td>`).join('')}
          </tr>`).join('')}</tbody></table>`;
      }
      return instances.map((inst, i) => `
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#f9fafb;">
          <div style="font-size:11px;font-weight:700;font-style:italic;color:#6b7280;margin-bottom:6px;">${inst.label || `${f.label || 'Item'} ${i + 1}`}</div>
          ${members.map(sf => `
            <div style="margin-bottom:6px;">
              <div style="font-size:10px;font-weight:600;color:#9ca3af;">${sf.label}</div>
              <div style="font-size:12px;color:#1f2937;">${renderFieldDisplay(sf, inst.values[sf.id] || '', allFields)}</div>
            </div>`).join('')}
        </div>`).join('');
    } catch { return v; }
  }
  if (v.startsWith('data:image')) {
    return `<img src="${v}" style="max-width:300px;max-height:200px;border-radius:6px;border:1px solid #e5e7eb;margin-top:4px;" />`;
  }
  if (v.startsWith('data:')) return '<span style="color:#2563eb;">[File attached]</span>';
  if (f.type === 'toggle') {
    const yes = v === 'true';
    return `<span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:12px;font-weight:600;background:${yes ? '#dcfce7' : '#fee2e2'};color:${yes ? '#15803d' : '#dc2626'};">${yes ? 'Yes' : 'No'}</span>`;
  }
  if (f.type === 'rating') {
    const n = parseInt(v) || 0;
    return `<span style="font-size:18px;letter-spacing:2px;">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span> <span style="color:#6b7280;">(${n}/5)</span>`;
  }
  return v.replace(/\|\|/g, ', ').replace(/</g, '&lt;');
}

export async function downloadHTMLReport(formName: string, description: string, fieldDefs: FormField[], formResponses: ResponseData[]) {
  const now = new Date().toLocaleString();
  const imageMap = await buildInlineImageMap(formResponses.flatMap(r => Object.values(r.values || {})));

  const repeatableMemberIds = new Set<string>();
  fieldDefs.forEach((f) => { if (f.type === 'section' && f.repeatable) sectionMembers(fieldDefs, f).forEach(m => repeatableMemberIds.add(m.id)); });
  // Walk fields in original order so section headers land where they were placed on the
  // canvas, instead of grouping all sections at the end.
  const rowFields = fieldDefs.filter(f => !f.hidden && !repeatableMemberIds.has(f.id));

  const responseCards = formResponses.map((r, i) => {
    const vals = r.values || {};
    const fieldRows = rowFields.map(f => {
      if (f.type === 'section' && !f.repeatable) {
        return `
        <tr>
          <td colspan="2" style="padding:14px 14px 6px;font-size:14px;font-weight:700;font-style:italic;color:#111827;border-bottom:1px solid #f3f4f6;">${f.label}</td>
        </tr>`;
      }
      const display = renderFieldDisplay(f, vals[f.id] || '', fieldDefs);
      return `
        <tr>
          <td style="padding:10px 14px;font-size:12px;font-weight:600;color:#374151;background:#f9fafb;border-bottom:1px solid #f3f4f6;width:200px;vertical-align:top;">${f.label}${f.required ? ' <span style="color:#ef4444;">*</span>' : ''}</td>
          <td style="padding:10px 14px;font-size:13px;color:#1f2937;border-bottom:1px solid #f3f4f6;vertical-align:top;">${display}</td>
        </tr>`;
    }).join('');

    return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:10px;margin-bottom:24px;overflow:hidden;page-break-inside:avoid;">
        <div style="padding:14px 18px;background:#f9fafb;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <span style="font-size:15px;font-weight:700;color:#111827;">Response #${i + 1}</span>
            <span style="margin-left:12px;font-size:13px;color:#6b7280;">
              ${r.assignedToName ? `Assigned by ${r.submittedBy} &rarr; ${r.status === 'submitted' ? 'Completed' : 'Pending with'} ${r.assignedToName}` : r.submittedBy}
            </span>
          </div>
          <div style="font-size:12px;color:#9ca3af;">${r.plant} &middot; ${formatDate(r.date)}</div>
        </div>
        <table style="width:100%;border-collapse:collapse;">
          ${fieldRows}
        </table>
      </div>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${formName} — Responses Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f3f4f6; color: #1f2937; }
  @media print {
    body { background: #fff; }
    .no-print { display: none !important; }
    .container { max-width: 100% !important; padding: 0 !important; }
  }
</style>
</head>
<body>
<div class="container" style="max-width:800px;margin:0 auto;padding:32px 20px;">

  <div style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:24px 28px;margin-bottom:24px;">
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
      <div style="width:36px;height:36px;border-radius:9px;background:#1a3f8f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:15px;font-weight:800;">D</div>
      <div>
        <div style="font-size:11px;font-weight:600;color:#9ca3af;text-transform:uppercase;letter-spacing:0.05em;">DockForm Report</div>
        <div style="font-size:20px;font-weight:700;color:#111827;">${formName}</div>
      </div>
    </div>
    ${description ? `<div style="font-size:13px;color:#6b7280;margin-top:4px;">${description}</div>` : ''}
    <div style="display:flex;gap:24px;margin-top:14px;flex-wrap:wrap;">
      <div style="font-size:12px;color:#6b7280;"><strong style="color:#374151;">${formResponses.length}</strong> responses</div>
      <div style="font-size:12px;color:#6b7280;"><strong style="color:#374151;">${fieldDefs.length}</strong> fields</div>
      <div style="font-size:12px;color:#6b7280;">Generated: ${now}</div>
    </div>
  </div>

  <div class="no-print" style="margin-bottom:20px;display:flex;gap:10px;">
    <button onclick="window.print()" style="padding:8px 18px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer;">Print / Save as PDF</button>
  </div>

  ${responseCards}

  <div style="text-align:center;padding:20px;font-size:11px;color:#9ca3af;">
    Generated by DockForm &middot; ${now}
  </div>
</div>
</body>
</html>`;

  const finalHtml = applyInlineImageMap(html, imageMap);
  const blob = new Blob([finalHtml], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${formName.replace(/[^a-z0-9]+/gi, '_')}_report.html`;
  a.click();
  URL.revokeObjectURL(url);
}
