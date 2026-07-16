import { useState, useEffect, useRef } from 'react';
import { Sparkles, Paperclip, X, ArrowUp, FileSpreadsheet, FilePlus2, Layers, ArrowLeft } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { legibleAccent } from '../../lib/theme';
import { formatDate } from '../../lib/format';
import { parseImportFile, IMPORT_ACCEPT } from '../../lib/parseImportFile';
import type { FormField } from '../../store/types';

const EXAMPLE_PROMPTS = [
  'Create a housekeeping checklist with photo evidence for each area',
  'Comprehensive FSSAI food safety audit, entry to exit',
  'Daily forklift pre-operation safety inspection',
  'New employee onboarding form with document checklist',
];

const TYPE_LABELS: Record<string, string> = {
  textbox: 'Text', textarea: 'Textarea', richtext: 'Rich Text', number: 'Number', currency: 'Currency',
  percent: 'Percent', date: 'Date', time: 'Time', datetime: 'DateTime', dropdown: 'Dropdown',
  multiselect: 'Multi-Sel', checkbox: 'Checkbox', radio: 'Radio', toggle: 'Toggle', lookup: 'Lookup',
  formula: 'Formula', image: 'Image', camera: 'Camera', video: 'Video', audio: 'Audio', upload: 'File',
  signature: 'Signature', gps: 'GPS', qr: 'QR', barcode: 'Barcode', email: 'Email', phone: 'Phone',
  url: 'URL', rating: 'Rating', color: 'Color', hidden: 'Hidden', system: 'System', ai: 'AI', section: 'Section',
};

type PlanField = Omit<FormField, 'id'>;

interface ChatMessage {
  role: 'user' | 'ai';
  text: string;
}

export default function CreateScreen() {
  const accent = useStore((s) => s.accent);
  const dark = useStore((s) => s.dark);
  const winWidth = useStore((s) => s.winWidth);
  const currentUserName = useStore((s) => s.currentUserName);
  const forms = useStore((s) => s.forms);
  const refreshForms = useStore((s) => s.refreshForms);
  const loadGeneratedFields = useStore((s) => s.loadGeneratedFields);
  const editForm = useStore((s) => s.editForm);
  const openNewForm = useStore((s) => s.openNewForm);

  const [prompt, setPrompt] = useState('');
  const [attachedFile, setAttachedFile] = useState<File | null>(null);
  const [fileContext, setFileContext] = useState('');
  const [parsingFile, setParsingFile] = useState(false);
  const [fileError, setFileError] = useState('');
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Plan-review stage: once AI returns a draft, we show its summary + field list here
  // instead of jumping straight to the builder, so the user can confirm or ask for
  // changes via a short follow-up chat before anything touches builder state.
  const [planFields, setPlanFields] = useState<PlanField[] | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [refinePrompt, setRefinePrompt] = useState('');
  const [originalPrompt, setOriginalPrompt] = useState('');

  useEffect(() => { refreshForms(); }, [refreshForms]);

  const accentText = legibleAccent(accent, dark);
  const isMobile = winWidth < 720;
  const ghost = dark ? '#303036' : '#E4E4E7';

  const recentForms = [...forms].sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime()).slice(0, 5);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFileError('');
    setParsingFile(true);
    try {
      const text = await parseImportFile(file);
      if (!text) { setFileError('Could not read any content from that file.'); setAttachedFile(null); setFileContext(''); return; }
      setAttachedFile(file);
      setFileContext(text);
    } catch (err: any) {
      setFileError(err?.message || 'Failed to read file');
      setAttachedFile(null);
      setFileContext('');
    } finally {
      setParsingFile(false);
    }
  };

  const removeAttachment = () => { setAttachedFile(null); setFileContext(''); setFileError(''); };

  const handleGenerate = async () => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    setError('');
    try {
      const { api } = await import('../../lib/api');
      const { summary, fields } = await api.generateForm(prompt.trim(), fileContext || undefined);
      setOriginalPrompt(prompt.trim());
      setMessages([{ role: 'user', text: prompt.trim() }, { role: 'ai', text: summary || `Drafted ${fields.length} fields based on your request.` }]);
      setPlanFields(fields);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate form');
    } finally {
      setGenerating(false);
    }
  };

  const handleRefine = async () => {
    if (!refinePrompt.trim() || generating || !planFields) return;
    setGenerating(true);
    setError('');
    const instruction = refinePrompt.trim();
    try {
      const { api } = await import('../../lib/api');
      // Send only the fields the model actually needs to revise a plan (type/label/
      // helpText/required/options/repeatable) -- the full FormField objects also carry
      // placeholder/defaultValue/validation/logic/etc, which would bloat the prompt (and
      // the required "produce the complete, revised field list" echo-back) for no benefit,
      // competing with the same output-token ceiling that large initial generations hit.
      const minimalFields = planFields.map(({ type, label, helpText, required, options, repeatable }) => ({
        type, label, helpText, required, options, repeatable,
      }));
      const { summary, fields } = await api.generateForm(instruction, undefined, minimalFields);
      setMessages((prev) => [...prev, { role: 'user', text: instruction }, { role: 'ai', text: summary || `Updated the field list (${fields.length} fields).` }]);
      setPlanFields(fields);
      setRefinePrompt('');
    } catch (err: any) {
      setError(err?.message || 'Failed to update form');
    } finally {
      setGenerating(false);
    }
  };

  const handleBuild = () => {
    if (!planFields) return;
    const name = originalPrompt.length > 60 ? originalPrompt.slice(0, 57) + '…' : originalPrompt;
    loadGeneratedFields(planFields, name || 'Generated Form');
  };

  const startOver = () => {
    setPlanFields(null);
    setMessages([]);
    setPrompt('');
    setRefinePrompt('');
    setError('');
    removeAttachment();
  };

  if (planFields) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div style={{ height: 52, minHeight: 52, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, padding: '0 14px', background: 'var(--surface)' }}>
          <button type="button" onClick={startOver}
            style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 30, height: 30, borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--text)', cursor: 'pointer' }}>
            <ArrowLeft size={17} />
          </button>
          <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', flex: 1 }}>Review Plan</div>
          <button onClick={handleBuild} disabled={generating}
            style={{ height: 32, padding: '0 16px', borderRadius: 7, border: 'none', background: accent, color: '#fff', fontSize: 12.5, fontWeight: 600, cursor: generating ? 'default' : 'pointer', opacity: generating ? 0.6 : 1 }}>
            Build This
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: isMobile ? 16 : 24, display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 720, width: '100%', margin: '0 auto' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {messages.map((m, i) => (
              <div key={i} style={{ alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start', maxWidth: '85%' }}>
                <div style={{
                  fontSize: 13, lineHeight: 1.5, padding: '9px 13px', borderRadius: 12,
                  background: m.role === 'user' ? accent : 'var(--surface)',
                  color: m.role === 'user' ? '#fff' : 'var(--text)',
                  border: m.role === 'ai' ? `1px solid ${ghost}` : 'none',
                }}>
                  {m.text}
                </div>
              </div>
            ))}
          </div>

          {error && <div style={{ fontSize: 12.5, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 11px' }}>{error}</div>}

          <div>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.5px', marginBottom: 10 }}>
              Proposed Fields ({planFields.length})
            </div>
            <div style={{ background: 'var(--surface)', border: `1px solid ${ghost}`, borderRadius: 10, overflow: 'hidden' }}>
              {planFields.map((f, i) => (
                f.type === 'section' ? (
                  <div key={i} style={{ padding: '10px 14px', background: 'var(--surface2)', borderBottom: i < planFields.length - 1 ? `1px solid ${ghost}` : 'none', display: 'flex', alignItems: 'center', gap: 7 }}>
                    <Layers size={12} color="var(--muted)" />
                    <span style={{ fontSize: 12, fontWeight: 700, fontStyle: 'italic', color: 'var(--text)' }}>{f.label}</span>
                    {f.repeatable && <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase' as const, padding: '2px 6px', borderRadius: 4, background: `${accent}18`, color: accent }}>Repeats</span>}
                  </div>
                ) : (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 14px 9px 28px', borderBottom: i < planFields.length - 1 ? `1px solid ${dark ? '#1C1C1E' : '#F4F4F5'}` : 'none' }}>
                    <div style={{ width: 22, height: 22, borderRadius: 6, background: dark ? '#242426' : '#F4F4F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: 'var(--muted)', marginTop: 1, fontSize: 9.5 }}>
                      {(TYPE_LABELS[f.type] || f.type).charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--text)' }}>{f.label}</div>
                      <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>{TYPE_LABELS[f.type] || f.type}{f.required ? ' · Required' : ''}</div>
                    </div>
                  </div>
                )
              ))}
            </div>
          </div>
        </div>

        <div style={{ borderTop: `1px solid ${ghost}`, padding: isMobile ? 12 : 16, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 8, maxWidth: 720, width: '100%', margin: '0 auto' }}>
            <input
              value={refinePrompt}
              onChange={(e) => setRefinePrompt(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRefine(); } }}
              disabled={generating}
              placeholder='Ask for a change — e.g. "also add a signature field"'
              style={{ flex: 1, padding: '10px 13px', border: `1px solid ${ghost}`, borderRadius: 8, fontSize: 13, color: 'var(--text)', background: 'var(--surface)', outline: 'none' }}
            />
            <button onClick={handleRefine} disabled={generating || !refinePrompt.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 40, height: 40, borderRadius: 8, border: 'none', background: (generating || !refinePrompt.trim()) ? 'var(--border)' : accent, color: (generating || !refinePrompt.trim()) ? 'var(--muted)' : '#fff', cursor: (generating || !refinePrompt.trim()) ? 'default' : 'pointer', flexShrink: 0 }}>
              <ArrowUp size={16} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflowY: 'auto' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: isMobile ? '32px 16px' : '48px 24px', minHeight: 480 }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${accentText}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: accentText, marginBottom: 18 }}>
          <Sparkles size={22} />
        </div>
        <h1 style={{ fontSize: isMobile ? 22 : 28, fontWeight: 600, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: 8, textAlign: 'center' }}>
          {currentUserName ? `What are we building, ${currentUserName.split(' ')[0]}?` : 'What are we building today?'}
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', marginBottom: 28, textAlign: 'center', maxWidth: 480 }}>
          Describe the checklist or form you need, optionally attach an existing spreadsheet or list for context. AI will draft a plan for you to review before anything is built.
        </p>

        <div style={{ width: '100%', maxWidth: 680, background: 'var(--surface)', border: `1px solid ${ghost}`, borderRadius: 16, padding: 14, boxShadow: dark ? 'none' : '0 2px 12px rgba(0,0,0,.05)' }}>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleGenerate(); } }}
            disabled={generating}
            placeholder="Create a housekeeping checklist with photo evidence…"
            rows={3}
            style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'var(--text)', fontSize: 15, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, minHeight: 64 }}
          />

          {attachedFile && (
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface2)', border: `1px solid ${ghost}`, borderRadius: 20, padding: '5px 8px 5px 10px', fontSize: 12, color: 'var(--text)', marginBottom: 10, marginTop: 2 }}>
              <FileSpreadsheet size={13} color="var(--muted)" />
              <span style={{ maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{attachedFile.name}</span>
              <button onClick={removeAttachment} style={{ display: 'flex', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 0 }}>
                <X size={12} />
              </button>
            </div>
          )}
          {parsingFile && <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 10 }}>Reading file…</div>}
          {fileError && <div style={{ fontSize: 12, color: '#DC2626', marginBottom: 10 }}>{fileError}</div>}
          {error && <div style={{ fontSize: 12.5, color: '#DC2626', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: 8, padding: '8px 11px', marginBottom: 10 }}>{error}</div>}

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
            <input ref={fileInputRef} type="file" accept={IMPORT_ACCEPT} onChange={handleFileChange} style={{ display: 'none' }} />
            <button onClick={() => fileInputRef.current?.click()} disabled={generating || parsingFile}
              title="Attach an Excel/CSV/text file for context"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 12px', background: 'var(--surface2)', border: `1px solid ${ghost}`, borderRadius: 8, fontSize: 12.5, fontWeight: 500, color: 'var(--text)', cursor: (generating || parsingFile) ? 'default' : 'pointer', opacity: (generating || parsingFile) ? 0.6 : 1 }}>
              <Paperclip size={13} /> Attach file
            </button>
            <button onClick={handleGenerate} disabled={generating || !prompt.trim()}
              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 36, height: 36, borderRadius: '50%', border: 'none', background: (generating || !prompt.trim()) ? 'var(--border)' : accent, color: (generating || !prompt.trim()) ? 'var(--muted)' : '#fff', cursor: (generating || !prompt.trim()) ? 'default' : 'pointer' }}>
              <ArrowUp size={17} />
            </button>
          </div>
        </div>

        {!prompt && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 18, maxWidth: 680 }}>
            {EXAMPLE_PROMPTS.map((ex) => (
              <button key={ex} onClick={() => setPrompt(ex)}
                style={{ padding: '7px 13px', borderRadius: 20, border: `1px solid ${ghost}`, background: 'var(--surface)', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' }}>
                {ex}
              </button>
            ))}
          </div>
        )}

        {generating && (
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 18 }}>Generating your form…</div>
        )}
      </div>

      {recentForms.length > 0 && (
        <div style={{ padding: isMobile ? '0 16px 32px' : '0 24px 40px', maxWidth: 680, width: '100%', margin: '0 auto' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase' as const, letterSpacing: '0.5px' }}>Recent Forms</div>
            <button onClick={openNewForm} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: accent, fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              <FilePlus2 size={12} /> Blank Form
            </button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {recentForms.map((f) => (
              <button key={f.id} onClick={() => editForm(f.id)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--surface)', border: `1px solid ${ghost}`, borderRadius: 8, cursor: 'pointer', textAlign: 'left' }}>
                <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{f.name}</span>
                <span style={{ fontSize: 11, color: 'var(--muted)', flexShrink: 0, marginLeft: 12 }}>{formatDate(f.updated)}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
