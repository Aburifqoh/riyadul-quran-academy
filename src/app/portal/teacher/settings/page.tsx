'use client';

import { displayValue } from '@/lib/userDataHelpers';

import React, { useState, useMemo } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, User, Save, Clock, Info, CheckCircle, Plus, X } from 'lucide-react';
import { submitTeacherProfileForApproval } from '@/lib/db';
import { cn } from '@/lib/utils';
import { ChangePassword } from '@/components/auth/ChangePassword';

export default function TeacherSettings() {
  const { userData, user } = useAuth();
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isPending = !!userData?.pendingProfileUpdate;

  const profileDefaults = useMemo(() => {
    const activeProfile = userData?.pendingProfileUpdate || userData?.publicProfile || {};
    const parseList = (value: unknown) => {
      if (Array.isArray(value)) return value as string[];
      if (typeof value === 'string' && value.trim()) return value.split(',').map((s: string) => s.trim());
      return [''];
    };
    return {
      qualifications: parseList(activeProfile.qualifications),
      specialization: parseList(activeProfile.specialization),
      languages: parseList(activeProfile.languages),
      about: displayValue(activeProfile.about),
      kunyah: displayValue(activeProfile.kunyah),
    };
  }, [userData?.pendingProfileUpdate, userData?.publicProfile]);

  const [qualificationsOverride, setQualificationsOverride] = useState<string[] | null>(null);
  const [specializationOverride, setSpecializationOverride] = useState<string[] | null>(null);
  const [languagesOverride, setLanguagesOverride] = useState<string[] | null>(null);
  const [aboutOverride, setAboutOverride] = useState<string | null>(null);
  const [kunyahOverride, setKunyahOverride] = useState<string | null>(null);

  const qualifications = qualificationsOverride ?? profileDefaults.qualifications;
  const specialization = specializationOverride ?? profileDefaults.specialization;
  const languages = languagesOverride ?? profileDefaults.languages;
  const about = aboutOverride ?? profileDefaults.about;
  const kunyah = kunyahOverride ?? profileDefaults.kunyah;

  const setQualifications = (value: React.SetStateAction<string[]>) => {
    setQualificationsOverride(typeof value === 'function' ? value(qualifications) : value);
  };
  const setSpecialization = (value: React.SetStateAction<string[]>) => {
    setSpecializationOverride(typeof value === 'function' ? value(specialization) : value);
  };
  const setLanguages = (value: React.SetStateAction<string[]>) => {
    setLanguagesOverride(typeof value === 'function' ? value(languages) : value);
  };
  const setAbout = (value: React.SetStateAction<string>) => {
    setAboutOverride(typeof value === 'function' ? value(about) : value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    
    // Clean empty entries
    const cleanQual = qualifications.filter(q => q.trim() !== '');
    const cleanSpec = specialization.filter(s => s.trim() !== '');
    const cleanLang = languages.filter(l => l.trim() !== '');
    
    setIsSubmitting(true);
    const success = await submitTeacherProfileForApproval(user.id, {
      qualifications: cleanQual.length > 0 ? cleanQual : [''],
      specialization: cleanSpec.length > 0 ? cleanSpec : [''],
      languages: cleanLang.length > 0 ? cleanLang : [''],
      about,
      kunyah: kunyah.trim(),
    });
    
    if (success) {
      alert("Profile update submitted for admin approval!");
      window.location.reload();
    } else {
      alert("Failed to submit profile update. Please try again.");
      setIsSubmitting(false);
    }
  };

  const handleArrayChange = (index: number, value: string, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => {
      const newArr = [...prev];
      newArr[index] = value;
      return newArr;
    });
  };

  const addField = (setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => [...prev, '']);
  };

  const removeField = (index: number, setter: React.Dispatch<React.SetStateAction<string[]>>) => {
    setter(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : ['']);
  };

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-headers text-secondary m-0 mb-2">Account Settings</h2>
        <p className="text-gray-500 m-0">Manage your instructor profile and preferences.</p>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Core Read-Only Details */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-8 pb-4 border-b border-gray-100">
             <User className="w-6 h-6 text-primary" />
             <h3 className="text-xl font-bold font-headers text-secondary m-0">Core Identity</h3>
          </div>

          <div className="grid md:grid-cols-2 gap-6 mb-8">
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Full Name</label>
              <div className="relative">
                 <input 
                   type="text" 
                   value={userData?.name || ''} 
                   readOnly 
                   className="w-full px-5 py-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed font-medium pr-12"
                 />
                 <Lock className="w-4 h-4 text-gray-400 absolute right-5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Email Address</label>
              <div className="relative">
                 <input 
                   type="email" 
                   value={userData?.email || ''} 
                   readOnly 
                   className="w-full px-5 py-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed font-medium pr-12"
                 />
                 <Lock className="w-4 h-4 text-gray-400 absolute right-5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Gender</label>
              <div className="relative">
                 <input 
                   type="text" 
                   value={displayValue(userData?.publicProfile?.gender) || userData?.gender || 'Not set'} 
                   readOnly 
                   className="w-full px-5 py-4 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed font-medium pr-12"
                 />
                 <Lock className="w-4 h-4 text-gray-400 absolute right-5 top-1/2 -translate-y-1/2" />
              </div>
            </div>
          </div>
          
          <div className="p-4 rounded-xl bg-blue-50 border border-blue-100 text-blue-800 flex gap-4">
             <div className="shrink-0 pt-0.5"><Lock className="w-5 h-5 text-blue-500" /></div>
             <p className="text-sm m-0 leading-relaxed font-medium">
               <strong>Read-Only Mode:</strong> Core profile details are strictly managed by Ilmvers Administration. To request changes, please contact HR.
             </p>
          </div>
        </div>

        {/* Editable Public Profile */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden">
          {isPending && (
            <div className="absolute top-0 left-0 w-full h-full bg-white/60 backdrop-blur-[2px] z-10 flex items-center justify-center rounded-[32px]">
               <div className="bg-white p-6 rounded-2xl shadow-xl border border-amber-100 max-w-sm text-center">
                  <Clock className="w-12 h-12 text-amber-500 mx-auto mb-4 animate-pulse" />
                  <h4 className="text-xl font-bold text-secondary mb-2">Pending Approval</h4>
                  <p className="text-sm text-gray-500">Your profile updates are currently being reviewed by an administrator. You cannot make further changes until the current request is processed.</p>
               </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
            <div className="flex items-center gap-3">
               <Info className="w-6 h-6 text-emerald-500" />
               <h3 className="text-xl font-bold font-headers text-secondary m-0">Public Profile</h3>
            </div>
            {userData?.publicProfile && !isPending && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                <CheckCircle className="w-3 h-3" /> Live
              </span>
            )}
          </div>

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Qualifications */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 m-0">Qualifications & Certifications</label>
                <button type="button" onClick={() => addField(setQualifications)} className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full transition-colors">
                   <Plus className="w-4 h-4" /> Add More
                </button>
              </div>
              <div className="space-y-3">
                {qualifications.map((qual, index) => (
                  <div key={`q-${index}`} className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="e.g. Ijazah in Hafs from Asim"
                      value={qual}
                      onChange={e => handleArrayChange(index, e.target.value, setQualifications)}
                      required={index === 0}
                      className="flex-1 px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all font-medium"
                    />
                    <button type="button" onClick={() => removeField(index, setQualifications)} className="w-14 shrink-0 flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Specializations */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 m-0">Area of Specialization</label>
                <button type="button" onClick={() => addField(setSpecialization)} className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full transition-colors">
                   <Plus className="w-4 h-4" /> Add More
                </button>
              </div>
              <div className="space-y-3">
                {specialization.map((spec, index) => (
                  <div key={`s-${index}`} className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="e.g. Tajweed Rules, Arabic Grammar"
                      value={spec}
                      onChange={e => handleArrayChange(index, e.target.value, setSpecialization)}
                      required={index === 0}
                      className="flex-1 px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all font-medium"
                    />
                    <button type="button" onClick={() => removeField(index, setSpecialization)} className="w-14 shrink-0 flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Spoken Languages */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 m-0">Spoken Languages</label>
                <button type="button" onClick={() => addField(setLanguages)} className="text-emerald-600 text-sm font-bold flex items-center gap-1 hover:text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full transition-colors">
                   <Plus className="w-4 h-4" /> Add More
                </button>
              </div>
              <div className="space-y-3">
                {languages.map((lang, index) => (
                  <div key={`l-${index}`} className="flex gap-2">
                    <input 
                      type="text"
                      placeholder="e.g. English, Arabic, Urdu"
                      value={lang}
                      onChange={e => handleArrayChange(index, e.target.value, setLanguages)}
                      required={index === 0}
                      className="flex-1 px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all font-medium"
                    />
                    <button type="button" onClick={() => removeField(index, setLanguages)} className="w-14 shrink-0 flex items-center justify-center border border-gray-200 rounded-xl text-gray-400 hover:text-red-500 hover:bg-red-50 hover:border-red-200 transition-colors">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Kunyah */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Kunyah</label>
              <input
                type="text"
                placeholder="e.g. Abu Rifqoh"
                value={kunyah}
                onChange={e => setKunyahOverride(e.target.value)}
                className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all font-medium"
              />
              <p className="text-xs text-gray-400 mt-2 m-0">
                Shown publicly as your first name + kunyah. Leave blank to show your full name.
              </p>
            </div>

            {/* About */}
            <div>
              <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">About / Biography</label>
              <textarea 
                placeholder="Write a short bio about yourself..."
                value={about}
                onChange={e => setAbout(e.target.value)}
                required
                className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all font-medium min-h-[150px] resize-none"
              />
            </div>

            <button 
              type="submit" 
              disabled={isSubmitting || isPending}
              className={cn(
                "w-full py-4 rounded-full font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all mt-8",
                isSubmitting ? "bg-emerald-400 opacity-50 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-1 hover:shadow-xl"
              )}
            >
              <Save className="w-5 h-5" />
              {isSubmitting ? 'Submitting...' : 'Submit for Approval'}
            </button>
          </form>
        </div>

        {/* Security / Change Password */}
        <div className="mt-8">
           <ChangePassword />
        </div>
      </div>
    </div>
  );
}
