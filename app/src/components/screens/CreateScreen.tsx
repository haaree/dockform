import { useState, useEffect, useRef } from 'react';
import { Sparkles, Paperclip, X, ArrowUp, FileSpreadsheet, FilePlus2 } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { legibleAccent } from '../../lib/theme';
import { formatDate } from '../../lib/format';
import { parseImportFile, IMPORT_ACCEPT } from '../../lib/parseImportFile';

const EXAMPLE_PROMPTS = [
  'Create a housekeeping checklist with photo evidence for each area',
  'Comprehensive FSSAI food safety audit, entry to exit',
  'Daily forklift pre-operation safety inspection',
  'New employee onboarding form with document checklist',
];

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
      const { fields } = await api.generateForm(prompt.trim(), fileContext || undefined);
      const name = prompt.trim().length > 60 ? prompt.trim().slice(0, 57) + '…' : prompt.trim();
      loadGeneratedFields(fields, name);
    } catch (err: any) {
      setError(err?.message || 'Failed to generate form');
    } finally {
      setGenerating(false);
    }
  };

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
          Describe the checklist or form you need, optionally attach an existing spreadsheet or list for context, and AI will draft a complete field list to review in the builder.
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
