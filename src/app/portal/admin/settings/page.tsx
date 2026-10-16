'use client';

import { getErrorMessage } from '@/lib/errors';
import { getUserRole } from '@/lib/userDataHelpers';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { ShieldAlert, User, Settings as SettingsIcon, Mic, Sparkles, Loader2 } from 'lucide-react';
import PortalSkeleton from '@/components/ui/PortalSkeleton';
import { supabase } from '@/lib/supabase';

export default function AdminSettings() {
  const { user, userData, loading } = useAuth();

  const [hifzMode, setHifzMode] = React.useState<'free' | 'premium'>('free');
  const [isUpdatingMode, setIsUpdatingMode] = React.useState(false);
  
  const [pricingRates, setPricingRates] = React.useState({ group: 8, oneToOne: 10, ijazah: 12 });
  const [isUpdatingPricing, setIsUpdatingPricing] = React.useState(false);

  React.useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase.from('system_settings').select('value').eq('key', 'hifz_mode').single();
      if (cancelled) return;
      if (data && data.value) setHifzMode(data.value as 'free' | 'premium');

      const { getPricingRates } = await import('@/app/actions/settings');
      const rates = await getPricingRates();
      if (cancelled) return;
      if (rates) setPricingRates(rates);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handlePricingUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingPricing(true);
    
    try {
      const { updatePricingRates } = await import('@/app/actions/settings');
      const result = await updatePricingRates(pricingRates);
      
      if (result.success) {
        alert('Pricing rates updated successfully! Changes are live immediately.');
      } else {
        alert('Failed to update pricing: ' + result.error);
      }
    } catch (err: unknown) {
      alert('Error updating pricing: ' + getErrorMessage(err));
    }
    
    setIsUpdatingPricing(false);
  };

  const toggleHifzMode = async (mode: 'free' | 'premium') => {
    setIsUpdatingMode(true);
    const { error } = await supabase.from('system_settings').upsert({ key: 'hifz_mode', value: mode });
    if (!error) setHifzMode(mode);
    setIsUpdatingMode(false);
  };

  if (loading) return <PortalSkeleton />;
  const role = getUserRole(userData?.role);
  if (role !== 'admin' && role !== 'super_admin') {
    return <div className="p-10 text-center text-gray-500">Access denied. Admin access required.</div>;
  }

  return (
    <div className="max-w-4xl mx-auto pb-10">
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-headers text-secondary m-0 mb-2 flex items-center gap-3">
          <SettingsIcon className="w-8 h-8 text-blue-600" /> System & Profile Settings
        </h2>
        <p className="text-gray-500 m-0">Manage your administrative profile and global platform settings.</p>
      </div>

      <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8 pb-8 border-b border-gray-100">
          <div className="w-24 h-24 bg-red-100 text-red-600 rounded-full flex items-center justify-center border-4 border-white shadow-md flex-shrink-0">
             <ShieldAlert className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-2xl font-bold font-headers text-secondary m-0">{userData?.name || 'Administrator'}</h3>
            <p className="text-sm font-bold text-gray-400 uppercase tracking-wider m-0 mb-2">Verified Admin Account</p>
            <p className="text-sm text-gray-500 m-0">{userData?.email || user?.email}</p>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h4 className="font-bold text-secondary mb-4 flex items-center gap-2">
               <User className="w-5 h-5 text-gray-400" /> Identity Details
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Full Name</label>
                <div className="px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700">{userData?.name}</div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Email Address</label>
                <div className="px-4 py-3 bg-white border border-gray-200 rounded-xl font-medium text-gray-700">{userData?.email || user?.email}</div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Role / Access Level</label>
                <div className="px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-blue-600 uppercase tracking-widest text-xs">{getUserRole(userData?.role) || 'admin'}</div>
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Account Status</label>
                <div className="px-4 py-3 bg-white border border-gray-200 rounded-xl font-bold text-emerald-600 uppercase tracking-widest text-xs">Active</div>
              </div>
            </div>
            
            <div className="mt-6 p-4 bg-blue-50 border border-blue-100 rounded-xl">
               <p className="text-sm text-blue-800 m-0 font-medium">
                 <strong>Note:</strong> As an Administrator, your core identity details are tied directly to your Supabase Auth instance. To change these, please update them directly in the Supabase Dashboard.
               </p>
            </div>
          </div>

          {getUserRole(userData?.role) === 'super_admin' && (
            <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-8">
              <h4 className="font-bold text-secondary mb-4 flex items-center gap-2">
                 <SettingsIcon className="w-5 h-5 text-gray-400" /> Global Tuition Pricing
              </h4>
              
              <form onSubmit={handlePricingUpdate} className="bg-white border border-gray-200 rounded-2xl p-6">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h5 className="font-bold text-lg text-secondary flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-amber-500" /> Base Hourly Rates
                    </h5>
                    <p className="text-sm text-gray-500 mt-1 max-w-md">
                      Set the base hourly rate (in USD) for each plan. The monthly prices on the public pricing page will automatically recalculate.
                    </p>
                  </div>
                  {isUpdatingPricing && <Loader2 className="w-5 h-5 animate-spin text-amber-500" />}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Group Plan</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                      <input 
                        type="number" 
                        value={pricingRates.group}
                        onChange={e => setPricingRates(prev => ({ ...prev, group: Number(e.target.value) }))}
                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                        min="1" step="0.5" required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">One-to-One Plan</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                      <input 
                        type="number" 
                        value={pricingRates.oneToOne}
                        onChange={e => setPricingRates(prev => ({ ...prev, oneToOne: Number(e.target.value) }))}
                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                        min="1" step="0.5" required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-2">Ijazah Plan</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                      <input 
                        type="number" 
                        value={pricingRates.ijazah}
                        onChange={e => setPricingRates(prev => ({ ...prev, ijazah: Number(e.target.value) }))}
                        className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-gray-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none transition-all"
                        min="1" step="0.5" required
                      />
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-100">
                  <button 
                    type="submit" 
                    disabled={isUpdatingPricing}
                    className="bg-secondary hover:bg-secondary/90 text-white px-8 py-3 rounded-xl font-bold transition-all disabled:opacity-50 shadow-md hover:shadow-lg"
                  >
                    Save Pricing Configuration
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100 mt-8">
            <h4 className="font-bold text-secondary mb-4 flex items-center gap-2">
               <SettingsIcon className="w-5 h-5 text-gray-400" /> Platform Infrastructure
            </h4>
            
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h5 className="font-bold text-lg text-secondary flex items-center gap-2">
                    <Mic className="w-5 h-5 text-emerald-500" /> Hifz AI Lab Engine
                  </h5>
                  <p className="text-sm text-gray-500 mt-1 max-w-md">
                    Choose the underlying AI engine powering the student Hifz Lab. Switching engines takes effect immediately for all students.
                  </p>
                </div>
                {isUpdatingMode && <Loader2 className="w-5 h-5 animate-spin text-gray-400" />}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  onClick={() => toggleHifzMode('free')}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${hifzMode === 'free' ? 'border-emerald-500 bg-emerald-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold ${hifzMode === 'free' ? 'text-emerald-700' : 'text-gray-700'}`}>Tarteel + Cloudflare AI</span>
                    {hifzMode === 'free' && <span className="bg-emerald-100 text-emerald-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">Active</span>}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <strong>Zero-Cost Mode.</strong> Uses HuggingFace Tarteel Whisper for transcription and Cloudflare Llama 3.1 for feedback generation. Ideal for free tiers.
                  </p>
                </button>

                <button 
                  onClick={() => toggleHifzMode('premium')}
                  className={`p-5 rounded-xl border-2 text-left transition-all ${hifzMode === 'premium' ? 'border-blue-500 bg-blue-50/50 shadow-sm' : 'border-gray-100 hover:border-gray-200 bg-white'}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`font-bold ${hifzMode === 'premium' ? 'text-blue-700' : 'text-gray-700'}`}>OpenAI Whisper + GPT-4o</span>
                    {hifzMode === 'premium' && <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wider">Active</span>}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    <strong>Premium Mode.</strong> High-fidelity transcription via OpenAI Whisper and advanced tajweed feedback from GPT-4o. Incurs API costs.
                  </p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
