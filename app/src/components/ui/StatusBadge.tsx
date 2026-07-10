const STATUS_MAP: Record<string, { label: string; bg: string; color: string; dot: string }> = {
  published: { label: 'Published', bg: '#F0FDF4', color: '#16A34A', dot: '#22C55E' },
  draft: { label: 'Draft', bg: '#F5F5F5', color: '#737373', dot: '#A3A3A3' },
  review: { label: 'In Review', bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' },
  active: { label: 'Active', bg: '#F0FDF4', color: '#16A34A', dot: '#22C55E' },
  inactive: { label: 'Inactive', bg: '#F5F5F5', color: '#737373', dot: '#A3A3A3' },
  pending: { label: 'Pending', bg: '#FFFBEB', color: '#D97706', dot: '#F59E0B' },
  suspended: { label: 'Suspended', bg: '#FEF2F2', color: '#DC2626', dot: '#EF4444' },
};

export function StatusBadge({ status }: { status: string }) {
  const v = STATUS_MAP[status] || STATUS_MAP.draft;
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '3px 10px',
        borderRadius: 20,
        background: v.bg,
        color: v.color,
        fontSize: 12,
        fontWeight: 500,
      }}
    >
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: v.dot, flexShrink: 0 }} />
      {v.label}
    </span>
  );
}
