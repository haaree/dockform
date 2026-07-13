import { useState, type CSSProperties, type ReactNode } from 'react';
import {
  ArrowLeft, Send, Type, AlignLeft, Pilcrow, Mail, Hash, DollarSign, Percent, Star,
  Calendar, Clock, CalendarClock, List, ListChecks, CheckSquare, CircleDot, ToggleLeft,
  Search, Calculator, Image, Camera, Video, Music, Upload, PenTool, MapPin, QrCode,
  Barcode, Phone, Globe, Palette, EyeOff, Cpu, Sparkles, GripVertical, Copy, Trash2,
  Sliders, Zap, Plus, Layers, type LucideIcon,
} from 'lucide-react';
import { useStore } from '../../store/useStore';
import type { FormField, LogicRule, ChecklistItemDef } from '../../store/types';

const CHOICE_TYPES = ['dropdown', 'multiselect', 'radio', 'checkbox'];

interface FieldTypeDef {
  type: string;
  label: string;
  icon: LucideIcon;
}

interface FieldCategory {
  name: string;
  items: FieldTypeDef[];
}

const FIELD_CATEGORIES: FieldCategory[] = [
  {
    name: 'Text & Content',
    items: [
      { type: 'textbox', label: 'Text', icon: Type },
      { type: 'textarea', label: 'Textarea', icon: AlignLeft },
      { type: 'richtext', label: 'Rich Text', icon: Pilcrow },
      { type: 'email', label: 'Email', icon: Mail },
    ],
  },
  {
    name: 'Numbers',
    items: [
      { type: 'number', label: 'Number', icon: Hash },
      { type: 'currency', label: 'Currency', icon: DollarSign },
      { type: 'percent', label: 'Percent', icon: Percent },
      { type: 'rating', label: 'Rating', icon: Star },
    ],
  },
  {
    name: 'Date & Time',
    items: [
      { type: 'date', label: 'Date', icon: Calendar },
      { type: 'time', label: 'Time', icon: Clock },
      { type: 'datetime', label: 'DateTime', icon: CalendarClock },
    ],
  },
  {
    name: 'Choice',
    items: [
      { type: 'dropdown', label: 'Dropdown', icon: List },
      { type: 'multiselect', label: 'Multi-Sel', icon: ListChecks },
      { type: 'checkbox', label: 'Checkbox', icon: CheckSquare },
      { type: 'radio', label: 'Radio', icon: CircleDot },
      { type: 'toggle', label: 'Toggle', icon: ToggleLeft },
    ],
  },
  {
    name: 'Reference',
    items: [
      { type: 'lookup', label: 'Lookup', icon: Search },
      { type: 'formula', label: 'Formula', icon: Calculator },
    ],
  },
  {
    name: 'Media',
    items: [
      { type: 'image', label: 'Image', icon: Image },
      { type: 'camera', label: 'Camera', icon: Camera },
      { type: 'beforeafter', label: 'Before/After', icon: Sliders },
      { type: 'photochecklist', label: 'Photo Checklist', icon: ListChecks },
      { type: 'video', label: 'Video', icon: Video },
      { type: 'audio', label: 'Audio', icon: Music },
      { type: 'upload', label: 'File', icon: Upload },
    ],
  },
  {
    name: 'Capture',
    items: [
      { type: 'signature', label: 'Signature', icon: PenTool },
      { type: 'gps', label: 'GPS', icon: MapPin },
      { type: 'qr', label: 'QR Code', icon: QrCode },
      { type: 'barcode', label: 'Barcode', icon: Barcode },
    ],
  },
  {
    name: 'Contact',
    items: [
      { type: 'phone', label: 'Phone', icon: Phone },
      { type: 'url', label: 'URL', icon: Globe },
    ],
  },
  {
    name: 'Advanced',
    items: [
      { type: 'color', label: 'Color', icon: Palette },
      { type: 'hidden', label: 'Hidden', icon: EyeOff },
      { type: 'system', label: 'System', icon: Cpu },
      { type: 'ai', label: 'AI Field', icon: Sparkles },
    ],
  },
  {
    name: 'Structure',
    items: [
      { type: 'areagroup', label: 'Area Group', icon: Layers },
    ],
  },
];

const TYPE_ICON_MAP: Record<string, LucideIcon> = FIELD_CATEGORIES
  .flatMap((c) => c.items)
  .reduce((acc, item) => {
    acc[item.type] = item.icon;
    return acc;
  }, {} as Record<string, LucideIcon>);

const TYPE_LABEL_MAP: Record<string, string> = FIELD_CATEGORIES
  .flatMap((c) => c.items)
  .reduce((acc, item) => {
    acc[item.type] = item.label;
    return acc;
  }, {} as Record<string, string>);

function TypeIcon({ type, size = 14, style }: { type: string; size?: number; style?: CSSProperties }) {
  const Icon = TYPE_ICON_MAP[type] || Type;
  return <Icon size={size} style={style} />;
}

/* ---------- shared small UI ---------- */

function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  const accent = useStore((s) => s.accent);
  return (
    <button
      type="button"
      onClick={() => onChange(!on)}
      style={{
        width: 34,
        height: 19,
        borderRadius: 999,
        position: 'relative',
        background: on ? accent : 'var(--border)',
        border: 'none',
        cursor: 'pointer',
        flexShrink: 0,
        transition: 'background 0.2s',
        padding: 0,
      }}
    >
      <span
        style={{
          position: 'absolute',
          top: 2,
          left: 2,
          width: 15,
          height: 15,
          borderRadius: '50%',
          background: '#fff',
          transform: on ? 'translateX(15px)' : 'translateX(0)',
          transition: 'transform 0.2s',
          boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
        }}
      />
    </button>
  );
}

function SecondaryButton({ children, onClick }: { children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        height: 32,
        padding: '0 12px',
        borderRadius: 7,
        border: '1px solid var(--border)',
        background: 'var(--surface)',
        color: 'var(--text)',
        fontSize: 12.5,
        fontWeight: 600,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

/* ---------- Toolbar ---------- */

function BuilderToolbar() {
  const setNav = useStore((s) => s.setNav);
  const currentFormName = useStore((s) => s.currentFormName);
  const setFormName = useStore((s) => s.setFormName);
  const builderTab = useStore((s) => s.builderTab);
  const setBuilderTab = useStore((s) => s.setBuilderTab);
  const accent = useStore((s) => s.accent);
  const setShowSaveTemplateModal = useStore((s) => s.setShowSaveTemplateModal);
  const saveDraft = useStore((s) => s.saveDraft);
  const setShowAssignModal = useStore((s) => s.setShowAssignModal);

  const tabs: { key: 'build' | 'logic' | 'preview'; label: string }[] = [
    { key: 'build', label: 'Build' },
    { key: 'logic', label: 'Logic' },
    { key: 'preview', label: 'Preview' },
  ];

  return (
    <div
      style={{
        height: 52,
        minHeight: 52,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 14px',
        background: 'var(--surface)',
      }}
    >
      <button
        type="button"
        onClick={() => setNav('forms')}
        aria-label="Back to forms"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 30,
          height: 30,
          borderRadius: 7,
          border: 'none',
          background: 'transparent',
          color: 'var(--text)',
          cursor: 'pointer',
        }}
      >
        <ArrowLeft size={17} />
      </button>

      <div style={{ width: 1, height: 18, background: 'var(--border)' }} />

      <input
        value={currentFormName}
        onChange={(e) => setFormName(e.target.value)}
        style={{
          background: 'transparent',
          border: 'none',
          outline: 'none',
          fontSize: 14,
          fontWeight: 600,
          color: 'var(--text)',
          minWidth: 120,
          maxWidth: 320,
        }}
      />

      <div style={{ flex: 1 }} />

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 2,
          padding: 3,
          borderRadius: 8,
          background: 'var(--surface2)',
        }}
      >
        {tabs.map((t) => {
          const active = builderTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setBuilderTab(t.key)}
              style={{
                border: 'none',
                cursor: 'pointer',
                padding: '5px 14px',
                borderRadius: 6,
                fontSize: 12.5,
                fontWeight: 600,
                color: active ? 'var(--text)' : 'var(--muted)',
                background: active ? 'var(--surface)' : 'transparent',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div style={{ width: 1, height: 18, background: 'var(--border)' }} />

      <SecondaryButton onClick={() => setShowSaveTemplateModal(true)}>Save as Template</SecondaryButton>
      <SecondaryButton onClick={saveDraft}>Save Draft</SecondaryButton>

      <button
        type="button"
        onClick={() => setShowAssignModal(true)}
        style={{
          height: 32,
          padding: '0 14px',
          borderRadius: 7,
          border: 'none',
          background: accent,
          color: '#fff',
          fontSize: 12.5,
          fontWeight: 600,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          whiteSpace: 'nowrap',
        }}
      >
        <Send size={13} />
        Publish
      </button>
    </div>
  );
}

/* ---------- Field Library (left panel) ---------- */

function FieldLibrary() {
  const addField = useStore((s) => s.addField);
  const [search, setSearch] = useState('');

  const q = search.trim().toLowerCase();
  const filteredCategories = FIELD_CATEGORIES.map((cat) => ({
    ...cat,
    items: q ? cat.items.filter((i) => i.label.toLowerCase().includes(q) || i.type.toLowerCase().includes(q)) : cat.items,
  })).filter((cat) => cat.items.length > 0);

  return (
    <div
      style={{
        width: 232,
        minWidth: 232,
        borderRight: '1px solid var(--border)',
        overflowY: 'auto',
        background: 'var(--surface)',
        padding: '14px 12px',
      }}
    >
      <div
        style={{
          fontSize: 9.5,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: 0.9,
          color: 'var(--muted)',
          marginBottom: 10,
        }}
      >
        Field Library
      </div>

      <input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search fields…"
        style={{
          width: '100%',
          height: 30,
          borderRadius: 7,
          border: '1px solid var(--border)',
          background: 'var(--surface2)',
          color: 'var(--text)',
          fontSize: 12,
          padding: '0 10px',
          marginBottom: 16,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />

      {filteredCategories.map((cat) => (
        <div key={cat.name} style={{ marginBottom: 16 }}>
          <div
            style={{
              fontSize: 9,
              fontWeight: 700,
              textTransform: 'uppercase',
              letterSpacing: 0.9,
              color: 'var(--muted)',
              marginBottom: 7,
            }}
          >
            {cat.name}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {cat.items.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.type}
                  type="button"
                  onClick={() => addField(item.type)}
                  title={item.label}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 4,
                    padding: '8px 2px',
                    borderRadius: 7,
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    color: 'var(--text)',
                    cursor: 'pointer',
                  }}
                >
                  <Icon size={15} />
                  <span
                    style={{
                      fontSize: 9,
                      fontWeight: 500,
                      textAlign: 'center',
                      lineHeight: 1.1,
                      color: 'var(--text)',
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------- Field preview renderer ---------- */

function DashedPlaceholder({ icon: Icon, text }: { icon: LucideIcon; text: string }) {
  return (
    <div
      style={{
        border: '1.5px dashed var(--border)',
        borderRadius: 7,
        padding: '16px 10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        color: 'var(--muted)',
        background: 'var(--surface2)',
      }}
    >
      <Icon size={18} />
      <span style={{ fontSize: 11.5 }}>{text}</span>
    </div>
  );
}

function inputStyle(): CSSProperties {
  return {
    width: '100%',
    height: 32,
    borderRadius: 6,
    border: '1px solid var(--border)',
    background: 'var(--surface)',
    color: 'var(--text)',
    fontSize: 12.5,
    padding: '0 10px',
    outline: 'none',
    boxSizing: 'border-box',
  };
}

function FieldPreview({ field }: { field: FormField }) {
  const { type, placeholder, options } = field;

  switch (type) {
    case 'textbox':
    case 'email':
    case 'phone':
    case 'url':
      return <input disabled placeholder={placeholder || 'Enter value…'} style={inputStyle()} />;

    case 'textarea':
      return <textarea disabled placeholder={placeholder || 'Enter value…'} style={{ ...inputStyle(), height: 72, resize: 'none', padding: 8 }} />;

    case 'richtext':
      return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <div style={{ display: 'flex', gap: 8, padding: '6px 8px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
            <b style={{ fontSize: 11, color: 'var(--muted)' }}>B</b>
            <i style={{ fontSize: 11, color: 'var(--muted)' }}>I</i>
            <u style={{ fontSize: 11, color: 'var(--muted)' }}>U</u>
          </div>
          <div style={{ height: 52, padding: 8, fontSize: 12, color: 'var(--muted)' }}>Rich text content…</div>
        </div>
      );

    case 'number':
      return <input disabled type="number" placeholder={placeholder || '0'} style={inputStyle()} />;

    case 'currency':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>$</span>
          <input disabled type="number" placeholder="0.00" style={inputStyle()} />
        </div>
      );

    case 'percent':
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input disabled type="number" placeholder="0" style={inputStyle()} />
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>%</span>
        </div>
      );

    case 'date':
      return <input disabled type="date" style={inputStyle()} />;

    case 'time':
      return <input disabled type="time" style={inputStyle()} />;

    case 'datetime':
      return <input disabled type="datetime-local" style={inputStyle()} />;

    case 'dropdown':
      return (
        <select disabled style={inputStyle()}>
          <option>{options[0] || 'Select an option'}</option>
        </select>
      );

    case 'multiselect':
      return (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {options.slice(0, 3).map((o) => (
            <span
              key={o}
              style={{
                fontSize: 11,
                fontWeight: 500,
                padding: '3px 9px',
                borderRadius: 999,
                background: 'var(--surface2)',
                color: 'var(--text)',
                border: '1px solid var(--border)',
              }}
            >
              {o}
            </span>
          ))}
          <span style={{ fontSize: 11, color: 'var(--muted)', padding: '3px 4px' }}>+ add…</span>
        </div>
      );

    case 'checkbox':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {options.map((o) => (
            <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text)' }}>
              <input disabled type="checkbox" style={{ margin: 0 }} />
              {o}
            </label>
          ))}
        </div>
      );

    case 'radio':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {options.map((o) => (
            <label key={o} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, color: 'var(--text)' }}>
              <input disabled type="radio" style={{ margin: 0 }} />
              {o}
            </label>
          ))}
        </div>
      );

    case 'toggle':
      return (
        <div
          style={{
            width: 40,
            height: 22,
            borderRadius: 999,
            background: 'var(--border)',
            position: 'relative',
          }}
        >
          <span
            style={{
              position: 'absolute',
              top: 2,
              left: 2,
              width: 18,
              height: 18,
              borderRadius: '50%',
              background: '#fff',
              boxShadow: '0 1px 2px rgba(0,0,0,0.25)',
            }}
          />
        </div>
      );

    case 'rating':
      return (
        <div style={{ display: 'flex', gap: 4 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Star key={i} size={18} style={{ color: 'var(--muted2)' }} />
          ))}
        </div>
      );

    case 'color':
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          {['#EF4444', '#F97316', '#EAB308', '#22C55E', '#0EA5E9', '#6366F1', '#A855F7', '#EC4899'].map((c) => (
            <span key={c} style={{ width: 20, height: 20, borderRadius: '50%', background: c, display: 'inline-block' }} />
          ))}
        </div>
      );

    case 'signature':
      return <DashedPlaceholder icon={PenTool} text="Sign here" />;
    case 'image':
      return <DashedPlaceholder icon={Image} text="Upload or drop image" />;
    case 'camera':
      return <DashedPlaceholder icon={Camera} text="Capture photo" />;
    case 'beforeafter':
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <DashedPlaceholder icon={Camera} text="Before" />
          <DashedPlaceholder icon={Camera} text="After" />
        </div>
      );
    case 'photochecklist':
      return <DashedPlaceholder icon={ListChecks} text="Upload photo — AI checks against checklist items" />;
    case 'areagroup': {
      let subFields: FormField[] = [];
      try { subFields = JSON.parse(field.defaultValue || '[]'); } catch { /* empty */ }
      return <DashedPlaceholder icon={Layers} text={subFields.length > 0 ? `Repeatable group — ${subFields.length} field${subFields.length === 1 ? '' : 's'} per area, "Add Another Area" at fill time` : 'Repeatable group — configure sub-fields in Properties'} />;
    }
    case 'video':
      return <DashedPlaceholder icon={Video} text="Upload or record video" />;
    case 'audio':
      return <DashedPlaceholder icon={Music} text="Upload or record audio" />;
    case 'upload':
      return <DashedPlaceholder icon={Upload} text="Drag & drop file, or browse" />;

    case 'gps':
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <input disabled placeholder="Latitude, Longitude" style={inputStyle()} />
          <SecondaryButton>
            <MapPin size={13} /> Capture
          </SecondaryButton>
        </div>
      );

    case 'qr':
      return <DashedPlaceholder icon={QrCode} text="Scan QR code" />;
    case 'barcode':
      return <DashedPlaceholder icon={Barcode} text="Scan barcode" />;

    case 'lookup':
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <input disabled placeholder="Search records…" style={inputStyle()} />
          <SecondaryButton>
            <Search size={13} />
          </SecondaryButton>
        </div>
      );

    case 'formula':
      return (
        <div
          style={{
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
            fontSize: 12,
            padding: '8px 10px',
            borderRadius: 6,
            background: 'var(--surface2)',
            color: 'var(--text)',
            border: '1px solid var(--border)',
          }}
        >
          fx = SUM(Field1, Field2)
        </div>
      );

    case 'hidden':
      return <DashedPlaceholder icon={EyeOff} text="Hidden field (not shown to user)" />;
    case 'system':
      return <DashedPlaceholder icon={Cpu} text="System-generated value" />;
    case 'ai':
      return <DashedPlaceholder icon={Sparkles} text="AI-generated field" />;

    default:
      return <input disabled placeholder={placeholder || 'Enter value…'} style={inputStyle()} />;
  }
}

/* ---------- Canvas (center panel) ---------- */

function FieldCard({ field, index }: { field: FormField; index: number }) {
  const selectedId = useStore((s) => s.selectedId);
  const accent = useStore((s) => s.accent);
  const selectField = useStore((s) => s.selectField);
  const duplicateField = useStore((s) => s.duplicateField);
  const deleteField = useStore((s) => s.deleteField);
  const setDragSrcIdx = useStore((s) => s.setDragSrcIdx);
  const dragSrcIdx = useStore((s) => s.dragSrcIdx);
  const reorderFields = useStore((s) => s.reorderFields);

  const selected = selectedId === field.id;

  return (
    <div
      draggable
      onClick={() => selectField(field.id)}
      onDragStart={() => setDragSrcIdx(index)}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        if (dragSrcIdx !== null) reorderFields(dragSrcIdx, index);
      }}
      style={{
        background: 'var(--surface)',
        border: `1px solid ${selected ? accent : 'var(--border)'}`,
        borderRadius: 10,
        padding: 14,
        marginBottom: 12,
        cursor: 'pointer',
        boxShadow: selected ? `0 0 0 3px ${accent}22` : 'none',
        transition: 'box-shadow 0.15s, border-color 0.15s',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <span style={{ color: 'var(--muted2)', cursor: 'grab', display: 'flex' }}>
          <GripVertical size={15} />
        </span>
        <span style={{ color: 'var(--muted)', display: 'flex' }}>
          <TypeIcon type={field.type} size={15} />
        </span>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text)' }}>
          {field.label}
          {field.required && <span style={{ color: '#DC2626' }}> *</span>}
        </span>

        <div style={{ flex: 1 }} />

        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            padding: '2px 7px',
            borderRadius: 4,
            background: 'var(--surface2)',
            color: 'var(--muted)',
          }}
        >
          {TYPE_LABEL_MAP[field.type] || field.type}
        </span>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            duplicateField(field.id);
          }}
          aria-label="Duplicate field"
          style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', display: 'flex' }}
        >
          <Copy size={14} />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            deleteField(field.id);
          }}
          aria-label="Delete field"
          style={{ border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer', display: 'flex' }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <FieldPreview field={field} />
    </div>
  );
}

function Canvas() {
  const fields = useStore((s) => s.fields);
  const currentFormName = useStore((s) => s.currentFormName);
  const currentFormDesc = useStore((s) => s.currentFormDesc);
  const setFormName = useStore((s) => s.setFormName);
  const setFormDesc = useStore((s) => s.setFormDesc);
  const addField = useStore((s) => s.addField);

  return (
    <div style={{ flex: 1, background: 'var(--surface2)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', padding: 24 }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 10,
            padding: '18px 20px',
            marginBottom: 20,
          }}
        >
          <input
            value={currentFormName}
            onChange={(e) => setFormName(e.target.value)}
            placeholder="Form Name"
            style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6, background: 'transparent', border: 'none', outline: 'none', width: '100%', padding: 0 }}
          />
          <input
            value={currentFormDesc}
            onChange={(e) => setFormDesc(e.target.value)}
            placeholder="Add a description…"
            style={{ fontSize: 13, color: 'var(--muted)', background: 'transparent', border: 'none', outline: 'none', width: '100%', padding: 0 }}
          />
        </div>

        {fields.length === 0 ? (
          <div
            style={{
              border: '2px dashed var(--border)',
              borderRadius: 12,
              padding: '56px 20px',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 8,
              color: 'var(--muted)',
              textAlign: 'center',
            }}
          >
            <Sliders size={32} style={{ opacity: 0.5 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Start building your form</div>
            <div style={{ fontSize: 12.5 }}>Click any field type from the palette on the left.</div>
          </div>
        ) : (
          fields.map((f, i) => <FieldCard key={f.id} field={f} index={i} />)
        )}

        <button
          type="button"
          onClick={() => addField('textbox')}
          style={{
            width: '100%',
            marginTop: 12,
            padding: '10px 0',
            borderRadius: 8,
            border: '2px dashed var(--border)',
            background: 'transparent',
            color: 'var(--muted)',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Plus size={14} />
          Add Text Field
        </button>
      </div>
    </div>
  );
}

/* ---------- Properties Panel (right panel) ---------- */

function PropField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', marginBottom: 5 }}>{label}</div>
      {children}
    </div>
  );
}

function ToggleRow({ label, on, onChange }: { label: string; on: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 0' }}>
      <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{label}</span>
      <Toggle on={on} onChange={onChange} />
    </div>
  );
}

function ChecklistItemsEditor({ field }: { field: FormField }) {
  const updateField = useStore((s) => s.updateField);
  let items: ChecklistItemDef[] = [];
  try { items = JSON.parse(field.defaultValue || '[]'); } catch { /* empty */ }

  const save = (next: ChecklistItemDef[]) => updateField(field.id, 'defaultValue', JSON.stringify(next));

  const addItem = () => save([...items, { id: 'ci' + Date.now(), text: '', direction: 'present' }]);
  const updateItem = (idx: number, patch: Partial<ChecklistItemDef>) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    save(next);
  };
  const removeItem = (idx: number) => save(items.filter((_, i) => i !== idx));

  return (
    <PropField label="Baseline Checklist Items (optional)">
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
        AI will also generate items from the uploaded photo — these are added on top as a starting baseline.
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {items.map((item, idx) => (
          <div key={item.id} style={{ display: 'flex', gap: 6 }}>
            <input value={item.text} onChange={(e) => updateItem(idx, { text: e.target.value })}
              placeholder="e.g. Fire extinguisher present" style={inputStyle()} />
            <select value={item.direction} onChange={(e) => updateItem(idx, { direction: e.target.value as 'present' | 'absent' })}
              style={{ ...inputStyle(), width: 110, flexShrink: 0 }}>
              <option value="present">Must be present</option>
              <option value="absent">Must be absent</option>
            </select>
            <button type="button" onClick={() => removeItem(idx)} aria-label="Remove item"
              style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 6, color: '#DC2626', cursor: 'pointer', width: 30, flexShrink: 0 }}>
              <Trash2 size={13} style={{ margin: 'auto' }} />
            </button>
          </div>
        ))}
        <button type="button" onClick={addItem}
          style={{ border: '1px dashed var(--border)', background: 'transparent', borderRadius: 6, color: 'var(--muted)', fontSize: 12, fontWeight: 600, padding: '7px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Plus size={12} /> Add Baseline Item
        </button>
      </div>
    </PropField>
  );
}

function newSubField(type: string): FormField {
  const hasOpts = CHOICE_TYPES.includes(type);
  return {
    id: 'sf' + Date.now() + Math.floor(Math.random() * 1000),
    type, label: TYPE_LABEL_MAP[type] || type,
    placeholder: '', helpText: '', defaultValue: '',
    required: false, readOnly: false, hidden: false, searchable: false, indexed: false,
    options: hasOpts ? ['Option 1', 'Option 2', 'Option 3'] : [],
    validation: { min: '', max: '', pattern: '', message: '' },
    logic: [],
  };
}

// Sub-field types available inside an Area Group. Excludes 'areagroup' from the initial
// palette row (nesting is still possible — a sub-field CAN be an areagroup — but isn't
// surfaced as a one-click default choice to avoid encouraging accidental deep nesting).
const SUBFIELD_PALETTE: { type: string; label: string }[] = [
  { type: 'textbox', label: 'Text' },
  { type: 'textarea', label: 'Textarea' },
  { type: 'number', label: 'Number' },
  { type: 'dropdown', label: 'Dropdown' },
  { type: 'checkbox', label: 'Checkbox' },
  { type: 'toggle', label: 'Toggle' },
  { type: 'rating', label: 'Rating' },
  { type: 'image', label: 'Image' },
  { type: 'camera', label: 'Camera' },
  { type: 'beforeafter', label: 'Before/After' },
  { type: 'photochecklist', label: 'Photo Checklist' },
  { type: 'signature', label: 'Signature' },
  { type: 'areagroup', label: 'Area Group (nested)' },
];

// Editor for one sub-field's own properties, rendered inline in the parent's sub-field list.
// Deliberately has no Logic tab — cross-field logic referencing fields inside a repeated,
// nested group has no well-defined resolution yet (deferred).
function SubFieldEditor({ subField, onChange, onRemove, depth }: { subField: FormField; onChange: (next: FormField) => void; onRemove: () => void; depth: number }) {
  const [expanded, setExpanded] = useState(false);
  const hasOptions = CHOICE_TYPES.includes(subField.type);
  const hasPlaceholder = !['dropdown', 'multiselect', 'checkbox', 'radio', 'toggle', 'rating', 'color', 'signature', 'image', 'camera', 'video', 'audio', 'upload', 'gps', 'qr', 'barcode', 'formula', 'hidden', 'system', 'beforeafter', 'photochecklist', 'areagroup'].includes(subField.type);

  let nestedSubFields: FormField[] = [];
  if (subField.type === 'areagroup') {
    try { nestedSubFields = JSON.parse(subField.defaultValue || '[]'); } catch { /* empty */ }
  }
  let checklistItems: ChecklistItemDef[] = [];
  if (subField.type === 'photochecklist') {
    try { checklistItems = JSON.parse(subField.defaultValue || '[]'); } catch { /* empty */ }
  }

  return (
    <div style={{ border: '1px solid var(--border)', borderRadius: 8, background: 'var(--surface)', marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 10px', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <TypeIcon type={subField.type} size={13} style={{ color: 'var(--muted)', flexShrink: 0 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subField.label || TYPE_LABEL_MAP[subField.type]}</span>
        <span style={{ fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', color: 'var(--muted)', flexShrink: 0 }}>{TYPE_LABEL_MAP[subField.type] || subField.type}</span>
        <button type="button" onClick={(e) => { e.stopPropagation(); onRemove(); }} aria-label="Remove sub-field"
          style={{ border: 'none', background: 'transparent', color: '#DC2626', cursor: 'pointer', flexShrink: 0, display: 'flex' }}>
          <Trash2 size={13} />
        </button>
      </div>
      {expanded && (
        <div style={{ padding: '4px 10px 10px', borderTop: '1px solid var(--border)' }}>
          <PropField label="Label">
            <input value={subField.label} onChange={(e) => onChange({ ...subField, label: e.target.value })} style={inputStyle()} />
          </PropField>
          {hasPlaceholder && (
            <PropField label="Placeholder">
              <input value={subField.placeholder} onChange={(e) => onChange({ ...subField, placeholder: e.target.value })} style={inputStyle()} />
            </PropField>
          )}
          <ToggleRow label="Required" on={subField.required} onChange={(v) => onChange({ ...subField, required: v })} />

          {hasOptions && (
            <PropField label="Options">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {subField.options.map((opt, idx) => (
                  <div key={idx} style={{ display: 'flex', gap: 6 }}>
                    <input value={opt} onChange={(e) => {
                      const next = [...subField.options]; next[idx] = e.target.value;
                      onChange({ ...subField, options: next });
                    }} style={inputStyle()} />
                    <button type="button" onClick={() => onChange({ ...subField, options: subField.options.filter((_, i) => i !== idx) })}
                      style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 6, color: '#DC2626', cursor: 'pointer', width: 30, flexShrink: 0 }}>
                      <Trash2 size={12} style={{ margin: 'auto' }} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => onChange({ ...subField, options: [...subField.options, `Option ${subField.options.length + 1}`] })}
                  style={{ border: '1px dashed var(--border)', background: 'transparent', borderRadius: 6, color: 'var(--muted)', fontSize: 12, fontWeight: 600, padding: '6px 0', cursor: 'pointer' }}>
                  + Add Option
                </button>
              </div>
            </PropField>
          )}

          {subField.type === 'photochecklist' && (
            <PropField label="Baseline Checklist Items (optional)">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {checklistItems.map((item, idx) => (
                  <div key={item.id} style={{ display: 'flex', gap: 6 }}>
                    <input value={item.text} onChange={(e) => {
                      const next = [...checklistItems]; next[idx] = { ...next[idx], text: e.target.value };
                      onChange({ ...subField, defaultValue: JSON.stringify(next) });
                    }} placeholder="e.g. Fire extinguisher present" style={inputStyle()} />
                    <select value={item.direction} onChange={(e) => {
                      const next = [...checklistItems]; next[idx] = { ...next[idx], direction: e.target.value as 'present' | 'absent' };
                      onChange({ ...subField, defaultValue: JSON.stringify(next) });
                    }} style={{ ...inputStyle(), width: 110, flexShrink: 0 }}>
                      <option value="present">Must be present</option>
                      <option value="absent">Must be absent</option>
                    </select>
                    <button type="button" onClick={() => onChange({ ...subField, defaultValue: JSON.stringify(checklistItems.filter((_, i) => i !== idx)) })}
                      style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 6, color: '#DC2626', cursor: 'pointer', width: 30, flexShrink: 0 }}>
                      <Trash2 size={12} style={{ margin: 'auto' }} />
                    </button>
                  </div>
                ))}
                <button type="button" onClick={() => onChange({ ...subField, defaultValue: JSON.stringify([...checklistItems, { id: 'ci' + Date.now(), text: '', direction: 'present' as const }]) })}
                  style={{ border: '1px dashed var(--border)', background: 'transparent', borderRadius: 6, color: 'var(--muted)', fontSize: 12, fontWeight: 600, padding: '6px 0', cursor: 'pointer' }}>
                  + Add Baseline Item
                </button>
              </div>
            </PropField>
          )}

          {subField.type === 'areagroup' && depth < 3 && (
            <PropField label="Nested Area Sub-Fields">
              <AreaGroupSubFieldsEditor
                subFields={nestedSubFields}
                onChange={(next) => onChange({ ...subField, defaultValue: JSON.stringify(next) })}
                depth={depth + 1}
              />
            </PropField>
          )}
          {subField.type === 'areagroup' && depth >= 3 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', fontStyle: 'italic' }}>Nesting limit reached (3 levels).</div>
          )}
        </div>
      )}
    </div>
  );
}

function AreaGroupSubFieldsEditor({ subFields, onChange, depth }: { subFields: FormField[]; onChange: (next: FormField[]) => void; depth: number }) {
  const [showPalette, setShowPalette] = useState(false);

  const addSubField = (type: string) => {
    onChange([...subFields, newSubField(type)]);
    setShowPalette(false);
  };
  const updateSubField = (idx: number, next: FormField) => {
    const updated = [...subFields]; updated[idx] = next;
    onChange(updated);
  };
  const removeSubField = (idx: number) => onChange(subFields.filter((_, i) => i !== idx));

  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8 }}>
        These fields repeat as a set every time "Add Another Area" is used when filling out the form.
      </div>
      {subFields.map((sf, idx) => (
        <SubFieldEditor key={sf.id} subField={sf} depth={depth}
          onChange={(next) => updateSubField(idx, next)}
          onRemove={() => removeSubField(idx)} />
      ))}
      <div style={{ position: 'relative' }}>
        <button type="button" onClick={() => setShowPalette(!showPalette)}
          style={{ width: '100%', border: '1px dashed var(--border)', background: 'transparent', borderRadius: 6, color: 'var(--muted)', fontSize: 12, fontWeight: 600, padding: '8px 0', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
          <Plus size={12} /> Add Sub-Field
        </button>
        {showPalette && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: 4, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, boxShadow: '0 4px 16px rgba(0,0,0,.12)', zIndex: 10, maxHeight: 220, overflowY: 'auto' }}>
            {SUBFIELD_PALETTE.map((opt) => (
              <button key={opt.type} type="button" onClick={() => addSubField(opt.type)}
                style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', textAlign: 'left', padding: '8px 10px', border: 'none', background: 'transparent', color: 'var(--text)', fontSize: 12.5, cursor: 'pointer' }}>
                <TypeIcon type={opt.type} size={13} style={{ color: 'var(--muted)' }} />
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function PropertiesTab({ field }: { field: FormField }) {
  const updateField = useStore((s) => s.updateField);
  const hasPlaceholder = !['dropdown', 'multiselect', 'checkbox', 'radio', 'toggle', 'rating', 'color', 'signature', 'image', 'camera', 'video', 'audio', 'upload', 'gps', 'qr', 'barcode', 'formula', 'hidden', 'system'].includes(field.type);
  const hasOptions = CHOICE_TYPES.includes(field.type);

  const setOption = (idx: number, value: string) => {
    const next = [...field.options];
    next[idx] = value;
    updateField(field.id, 'options', next);
  };
  const addOption = () => {
    updateField(field.id, 'options', [...field.options, `Option ${field.options.length + 1}`]);
  };
  const removeOption = (idx: number) => {
    updateField(field.id, 'options', field.options.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ padding: 14 }}>
      <PropField label="Label">
        <input
          value={field.label}
          onChange={(e) => updateField(field.id, 'label', e.target.value)}
          style={inputStyle()}
        />
      </PropField>

      {hasPlaceholder && (
        <PropField label="Placeholder">
          <input
            value={field.placeholder}
            onChange={(e) => updateField(field.id, 'placeholder', e.target.value)}
            style={inputStyle()}
          />
        </PropField>
      )}

      <PropField label="Help Text">
        <input
          value={field.helpText}
          onChange={(e) => updateField(field.id, 'helpText', e.target.value)}
          style={inputStyle()}
        />
      </PropField>

      {field.type !== 'photochecklist' && field.type !== 'areagroup' && (
        <PropField label="Default Value">
          <input
            value={field.defaultValue}
            onChange={(e) => updateField(field.id, 'defaultValue', e.target.value)}
            style={inputStyle()}
          />
        </PropField>
      )}

      {field.type === 'photochecklist' && <ChecklistItemsEditor field={field} />}

      {field.type === 'areagroup' && (
        <PropField label="Area Sub-Fields">
          <AreaGroupSubFieldsEditor
            subFields={(() => { try { return JSON.parse(field.defaultValue || '[]'); } catch { return []; } })()}
            onChange={(next) => updateField(field.id, 'defaultValue', JSON.stringify(next))}
            depth={0}
          />
        </PropField>
      )}

      {hasOptions && (
        <PropField label="Options">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {field.options.map((opt, idx) => (
              <div key={idx} style={{ display: 'flex', gap: 6 }}>
                <input value={opt} onChange={(e) => setOption(idx, e.target.value)} style={inputStyle()} />
                <button
                  type="button"
                  onClick={() => removeOption(idx)}
                  aria-label="Remove option"
                  style={{ border: '1px solid var(--border)', background: 'var(--surface)', borderRadius: 6, color: '#DC2626', cursor: 'pointer', width: 30, flexShrink: 0 }}
                >
                  <Trash2 size={13} style={{ margin: 'auto' }} />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addOption}
              style={{
                border: '1px dashed var(--border)',
                background: 'transparent',
                borderRadius: 6,
                color: 'var(--muted)',
                fontSize: 12,
                fontWeight: 600,
                padding: '7px 0',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
              }}
            >
              <Plus size={12} /> Add Option
            </button>
          </div>
        </PropField>
      )}

      <div style={{ height: 1, background: 'var(--border)', margin: '4px 0 4px' }} />

      <ToggleRow label="Required" on={field.required} onChange={(v) => updateField(field.id, 'required', v)} />
      <ToggleRow label="Read Only" on={field.readOnly} onChange={(v) => updateField(field.id, 'readOnly', v)} />
      <ToggleRow label="Hidden" on={field.hidden} onChange={(v) => updateField(field.id, 'hidden', v)} />
      <ToggleRow label="Searchable" on={field.searchable} onChange={(v) => updateField(field.id, 'searchable', v)} />
      <ToggleRow label="Indexed" on={field.indexed} onChange={(v) => updateField(field.id, 'indexed', v)} />
    </div>
  );
}

function ValidationTab({ field }: { field: FormField }) {
  const updateValidation = useStore((s) => s.updateValidation);

  return (
    <div style={{ padding: 14 }}>
      <PropField label="Min">
        <input
          value={field.validation.min}
          onChange={(e) => updateValidation(field.id, 'min', e.target.value)}
          style={inputStyle()}
        />
      </PropField>
      <PropField label="Max">
        <input
          value={field.validation.max}
          onChange={(e) => updateValidation(field.id, 'max', e.target.value)}
          style={inputStyle()}
        />
      </PropField>
      <PropField label="Pattern">
        <input
          value={field.validation.pattern}
          onChange={(e) => updateValidation(field.id, 'pattern', e.target.value)}
          style={{ ...inputStyle(), fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}
        />
      </PropField>
      <PropField label="Custom Error Message">
        <input
          value={field.validation.message}
          onChange={(e) => updateValidation(field.id, 'message', e.target.value)}
          style={inputStyle()}
        />
      </PropField>
    </div>
  );
}

function FieldLogicTab() {
  const selectedId = useStore((s) => s.selectedId);
  const fields = useStore((s) => s.fields);
  const addLogicRule = useStore((s) => s.addLogicRule);
  const updateLogicRule = useStore((s) => s.updateLogicRule);
  const deleteLogicRule = useStore((s) => s.deleteLogicRule);

  const field = fields.find(f => f.id === selectedId);
  if (!field) return null;

  const otherFields = fields.filter(f => f.id !== field.id);
  const rules = (field.logic || []) as LogicRule[];

  const selectStyle: React.CSSProperties = {
    height: 30, borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text)', fontSize: 11.5, padding: '0 6px', flex: 1, minWidth: 0,
  };
  const inputStyle: React.CSSProperties = {
    height: 30, borderRadius: 6, border: '1px solid var(--border)',
    background: 'var(--surface2)', color: 'var(--text)', fontSize: 11.5, padding: '0 8px', flex: 1, minWidth: 0,
  };

  return (
    <div style={{ padding: 16 }}>
      {rules.length === 0 ? (
        <div style={{ textAlign: 'center', color: 'var(--muted)', padding: '16px 0' }}>
          <Zap size={20} style={{ opacity: 0.5, marginBottom: 6 }} />
          <div style={{ fontSize: 12 }}>No conditions yet</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 12 }}>
          {rules.map((rule) => {
            const sourceField = otherFields.find(f => f.id === rule.sourceFieldId);
            const showValueInput = rule.operator !== 'not_empty' && rule.operator !== 'empty';
            const sourceHasOptions = sourceField && ['dropdown', 'multiselect', 'radio', 'checkbox'].includes(sourceField.type);
            return (
              <div key={rule.id} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                  <select value={rule.action} onChange={e => updateLogicRule(field.id, rule.id, { action: e.target.value as 'show' | 'hide' | 'require' })} style={selectStyle}>
                    <option value="show">Show this field</option>
                    <option value="hide">Hide this field</option>
                    <option value="require">Require this field</option>
                  </select>
                  <button onClick={() => deleteLogicRule(field.id, rule.id)} style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 4 }}>
                    <Trash2 size={13} />
                  </button>
                </div>
                <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--muted)', marginBottom: 4 }}>WHEN</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <select value={rule.sourceFieldId} onChange={e => updateLogicRule(field.id, rule.id, { sourceFieldId: e.target.value, value: '' })} style={selectStyle}>
                    <option value="">Select field…</option>
                    {otherFields.map(f => <option key={f.id} value={f.id}>{f.label}</option>)}
                  </select>
                  <select value={rule.operator} onChange={e => updateLogicRule(field.id, rule.id, { operator: e.target.value as LogicRule['operator'] })} style={selectStyle}>
                    <option value="equals">Equals</option>
                    <option value="not_equals">Not equals</option>
                    <option value="contains">Contains</option>
                    <option value="not_empty">Is not empty</option>
                    <option value="empty">Is empty</option>
                    <option value="greater_than">Greater than</option>
                    <option value="less_than">Less than</option>
                  </select>
                  {showValueInput && (
                    sourceHasOptions ? (
                      <select value={rule.value} onChange={e => updateLogicRule(field.id, rule.id, { value: e.target.value })} style={selectStyle}>
                        <option value="">Select value…</option>
                        {sourceField.options.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : (
                      <input value={rule.value} onChange={e => updateLogicRule(field.id, rule.id, { value: e.target.value })} placeholder="Value…" style={inputStyle} />
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <SecondaryButton onClick={() => addLogicRule(field.id)}>
        <Plus size={13} /> Add Condition
      </SecondaryButton>
    </div>
  );
}

function PropertiesPanel() {
  const selectedId = useStore((s) => s.selectedId);
  const fields = useStore((s) => s.fields);
  const fieldPropTab = useStore((s) => s.fieldPropTab);
  const setFieldPropTab = useStore((s) => s.setFieldPropTab);
  const deleteField = useStore((s) => s.deleteField);
  const accent = useStore((s) => s.accent);

  const field = fields.find((f) => f.id === selectedId);

  if (!field) {
    return (
      <div
        style={{
          width: 300,
          minWidth: 300,
          borderLeft: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          color: 'var(--muted)',
          textAlign: 'center',
          padding: 24,
        }}
      >
        <Sliders size={26} style={{ opacity: 0.5 }} />
        <div style={{ fontSize: 12.5 }}>No field selected</div>
      </div>
    );
  }

  const subTabs: { key: 'props' | 'validation' | 'logic'; label: string }[] = [
    { key: 'props', label: 'Properties' },
    { key: 'validation', label: 'Validation' },
    { key: 'logic', label: 'Logic' },
  ];

  return (
    <div
      style={{
        width: 300,
        minWidth: 300,
        borderLeft: '1px solid var(--border)',
        background: 'var(--surface)',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '14px 14px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TypeIcon type={field.type} size={15} style={{ color: 'var(--muted)' }} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{field.label}</span>
        </div>
        <span
          style={{
            fontSize: 9.5,
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: 0.4,
            padding: '2px 7px',
            borderRadius: 4,
            background: 'var(--surface2)',
            color: 'var(--muted)',
          }}
        >
          {TYPE_LABEL_MAP[field.type] || field.type}
        </span>

        <div style={{ display: 'flex', gap: 4, marginTop: 14, borderBottom: '1px solid var(--border)' }}>
          {subTabs.map((t) => {
            const active = fieldPropTab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setFieldPropTab(t.key)}
                style={{
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  padding: '8px 8px',
                  fontSize: 12,
                  fontWeight: 600,
                  color: active ? accent : 'var(--muted)',
                  borderBottom: `2px solid ${active ? accent : 'transparent'}`,
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ flex: 1 }}>
        {fieldPropTab === 'props' && <PropertiesTab field={field} />}
        {fieldPropTab === 'validation' && <ValidationTab field={field} />}
        {fieldPropTab === 'logic' && <FieldLogicTab />}
      </div>

      <div style={{ padding: 14, borderTop: '1px solid var(--border)' }}>
        <button
          type="button"
          onClick={() => deleteField(field.id)}
          style={{
            width: '100%',
            padding: '9px 0',
            borderRadius: 7,
            border: '1px solid #DC2626',
            background: 'transparent',
            color: '#DC2626',
            fontSize: 12.5,
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
          }}
        >
          <Trash2 size={13} />
          Delete Field
        </button>
      </div>
    </div>
  );
}

/* ---------- Build mode ---------- */

function BuildMode() {
  return (
    <div style={{ flex: 1, display: 'flex', minHeight: 0 }}>
      <FieldLibrary />
      <Canvas />
      <PropertiesPanel />
    </div>
  );
}

/* ---------- Preview mode ---------- */

function PreviewField({ field }: { field: FormField }) {
  if (field.hidden) return null;
  return (
    <div style={{ marginBottom: 20 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: 'var(--text)', marginBottom: 6 }}>
        {field.label}
        {field.required && <span style={{ color: '#DC2626' }}> *</span>}
      </label>
      <FieldPreview field={field} />
      {field.helpText && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 5 }}>{field.helpText}</div>
      )}
    </div>
  );
}

function PreviewMode() {
  const fields = useStore((s) => s.fields);
  const currentFormName = useStore((s) => s.currentFormName);
  const currentFormDesc = useStore((s) => s.currentFormDesc);
  const accent = useStore((s) => s.accent);

  return (
    <div style={{ flex: 1, background: 'var(--surface2)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 640, margin: '0 auto', padding: '32px 24px' }}>
        <div
          style={{
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 12,
            padding: '28px 28px 8px',
          }}
        >
          <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>{currentFormName}</div>
          <div style={{ fontSize: 13.5, color: 'var(--muted)', marginBottom: 24 }}>{currentFormDesc}</div>

          {fields.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
              No fields added yet.
            </div>
          ) : (
            fields.map((f) => <PreviewField key={f.id} field={f} />)
          )}

          <button
            type="button"
            style={{
              width: '100%',
              padding: '11px 0',
              marginBottom: 24,
              borderRadius: 8,
              border: 'none',
              background: accent,
              color: '#fff',
              fontSize: 13.5,
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            Submit Form
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- Logic mode ---------- */

function LogicMode() {
  const fields = useStore((s) => s.fields);
  const addLogicRule = useStore((s) => s.addLogicRule);
  const updateLogicRule = useStore((s) => s.updateLogicRule);
  const deleteLogicRule = useStore((s) => s.deleteLogicRule);
  const accent = useStore((s) => s.accent);


  return (
    <div style={{ flex: 1, background: 'var(--surface2)', overflowY: 'auto' }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: 24 }}>
        {fields.length === 0 ? (
          <div style={{ border: '2px dashed var(--border)', borderRadius: 12, padding: '56px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--muted)', textAlign: 'center' }}>
            <Zap size={32} style={{ opacity: 0.5 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>Conditional Logic Builder</div>
            <div style={{ fontSize: 12.5, maxWidth: 340 }}>Add fields to your form first, then define rules to show, hide, or require them based on other answers.</div>
          </div>
        ) : (
          <>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Conditional Logic Builder</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 18 }}>Define when fields should be shown, hidden, or required based on other field values.</div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {fields.map((f) => {
                const rules = (f.logic || []) as LogicRule[];
                const otherFields = fields.filter(of => of.id !== f.id);
                const hasRules = rules.length > 0;

                return (
                  <div key={f.id} style={{ background: 'var(--surface)', border: `1px solid ${hasRules ? accent + '40' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ padding: '12px 14px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: hasRules ? '1px solid var(--border)' : 'none' }}>
                      <TypeIcon type={f.type} size={14} style={{ color: hasRules ? accent : 'var(--muted)', flexShrink: 0 }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', flex: 1 }}>{f.label}</span>
                      {hasRules && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 10, background: `${accent}20`, color: accent }}>
                          {rules.length} rule{rules.length > 1 ? 's' : ''}
                        </span>
                      )}
                      <button onClick={() => addLogicRule(f.id)}
                        style={{ height: 26, padding: '0 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text)', fontSize: 11, fontWeight: 600, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                        <Plus size={11} /> Rule
                      </button>
                    </div>

                    {rules.map((rule) => {
                      const sourceField = otherFields.find(sf => sf.id === rule.sourceFieldId);
                      const showValueInput = rule.operator !== 'not_empty' && rule.operator !== 'empty';
                      const sourceHasOptions = sourceField && ['dropdown', 'multiselect', 'radio', 'checkbox', 'toggle'].includes(sourceField.type);

                      const selectStyle: React.CSSProperties = {
                        height: 28, borderRadius: 5, border: '1px solid var(--border)',
                        background: 'var(--surface2)', color: 'var(--text)', fontSize: 11.5, padding: '0 6px',
                      };

                      return (
                        <div key={rule.id} style={{ padding: '10px 14px', borderBottom: '1px solid var(--border)', background: 'var(--surface2)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                            <select value={rule.action} onChange={e => updateLogicRule(f.id, rule.id, { action: e.target.value as 'show' | 'hide' | 'require' })} style={{ ...selectStyle, fontWeight: 600 }}>
                              <option value="show">Show</option>
                              <option value="hide">Hide</option>
                              <option value="require">Require</option>
                            </select>
                            <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>when</span>
                            <select value={rule.sourceFieldId} onChange={e => updateLogicRule(f.id, rule.id, { sourceFieldId: e.target.value, value: '' })} style={selectStyle}>
                              <option value="">Select field…</option>
                              {otherFields.map(of => <option key={of.id} value={of.id}>{of.label}</option>)}
                            </select>
                            <select value={rule.operator} onChange={e => updateLogicRule(f.id, rule.id, { operator: e.target.value as LogicRule['operator'] })} style={selectStyle}>
                              <option value="equals">equals</option>
                              <option value="not_equals">not equals</option>
                              <option value="contains">contains</option>
                              <option value="not_empty">is not empty</option>
                              <option value="empty">is empty</option>
                              <option value="greater_than">greater than</option>
                              <option value="less_than">less than</option>
                            </select>
                            {showValueInput && (
                              sourceHasOptions ? (
                                <select value={rule.value} onChange={e => updateLogicRule(f.id, rule.id, { value: e.target.value })} style={selectStyle}>
                                  <option value="">Select…</option>
                                  {sourceField.type === 'toggle' ? (
                                    <><option value="true">Yes</option><option value="false">No</option></>
                                  ) : (
                                    sourceField.options.map(o => <option key={o} value={o}>{o}</option>)
                                  )}
                                </select>
                              ) : (
                                <input value={rule.value} onChange={e => updateLogicRule(f.id, rule.id, { value: e.target.value })} placeholder="Value…"
                                  style={{ ...selectStyle, width: 90 }} />
                              )
                            )}
                            <button onClick={() => deleteLogicRule(f.id, rule.id)}
                              style={{ background: 'none', border: 'none', color: '#EF4444', cursor: 'pointer', padding: 3, flexShrink: 0 }}>
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------- Root ---------- */

export function FormBuilder() {
  const builderTab = useStore((s) => s.builderTab);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--bg)' }}>
      <BuilderToolbar />
      {builderTab === 'build' && <BuildMode />}
      {builderTab === 'logic' && <LogicMode />}
      {builderTab === 'preview' && <PreviewMode />}
    </div>
  );
}

export default FormBuilder;
