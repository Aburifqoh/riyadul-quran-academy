'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { Settings, User, CreditCard, Lock, Calendar, CheckCircle, AlertCircle, RefreshCw, ExternalLink, Save, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { submitStudentProfileUpdate, requestScheduleChange } from '@/lib/db';
import Link from 'next/link';
import { ChangePassword } from '@/components/auth/ChangePassword';

export default function SettingsPage() {
  const { userData, user } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const router = useRouter();

  // Profile Form State
  const [address, setAddress] = useState('');
  const [goals, setGoals] = useState('');
  const [bio, setBio] = useState('');
  const [isSubmittingProfile, setIsSubmittingProfile] = useState(false);

  // Schedule Request State
  const [scheduleSlots, setScheduleSlots] = useState([{ day: 'Monday', time: '' }]);
  const [isSubmittingSchedule, setIsSubmittingSchedule] = useState(false);
  const pendingScheduleRequest = userData?.scheduleChangeRequest?.status === 'pending';

  const maxDays = userData?.planDays || userData?.schedule?.length || 2;

  const addSlot = () => {
    if (scheduleSlots.length < maxDays) {
      setScheduleSlots([...scheduleSlots, { day: 'Monday', time: '' }]);
    }
  };
  const removeSlot = (idx: number) => setScheduleSlots(scheduleSlots.filter((_, i) => i !== idx));
  const updateSlot = (idx: number, field: string, value: string) => {
    const newSlots = [...scheduleSlots];
    newSlots[idx] = { ...newSlots[idx], [field]: value };
    setScheduleSlots(newSlots);
  };

  useEffect(() => {
    if (userData?.studentProfile) {
      setAddress(userData.studentProfile.address || '');
      setGoals(userData.studentProfile.goals || '');
      setBio(userData.studentProfile.bio || '');
    }
  }, [userData]);

  const rawPlan = userData?.tuitionPlan || 'None';
  let displayPlanName = rawPlan.replace(/_/g, ' ');
  if (displayPlanName.toLowerCase().includes('onetoone')) {
    displayPlanName = displayPlanName.replace(/onetoone/gi, 'One-to-One');
  }

  const handleManagePlan = () => {
    router.push('/payment');
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSubmittingProfile(true);
    const success = await submitStudentProfileUpdate(user.id, { address, goals, bio });
    if (success) {
      alert("Profile updated successfully!");
    } else {
      alert("Failed to update profile.");
    }
    setIsSubmittingProfile(false);
  };

  const handleScheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSubmittingSchedule(true);
    
    const requestText = scheduleSlots.map(s => `${s.day} at ${s.time}`).join(', ');
    
    const success = await requestScheduleChange(user.id, requestText);
    if (success) {
      alert("Schedule change request submitted!");
      setScheduleSlots([{ day: 'Monday', time: '' }]);
      window.location.reload();
    } else {
      alert("Failed to submit request.");
    }
    setIsSubmittingSchedule(false);
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: { opacity: 1, x: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="pb-10 max-w-7xl mx-auto"
    >
      <div className="mb-8">
        <h2 className="text-3xl font-bold font-headers text-secondary m-0 mb-2 flex items-center gap-3">
           <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 text-white flex items-center justify-center shadow-sm">
              <Settings className="w-5 h-5" />
           </div>
           Settings & Preferences
        </h2>
        <p className="text-gray-500 m-0">Manage your profile, class schedule, and automated payment history.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT SIDEBAR: TABS */}
        <motion.div variants={itemVariants} className="lg:col-span-3">
          <div className="bg-white border border-gray-200 rounded-[32px] p-4 shadow-sm flex flex-col gap-2 sticky top-24">
            <button 
              onClick={() => setActiveTab('profile')} 
              className={cn(
                 "px-6 py-4 text-sm font-bold rounded-2xl whitespace-nowrap transition-all flex items-center gap-3 w-full text-left",
                 activeTab === 'profile' 
                    ? "bg-slate-800 text-white shadow-md scale-[1.02]" 
                    : "text-gray-500 hover:text-secondary hover:bg-gray-50 hover:scale-[1.02]"
              )}
            >
              <User className="w-5 h-5" /> 
              <span>Profile Details</span>
            </button>
            <button 
              onClick={() => setActiveTab('schedule')} 
              className={cn(
                 "px-6 py-4 text-sm font-bold rounded-2xl whitespace-nowrap transition-all flex items-center gap-3 w-full text-left",
                 activeTab === 'schedule' 
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 scale-[1.02]" 
                    : "text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 hover:scale-[1.02]"
              )}
            >
              <Calendar className="w-5 h-5" /> 
              <span>Schedule & Classes</span>
            </button>
            <button 
              onClick={() => setActiveTab('billing')} 
              className={cn(
                 "px-6 py-4 text-sm font-bold rounded-2xl whitespace-nowrap transition-all flex items-center gap-3 w-full text-left",
                 activeTab === 'billing' 
                    ? "bg-[#004D4A] text-white shadow-md shadow-[#004D4A]/20 scale-[1.02]" 
                    : "text-gray-500 hover:text-[#004D4A] hover:bg-[#E6F3F2] hover:scale-[1.02]"
              )}
            >
              <CreditCard className="w-5 h-5" /> 
              <span>Billing & Plans</span>
            </button>
            <button 
              onClick={() => setActiveTab('security')} 
              className={cn(
                 "px-6 py-4 text-sm font-bold rounded-2xl whitespace-nowrap transition-all flex items-center gap-3 w-full text-left",
                 activeTab === 'security' 
                    ? "bg-red-500 text-white shadow-md shadow-red-500/20 scale-[1.02]" 
                    : "text-gray-500 hover:text-red-600 hover:bg-red-50 hover:scale-[1.02]"
              )}
            >
              <Lock className="w-5 h-5" /> 
              <span>Security & Password</span>
            </button>
          </div>
        </motion.div>

        {/* RIGHT CONTENT AREA */}
        <motion.div variants={itemVariants} className="lg:col-span-9 h-full">
          <AnimatePresence mode="wait">
            
            {/* PROFILE TAB */}
            {activeTab === 'profile' && (
              <motion.div 
                key="profile-tab" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }} 
                className="grid grid-cols-1 md:grid-cols-3 gap-6"
              >
                <div className="md:col-span-1">
                   <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 flex flex-col items-center text-center h-full">
                      <div className="w-24 h-24 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-4xl font-bold mb-4 shadow-inner border-4 border-white">
                         {userData?.name?.charAt(0) || 'U'}
                      </div>
                      <h3 className="text-xl font-bold font-headers text-secondary mb-1">{userData?.name}</h3>
                      <p className="text-sm font-bold text-gray-400 uppercase tracking-wider">{userData?.role}</p>
                   </div>
                </div>

                <div className="md:col-span-2 flex flex-col gap-6">
                  {/* Read Only Block */}
                  <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                       <h3 className="text-xl font-bold font-headers text-secondary m-0">Core Identity</h3>
                       <div className="bg-gray-100 text-gray-500 px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5" /> Read Only
                       </div>
                    </div>
                    
                    <div className="space-y-6">
                      <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex gap-3 text-blue-700 text-sm font-medium">
                         <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                         <p className="m-0">Your core identity details are locked for security reasons. To change your name, email, or phone number, please contact administration.</p>
                      </div>

                      <div className="grid md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Full Name</label>
                          <div className="w-full px-5 py-4 border border-gray-100 rounded-xl text-secondary bg-gray-50 font-bold flex items-center justify-between">
                             {userData?.name || 'Not Provided'}
                             <Lock className="w-4 h-4 text-gray-300" />
                          </div>
                        </div>
                        <div>
                          <label className="block text-sm font-bold uppercase tracking-wider text-gray-400 mb-2">Email Address</label>
                          <div className="w-full px-5 py-4 border border-gray-100 rounded-xl text-secondary bg-gray-50 font-bold flex items-center justify-between truncate">
                             {userData?.email || 'Not Provided'}
                             <Lock className="w-4 h-4 text-gray-300 shrink-0" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Editable Profile Block */}
                  <div className="bg-white rounded-[32px] p-8 shadow-sm border border-gray-100 relative overflow-hidden">
                    <div className="flex justify-between items-center border-b border-gray-100 pb-4 mb-6">
                       <h3 className="text-xl font-bold font-headers text-secondary m-0">Personal Profile</h3>
                    </div>
                    
                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                      <div>
                        <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Location / Address</label>
                        <input 
                          type="text"
                          placeholder="e.g. London, UK"
                          value={address}
                          onChange={e => setAddress(e.target.value)}
                          className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-50 transition-all font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">Learning Goals</label>
                        <input 
                          type="text"
                          placeholder="e.g. To memorize 5 Juz by end of year"
                          value={goals}
                          onChange={e => setGoals(e.target.value)}
                          className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-50 transition-all font-medium"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-2">About / Bio</label>
                        <textarea 
                          placeholder="Tell your instructors a bit about yourself..."
                          value={bio}
                          onChange={e => setBio(e.target.value)}
                          className="w-full px-5 py-4 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-slate-400 focus:ring-4 focus:ring-slate-50 transition-all font-medium min-h-[120px] resize-none"
                        />
                      </div>
                      <button 
                        type="submit" 
                        disabled={isSubmittingProfile}
                        className={cn(
                          "w-full py-4 rounded-full font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all mt-4",
                          isSubmittingProfile ? "bg-slate-400 opacity-50 cursor-not-allowed" : "bg-slate-800 hover:bg-slate-900 hover:-translate-y-1 hover:shadow-xl"
                        )}
                      >
                        <Save className="w-5 h-5" />
                        {isSubmittingProfile ? 'Saving...' : 'Save Profile'}
                      </button>
                    </form>
                  </div>

                </div>
              </motion.div>
            )}

            {/* SCHEDULE TAB */}
            {activeTab === 'schedule' && (
              <motion.div 
                key="schedule-tab" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }} 
                className="grid grid-cols-1 gap-6"
              >
                 <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-gray-100 relative overflow-hidden">
                    <h3 className="text-2xl font-bold font-headers text-secondary border-b border-gray-100 pb-4 mb-6 flex items-center gap-3">
                       <Calendar className="w-6 h-6 text-emerald-500" /> Request Schedule Change
                    </h3>
                    
                    {pendingScheduleRequest ? (
                       <div className="bg-emerald-50 border border-emerald-100 p-8 rounded-2xl flex flex-col items-center justify-center text-center">
                          <Clock className="w-12 h-12 text-emerald-500 mb-4 animate-pulse" />
                          <h4 className="text-xl font-bold text-secondary mb-2">Request Pending</h4>
                          <p className="text-gray-500 m-0 max-w-md">Your request to change your schedule has been submitted and is currently being reviewed by administration. We will notify you once approved.</p>
                       </div>
                    ) : (
                       <form onSubmit={handleScheduleSubmit} className="space-y-6">
                          <div className="bg-gray-50 border border-gray-100 p-6 rounded-2xl">
                             <p className="text-sm font-medium text-gray-500 leading-relaxed m-0">
                                Need to adjust your current class timings? Please select your new preferred days and times. Note that schedule changes are subject to instructor availability and may take up to 48 hours to be processed by administration.
                             </p>
                          </div>
                          
                          <div>
                            <label className="block text-sm font-bold uppercase tracking-wider text-gray-500 mb-4">Preferred Class Slots</label>
                            
                            <div className="space-y-3 mb-4">
                              {scheduleSlots.map((slot, idx) => (
                                <div key={idx} className="flex flex-col sm:flex-row items-center gap-3">
                                  <select 
                                    value={slot.day}
                                    onChange={e => updateSlot(idx, 'day', e.target.value)}
                                    className="w-full sm:w-1/2 px-4 py-3 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all font-bold"
                                  >
                                    <option value="Monday">Monday</option>
                                    <option value="Tuesday">Tuesday</option>
                                    <option value="Wednesday">Wednesday</option>
                                    <option value="Thursday">Thursday</option>
                                    <option value="Friday">Friday</option>
                                    <option value="Saturday">Saturday</option>
                                    <option value="Sunday">Sunday</option>
                                  </select>
                                  
                                  <input 
                                    type="time" 
                                    value={slot.time}
                                    onChange={e => updateSlot(idx, 'time', e.target.value)}
                                    className="w-full sm:w-1/3 px-4 py-3 border border-gray-200 rounded-xl text-secondary focus:outline-none focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50 transition-all font-bold"
                                  />
                                  
                                  {scheduleSlots.length > 1 && (
                                    <button 
                                      type="button" 
                                      onClick={() => removeSlot(idx)}
                                      className="w-full sm:w-auto p-3 rounded-xl text-red-500 hover:bg-red-50 transition-colors border border-transparent hover:border-red-100 flex items-center justify-center"
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                            
                            {scheduleSlots.length < maxDays ? (
                              <button 
                                type="button"
                                onClick={addSlot}
                                className="text-sm font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 px-4 py-2 rounded-lg transition-colors border border-emerald-100"
                              >
                                + Add Another Day
                              </button>
                            ) : (
                              <p className="text-sm font-medium text-amber-600 mt-2 bg-amber-50 inline-block px-3 py-1 rounded-full border border-amber-100">
                                You have reached the maximum number of classes for your current plan ({maxDays} days/week).
                              </p>
                            )}
                          </div>

                          <button 
                            type="submit" 
                            disabled={isSubmittingSchedule || scheduleSlots.some(s => !s.time)}
                            className={cn(
                              "w-full py-4 rounded-full font-bold text-white shadow-lg flex items-center justify-center gap-2 transition-all mt-6",
                              (isSubmittingSchedule || scheduleSlots.some(s => !s.time)) ? "bg-emerald-400 opacity-50 cursor-not-allowed" : "bg-emerald-600 hover:bg-emerald-700 hover:-translate-y-1 hover:shadow-xl"
                            )}
                          >
                            <Calendar className="w-5 h-5" />
                            {isSubmittingSchedule ? 'Submitting Request...' : 'Submit Request to Admin'}
                          </button>
                       </form>
                    )}
                 </div>
              </motion.div>
            )}

            {/* BILLING TAB */}
            {activeTab === 'billing' && (
              <motion.div 
                key="billing-tab" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }} 
                className="grid grid-cols-1 gap-6"
              >
                {/* Active Plan Card */}
                <div className="bg-slate-900 rounded-[32px] p-8 md:p-10 shadow-xl relative overflow-hidden group border border-slate-800">
                  <div className="absolute top-[-30px] right-[-30px] w-64 h-64 bg-[#D4AF37]/20 blur-[60px] rounded-full pointer-events-none transition-transform group-hover:scale-125 duration-1000" />
                  
                  <div className="flex flex-col md:flex-row md:items-start justify-between relative z-10 mb-8 gap-6">
                    <div>
                      <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-2 flex items-center gap-2">
                         <RefreshCw className="w-4 h-4 text-[#004D4A]" /> Automatic Recurring Plan
                      </div>
                      <h3 className="text-3xl md:text-4xl font-bold font-headers text-white capitalize mb-4">{displayPlanName}</h3>
                      <div className="flex items-center gap-3 flex-wrap">
                         <div className={cn(
                            "px-4 py-1.5 rounded-full text-xs font-bold border backdrop-blur-sm",
                            userData?.paymentVerified ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                         )}>
                           {userData?.paymentVerified ? 'ACTIVE' : 'PENDING'}
                         </div>
                         <div className="px-4 py-1.5 rounded-full text-xs font-bold border border-slate-700 bg-slate-800 text-slate-300 flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5" /> Auto-Pay Enabled
                         </div>
                      </div>
                    </div>
                    
                    <button 
                       onClick={handleManagePlan}
                       className="w-full md:w-auto bg-[#004D4A] hover:bg-[#0F3D38] text-white py-3 px-6 rounded-full font-bold shadow-[0_4px_20px_rgba(0,77,74,0.3)] transition-colors text-sm flex items-center justify-center gap-2 hover:-translate-y-1"
                    >
                      Manage Plan <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="relative z-10 bg-slate-800/50 border border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4 w-full md:w-auto">
                       <div className="w-12 h-12 rounded-full bg-slate-700 flex items-center justify-center text-slate-400">
                          <Calendar className="w-6 h-6" />
                       </div>
                       <div>
                         <div className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Next Billing Date</div>
                         <div className="text-lg font-bold text-white">
                           {userData?.paymentVerified ? 'Calculated via Subscription Portal' : 'Not Scheduled'}
                         </div>
                       </div>
                    </div>
                    <div className="text-sm text-slate-400 font-medium md:text-right w-full md:w-auto">
                       Your payment gateway automatically deducts <br className="hidden md:block" />
                       monthly payments according to your chosen plan.
                    </div>
                  </div>
                </div>

                {/* Payment History */}
                <div className="bg-white rounded-[32px] p-8 md:p-10 shadow-sm border border-gray-100">
                  <h3 className="text-xl font-bold font-headers text-secondary border-b border-gray-100 pb-4 mb-6 flex items-center gap-3">
                     <CreditCard className="w-5 h-5 text-gray-400" /> Payment History
                  </h3>
                  
                  <div className="space-y-4">
                    {userData?.paymentVerified ? (
                      <div className="flex flex-col md:flex-row md:items-center justify-between p-5 bg-emerald-50/50 rounded-2xl border border-emerald-100 gap-4">
                        <div>
                          <strong className="block text-secondary font-bold mb-1">Subscription Activation</strong>
                          <span className="text-sm font-medium text-gray-500">Initial checkout verification</span>
                        </div>
                        <div className="flex items-center justify-between w-full md:w-auto md:justify-end gap-6">
                           <span className="text-lg font-black text-secondary">Verified</span>
                           <div className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                              <CheckCircle className="w-4 h-4" /> Paid
                           </div>
                        </div>
                      </div>
                    ) : (
                      <div className="p-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200 text-center flex flex-col items-center justify-center gap-3">
                        <AlertCircle className="w-10 h-10 text-gray-300" />
                        <h4 className="text-lg font-bold text-secondary">No payment history found</h4>
                        <p className="text-gray-400 font-medium m-0 max-w-sm">Complete your checkout process to view your automatic subscription history here.</p>
                      </div>
                    )}
                  </div>
                </div>

              </motion.div>
            )}

            {/* SECURITY TAB */}
            {activeTab === 'security' && (
              <motion.div 
                key="security-tab" 
                initial={{ opacity: 0, x: 20 }} 
                animate={{ opacity: 1, x: 0 }} 
                exit={{ opacity: 0, x: 20 }} 
                className="grid grid-cols-1 gap-6"
              >
                 <ChangePassword />
              </motion.div>
            )}

          </AnimatePresence>
        </motion.div>
      </div>
    </motion.div>
  );
}
