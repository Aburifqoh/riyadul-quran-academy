'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import { Plus, X, Save } from 'lucide-react';
import { asStringArray, displayValue } from '@/lib/userDataHelpers';
import { authFetch } from '@/lib/authFetch';
import type { UserData } from '@/types/user';
import type { JsonValue } from '@/types/json';

function parseList(value: unknown): string[] {
  const fromArray = asStringArray(value as JsonValue);
  if (fromArray.length) return fromArray;
  if (typeof value === 'string' && value.trim()) {
    return value.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [''];
}

export function EditTeacherProfileModal({
  teacher,
  onClose,
  onSaved,
}: {
  teacher: UserData;
  onClose: () => void;
  onSaved: () => void;
}) {
  const profile = teacher.publicProfile || {};
  const [name, setName] = useState(teacher.name || '');
  const [email, setEmail] = useState(teacher.email || '');
  const [kunyah, setKunyah] = useState(displayValue(profile.kunyah as JsonValue));
  const [gender, setGender] = useState(
    displayValue(profile.gender as JsonValue) || teacher.gender || ''
  );
  const [qualifications, setQualifications] = useState(parseList(profile.qualifications));
  const [specialization, setSpecialization] = useState(parseList(profile.specialization));
  const [languages, setLanguages] = useState(parseList(profile.languages));
  const [about, setAbout] = useState(displayValue((profile.about || profile.bio) as JsonValue));
  const [isLive, setIsLive] = useState(Boolean(profile.isLive));
  const [saving, setSaving] = useState(false);

  const updateList = (setter: Dispatch<SetStateAction<string[]>>, index: number, value: string) => {
    setter(prev => prev.map((item, i) => (i === index ? value : item)));
  };

  const handleSave = async () => {
    if (!name.trim()) {
      alert('Name is required.');
      return;
    }
    setSaving(true);
    const res = await authFetch('/api/admin/teacher-profile', {
      method: 'POST',
      body: JSON.stringify({
        teacherId: teacher.id,
        name: name.trim(),
        email: email.trim(),
        kunyah: kunyah.trim(),
        gender,
        qualifications,
        specialization,
        languages,
        about,
        isLive,
      }),
    });
    const result = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok || !result.success) {
      alert(result.error || 'Failed to save teacher profile.');
      return;
    }
    onSaved();
  };

  const fieldList = (
    label: string,
    values: string[],
    setter: Dispatch<SetStateAction<string[]>>,
    placeholder: string
  ) => (
    <div>
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-bold uppercase tracking-wider text-gray-500 m-0">{label}</label>
        <button
          type="button"
          onClick={() => setter(prev => [...prev, ''])}
          className="text-xs font-bold text-indigo-600 flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" /> Add
        </button>
      </div>
      <div className="space-y-2">
        {values.map((value, index) => (
          <div key={`${label}-${index}`} className="flex gap-2">
            <input
              type="text"
              value={value}
              placeholder={placeholder}
              onChange={e => updateList(setter, index, e.target.value)}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm outline-none focus:border-indigo-400"
            />
            <button
              type="button"
              onClick={() => setter(prev => (prev.length > 1 ? prev.filter((_, i) => i !== index) : ['']))}
              className="w-10 shrink-0 rounded-xl border border-gray-200 text-gray-400 hover:text-red-500 hover:bg-red-50"
            >
              <X className="w-4 h-4 mx-auto" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl p-6 max-w-2xl w-full shadow-2xl max-h-[90vh] overflow-y-auto">
        <h4 className="text-xl font-bold text-secondary mb-1">Edit teacher profile</h4>
        <p className="text-sm text-gray-500 mb-5">Changes go live immediately. Any pending teacher update is cleared.</p>

        <div className="grid md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="text-xs font-bold uppercase text-gray-400">Full name</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-400">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-400">Kunyah</label>
            <input
              value={kunyah}
              onChange={e => setKunyah(e.target.value)}
              placeholder="e.g. Abu Rifqoh"
              className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
            />
            <p className="text-[11px] text-gray-400 mt-1 m-0">
              Public Teachers page shows first name + kunyah. Leave blank to show the full name.
            </p>
          </div>
          <div>
            <label className="text-xs font-bold uppercase text-gray-400">Gender</label>
            <select
              value={gender}
              onChange={e => setGender(e.target.value)}
              className="w-full mt-1 px-4 py-2.5 border border-gray-200 rounded-xl text-sm"
            >
              <option value="">Not set</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>
          <label className="flex items-center gap-2 mt-6 text-sm font-medium text-secondary cursor-pointer">
            <input type="checkbox" checked={isLive} onChange={e => setIsLive(e.target.checked)} />
            Show on public Teachers page
          </label>
        </div>

        <div className="space-y-5">
          {fieldList('Qualifications', qualifications, setQualifications, 'e.g. Ijazah in Hafs')}
          {fieldList('Specialization', specialization, setSpecialization, 'e.g. Tajweed, Hifz')}
          {fieldList('Spoken languages', languages, setLanguages, 'e.g. English, Arabic')}
          <div>
            <label className="text-xs font-bold uppercase text-gray-400">About / biography</label>
            <textarea
              value={about}
              onChange={e => setAbout(e.target.value)}
              className="w-full mt-1 px-4 py-3 border border-gray-200 rounded-xl text-sm min-h-[120px]"
              placeholder="Instructor biography shown on the public site."
            />
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button type="button" onClick={onClose} className="flex-1 py-3 rounded-full font-bold bg-gray-100 text-gray-600">
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 rounded-full font-bold bg-indigo-600 text-white disabled:opacity-50 inline-flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving…' : 'Save profile'}
          </button>
        </div>
      </div>
    </div>
  );
}
