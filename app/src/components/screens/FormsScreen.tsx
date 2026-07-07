import { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Search, MoreHorizontal, Trash2, Copy, ClipboardList, CalendarClock } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { legibleAccent } from '../../lib/theme';
import { StatusBadge } from '../ui/StatusBadge';

export default function FormsScreen() {
  const forms = useStore((s) => s.forms);
  const accent = useStore((s) => s.accent);
  const dark = useStore((s) => s.dark);
  const openNewForm = useStore((s) => s.openNewForm);
  const editForm = useStore((s) => s.editForm);
  const deleteForm = useStore((s) => s.deleteForm);
  const fillForm = useStore((s) => s.fillForm);
  const winWidth = useStore((s) => s.winWidth);
  const currentUserId = useStore((s) => s.currentUserId);
  const currentUserRole = useStore((s) => s.currentUserRole);
  const [search, setSearch] = useState('');
  const [menuId, setMenuId] = useState<number | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (menuId === null) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuId]);

  const handleMenuClick = (e: React.MouseEvent, formId: number) => {
    e.stopPropagation();
    if (menuId === formId) {
      setMenuId(null);
      return;
    }
    const btn = e.currentTarget as HTMLElement;
    const rect = btn.getBoundingClientRect();
    setMenuPos({ top: rect.bottom + 4, left: rect.right - 180 });
    setMenuId(formId);
  };

  const accentText = legibleAccent(accent, dark);
  const isMobile = winWidth < 720;
  const pad = isMobile ? '16px' : '24px 32px';
  const isAdmin = currentUserRole === 'Admin' || currentUserRole === 'admin';
  const visibleForms = isAdmin ? forms : forms.filter(f =>
    !f.assignedUserIds || f.assignedUserIds.length === 0 || (currentUserId && f.assignedUserIds.includes(currentUserId))
  );
  const filtered = visibleForms.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.category.toLowerCase().includes(search.toLowerCase())
  );

  const menuForm = forms.find(f => f.id === menuId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: pad, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 18 : 21, fontWeight: 700, letterSpacing: '-0.5px', color: 'var(--text)' }}>Forms</h1>
          <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 3 }}>{visibleForms.length} forms in your workspace</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}>
          <Search size={13} color="var(--muted)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search forms…"
            style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: isMobile ? '100%' : 170, outline: 'none' }} />
        </div>
        <button onClick={openNewForm}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: accent, color: '#fff', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
          <Plus size={14} /> New Form
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: pad }}>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12 }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Name', 'Category', 'Fields', 'Responses', 'Status', 'Updated', 'Actions'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.03em', padding: '10px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((form) => (
                  <tr key={form.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${accentText}1A`, color: accentText, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <FileText size={15} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{form.name}</span>
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{form.category}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{form.fields}</td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{form.responses}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <StatusBadge status={form.status} />
                        {form.schedule && form.schedule.frequency !== 'once' && (
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: '#EFF6FF', color: '#2563EB' }}>
                            <CalendarClock size={10} /> {form.schedule.frequency}
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: 13, color: 'var(--muted)' }}>{form.updated}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {form.status === 'published' && (
                          <button onClick={() => fillForm(form.id)}
                            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: accent, border: 'none', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                            <ClipboardList size={12} /> Fill Out
                          </button>
                        )}
                        <button onClick={() => editForm(form.id)}
                          style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, padding: '5px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)', cursor: 'pointer' }}>
                          Edit
                        </button>
                        <button onClick={(e) => handleMenuClick(e, form.id)}
                          style={{ background: 'none', border: '1px solid var(--border)', borderRadius: 6, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', cursor: 'pointer' }}>
                          <MoreHorizontal size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} style={{ padding: '32px 20px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>No forms match your search.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {menuId !== null && menuForm && (
        <div ref={menuRef} style={{
          position: 'fixed', top: menuPos.top, left: menuPos.left,
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
          boxShadow: '0 4px 16px rgba(0,0,0,.18)', zIndex: 999, minWidth: 180,
        }}>
          {menuForm.status === 'published' && (
            <button onClick={() => { fillForm(menuForm.id); setMenuId(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
              <ClipboardList size={14} /> Fill Out
            </button>
          )}
          <button onClick={() => { editForm(menuForm.id); setMenuId(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
            <Copy size={14} /> Duplicate
          </button>
          <button onClick={() => { deleteForm(menuForm.id); setMenuId(null); }}
            style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: '#EF4444', cursor: 'pointer', textAlign: 'left' }}>
            <Trash2 size={14} /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
