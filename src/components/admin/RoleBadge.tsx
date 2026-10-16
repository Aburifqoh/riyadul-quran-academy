interface RoleBadgeProps {
  role: 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent';
  size?: 'sm' | 'md';
}

const ROLE_STYLES: Record<string, { label: string; classes: string; showCrown: boolean }> = {
  super_admin: {
    label: 'Super Admin',
    classes: 'bg-amber-50 text-amber-800 border border-amber-300',
    showCrown: true,
  },
  admin: {
    label: 'Admin',
    classes: 'bg-blue-50 text-blue-700 border border-blue-200',
    showCrown: false,
  },
  teacher: {
    label: 'Teacher',
    classes: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    showCrown: false,
  },
  student: {
    label: 'Student',
    classes: 'bg-stone-50 text-stone-600 border border-stone-200',
    showCrown: false,
  },
  parent: {
    label: 'Parent',
    classes: 'bg-stone-50 text-stone-600 border border-stone-200',
    showCrown: false,
  },
};

export function RoleBadge({ role, size = 'md' }: RoleBadgeProps) {
  const style = ROLE_STYLES[role] ?? ROLE_STYLES.student;
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium ${padding} ${style.classes}`}
    >
      {style.showCrown && (
        <svg
          viewBox="0 0 24 24"
          fill="currentColor"
          className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'}
        >
          <path d="M5 16L3 6l5.5 4L12 4l3.5 6L21 6l-2 10H5zm0 2h14v2H5v-2z" />
        </svg>
      )}
      {style.label}
    </span>
  );
}
