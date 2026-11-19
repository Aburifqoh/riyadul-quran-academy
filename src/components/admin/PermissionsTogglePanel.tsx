'use client';

import { useState } from 'react';
import { AdminPermissionKey } from '@/lib/permissions';
import { authFetch } from '@/lib/authFetch';

interface PermissionsTogglePanelProps {
  targetUserId: string;
  targetName: string;
  currentPermissions: Record<AdminPermissionKey, boolean>;
  callerId?: string;
  onUpdated: (newPermissions: Record<AdminPermissionKey, boolean>) => void;
}

const TOGGLE_LABELS: Record<AdminPermissionKey, { label: string; description: string }> = {
  can_manage_students: {
    label: 'Can manage students',
    description: 'Enroll, edit profiles, review progress, mark attendance.',
  },
  can_manage_live_classes: {
    label: 'Can manage live classes',
    description: 'Schedule sessions, access recordings, assign teachers.',
  },
  can_manage_cms_gallery: {
    label: 'Can manage CMS / Gallery',
    description: 'Upload gallery photos and edit site content (submissions still need Super Admin approval).',
  },
  can_access_communications: {
    label: 'Can access communications',
    description: 'Read and send messages in the Communications tab.',
  },
};

export function PermissionsTogglePanel({
  targetUserId,
  targetName,
  currentPermissions,
  onUpdated,
}: PermissionsTogglePanelProps) {
  const [permissions, setPermissions] = useState(currentPermissions);
  const [saving, setSaving] = useState<AdminPermissionKey | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleToggle = async (key: AdminPermissionKey) => {
    const newValue = !permissions[key];
    const optimistic = { ...permissions, [key]: newValue };
    setPermissions(optimistic);
    setSaving(key);
    setError(null);

    try {
      const res = await authFetch('/api/admin/update-permissions', {
        method: 'POST',
        body: JSON.stringify({
          targetUserId,
          permissions: { [key]: newValue },
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        // Revert on failure
        setPermissions(permissions);
        setError(data.error || 'Could not update this permission.');
        return;
      }

      setPermissions(data.permissions);
      onUpdated(data.permissions);
    } catch {
      setPermissions(permissions);
      setError('Network error \u2014 try again.');
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
      <h4 className="text-sm font-medium text-stone-700 mb-1">Access for {targetName}</h4>
      <p className="text-xs text-stone-500 mb-4">
        Turning a toggle off hides that section from this admin immediately and blocks it at the data level.
      </p>

      <div className="flex flex-col divide-y divide-stone-200">
        {(Object.keys(TOGGLE_LABELS) as AdminPermissionKey[]).map(key => {
          const meta = TOGGLE_LABELS[key];
          const isOn = permissions[key];
          const isSaving = saving === key;

          return (
            <div key={key} className="flex items-start justify-between gap-4 py-3">
              <div>
                <p className="text-sm text-stone-800">{meta.label}</p>
                <p className="text-xs text-stone-500 mt-0.5">{meta.description}</p>
              </div>

              <button
                onClick={() => handleToggle(key)}
                disabled={isSaving}
                role="switch"
                aria-checked={isOn}
                aria-label={meta.label}
                className={`
                  relative shrink-0 w-10 h-6 rounded-full transition-colors mt-0.5
                  ${isOn ? 'bg-emerald-600' : 'bg-stone-300'}
                  ${isSaving ? 'opacity-50' : ''}
                `}
              >
                <span
                  className={`
                    absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform
                    ${isOn ? 'translate-x-4' : 'translate-x-0'}
                  `}
                />
              </button>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{error}</p>
      )}
    </div>
  );
}
