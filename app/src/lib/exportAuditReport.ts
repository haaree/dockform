import type { FormField } from '../store/types';
import { formatDate } from './format';
import { buildInlineImageMap, applyInlineImageMap } from './imageInline';
import { noteKey, mediaKey } from './fieldAnnotations';
import { isYesNoOptions, yesNoColor } from './yesNoNa';

interface AuditResponseData {
  submittedBy: string;
  assignedToName?: string | null;
  status?: string;
  plant: string;
  date: string;
  values?: Record<string, string>;
}

function sectionMembers(allFields: FormField[], marker: FormField): FormField[] {
  const idx = allFields.findIndex(f => f.id === marker.id);
  if (idx === -1) return [];
  const members: FormField[] = [];
  for (let i = idx + 1; i < allFields.length && allFields[i].type !== 'section'; i++) members.push(allFields[i]);
  return members;
}

function renderActivityField(f: FormField, v: string, allFields: FormField[]): string {
  if (f.type === 'section' && !f.repeatable) {
    return `<div style="font-size:13px;font-weight:700;font-style:italic;color:#111827;margin:14px 0 6px;padding-bottom:4px;border-bottom:1px solid #e5e7eb;">${f.label}</div>`;
  }
  if (f.type === 'beforeafter') {
    try {
      const ba = JSON.parse(v);
      return `
        <div style="margin:10px 0;">
          <div style="font-size:11px;font-weight:600;color:#6b7280;margin-bottom:6px;">${f.label}</div>
          <div style="display:flex;gap:10px;page-break-inside:avoid;">
            ${ba.before ? `<div style="flex:1;text-align:center;"><div style="font-size:10px;font-weight:600;color:#9ca3af;margin-bottom:4px;">BEFORE</div><img src="${ba.before}" style="width:100%;max-height:130px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" />${ba.beforeDesc ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">${ba.beforeDesc}</div>` : ''}</div>` : ''}
            ${ba.after ? `<div style="flex:1;text-align:center;"><div style="font-size:10px;font-weight:600;color:#9ca3af;margin-bottom:4px;">AFTER</div><img src="${ba.after}" style="width:100%;max-height:130px;object-fit:cover;border-radius:6px;border:1px solid #e5e7eb;" />${ba.afterDesc ? `<div style="font-size:11px;color:#6b7280;margin-top:4px;">${ba.afterDesc}</div>` : ''}</div>` : ''}
          </div>
          ${ba.observation ? `<div style="margin-top:8px;padding:8px 12px;background:#eff6ff;border-radius:6px;font-size:12px;color:#1e40af;border-left:3px solid #3b82f6;"><strong>Observation:</strong> ${ba.observation}</div>` : ''}
        </div>`;
    } catch { return ''; }
  }
  if (f.type === 'photochecklist') {
    try {
      const data = JSON.parse(v);
      const items = data.items || [];
      const attempts = data.attempts || [];
      const latest = attempts[attempts.length - 1];
      if (!latest) return '';
      const rows = items.map((item: any) => {
        const r = (latest.results || []).find((res: any) => res.itemId === item.id);
        if (!r) return '';
        return `<div style="font-size:11px;color:#1f2937;margin-top:2px;">${r.found ? '✅' : '❌'} <strong>${item.text}</strong> (${item.direction === 'absent' ? 'must be absent' : 'must be present'}) — ${r.note}</div>`;
      }).join('');
      return `
        <div style="margin:10px 0;page-break-inside:avoid;">
          <div style="font-size:11px;font-weight:600;color:#6b7280;margin-bottom:6px;">${f.label}${attempts.length > 1 ? ` (attempt ${attempts.length})` : ''}</div>
          <img src="${latest.photo}" style="max-width:140px;max-height:105px;border-radius:6px;border:1px solid #e5e7eb;margin-bottom:6px;" />
          ${rows}
        </div>`;
    } catch { return ''; }
  }
  if (f.type === 'section' && f.repeatable) {
    try {
      const instances: { id: string; values: Record<string, string>; label?: string }[] = JSON.parse(v);
      const members = sectionMembers(allFields, f).filter(sf => !sf.hidden);
      if (instances.length === 0) return '';
      if (f.tableLayout) {
        return `
          <div style="margin:10px 0;">
            <div style="font-size:11px;font-weight:700;font-style:italic;color:#6b7280;margin-bottom:6px;">${f.label}</div>
            <table style="border-collapse:collapse;font-size:11px;width:100%;table-layout:fixed;"><colgroup>
              <col style="width:22%;" />
              ${members.map(() => `<col style="width:${Math.round(78 / Math.max(members.length, 1))}%;" />`).join('')}
            </colgroup><thead><tr>
              <th style="padding:5px 8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;word-wrap:break-word;overflow-wrap:break-word;">${f.label}</th>
              ${members.map(sf => `<th style="padding:5px 8px;border:1px solid #e5e7eb;background:#f9fafb;text-align:left;word-wrap:break-word;overflow-wrap:break-word;">${sf.label}</th>`).join('')}
            </tr></thead><tbody>${instances.map(inst => `
              <tr>
                <td style="padding:5px 8px;border:1px solid #e5e7eb;font-weight:600;word-wrap:break-word;overflow-wrap:break-word;">${inst.label || '—'}</td>
                ${members.map(sf => `<td style="padding:5px 8px;border:1px solid #e5e7eb;word-wrap:break-word;overflow-wrap:break-word;">${renderActivityField(sf, inst.values[sf.id] || '', allFields)}${renderAnnotationCell(sf.id, inst.values)}</td>`).join('')}
              </tr>`).join('')}</tbody></table>
          </div>`;
      }
      return `
        <div style="margin:10px 0;">
          <div style="font-size:11px;font-weight:700;font-style:italic;color:#6b7280;margin-bottom:6px;">${f.label}</div>
          ${instances.map((inst, i) => `
            <div style="border:1px solid #e5e7eb;border-radius:8px;padding:10px 12px;margin-bottom:8px;background:#f9fafb;">
              <div style="font-size:10px;font-weight:700;color:#9ca3af;margin-bottom:4px;">${(inst.label || `${f.label || 'ITEM'} ${i + 1}`).toUpperCase()}</div>
              ${members.map(sf => renderActivityField(sf, inst.values[sf.id] || '', allFields) + renderAnnotationCell(sf.id, inst.values)).join('')}
            </div>`).join('')}
        </div>`;
    } catch { return ''; }
  }
  if (!v) return '';
  if (v.startsWith('data:image') || (v.startsWith('/api/files/') && /\.(png|jpe?g|gif|webp)$/i.test(v))) {
    return `<div style="margin:6px 0;page-break-inside:avoid;"><div style="font-size:11px;font-weight:600;color:#6b7280;margin-bottom:4px;">${f.label}</div><img src="${v}" style="max-width:140px;max-height:105px;border-radius:6px;border:1px solid #e5e7eb;" /></div>`;
  }
  if (v.startsWith('data:')) return '';
  if (f.type === 'toggle') {
    const yes = v === 'true';
    return `<div style="margin:4px 0;display:flex;gap:8px;align-items:center;"><span style="font-size:11px;font-weight:600;color:#6b7280;">${f.label}:</span><span style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:${yes ? '#dcfce7' : '#fee2e2'};color:${yes ? '#15803d' : '#dc2626'};">${yes ? 'Yes' : 'No'}</span></div>`;
  }
  if (f.type === 'rating') {
    const n = parseInt(v) || 0;
    return `<div style="margin:4px 0;display:flex;gap:8px;align-items:center;"><span style="font-size:11px;font-weight:600;color:#6b7280;">${f.label}:</span><span style="font-size:14px;letter-spacing:1px;">${'★'.repeat(n)}${'☆'.repeat(5 - n)}</span></div>`;
  }
  if ((f.type === 'radio' || f.type === 'dropdown') && isYesNoOptions(f.options)) {
    const c = yesNoColor(v);
    if (c) return `<div style="margin:4px 0;display:flex;gap:8px;align-items:center;"><span style="font-size:11px;font-weight:600;color:#6b7280;">${f.label}:</span><span style="padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600;background:${c.bg};color:${c.fg};">${v}</span></div>`;
  }
  return `<div style="margin:4px 0;display:flex;gap:8px;"><span style="font-size:11px;font-weight:600;color:#6b7280;">${f.label}:</span><span style="font-size:12px;color:#1f2937;">${v.replace(/\|\|/g, ', ').replace(/</g, '&lt;')}</span></div>`;
}

// Optional note/photo a filler attached to a field, stored as sidecar keys alongside the
// field's own value (see lib/fieldAnnotations). Returns '' if neither was set.
function renderAnnotationCell(fieldId: string, values: Record<string, string>): string {
  const note = values[noteKey(fieldId)] || '';
  const media = values[mediaKey(fieldId)] || '';
  if (!note && !media) return '';
  const noteHtml = note ? `<div style="font-size:10px;color:#374151;margin:2px 0 0 0;"><strong>Note:</strong> ${note.replace(/</g, '&lt;')}</div>` : '';
  const isImage = media.startsWith('data:image') || (media.startsWith('/api/files/') && /\.(png|jpe?g|gif|webp)$/i.test(media));
  const mediaHtml = isImage ? `<img src="${media}" style="max-width:110px;max-height:80px;border-radius:6px;border:1px solid #e5e7eb;margin-top:4px;" />` : (media ? `<div style="font-size:10px;color:#2563eb;margin-top:2px;">[Photo attached]</div>` : '');
  return noteHtml + mediaHtml;
}

function renderActivityCard(r: AuditResponseData, i: number, fieldDefs: FormField[], repeatableMemberIds: Set<string>): string {
  const vals = r.values || {};
  const rowFields = fieldDefs.filter(f => !f.hidden && !repeatableMemberIds.has(f.id));
  const fields = rowFields.map(f => renderActivityField(f, vals[f.id] || '', fieldDefs) + renderAnnotationCell(f.id, vals)).filter(Boolean).join('');

  return `
    <div style="background:#fff;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:12px;">
      <div style="padding:10px 14px;background:#f8fafc;border-bottom:1px solid #e5e7eb;border-radius:8px 8px 0 0;display:flex;justify-content:space-between;align-items:center;page-break-after:avoid;">
        <span style="font-size:13px;font-weight:700;color:#111827;">Activity #${i + 1}</span>
        <div style="font-size:11px;color:#9ca3af;">${r.assignedToName ? `Assigned by ${r.submittedBy} &rarr; ${r.status === 'submitted' ? 'Completed' : 'Pending with'} ${r.assignedToName}` : r.submittedBy} · ${r.plant} · ${formatDate(r.date)}</div>
      </div>
      <div style="padding:12px 14px;">${fields}</div>
    </div>`;
}

function buildReportHtml(
  formName: string,
  description: string,
  companyName: string,
  activitiesHtml: string,
  activityCount: number,
  now: string,
): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${formName} — Audit Report</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #1f2937; }
  img { max-width: 100%; }
  @media print {
    .no-print { display: none !important; }
    body { font-size: 11px; }
    a { color: inherit; text-decoration: none; }
  }
  @page { margin: 15mm; }
</style>
</head>
<body>
<div style="max-width:800px;margin:0 auto;padding:24px 20px;">

  <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #111827;padding-bottom:16px;margin-bottom:20px;">
    <div>
      <div style="font-size:10px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.1em;">Audit Report</div>
      <div style="font-size:22px;font-weight:800;color:#111827;margin-top:2px;">${formName}</div>
      ${description ? `<div style="font-size:12px;color:#6b7280;margin-top:4px;">${description}</div>` : ''}
    </div>
    <div style="text-align:right;">
      <div style="width:40px;height:40px;border-radius:10px;background:#1a3f8f;color:#fff;display:flex;align-items:center;justify-content:center;font-size:16px;font-weight:800;margin-left:auto;">D</div>
      <div style="font-size:10px;color:#9ca3af;margin-top:4px;">DockForm</div>
    </div>
  </div>

  <div style="display:flex;gap:16px;flex-wrap:wrap;margin-bottom:20px;">
    <div style="padding:10px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;flex:1;min-width:120px;">
      <div style="font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;">Company</div>
      <div style="font-size:14px;font-weight:700;color:#111827;margin-top:2px;">${companyName}</div>
    </div>
    <div style="padding:10px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;flex:1;min-width:120px;">
      <div style="font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;">Activities</div>
      <div style="font-size:14px;font-weight:700;color:#111827;margin-top:2px;">${activityCount}</div>
    </div>
    <div style="padding:10px 16px;background:#f8fafc;border:1px solid #e5e7eb;border-radius:8px;flex:1;min-width:120px;">
      <div style="font-size:10px;font-weight:600;color:#9ca3af;text-transform:uppercase;">Generated</div>
      <div style="font-size:14px;font-weight:700;color:#111827;margin-top:2px;">${now}</div>
    </div>
  </div>

  <div class="no-print" style="margin-bottom:16px;">
    <button onclick="window.print()" style="padding:8px 18px;border:1px solid #e5e7eb;border-radius:8px;background:#fff;color:#374151;font-size:13px;font-weight:600;cursor:pointer;">Print / Save as PDF</button>
  </div>

  ${activitiesHtml}

  <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;">
    <div style="font-size:10px;color:#9ca3af;">Generated by DockForm · ${now}</div>
  </div>
</div>
</body>
</html>`;
}

function triggerHtmlDownload(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadAuditReport(
  formName: string,
  description: string,
  fieldDefs: FormField[],
  responses: AuditResponseData[],
  companyName: string,
) {
  const now = new Date().toLocaleString();
  const imageMap = await buildInlineImageMap(responses.flatMap(r => Object.values(r.values || {})));

  const repeatableMemberIds = new Set<string>();
  fieldDefs.forEach((f) => { if (f.type === 'section' && f.repeatable) sectionMembers(fieldDefs, f).forEach(m => repeatableMemberIds.add(m.id)); });
  const activitiesHtml = responses.map((r, i) => renderActivityCard(r, i, fieldDefs, repeatableMemberIds)).join('');

  const html = buildReportHtml(formName, description, companyName, activitiesHtml, responses.length, now);
  const finalHtml = applyInlineImageMap(html, imageMap);
  triggerHtmlDownload(finalHtml, `${formName.replace(/[^a-z0-9]+/gi, '_')}_audit_report.html`);
}

// Downloads one audit-report file per response, so each response is its own
// standalone document instead of being bundled into a single combined file.
// Sequential downloads are spaced out because browsers silently block rapid
// programmatic multi-file downloads (Chrome/Firefox both throttle/prompt after
// a handful fired back-to-back with no delay).
export async function downloadAuditReportsSeparate(
  formName: string,
  description: string,
  fieldDefs: FormField[],
  responses: AuditResponseData[],
  companyName: string,
) {
  const repeatableMemberIds = new Set<string>();
  fieldDefs.forEach((f) => { if (f.type === 'section' && f.repeatable) sectionMembers(fieldDefs, f).forEach(m => repeatableMemberIds.add(m.id)); });

  for (let i = 0; i < responses.length; i++) {
    const r = responses[i];
    const now = new Date().toLocaleString();
    const imageMap = await buildInlineImageMap(Object.values(r.values || {}));
    const activityHtml = renderActivityCard(r, 0, fieldDefs, repeatableMemberIds);
    const html = buildReportHtml(formName, description, companyName, activityHtml, 1, now);
    const finalHtml = applyInlineImageMap(html, imageMap);
    const datePart = formatDate(r.date).replace(/[^a-z0-9]+/gi, '_');
    triggerHtmlDownload(finalHtml, `${formName.replace(/[^a-z0-9]+/gi, '_')}_${datePart}_${i + 1}.html`);
    if (i < responses.length - 1) await new Promise(res => setTimeout(res, 400));
  }
}
