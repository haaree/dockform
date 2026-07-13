import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Send, Star, CheckSquare, Upload, X, Trash2, Sparkles, UserCheck } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { FormField, LogicRule } from '../../store/types';
import { api } from '../../lib/api';
import { resizeImageFile } from '../../lib/image';

function SignaturePad({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    drawing.current = true;
    lastPos.current = getPos(e);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!drawing.current || !lastPos.current) return;
    e.preventDefault();
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    const pos = getPos(e);
    ctx.strokeStyle = '#1a1a1a';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(lastPos.current.x, lastPos.current.y);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    lastPos.current = pos;
  };

  const endDraw = () => {
    if (drawing.current) {
      drawing.current = false;
      lastPos.current = null;
      const canvas = canvasRef.current!;
      onChange(canvas.toDataURL('image/png'));
    }
  };

  const clear = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    onChange('');
  };

  useEffect(() => {
    if (value && canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d')!;
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0);
      img.src = value;
    }
  }, []);

  return (
    <div>
      <div style={{ position: 'relative', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={400}
          height={150}
          style={{ width: '100%', height: 150, cursor: 'crosshair', background: '#fff', touchAction: 'none' }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button type="button" onClick={clear}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '6px 12px', fontSize: 12, fontWeight: 500, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', cursor: 'pointer' }}>
          <Trash2 size={12} /> Clear
        </button>
        {value && <span style={{ fontSize: 12, color: accent, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 4 }}><CheckSquare size={12} /> Signed</span>}
      </div>
    </div>
  );
}

function BeforeAfterField({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
  const beforeRef = useRef<HTMLInputElement>(null);
  const afterRef = useRef<HTMLInputElement>(null);
  let parsed: { before?: string; after?: string; beforeDesc?: string; afterDesc?: string; observation?: string; aiComment?: string; aiComparison?: string } = {};
  try { parsed = JSON.parse(value || '{}'); } catch { /* empty */ }
  const [aiLoading, setAiLoading] = useState<'before' | 'compare' | null>(null);
  const [aiError, setAiError] = useState('');

  const update = (patch: Partial<typeof parsed>) => {
    onChange(JSON.stringify({ ...parsed, ...patch }));
  };

  const handleFile = (key: 'before' | 'after') => async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const dataUrl = await resizeImageFile(file);
    update({ [key]: dataUrl });
    if (key === 'after' && parsed.before) {
      setAiError('');
      setAiLoading('compare');
      try {
        const { comment } = await api.comparePhotos(parsed.before, dataUrl, 'factory cleaning checklist');
        update({ after: dataUrl, aiComparison: comment });
      } catch (err: any) {
        setAiError(`AI comparison unavailable (${err?.message || 'unknown error'}) — you can still add a manual comment.`);
      } finally {
        setAiLoading(null);
      }
    }
  };

  const runAiOnBefore = async () => {
    if (!parsed.before) return;
    setAiError('');
    setAiLoading('before');
    try {
      const { comment } = await api.analyzePhoto(parsed.before, 'factory cleaning checklist');
      update({ aiComment: comment });
    } catch (err: any) {
      setAiError(`AI comment unavailable (${err?.message || 'unknown error'}) — you can still write one manually.`);
    } finally {
      setAiLoading(null);
    }
  };

  const inputStyle: React.CSSProperties = { width: '100%', padding: '8px 10px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', outline: 'none', marginTop: 8 };

  const photoBox = (label: string, key: 'before' | 'after', descKey: 'beforeDesc' | 'afterDesc', inputRef: React.RefObject<HTMLInputElement | null>) => (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile(key)} style={{ display: 'none' }} />
      {parsed[key] ? (
        <div>
          <div style={{ position: 'relative' }}>
            <img src={parsed[key]} alt={label} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)' }} />
            <button type="button" onClick={() => update({ [key]: '', [descKey]: '', ...(key === 'before' ? { aiComment: '' } : { aiComparison: '' }) })}
              style={{ position: 'absolute', top: 6, right: 6, width: 24, height: 24, borderRadius: '50%', border: 'none', background: 'rgba(0,0,0,.6)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>×</button>
          </div>
          <input type="text" value={parsed[descKey] || ''} onChange={(e) => update({ [descKey]: e.target.value })} placeholder={`Describe ${label.toLowerCase()} photo…`} style={inputStyle} />
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          style={{ width: '100%', height: 160, fontSize: 12, color: 'var(--muted)', background: 'var(--surface2)', border: '2px dashed var(--border)', borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
          <Upload size={18} />
          {label}
        </button>
      )}
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', gap: 12 }}>
        {photoBox('Before', 'before', 'beforeDesc', beforeRef)}
        {photoBox('After', 'after', 'afterDesc', afterRef)}
      </div>

      {parsed.before && !parsed.after && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>Comment (before cleaning)</div>
            <button type="button" onClick={runAiOnBefore} disabled={aiLoading === 'before'}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: `1px solid ${accent}`, borderRadius: 6, padding: '3px 8px', fontSize: 11, fontWeight: 600, color: accent, cursor: aiLoading === 'before' ? 'default' : 'pointer' }}>
              <Sparkles size={11} /> {aiLoading === 'before' ? 'Analyzing…' : 'AI Suggest'}
            </button>
          </div>
          <textarea value={parsed.aiComment ?? parsed.observation ?? ''} onChange={(e) => update({ observation: e.target.value, aiComment: undefined })}
            placeholder="Write a manual comment, or click AI Suggest…"
            style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', outline: 'none', minHeight: 70, resize: 'vertical', fontFamily: 'inherit' }} />
        </div>
      )}

      {parsed.after && (
        <div style={{ marginTop: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Comparison</div>
          {aiLoading === 'compare' ? (
            <div style={{ fontSize: 13, color: 'var(--muted)', padding: '10px 0' }}>Comparing before/after photos…</div>
          ) : (
            <textarea value={parsed.aiComparison ?? parsed.observation ?? ''} onChange={(e) => update({ observation: e.target.value, aiComparison: e.target.value })}
              placeholder="AI comparison will appear here once both photos are uploaded, or write your own…"
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', outline: 'none', minHeight: 80, resize: 'vertical', fontFamily: 'inherit' }} />
          )}
        </div>
      )}

      {aiError && <div style={{ fontSize: 11, color: '#DC2626', marginTop: 6 }}>{aiError}</div>}
    </div>
  );
}

type ChecklistItem = { id: string; text: string; direction: 'present' | 'absent'; source: 'builder' | 'ai' | 'manual' };
// found already reflects "satisfied" (AI is told each item's direction and scores accordingly), not raw presence/absence.
type ChecklistResult = { itemId: string; found: boolean; note: string };
type ChecklistAttempt = { photo: string; timestamp: string; results?: ChecklistResult[]; error?: string };
type ChecklistFieldValue = { items: ChecklistItem[]; attempts: ChecklistAttempt[] };

function PhotoChecklistField({ value, onChange, baselineItems, accent }: { value: string; onChange: (v: string) => void; baselineItems: ChecklistItem[]; accent: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  let data: ChecklistFieldValue = { items: [], attempts: [] };
  try {
    const parsed = JSON.parse(value || '{}');
    data = { items: parsed.items || [], attempts: parsed.attempts || [] };
  } catch { /* empty */ }

  if (data.items.length === 0 && baselineItems.length > 0) {
    data = { ...data, items: baselineItems };
  }

  const [loading, setLoading] = useState(false);
  const [newItemText, setNewItemText] = useState('');
  const [newItemDirection, setNewItemDirection] = useState<'present' | 'absent'>('present');

  const save = (next: Partial<ChecklistFieldValue>) => onChange(JSON.stringify({ ...data, ...next }));

  const addManualItem = () => {
    if (!newItemText.trim()) return;
    save({ items: [...data.items, { id: 'ci' + Date.now(), text: newItemText.trim(), direction: newItemDirection, source: 'manual' }] });
    setNewItemText('');
  };

  const latest = data.attempts[data.attempts.length - 1];
  const allSatisfiedInLatest = latest?.results && data.items.every(item => {
    const r = latest.results!.find(res => res.itemId === item.id);
    return r && r.found;
  });

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || data.items.length === 0) return;
    const photo = await resizeImageFile(file);
    const timestamp = new Date().toISOString();
    setLoading(true);
    try {
      const { results } = await api.scoreChecklistPhoto(photo, data.items.map(i => ({ id: i.id, text: i.text, direction: i.direction })), 'area inspection checklist');
      save({ attempts: [...data.attempts, { photo, timestamp, results }] });
    } catch (err: any) {
      save({ attempts: [...data.attempts, { photo, timestamp, error: err?.message || 'AI scoring unavailable' }] });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />

      <div style={{ marginBottom: 10 }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: 0.5 }}>Checklist Items</div>
        {data.items.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 6 }}>No items yet — add one below, or upload a photo and AI will suggest items.</div>}
        {data.items.map(item => (
          <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12.5, color: 'var(--text)', padding: '4px 0' }}>
            <span style={{ flex: 1 }}>{item.text}</span>
            <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 600 }}>{item.direction === 'absent' ? 'must be absent' : 'must be present'}</span>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
          <input value={newItemText} onChange={(e) => setNewItemText(e.target.value)} placeholder="Add a checklist item…"
            style={{ flex: 1, padding: '6px 8px', fontSize: 12, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', outline: 'none' }} />
          <select value={newItemDirection} onChange={(e) => setNewItemDirection(e.target.value as 'present' | 'absent')}
            style={{ fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)' }}>
            <option value="present">Present</option>
            <option value="absent">Absent</option>
          </select>
          <button type="button" onClick={addManualItem} style={{ padding: '6px 10px', fontSize: 11, fontWeight: 600, border: 'none', borderRadius: 6, background: accent, color: '#fff', cursor: 'pointer' }}>Add</button>
        </div>
      </div>

      <button type="button" onClick={() => inputRef.current?.click()} disabled={loading || data.items.length === 0}
        style={{ width: '100%', padding: '14px 12px', fontSize: 13, fontWeight: 600, color: loading ? 'var(--muted)' : accent, background: 'var(--surface2)', border: `2px dashed ${loading ? 'var(--border)' : accent}`, borderRadius: 8, cursor: loading ? 'default' : 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
        <Upload size={18} />
        {loading ? 'Checking against checklist…' : data.attempts.length > 0 ? 'Upload New Photo (Re-check)' : 'Upload Photo'}
      </button>

      {latest && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Latest Check {data.attempts.length > 1 ? `(Attempt ${data.attempts.length})` : ''}
            </div>
            {latest.results && (
              <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: allSatisfiedInLatest ? '#DCFCE7' : '#FEF3C7', color: allSatisfiedInLatest ? '#15803D' : '#92400E' }}>
                {allSatisfiedInLatest ? 'All Clear' : 'Issues Remain'}
              </span>
            )}
          </div>
          <img src={latest.photo} alt="Latest check" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--border)', marginBottom: 8 }} />

          {latest.error && <div style={{ fontSize: 12, color: '#DC2626' }}>{latest.error}</div>}

          {latest.results && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {data.items.map(item => {
                const r = latest.results!.find(res => res.itemId === item.id);
                if (!r) return null;
                const satisfied = r.found;
                return (
                  <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '8px 10px', background: 'var(--surface2)', borderRadius: 6 }}>
                    <span style={{ fontSize: 13, flexShrink: 0 }}>{satisfied ? '✅' : '❌'}</span>
                    <div>
                      <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{item.text} <span style={{ fontWeight: 400, color: 'var(--muted)' }}>({item.direction === 'absent' ? 'must be absent' : 'must be present'})</span></div>
                      <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{r.note}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {data.attempts.length > 1 && (
        <details style={{ marginTop: 10 }}>
          <summary style={{ fontSize: 11.5, color: 'var(--muted)', cursor: 'pointer', fontWeight: 600 }}>
            View {data.attempts.length - 1} earlier attempt{data.attempts.length - 1 > 1 ? 's' : ''}
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {data.attempts.slice(0, -1).reverse().map((a, i) => {
              const satisfiedCount = a.results ? data.items.filter(item => {
                const r = a.results!.find(res => res.itemId === item.id);
                return r && r.found;
              }).length : 0;
              return (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '6px 8px', background: 'var(--surface2)', borderRadius: 6 }}>
                  <img src={a.photo} alt="" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 4, flexShrink: 0 }} />
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {new Date(a.timestamp).toLocaleString()} — {a.results ? `${satisfiedCount}/${data.items.length} satisfied` : (a.error || 'no result')}
                  </div>
                </div>
              );
            })}
          </div>
        </details>
      )}
    </div>
  );
}

function FileUploadField({ value, onChange, accept, label }: { value: string; onChange: (v: string) => void; accept: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    if (file.type.startsWith('image/')) {
      onChange(await resizeImageFile(file));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} onChange={handleFile} style={{ display: 'none' }} />
      {value ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {value.startsWith('data:image') && (
            <img src={value} alt="Preview" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain', border: '1px solid var(--border)' }} />
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>{fileName || 'File uploaded'}</span>
            <button type="button" onClick={() => { onChange(''); setFileName(''); }}
              style={{ display: 'flex', alignItems: 'center', padding: '4px 8px', fontSize: 11, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: '#EF4444', cursor: 'pointer', gap: 4 }}>
              <X size={11} /> Remove
            </button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()}
          style={{ width: '100%', padding: '20px 12px', fontSize: 14, color: 'var(--muted)', background: 'var(--surface2)', border: '2px dashed var(--border)', borderRadius: 8, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
          <Upload size={20} />
          {label}
        </button>
      )}
    </div>
  );
}

function FieldInput({ field, value, onChange, lockToToday }: { field: FormField; value: string; onChange: (v: string) => void; lockToToday?: boolean }) {
  const dark = useStore((s) => s.dark);
  const accent = useStore((s) => s.accent);
  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px', fontSize: 14, color: 'var(--text)',
    background: dark ? '#1C1C1E' : '#FAFAFA', border: '1px solid var(--border)',
    borderRadius: 8, outline: 'none',
  };

  switch (field.type) {
    case 'textarea':
    case 'richtext':
      return <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}…`} rows={4} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />;

    case 'number':
    case 'currency':
    case 'percent':
      return <input type="number" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || '0'} style={inputStyle} />;

    case 'email':
      return <input type="email" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || 'email@example.com'} style={inputStyle} />;

    case 'phone':
      return <input type="tel" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || '+91 98765 43210'} style={inputStyle} />;

    case 'date': {
      const now = new Date();
      const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      return <input type="date" value={lockToToday ? today : value} onChange={(e) => onChange(e.target.value)}
        min={lockToToday ? today : undefined} max={lockToToday ? today : undefined} disabled={lockToToday} style={{ ...inputStyle, opacity: lockToToday ? 0.7 : 1 }} />;
    }

    case 'time':
      return <input type="time" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />;

    case 'datetime':
      return <input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} style={inputStyle} />;

    case 'toggle':
      return (
        <button type="button" onClick={() => onChange(value === 'true' ? 'false' : 'true')}
          style={{ width: 48, height: 26, borderRadius: 999, position: 'relative', background: value === 'true' ? accent : 'var(--border)', border: 'none', cursor: 'pointer', padding: 0 }}>
          <span style={{ position: 'absolute', top: 3, left: 3, width: 20, height: 20, borderRadius: '50%', background: '#fff', transform: value === 'true' ? 'translateX(22px)' : 'translateX(0)', transition: 'transform 0.2s', boxShadow: '0 1px 2px rgba(0,0,0,0.25)' }} />
        </button>
      );

    case 'dropdown':
      return (
        <select value={value} onChange={(e) => onChange(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
          <option value="">Select…</option>
          {field.options.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      );

    case 'radio':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {field.options.map((opt) => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text)', cursor: 'pointer' }}>
              <input type="radio" name={field.id} value={opt} checked={value === opt} onChange={() => onChange(opt)} style={{ accentColor: accent }} />
              {opt}
            </label>
          ))}
        </div>
      );

    case 'checkbox':
    case 'multiselect':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {field.options.map((opt) => {
            const selected = value.split('||').filter(Boolean);
            const checked = selected.includes(opt);
            return (
              <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={checked} onChange={() => {
                  const next = checked ? selected.filter(s => s !== opt) : [...selected, opt];
                  onChange(next.join('||'));
                }} style={{ accentColor: accent }} />
                {opt}
              </label>
            );
          })}
        </div>
      );

    case 'rating': {
      const stars = parseInt(value) || 0;
      return (
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => onChange(String(n))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, color: n <= stars ? '#F59E0B' : 'var(--border)' }}>
              <Star size={24} fill={n <= stars ? '#F59E0B' : 'none'} />
            </button>
          ))}
        </div>
      );
    }

    case 'camera':
      return <FileUploadField value={value} onChange={onChange} accept="image/*;capture=camera" label="Tap to take photo or choose from gallery" />;

    case 'image':
      return <FileUploadField value={value} onChange={onChange} accept="image/*" label="Tap to upload image" />;

    case 'beforeafter':
      return <BeforeAfterField value={value} onChange={onChange} accent={accent} />;

    case 'photochecklist': {
      let baselineItems: ChecklistItem[] = [];
      try {
        baselineItems = (JSON.parse(field.defaultValue || '[]') as { id: string; text: string; direction: 'present' | 'absent' }[])
          .map(i => ({ ...i, source: 'builder' as const }));
      } catch { /* empty */ }
      return <PhotoChecklistField value={value} onChange={onChange} baselineItems={baselineItems} accent={accent} />;
    }

    case 'upload':
      return <FileUploadField value={value} onChange={onChange} accept="*/*" label="Tap to upload file" />;

    case 'video':
      return <FileUploadField value={value} onChange={onChange} accept="video/*" label="Tap to upload video" />;

    case 'audio':
      return <FileUploadField value={value} onChange={onChange} accept="audio/*" label="Tap to upload audio" />;

    case 'signature':
      return <SignaturePad value={value} onChange={onChange} accent={accent} />;

    default:
      return <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}…`} style={inputStyle} />;
  }
}

export default function FormFiller() {
  const fillingFormId = useStore((s) => s.fillingFormId);
  const forms = useStore((s) => s.forms);
  const setNav = useStore((s) => s.setNav);
  const submitResponse = useStore((s) => s.submitResponse);
  const saveResponseDraft = useStore((s) => s.saveResponseDraft);
  const activeResponseId = useStore((s) => s.activeResponseId);
  const activeResponseValues = useStore((s) => s.activeResponseValues);
  const accent = useStore((s) => s.accent);
  const winWidth = useStore((s) => s.winWidth);
  const currentUserId = useStore((s) => s.currentUserId);
  const currentUserRole = useStore((s) => s.currentUserRole);

  const form = forms.find(f => f.id === fillingFormId);
  const fields = form?.fieldDefs || [];
  const isMobile = winWidth < 720;
  const isAdmin = currentUserRole === 'Admin' || currentUserRole === 'admin';

  if (form && form.assignedUserIds != null && !isAdmin && !(currentUserId && form.assignedUserIds.includes(currentUserId as string))) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', padding: 32 }}>
        <div style={{ textAlign: 'center', maxWidth: 400 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Access Denied</h2>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, marginBottom: 20 }}>You don't have permission to fill out this form. Contact your administrator to request access.</p>
          <button onClick={() => setNav('forms')} style={{ padding: '8px 20px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Back to Forms</button>
        </div>
      </div>
    );
  }

  const [values, setValues] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoffUsers, setHandoffUsers] = useState<any[]>([]);
  const [handoffTarget, setHandoffTarget] = useState('');
  const [handoffError, setHandoffError] = useState('');

  useEffect(() => {
    if (activeResponseValues) setValues(activeResponseValues);
  }, [activeResponseValues]);

  const evaluateRule = (rule: LogicRule): boolean => {
    const sourceVal = values[rule.sourceFieldId] || '';
    switch (rule.operator) {
      case 'equals': return sourceVal === rule.value;
      case 'not_equals': return sourceVal !== rule.value;
      case 'contains': return sourceVal.toLowerCase().includes(rule.value.toLowerCase());
      case 'not_empty': return sourceVal.trim() !== '';
      case 'empty': return sourceVal.trim() === '';
      case 'greater_than': return parseFloat(sourceVal) > parseFloat(rule.value);
      case 'less_than': return parseFloat(sourceVal) < parseFloat(rule.value);
      default: return false;
    }
  };

  const isFieldVisible = (field: FormField): boolean => {
    if (field.hidden) return false;
    const rules = (field.logic || []) as LogicRule[];
    if (rules.length === 0) return true;
    const showRules = rules.filter(r => r.action === 'show' && r.sourceFieldId);
    const hideRules = rules.filter(r => r.action === 'hide' && r.sourceFieldId);
    if (showRules.length > 0 && !showRules.some(evaluateRule)) return false;
    if (hideRules.length > 0 && hideRules.some(evaluateRule)) return false;
    return true;
  };

  const isFieldRequired = (field: FormField): boolean => {
    if (field.required) return true;
    const rules = (field.logic || []) as LogicRule[];
    const requireRules = rules.filter(r => r.action === 'require' && r.sourceFieldId);
    return requireRules.some(evaluateRule);
  };

  const setValue = useCallback((id: string, v: string) => {
    setValues(prev => ({ ...prev, [id]: v }));
  }, []);

  if (!form) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 15 }}>
        Form not found.
        <button onClick={() => setNav('forms')} style={{ marginLeft: 12, color: accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Back to Forms</button>
      </div>
    );
  }

  if (submitted) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#DCFCE7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckSquare size={28} color="#15803D" />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Response Submitted</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', maxWidth: 400 }}>
          Your response to "{form.name}" has been recorded successfully.
        </div>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <button onClick={() => { setValues({}); setSubmitted(false); }}
            style={{ padding: '10px 20px', border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Fill Again
          </button>
          <button onClick={() => setNav('forms')}
            style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
            Back to Forms
          </button>
        </div>
      </div>
    );
  }

  const visibleFields = fields.filter(f => isFieldVisible(f));
  const missingRequired = visibleFields.filter(f => isFieldRequired(f) && !values[f.id]?.trim());

  const handleSubmit = async () => {
    if (missingRequired.length > 0) return;
    setSubmitError('');
    try {
      await submitResponse(form.id, values);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit response');
    }
  };

  const handleSaveDraft = async () => {
    await saveResponseDraft(form.id, values);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const openHandoff = () => {
    setHandoffError('');
    setShowHandoff(true);
    api.getUsers().then(setHandoffUsers).catch(() => {});
  };

  const handleHandoff = async () => {
    if (!handoffTarget) { setHandoffError('Select a supervisor to hand off to.'); return; }
    try {
      await saveResponseDraft(form.id, values, { assignedToId: handoffTarget, handOff: true });
      setShowHandoff(false);
      setNav('forms');
    } catch (err: any) {
      setHandoffError(err?.message || 'Failed to hand off');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ height: 52, minHeight: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', background: 'var(--surface)' }}>
        <button type="button" onClick={() => setNav('forms')}
          style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
          <ArrowLeft size={17} />
        </button>
        <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.name}{activeResponseId ? ' (In Progress)' : ''}</div>
        <button type="button" onClick={handleSaveDraft}
          style={{ height: 32, padding: '0 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0 }}>
          {saved ? 'Saved' : 'Save & Continue Later'}
        </button>
        {isAdmin && (
          <button type="button" onClick={openHandoff}
            style={{ height: 32, padding: '0 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <UserCheck size={13} /> Hand Off to Supervisor
          </button>
        )}
        <button type="button" onClick={handleSubmit} disabled={missingRequired.length > 0}
          style={{
            height: 32, padding: '0 14px', borderRadius: 7, border: 'none',
            background: missingRequired.length > 0 ? 'var(--border)' : accent,
            color: missingRequired.length > 0 ? 'var(--muted)' : '#fff',
            fontSize: 12.5, fontWeight: 600, cursor: missingRequired.length > 0 ? 'default' : 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
          }}>
          <Send size={13} /> Submit
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface2)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: isMobile ? 16 : 24 }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{form.name}</div>
            {form.description && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{form.description}</div>}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              {fields.filter(f => f.required).length > 0 && <span style={{ color: '#EF4444' }}>*</span>}{' '}
              indicates required fields
            </div>
          </div>

          {visibleFields.map((field) => {
            const required = isFieldRequired(field);
            return (
            <div key={field.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                {field.label}
                {required && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
              </label>
              {field.helpText && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{field.helpText}</div>}
              <FieldInput field={field} value={values[field.id] || field.defaultValue || ''} onChange={(v) => setValue(field.id, v)}
                lockToToday={field.type === 'date' && form.schedule?.frequency === 'daily'} />
            </div>
            );
          })}

          <div style={{ padding: '16px 0' }}>
            {submitError && <div style={{ fontSize: 12.5, color: '#DC2626', marginBottom: 10, textAlign: 'center' }}>{submitError}</div>}
            <button type="button" onClick={handleSubmit} disabled={missingRequired.length > 0}
              style={{
                width: '100%', padding: '14px 20px', borderRadius: 10, border: 'none',
                background: missingRequired.length > 0 ? 'var(--border)' : accent,
                color: missingRequired.length > 0 ? 'var(--muted)' : '#fff',
                fontSize: 15, fontWeight: 700, cursor: missingRequired.length > 0 ? 'default' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}>
              <Send size={16} /> Submit Response
            </button>
          </div>
        </div>
      </div>

      {showHandoff && (
        <div onClick={() => setShowHandoff(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 420, maxWidth: '92%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Hand Off to Supervisor</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>Saves your current progress and assigns this response to the selected supervisor to complete.</div>
            <select value={handoffTarget} onChange={(e) => setHandoffTarget(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', outline: 'none', marginBottom: 12 }}>
              <option value="">Select a supervisor…</option>
              {handoffUsers.filter(u => u.status === 'active' && u.id !== currentUserId).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            {handoffError && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{handoffError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowHandoff(false)} style={{ padding: '8px 16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleHandoff} style={{ padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Hand Off</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
