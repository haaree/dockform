const STATUS_MAP: Record<string, { label: string; bg: string; color: string }> = {
  published: { label: 'Published', bg: '#DCFCE7', color: '#15803D' },
  draft: { label: 'Draft', bg: '#F3F4F6', color: '#6B7280' },
  review: { label: 'In Review', bg: '#FEF3C7', color: '#92400E' },
  active: { label: 'Active', bg: '#DCFCE7', color: '#15803D' },
  inactive: { label: 'Inactive', bg: '#F3F4F6', color: '#6B7280' },
};

export function StatusBadge({ status }: { status: string }) {
  const v = STATUS_MAP[status] || STATUS_MAP.draft;
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
      style={{ background: v.bg, color: v.color, fontSize: 11, fontWeight: 600 }}
    >
      <span className="inline-block rounded-full" style={{ width: 6, height: 6, background: v.color }} />
      {v.label}
    </span>
  );
}
