import { useState, useRef, useCallback, useEffect } from 'react';
import { ArrowLeft, Send, Star, CheckSquare, Upload, X, Trash2, Sparkles, UserCheck, Plus } from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { FormField, LogicRule } from '../../store/types';
import { api } from '../../lib/api';
import { resizeImageFile } from '../../lib/image';

// Uploads a data URL (photo, signature, or file) to object storage and returns a short
// "/api/files/:key" reference. Falls back to embedding the raw data URL only if object
// storage isn't configured or the upload genuinely fails, so capture never hard-blocks —
// but that fallback embeds the full file in the response record, so callers should surface
// `usedFallback` to the user rather than silently accepting the bloat.
async function uploadOrFallback(dataUrl: string): Promise<{ value: string; usedFallback: boolean }> {
  try {
    const { url } = await api.uploadPhoto(dataUrl);
    return { value: url, usedFallback: false };
  } catch (err) {
    console.error('[uploadOrFallback] object storage upload failed, embedding raw data instead:', err);
    return { value: dataUrl, usedFallback: true };
  }
}

function SignaturePad({ value, onChange, accent }: { value: string; onChange: (v: string) => void; accent: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const [storageWarning, setStorageWarning] = useState('');
  // endDraw fires on every mouseup/mouseleave during a multi-stroke signature — each stroke
  // would otherwise kick off its own R2 upload, and an out-of-order response could overwrite
  // the final signature with a mid-drawing one. Only the most recent upload's result is kept.
  const uploadSeq = useRef(0);

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
      const dataUrl = canvas.toDataURL('image/png');
      const seq = ++uploadSeq.current;
      uploadOrFallback(dataUrl).then(({ value: ref, usedFallback }) => {
        if (seq !== uploadSeq.current) return; // a newer stroke's upload has already landed
        setStorageWarning(usedFallback ? 'Signature storage is unavailable right now — this signature was saved directly with the response instead.' : '');
        onChange(ref);
      });
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
      {storageWarning && <div style={{ fontSize: 11, color: '#92400E', marginTop: 6 }}>{storageWarning}</div>}
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
    const resized = await resizeImageFile(file);
    const { value: photoRef, usedFallback } = await uploadOrFallback(resized);
    update({ [key]: photoRef });
    if (usedFallback) setAiError('Photo storage is unavailable right now — this photo was saved directly with the response instead, which may slow down loading it later.');
    if (key === 'after' && parsed.before) {
      setAiError('');
      setAiLoading('compare');
      try {
        const { comment } = await api.comparePhotos(parsed.before, photoRef, 'factory cleaning checklist');
        update({ after: photoRef, aiComparison: comment });
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
  const [storageWarning, setStorageWarning] = useState('');

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
    const resized = await resizeImageFile(file);
    const { value: photo, usedFallback } = await uploadOrFallback(resized);
    setStorageWarning(usedFallback ? 'Photo storage is unavailable right now — this photo was saved directly with the response instead.' : '');
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
      {storageWarning && <div style={{ fontSize: 11, color: '#92400E', marginTop: 6 }}>{storageWarning}</div>}

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

type SectionInstance = { id: string; values: Record<string, string> };

// Renders a repeatable Section's member fields once per instance. Instance data is stored
// as a JSON array under the section marker field's own response value; member fields are
// the ordinary top-level fields between this marker and the next (or end of form).
// pointer-events:none stops custom div/contentEditable widgets (richtext, signature,
// rating, photo capture) from responding to clicks; fieldset disabled additionally
// covers native input/select/textarea keyboard/tab behavior. Neither alone is enough.
function LockedFieldWrapper({ locked, comments, children }: { locked: boolean; comments: { text: string; authorName: string }[]; children: React.ReactNode }) {
  if (!locked) return <>{children}</>;
  return (
    <div>
      <fieldset disabled style={{ border: 'none', margin: 0, padding: 0, opacity: 0.55, pointerEvents: 'none' }}>
        {children}
      </fieldset>
      {comments.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
          {comments.map((c, idx) => (
            <div key={idx} style={{ fontSize: 12, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 6, padding: '6px 10px' }}>
              <strong>{c.authorName}:</strong> {c.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function SectionInstanceGroup({ value, onChange, memberFields, accent, sectionLabel, isFieldLocked, getComments }: { value: string; onChange: (v: string) => void; memberFields: FormField[]; accent: string; sectionLabel: string; isFieldLocked?: (fieldId: string, instanceId: string) => boolean; getComments?: (fieldId: string, instanceId: string) => { text: string; authorName: string }[] }) {
  let instances: SectionInstance[] = [];
  try { instances = JSON.parse(value || '[]'); } catch { /* empty */ }

  const save = (next: SectionInstance[]) => onChange(JSON.stringify(next));

  const addInstance = () => save([...instances, { id: 'sec' + Date.now(), values: {} }]);
  const removeInstance = (id: string) => save(instances.filter(a => a.id !== id));
  const setInstanceValue = (instanceId: string, fieldId: string, v: string) => {
    save(instances.map(a => a.id === instanceId ? { ...a, values: { ...a.values, [fieldId]: v } } : a));
  };

  // Start with one instance already visible — an empty "Add Another" button with no fields
  // showing reads as broken, not as "click here to begin".
  useEffect(() => {
    if (instances.length === 0 && memberFields.length > 0) {
      onChange(JSON.stringify([{ id: 'sec' + Date.now(), values: {} }]));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (memberFields.length === 0) {
    return <div style={{ fontSize: 13, color: 'var(--muted)', fontStyle: 'italic' }}>No fields added to this section yet.</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      {instances.map((instance, idx) => (
        <div key={instance.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, background: 'var(--surface2)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)' }}>{sectionLabel} {idx + 1}</div>
            <button type="button" onClick={() => removeInstance(instance.id)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', color: '#DC2626', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <X size={12} /> Remove
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {memberFields.map((sf) => {
              const locked = isFieldLocked?.(sf.id, instance.id) ?? false;
              const fieldEntries = getComments?.(sf.id, instance.id) ?? [];
              return (
                <div key={sf.id}>
                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>
                    {sf.label}{sf.required && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
                  </label>
                  <LockedFieldWrapper locked={locked} comments={fieldEntries}>
                    <FieldInput field={sf} value={instance.values[sf.id] || sf.defaultValue || ''} onChange={(v) => setInstanceValue(instance.id, sf.id, v)} />
                  </LockedFieldWrapper>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <button type="button" onClick={addInstance}
        style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, border: `1px dashed ${accent}`, background: 'transparent', borderRadius: 8, padding: '10px 0', color: accent, fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
        <Plus size={14} /> Add Another {sectionLabel}
      </button>
    </div>
  );
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function FileUploadField({ value, onChange, accept, label }: { value: string; onChange: (v: string) => void; accept: string; label: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState('');
  const [storageWarning, setStorageWarning] = useState('');

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const dataUrl = file.type.startsWith('image/') ? await resizeImageFile(file) : await readAsDataUrl(file);
    const { value: ref, usedFallback } = await uploadOrFallback(dataUrl);
    setStorageWarning(usedFallback ? 'File storage is unavailable right now — this file was saved directly with the response instead.' : '');
    onChange(ref);
  };

  return (
    <div>
      <input ref={inputRef} type="file" accept={accept} onChange={handleFile} style={{ display: 'none' }} />
      {storageWarning && <div style={{ fontSize: 11, color: '#92400E', marginBottom: 6 }}>{storageWarning}</div>}
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
  const activeResponseStatus = useStore((s) => s.activeResponseStatus);
  const sendForApproval = useStore((s) => s.sendForApproval);
  const resubmitForApproval = useStore((s) => s.resubmitForApproval);
  const approveResponse = useStore((s) => s.approveResponse);
  const sendResponseBack = useStore((s) => s.sendResponseBack);
  const accent = useStore((s) => s.accent);
  const winWidth = useStore((s) => s.winWidth);
  const currentUserId = useStore((s) => s.currentUserId);
  const currentUserRole = useStore((s) => s.currentUserRole);
  const responses = useStore((s) => s.responses);

  const form = forms.find(f => f.id === fillingFormId);
  const fields = form?.fieldDefs || [];
  const isMobile = winWidth < 720;
  const isAdmin = currentUserRole === 'Admin' || currentUserRole === 'admin';
  const sentToMe = !!form && responses.some(r => r.formId === form.id && r.assignedToId === currentUserId && (r.status === 'awaiting_supervisor' || r.status === 'awaiting_approval'));
  // The manager reviewing a submission they didn't fill out themselves -- same
  // response/component, but a read-only approve/send-back view instead of an editable fill.
  const approvalRecord = form ? responses.find(r => r.formId === form.id && r.status === 'awaiting_approval' && r.assignedToId === currentUserId && r.submittedById !== currentUserId) : undefined;
  const isReviewer = !!approvalRecord;
  // The submitter reopening their own response while it's sitting with the manager --
  // must NOT be editable (no re-submit, no auto-save) or they could silently knock it
  // out of awaiting_approval and drop it from the manager's queue mid-review.
  const pendingApprovalRecord = form ? responses.find(r => r.formId === form.id && r.status === 'awaiting_approval' && r.submittedById === currentUserId) : undefined;
  const isPendingMyApproval = !!pendingApprovalRecord;

  if (form && form.assignedUserIds != null && !isAdmin && !sentToMe && !(currentUserId && form.assignedUserIds.includes(currentUserId as string))) {
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
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [submitError, setSubmitError] = useState('');
  const [showHandoff, setShowHandoff] = useState(false);
  const [handoffUsers, setHandoffUsers] = useState<any[]>([]);
  const [handoffTarget, setHandoffTarget] = useState('');
  const [handoffError, setHandoffError] = useState('');
  const [handoffSaving, setHandoffSaving] = useState(false);

  const [showApproval, setShowApproval] = useState(false);
  const [approvalUsers, setApprovalUsers] = useState<any[]>([]);
  const [approvalTarget, setApprovalTarget] = useState('');
  const [approvalError, setApprovalError] = useState('');
  const [approvalSaving, setApprovalSaving] = useState(false);
  const [resubmitSaving, setResubmitSaving] = useState(false);
  const [resubmitError, setResubmitError] = useState('');

  const [comments, setComments] = useState<{ id: string; fieldId: string | null; instanceId: string | null; text: string; authorName: string; resolved: boolean; createdAt: string }[]>([]);

  // Reviewer (manager) mode: composing an overall comment plus per-field comments before
  // Approve or Send Back. Keyed by `fieldId` (or `fieldId:instanceId` for a repeatable
  // section member) so a comment can target one specific instance of a repeated section.
  const [reviewOverallComment, setReviewOverallComment] = useState('');
  const [reviewFieldComments, setReviewFieldComments] = useState<Record<string, string>>({});
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState('');

  useEffect(() => {
    if (activeResponseValues) setValues(activeResponseValues);
  }, [activeResponseValues]);

  // Fetch comments when reopening a response the manager sent back (so the submitter can
  // see which fields were flagged), or when a manager opens a response to review it (so
  // they can see earlier rounds' comments for context).
  useEffect(() => {
    if (activeResponseId && (activeResponseStatus === 'changes_requested' || isReviewer)) {
      api.getResponseComments(activeResponseId).then(setComments).catch(() => {});
    } else {
      setComments([]);
    }
  }, [activeResponseId, activeResponseStatus, isReviewer]);

  // Unresolved per-field comments key the lock lookup: "fieldId" for plain fields,
  // "fieldId:instanceId" for a specific repeatable-section instance's member field.
  // Only fields present in this map stay editable on a changes_requested resubmit.
  const isLocked = activeResponseStatus === 'changes_requested';
  const unresolvedFieldKeys = new Set(
    comments.filter(c => !c.resolved && c.fieldId).map(c => c.instanceId ? `${c.fieldId}:${c.instanceId}` : c.fieldId as string)
  );
  const overallUnresolvedComment = comments.find(c => !c.resolved && !c.fieldId);
  const fieldComments = (fieldId: string, instanceId?: string) =>
    comments.filter(c => c.fieldId === fieldId && (instanceId ? c.instanceId === instanceId : !c.instanceId));

  const skipFirstRun = useRef(true);
  // Holds the in-flight auto-save promise (or null when idle) so handleSubmit/manual
  // save can await it before proceeding -- without this, submitting right after typing
  // could race a still-in-flight first-time createResponse (activeResponseId not yet
  // set) and create a second response instead of updating the one auto-save just made.
  const autoSaveInFlight = useRef<Promise<void> | null>(null);
  // Auto-save the in-progress fill a couple seconds after the last change, so a crash,
  // tab close, or connectivity drop doesn't lose answers between explicit saves/submit.
  // Skipped on mount so loading an existing draft doesn't immediately re-save it, and
  // skipped once submitted so a stray timer can't resurrect a finished response.
  useEffect(() => {
    if (skipFirstRun.current) { skipFirstRun.current = false; return; }
    // Auto-saving here always writes status: 'draft' -- fine for a normal fill, but it
    // would silently knock an awaiting_approval/changes_requested response out of the
    // approval loop (and, in reviewer mode, overwrite the submitter's response entirely).
    if (!form || submitted || isReviewer || isLocked || isPendingMyApproval || Object.keys(values).length === 0) return;
    const timer = setTimeout(() => {
      if (autoSaveInFlight.current) return;
      setSaving(true);
      setSaveError('');
      const p = saveResponseDraft(form.id, values)
        .then(() => { setSaved(true); setTimeout(() => setSaved(false), 2000); })
        .catch((err: any) => setSaveError(err?.message || 'Auto-save failed'))
        .finally(() => { setSaving(false); autoSaveInFlight.current = null; });
      autoSaveInFlight.current = p;
    }, 2000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [values, submitted]);

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

  const handleApprove = async () => {
    if (!approvalRecord || reviewSaving) return;
    setReviewSaving(true);
    setReviewError('');
    try {
      await approveResponse(approvalRecord.id);
      setNav('forms');
    } catch (err: any) {
      setReviewError(err?.message || 'Failed to approve response');
    } finally {
      setReviewSaving(false);
    }
  };

  const handleSendBack = async () => {
    if (!approvalRecord || reviewSaving) return;
    const fieldCommentsPayload = Object.entries(reviewFieldComments)
      .filter(([, text]) => text.trim())
      .map(([key, text]) => {
        const [fieldId, instanceId] = key.split(':');
        return instanceId ? { fieldId, instanceId, text: text.trim() } : { fieldId, text: text.trim() };
      });
    if (!reviewOverallComment.trim() && fieldCommentsPayload.length === 0) {
      setReviewError('Add an overall comment or at least one field comment explaining what needs to change.');
      return;
    }
    setReviewSaving(true);
    setReviewError('');
    try {
      await sendResponseBack(approvalRecord.id, reviewOverallComment.trim(), fieldCommentsPayload);
      setNav('forms');
    } catch (err: any) {
      setReviewError(err?.message || 'Failed to send back');
    } finally {
      setReviewSaving(false);
    }
  };

  const setReviewFieldComment = (fieldId: string, instanceId: string | undefined, text: string) => {
    const key = instanceId ? `${fieldId}:${instanceId}` : fieldId;
    setReviewFieldComments(prev => ({ ...prev, [key]: text }));
  };

  // Date fields locked to today (daily-scheduled forms) are disabled and can't fire onChange,
  // so seed their value directly or they'll incorrectly show as an unanswered required field.
  useEffect(() => {
    if (!form || form.schedule?.frequency !== 'daily') return;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const dateFieldIds = (form.fieldDefs || []).filter(f => f.type === 'date').map(f => f.id);
    if (dateFieldIds.length === 0) return;
    setValues(prev => {
      const next = { ...prev };
      let changed = false;
      for (const id of dateFieldIds) {
        if (next[id] !== today) { next[id] = today; changed = true; }
      }
      return changed ? next : prev;
    });
  }, [form, form?.fieldDefs]);

  if (!form) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--muted)', fontSize: 15 }}>
        Form not found.
        <button onClick={() => setNav('forms')} style={{ marginLeft: 12, color: accent, background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>Back to Forms</button>
      </div>
    );
  }

  if (isPendingMyApproval) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 16, padding: 24 }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <UserCheck size={28} color="#92400E" />
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>Awaiting Approval</div>
        <div style={{ fontSize: 14, color: 'var(--muted)', textAlign: 'center', maxWidth: 400 }}>
          Your response to "{form.name}" is with {pendingApprovalRecord?.assignedToName || 'your manager'} for review. It'll come back here if changes are needed.
        </div>
        <button onClick={() => setNav('forms')}
          style={{ padding: '10px 20px', border: 'none', borderRadius: 8, background: accent, color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
          Back to Forms
        </button>
      </div>
    );
  }

  if (isReviewer && approvalRecord) {
    const reviewVisibleFields = fields.filter(f => isFieldVisible(f));
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ height: 52, minHeight: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', background: 'var(--surface)' }}>
          <button type="button" onClick={() => setNav('forms')}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
            <ArrowLeft size={17} />
          </button>
          <div style={{ width: 1, height: 18, background: 'var(--border)' }} />
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{form.name} — Reviewing submission from {approvalRecord.submittedBy}</div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface2)' }}>
          <div style={{ maxWidth: 680, margin: '0 auto', padding: isMobile ? 16 : 24 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{form.name}</div>
              {form.description && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{form.description}</div>}
            </div>

            {(() => {
              const rows: React.ReactNode[] = [];
              let i = 0;
              while (i < reviewVisibleFields.length) {
                const field = reviewVisibleFields[i];
                if (field.type === 'section') {
                  let end = i + 1;
                  while (end < reviewVisibleFields.length && reviewVisibleFields[end].type !== 'section') end++;
                  const memberFields = reviewVisibleFields.slice(i + 1, end);
                  if (field.repeatable) {
                    let instances: SectionInstance[] = [];
                    try { instances = JSON.parse(values[field.id] || field.defaultValue || '[]'); } catch { /* empty */ }
                    rows.push(
                      <div key={field.id} style={{ marginTop: 20, marginBottom: 12 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, fontStyle: 'italic', color: 'var(--text)', marginBottom: 4, paddingBottom: 8, borderBottom: '2px solid var(--border)' }}>
                          {field.label}
                        </div>
                        {instances.map((instance, idx) => (
                          <div key={instance.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: 14, marginTop: 10, background: 'var(--surface2)' }}>
                            <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{field.label || 'Item'} {idx + 1}</div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                              {memberFields.map((mf) => (
                                <div key={mf.id}>
                                  <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 6 }}>{mf.label}</label>
                                  <LockedFieldWrapper locked comments={[]}>
                                    <FieldInput field={mf} value={instance.values[mf.id] || mf.defaultValue || ''} onChange={() => {}} />
                                  </LockedFieldWrapper>
                                  <input type="text" placeholder={`Comment on ${mf.label} for this ${field.label || 'item'}…`}
                                    value={reviewFieldComments[`${mf.id}:${instance.id}`] || ''}
                                    onChange={(e) => setReviewFieldComment(mf.id, instance.id, e.target.value)}
                                    style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', outline: 'none', marginTop: 6 }} />
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    rows.push(
                      <div key={field.id} style={{ marginTop: 20, marginBottom: 12 }}>
                        <div style={{ fontSize: 17, fontWeight: 700, fontStyle: 'italic', color: 'var(--text)', marginBottom: 4, paddingBottom: 8, borderBottom: '2px solid var(--border)' }}>
                          {field.label}
                        </div>
                        {memberFields.map((mf) => (
                          <div key={mf.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{mf.label}</label>
                            <LockedFieldWrapper locked comments={[]}>
                              <FieldInput field={mf} value={values[mf.id] || mf.defaultValue || ''} onChange={() => {}} />
                            </LockedFieldWrapper>
                            <input type="text" placeholder={`Comment on ${mf.label}…`}
                              value={reviewFieldComments[mf.id] || ''}
                              onChange={(e) => setReviewFieldComment(mf.id, undefined, e.target.value)}
                              style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', outline: 'none', marginTop: 6 }} />
                          </div>
                        ))}
                      </div>
                    );
                  }
                  i = end;
                } else {
                  rows.push(
                    <div key={field.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 12 }}>
                      <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>{field.label}</label>
                      <LockedFieldWrapper locked comments={[]}>
                        <FieldInput field={field} value={values[field.id] || field.defaultValue || ''} onChange={() => {}} />
                      </LockedFieldWrapper>
                      <input type="text" placeholder={`Comment on ${field.label}…`}
                        value={reviewFieldComments[field.id] || ''}
                        onChange={(e) => setReviewFieldComment(field.id, undefined, e.target.value)}
                        style={{ width: '100%', padding: '8px 10px', fontSize: 12.5, border: '1px solid var(--border)', borderRadius: 6, background: 'var(--surface)', color: 'var(--text)', outline: 'none', marginTop: 6 }} />
                    </div>
                  );
                  i++;
                }
              }
              return rows;
            })()}

            {comments.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Previous comments</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {comments.map(c => (
                    <div key={c.id} style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px' }}>
                      <strong>{c.authorName}:</strong> {c.text} {c.resolved && <span style={{ color: '#15803D' }}>(addressed)</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>Overall comment (optional)</label>
              <textarea value={reviewOverallComment} onChange={(e) => setReviewOverallComment(e.target.value)} rows={3}
                placeholder="Add a general note for the submitter…"
                style={{ width: '100%', padding: '10px 12px', fontSize: 13.5, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', outline: 'none', resize: 'vertical' }} />
            </div>

            {reviewError && <div style={{ fontSize: 12.5, color: '#DC2626', marginBottom: 10, textAlign: 'center' }}>{reviewError}</div>}
            <div style={{ display: 'flex', gap: 10, padding: '4px 0 24px' }}>
              <button type="button" onClick={handleSendBack} disabled={reviewSaving}
                style={{ flex: 1, padding: '14px 20px', borderRadius: 10, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 14, fontWeight: 700, cursor: reviewSaving ? 'default' : 'pointer', opacity: reviewSaving ? 0.6 : 1 }}>
                {reviewSaving ? 'Sending…' : 'Send Back with Comments'}
              </button>
              <button type="button" onClick={handleApprove} disabled={reviewSaving}
                style={{ flex: 1, padding: '14px 20px', borderRadius: 10, border: 'none', background: accent, color: '#fff', fontSize: 14, fontWeight: 700, cursor: reviewSaving ? 'default' : 'pointer', opacity: reviewSaving ? 0.6 : 1 }}>
                {reviewSaving ? 'Approving…' : 'Approve'}
              </button>
            </div>
          </div>
        </div>
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

  // Fields that belong to a repeatable section are validated per-instance inside
  // SectionInstanceGroup's own UI, not here — their required-ness has no single flat
  // values[f.id] to check against (the marker holds a JSON array of instances instead).
  const repeatableMemberIds = new Set<string>();
  for (let i = 0; i < visibleFields.length; i++) {
    if (visibleFields[i].type === 'section' && visibleFields[i].repeatable) {
      let end = i + 1;
      while (end < visibleFields.length && visibleFields[end].type !== 'section') end++;
      for (let j = i + 1; j < end; j++) repeatableMemberIds.add(visibleFields[j].id);
    }
  }
  const missingRequired = visibleFields.filter(f => f.type !== 'section' && !repeatableMemberIds.has(f.id) && isFieldRequired(f) && !values[f.id]?.trim());

  const handleSubmit = async () => {
    if (missingRequired.length > 0) return;
    setSubmitError('');
    try {
      // Let any in-flight auto-save resolve first so activeResponseId is set before we
      // submit -- otherwise a submit racing a first-time auto-save create can create a
      // second response instead of finalizing the one auto-save just made.
      if (autoSaveInFlight.current) await autoSaveInFlight.current;
      await submitResponse(form.id, values);
      setSubmitted(true);
    } catch (err: any) {
      setSubmitError(err?.message || 'Failed to submit response');
    }
  };

  const handleResubmit = async () => {
    if (missingRequired.length > 0 || !activeResponseId) return;
    setResubmitError('');
    setResubmitSaving(true);
    try {
      if (autoSaveInFlight.current) await autoSaveInFlight.current;
      await resubmitForApproval(activeResponseId, values);
      setSubmitted(true);
    } catch (err: any) {
      setResubmitError(err?.message || 'Failed to resubmit response');
    } finally {
      setResubmitSaving(false);
    }
  };

  const openApproval = () => {
    setApprovalError('');
    setShowApproval(true);
    api.getUsers().then(setApprovalUsers).catch(() => {});
  };

  const handleSendForApproval = async () => {
    if (missingRequired.length > 0) { setApprovalError('Complete all required fields before sending for approval.'); return; }
    if (!approvalTarget) { setApprovalError('Select a manager to review this.'); return; }
    if (approvalSaving) return;
    setApprovalSaving(true);
    setApprovalError('');
    try {
      if (autoSaveInFlight.current) await autoSaveInFlight.current;
      await sendForApproval(form.id, values, approvalTarget);
      setShowApproval(false);
      setNav('forms');
    } catch (err: any) {
      setApprovalError(err?.message || 'Failed to send for approval');
    } finally {
      setApprovalSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    try {
      await saveResponseDraft(form.id, values);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setSaveError(err?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const openHandoff = () => {
    setHandoffError('');
    setShowHandoff(true);
    api.getUsers().then(setHandoffUsers).catch(() => {});
  };

  const handleHandoff = async () => {
    if (!handoffTarget) { setHandoffError('Select a person to send this to.'); return; }
    if (handoffSaving) return;
    setHandoffSaving(true);
    setHandoffError('');
    try {
      if (autoSaveInFlight.current) await autoSaveInFlight.current;
      await saveResponseDraft(form.id, values, { assignedToId: handoffTarget, handOff: true });
      setShowHandoff(false);
      setNav('forms');
    } catch (err: any) {
      setHandoffError(err?.message || 'Failed to hand off');
    } finally {
      setHandoffSaving(false);
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
        <button type="button" onClick={handleSaveDraft} disabled={saving}
          style={{ height: 32, padding: '0 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: saving ? 'default' : 'pointer', flexShrink: 0, opacity: saving ? 0.6 : 1 }}>
          {saving ? 'Saving…' : saved ? 'Saved' : 'Save & Continue Later'}
        </button>
        {isAdmin && !isLocked && (
          <button type="button" onClick={openHandoff}
            style={{ height: 32, padding: '0 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <UserCheck size={13} /> Send for Completion
          </button>
        )}
        {!isLocked && (
          <button type="button" onClick={openApproval}
            style={{ height: 32, padding: '0 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <UserCheck size={13} /> Send for Approval
          </button>
        )}
        {isLocked ? (
          <button type="button" onClick={handleResubmit} disabled={missingRequired.length > 0 || resubmitSaving}
            style={{
              height: 32, padding: '0 14px', borderRadius: 7, border: 'none',
              background: missingRequired.length > 0 ? 'var(--border)' : accent,
              color: missingRequired.length > 0 ? 'var(--muted)' : '#fff',
              fontSize: 12.5, fontWeight: 600, cursor: missingRequired.length > 0 ? 'default' : 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 6, flexShrink: 0,
            }}>
            <Send size={13} /> {resubmitSaving ? 'Resubmitting…' : 'Resubmit'}
          </button>
        ) : (
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
        )}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', background: 'var(--surface2)' }}>
        <div style={{ maxWidth: 680, margin: '0 auto', padding: isMobile ? 16 : 24 }}>
          {saveError && (
            <div style={{ fontSize: 12.5, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '10px 14px', marginBottom: 12 }}>
              {saveError}
            </div>
          )}
          {isLocked && overallUnresolvedComment && (
            <div style={{ fontSize: 13, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '12px 14px', marginBottom: 12 }}>
              <strong>{overallUnresolvedComment.authorName} requested changes:</strong> {overallUnresolvedComment.text}
            </div>
          )}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '18px 20px', marginBottom: 20 }}>
            <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{form.name}</div>
            {form.description && <div style={{ fontSize: 13, color: 'var(--muted)' }}>{form.description}</div>}
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 8 }}>
              {fields.filter(f => f.required).length > 0 && <span style={{ color: '#EF4444' }}>*</span>}{' '}
              indicates required fields
            </div>
          </div>

          {(() => {
            const rows: React.ReactNode[] = [];
            let i = 0;
            while (i < visibleFields.length) {
              const field = visibleFields[i];
              if (field.type === 'section') {
                let end = i + 1;
                while (end < visibleFields.length && visibleFields[end].type !== 'section') end++;
                const memberFields = visibleFields.slice(i + 1, end);
                rows.push(
                  <div key={field.id} style={{ marginTop: 20, marginBottom: 12 }}>
                    <div style={{ fontSize: 17, fontWeight: 700, fontStyle: 'italic', color: 'var(--text)', marginBottom: 4, paddingBottom: 8, borderBottom: '2px solid var(--border)' }}>
                      {field.label}
                    </div>
                    {field.helpText && <div style={{ fontSize: 12.5, color: 'var(--muted)', margin: '6px 0 10px' }}>{field.helpText}</div>}
                    {field.repeatable ? (
                      <div style={{ marginTop: 10 }}>
                        <SectionInstanceGroup
                          value={values[field.id] || field.defaultValue || ''}
                          onChange={(v) => setValue(field.id, v)}
                          memberFields={memberFields}
                          accent={accent}
                          sectionLabel={field.label || 'Item'}
                          isFieldLocked={isLocked ? (fieldId, instanceId) => !unresolvedFieldKeys.has(`${fieldId}:${instanceId}`) : undefined}
                          getComments={isLocked ? (fieldId, instanceId) => fieldComments(fieldId, instanceId).map(c => ({ text: c.text, authorName: c.authorName })) : undefined}
                        />
                      </div>
                    ) : (
                      memberFields.map((mf) => {
                        const required = isFieldRequired(mf);
                        const locked = isLocked && !unresolvedFieldKeys.has(mf.id);
                        const mfComments = isLocked ? fieldComments(mf.id).map(c => ({ text: c.text, authorName: c.authorName })) : [];
                        return (
                          <div key={mf.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 12 }}>
                            <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                              {mf.label}
                              {required && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
                            </label>
                            {mf.helpText && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{mf.helpText}</div>}
                            <LockedFieldWrapper locked={locked} comments={mfComments}>
                              <FieldInput field={mf} value={values[mf.id] || mf.defaultValue || ''} onChange={(v) => setValue(mf.id, v)}
                                lockToToday={mf.type === 'date' && form.schedule?.frequency === 'daily'} />
                            </LockedFieldWrapper>
                          </div>
                        );
                      })
                    )}
                  </div>
                );
                i = end;
              } else {
                const required = isFieldRequired(field);
                const locked = isLocked && !unresolvedFieldKeys.has(field.id);
                const fComments = isLocked ? fieldComments(field.id).map(c => ({ text: c.text, authorName: c.authorName })) : [];
                rows.push(
                  <div key={field.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', marginBottom: 12 }}>
                    <label style={{ display: 'block', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
                      {field.label}
                      {required && <span style={{ color: '#EF4444', marginLeft: 4 }}>*</span>}
                    </label>
                    {field.helpText && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 8 }}>{field.helpText}</div>}
                    <LockedFieldWrapper locked={locked} comments={fComments}>
                      <FieldInput field={field} value={values[field.id] || field.defaultValue || ''} onChange={(v) => setValue(field.id, v)}
                        lockToToday={field.type === 'date' && form.schedule?.frequency === 'daily'} />
                    </LockedFieldWrapper>
                  </div>
                );
                i++;
              }
            }
            return rows;
          })()}

          <div style={{ padding: '16px 0' }}>
            {(isLocked ? resubmitError : submitError) && <div style={{ fontSize: 12.5, color: '#DC2626', marginBottom: 10, textAlign: 'center' }}>{isLocked ? resubmitError : submitError}</div>}
            {missingRequired.length > 0 && (
              <div style={{ fontSize: 12.5, color: '#92400E', background: '#FEF3C7', border: '1px solid #FDE68A', borderRadius: 8, padding: '10px 14px', marginBottom: 10 }}>
                Complete these required fields before submitting: {missingRequired.map(f => f.label).join(', ')}
              </div>
            )}
            {isLocked ? (
              <button type="button" onClick={handleResubmit} disabled={missingRequired.length > 0 || resubmitSaving}
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 10, border: 'none',
                  background: missingRequired.length > 0 ? 'var(--border)' : accent,
                  color: missingRequired.length > 0 ? 'var(--muted)' : '#fff',
                  fontSize: 15, fontWeight: 700, cursor: missingRequired.length > 0 ? 'default' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                <Send size={16} /> {resubmitSaving ? 'Resubmitting…' : 'Resubmit for Approval'}
              </button>
            ) : (
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
            )}
          </div>
        </div>
      </div>

      {showHandoff && (
        <div onClick={() => setShowHandoff(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 420, maxWidth: '92%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Send for Completion</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>Saves your current progress and sends this form to the selected person to finish.</div>
            <select value={handoffTarget} onChange={(e) => setHandoffTarget(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', outline: 'none', marginBottom: 12 }}>
              <option value="">Select a person…</option>
              {handoffUsers.filter(u => u.status === 'active' && u.id !== currentUserId).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            {handoffError && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{handoffError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowHandoff(false)} disabled={handoffSaving} style={{ padding: '8px 16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: handoffSaving ? 'default' : 'pointer', opacity: handoffSaving ? 0.6 : 1 }}>Cancel</button>
              <button onClick={handleHandoff} disabled={handoffSaving} style={{ padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: handoffSaving ? 'default' : 'pointer', opacity: handoffSaving ? 0.6 : 1 }}>{handoffSaving ? 'Sending…' : 'Send'}</button>
            </div>
          </div>
        </div>
      )}

      {showApproval && (
        <div onClick={() => setShowApproval(false)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 420, maxWidth: '92%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Send for Approval</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>Saves your current progress and sends this form to the selected manager to review and approve.</div>
            <select value={approvalTarget} onChange={(e) => setApprovalTarget(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', fontSize: 13, border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', color: 'var(--text)', outline: 'none', marginBottom: 12 }}>
              <option value="">Select a manager…</option>
              {approvalUsers.filter(u => u.status === 'active' && u.id !== currentUserId).map(u => (
                <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
              ))}
            </select>
            {approvalError && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{approvalError}</div>}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowApproval(false)} disabled={approvalSaving} style={{ padding: '8px 16px', background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: approvalSaving ? 'default' : 'pointer', opacity: approvalSaving ? 0.6 : 1 }}>Cancel</button>
              <button onClick={handleSendForApproval} disabled={approvalSaving} style={{ padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: approvalSaving ? 'default' : 'pointer', opacity: approvalSaving ? 0.6 : 1 }}>{approvalSaving ? 'Sending…' : 'Send'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
