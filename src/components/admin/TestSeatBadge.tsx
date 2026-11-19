import { isSandboxAccount } from '@/lib/billing';

export function TestSeatBadge({
  user,
}: {
  user?: { email?: unknown; name?: unknown } | null;
}) {
  if (!isSandboxAccount(user)) return null;
  return (
    <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
      Test
    </span>
  );
}
