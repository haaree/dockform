import { useState, useEffect, useRef } from 'react';
import { FileText, Plus, Search, MoreHorizontal, Trash2, Copy, ClipboardList, CalendarClock, Users, Link2, Check, UserMinus, X } from 'lucide-react';
import { useStore } from '../../store/useStore';
import { legibleAccent } from '../../lib/theme';
import { StatusBadge } from '../ui/StatusBadge';
import { api } from '../../lib/api';
import { getCurrentOccurrenceStart } from '../../lib/schedule';

export default function FormsScreen() {
  const forms = useStore((s) => s.forms);
  const responses = useStore((s) => s.responses);
  const refreshForms = useStore((s) => s.refreshForms);
  const refreshResponses = useStore((s) => s.refreshResponses);
  const accent = useStore((s) => s.accent);
  const dark = useStore((s) => s.dark);
  const openNewForm = useStore((s) => s.openNewForm);
  const editForm = useStore((s) => s.editForm);
  const deleteForm = useStore((s) => s.deleteForm);
  const fillForm = useStore((s) => s.fillForm);
  const winWidth = useStore((s) => s.winWidth);
  const currentUserId = useStore((s) => s.currentUserId);
  const currentUserRole = useStore((s) => s.currentUserRole);
  const updateFormAssignment = useStore((s) => s.updateFormAssignment);
  const [allUsers, setAllUsers] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [menuId, setMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const [accessFormId, setAccessFormId] = useState<string | null>(null);
  const [accessSearch, setAccessSearch] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { refreshForms(); }, [refreshForms]);
  useEffect(() => { api.getUsers().then(setAllUsers).catch(() => {}); }, []);
  useEffect(() => { refreshResponses(); }, [refreshResponses]);

  useEffect(() => {
    if (menuId === null) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuId(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuId]);

  const handleMenuClick = (e: React.MouseEvent, formId: string) => {
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
  const isViewer = currentUserRole === 'viewer';
  const visibleForms = isAdmin ? forms : forms.filter(f =>
    !f.assignedUserIds || f.assignedUserIds.length === 0 || (currentUserId && f.assignedUserIds.includes(currentUserId as string))
  );
  const filtered = visibleForms.filter((f) =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.category.toLowerCase().includes(search.toLowerCase())
  ).filter(f => !isViewer || f.status === 'published');

  const isCompletedForViewer = (form: typeof forms[number]) => {
    const occurrenceStart = getCurrentOccurrenceStart(form.schedule);
    if (!occurrenceStart) {
      return responses.some(r => r.formId === form.id && (!currentUserId || r.submittedById === currentUserId));
    }
    return responses.some(r => r.formId === form.id && r.submittedById === currentUserId && new Date(r.date) >= occurrenceStart);
  };

  const pendingForms = isViewer ? filtered.filter(f => !isCompletedForViewer(f)) : [];
  const completedForms = isViewer ? filtered.filter(f => isCompletedForViewer(f)) : [];

  const menuForm = forms.find(f => f.id === menuId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: pad, flexShrink: 0, borderBottom: '1px solid var(--border)', display: 'flex', alignItems: isMobile ? 'stretch' : 'center', gap: 12, flexWrap: 'wrap', flexDirection: isMobile ? 'column' : 'row' }}>
        <div style={{ flex: 1, minWidth: 200 }}>
          <h1 style={{ fontSize: isMobile ? 20 : 24, fontWeight: 600, letterSpacing: '-0.5px', color: 'var(--text)' }}>Forms</h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', marginTop: 4 }}>{visibleForms.length} forms in your workspace</p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 12px' }}>
          <Search size={13} color="var(--muted)" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search forms…"
            style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: isMobile ? '100%' : 170, outline: 'none' }} />
        </div>
        {!isViewer && (
          <button onClick={openNewForm}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: 'var(--text)', color: 'var(--bg)', border: 'none', borderRadius: 6, fontSize: 13, fontWeight: 500, cursor: 'pointer', width: isMobile ? '100%' : 'auto', justifyContent: 'center' }}>
            <Plus size={14} /> New Form
          </button>
        )}
      </div>

      <div style={{ flex: 1, overflow: 'auto', padding: pad }}>
        {isViewer ? (
          <>
            <ViewerFormSection title="Pending" forms={pendingForms} accentText={accentText} fillForm={fillForm} />
            <div style={{ height: 24 }} />
            <ViewerFormSection title="Completed" forms={completedForms} accentText={accentText} fillForm={fillForm} completed />
          </>
        ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Name', 'Category', 'Fields', 'Responses', 'Status', 'Updated', 'Actions'].map((h) => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 12, fontWeight: 500, color: 'var(--muted)', padding: '12px 16px', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
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
        )}
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
          {menuForm.status === 'published' && (
            <button onClick={() => {
              const url = `${window.location.origin}?fill=${menuForm.id}`;
              navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
              setMenuId(null);
            }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
              <Link2 size={14} /> {copied ? 'Copied!' : 'Copy Link'}
            </button>
          )}
          {menuForm.status === 'published' && isAdmin && (
            <button onClick={() => { setAccessFormId(menuForm.id); setMenuId(null); }}
              style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '10px 14px', background: 'none', border: 'none', fontSize: 13, color: 'var(--text)', cursor: 'pointer', textAlign: 'left' }}>
              <Users size={14} /> Manage Access
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

      {accessFormId !== null && (() => {
        const form = forms.find(f => f.id === accessFormId);
        if (!form) return null;
        const assignedIds = form.assignedUserIds || [];
        const activeUsers = allUsers.filter(u => u.status === 'active');
        const assignedUsers = activeUsers.filter(u => assignedIds.includes(u.id));
        const unassigned = activeUsers.filter(u => !assignedIds.includes(u.id) && (!accessSearch || u.name.toLowerCase().includes(accessSearch.toLowerCase()) || u.email.toLowerCase().includes(accessSearch.toLowerCase())));

        const handleGrant = async (userId: string) => {
          const newIds = [...assignedIds, userId];
          await updateFormAssignment(accessFormId, newIds);
          const u = allUsers.find(usr => usr.id === userId);
          if (u) {
            api.sendFormAssignedEmail(u.email, u.name, form.name, 'DockForm Admin', form.id);
          }
        };

        const handleRevoke = async (userId: string) => {
          await updateFormAssignment(accessFormId, assignedIds.filter(id => id !== userId));
        };

        return (
          <div onClick={() => { setAccessFormId(null); setAccessSearch(''); }} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, width: 480, maxWidth: '92%', maxHeight: '80vh', display: 'flex', flexDirection: 'column' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Manage Access</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{form.name}</div>
                </div>
                <button onClick={() => { setAccessFormId(null); setAccessSearch(''); }} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}><X size={18} /></button>
              </div>

              {assignedUsers.length > 0 && (
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Assigned Users ({assignedUsers.length})</div>
                  <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 180, overflowY: 'auto' }}>
                    {assignedUsers.map(u => (
                      <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderBottom: '1px solid var(--border)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{u.initials}</div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email}</div>
                        </div>
                        <button onClick={() => handleRevoke(u.id)} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface)', color: '#EF4444', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>
                          <UserMinus size={12} /> Revoke
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {assignedUsers.length === 0 && (
                <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 13, marginBottom: 16, background: 'var(--surface2)', borderRadius: 8 }}>
                  No users assigned — this form is visible to all users.
                </div>
              )}

              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>Add Users</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: '7px 10px', marginBottom: 10 }}>
                <Search size={13} color="var(--muted)" />
                <input value={accessSearch} onChange={e => setAccessSearch(e.target.value)} placeholder="Search users to add…"
                  style={{ border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 13, width: '100%', outline: 'none' }} />
              </div>
              <div style={{ border: '1px solid var(--border)', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                {unassigned.map(u => (
                  <button key={u.id} onClick={() => handleGrant(u.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', background: 'none', border: 'none', borderBottom: '1px solid var(--border)', cursor: 'pointer', textAlign: 'left' }}>
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>{u.initials}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{u.name}</div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{u.email} · {u.role}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: accent, fontSize: 11, fontWeight: 600 }}>
                      <Check size={12} /> Grant
                    </div>
                  </button>
                ))}
                {unassigned.length === 0 && (
                  <div style={{ padding: 16, textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
                    {accessSearch ? 'No matching users found.' : 'All users are already assigned.'}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function ViewerFormSection({ title, forms, accentText, fillForm, completed }: {
  title: string; forms: any[]; accentText: string; fillForm: (id: string) => void; completed?: boolean;
}) {
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 10 }}>{title} ({forms.length})</div>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
        {forms.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', fontSize: 13, color: 'var(--muted)' }}>
            {completed ? 'No forms completed yet.' : 'Nothing pending.'}
          </div>
        )}
        {forms.map((form, i) => (
          <div key={form.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < forms.length - 1 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: `${accentText}1A`, color: accentText, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <FileText size={15} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{form.name}</div>
              <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                {form.category}
                {form.schedule && form.schedule.frequency !== 'once' && (
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 10, background: '#EFF6FF', color: '#2563EB' }}>
                    <CalendarClock size={10} /> {form.schedule.frequency}
                  </span>
                )}
              </div>
            </div>
            {!completed && (
              <button onClick={() => fillForm(form.id)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: accentText, border: 'none', borderRadius: 6, padding: '6px 14px', fontSize: 12, fontWeight: 600, color: '#fff', cursor: 'pointer' }}>
                <ClipboardList size={12} /> Fill Out
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
