'use client';

interface ConfirmDeleteModalProps {
  name?: string | null;
  role?: string;
  loading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function ConfirmDeleteModal({
  name,
  role,
  loading,
  onCancel,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const label = role || 'account';
  const who = name?.trim() || 'this account';

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl">
        <h3 className="text-2xl font-bold font-headers text-secondary m-0 mb-2">Delete this {label}?</h3>
        <p className="text-sm text-gray-600 mb-3">
          You are about to permanently delete <span className="font-bold text-secondary">{who}</span>.
        </p>
        <p className="text-sm text-red-700 bg-red-50 border border-red-100 rounded-2xl px-4 py-3 mb-6">
          This removes their profile and login. It cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            disabled={loading}
            onClick={onCancel}
            className="flex-1 py-3 rounded-full font-bold border border-gray-200 text-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={onConfirm}
            className="flex-1 py-3 rounded-full font-bold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Deleting…' : 'Delete permanently'}
          </button>
        </div>
      </div>
    </div>
  );
}
