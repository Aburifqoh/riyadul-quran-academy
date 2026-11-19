'use client';

import { getSchedule, getUserRole } from '@/lib/userDataHelpers';

import type { UserData } from '@/types/user';
import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect, useCallback } from 'react';
import { fetchAllUsersParsed } from '@/lib/fetchAllUsers';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Briefcase, ArrowLeft, Plus, CheckCircle, XCircle, Globe, EyeOff, Loader2, Pencil, Trash2 } from 'lucide-react';
import { approveTeacherProfile, rejectTeacherProfile, toggleTeacherLiveStatus } from '@/lib/db';
import { useAuth } from '@/context/AuthContext';
import { hasPermission } from '@/lib/permissions';
import { EditTeacherProfileModal } from '@/components/admin/EditTeacherProfileModal';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';
import { authFetch } from '@/lib/authFetch';
import PortalSkeleton from '@/components/ui/PortalSkeleton';
import { isSandboxAccount } from '@/lib/billing';
import { TestSeatBadge } from '@/components/admin/TestSeatBadge';
import { FacultyShowcaseManager } from '@/components/admin/FacultyShowcaseManager';

export default function FacultyManager() {
  const { userData, loading: authLoading } = useAuth();
  const isSuperAdmin = getUserRole(userData?.role) === 'super_admin';
  const [teachers, setTeachers] = useState<UserData[]>([]);
  const [allStudents, setAllStudents] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTeacher, setEditingTeacher] = useState<UserData | null>(null);
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [newTeacher, setNewTeacher] = useState({ name: '', email: '', password: '' });
  const [isAdding, setIsAdding] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<UserData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const router = useRouter();

  const fetchData = useCallback(async () => {
    try {
      const all = await fetchAllUsersParsed();
      setTeachers(all.filter((u) => getUserRole(u.role) === 'teacher'));
      setAllStudents(all.filter((u) => {
        const role = getUserRole(u.role);
        return role === 'student' || role === 'parent';
      }));
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const all = await fetchAllUsersParsed();
        if (cancelled) return;
        setTeachers(all.filter((u) => getUserRole(u.role) === 'teacher'));
        setAllStudents(all.filter((u) => {
          const role = getUserRole(u.role);
          return role === 'student' || role === 'parent';
        }));
      } catch (err) {
        console.error(err);
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const getStudentCount = (teacher: UserData) => {
    return allStudents.filter(s =>
      !isSandboxAccount(s) &&
      getSchedule(s.schedule).some((slot) => slot.teacherEmail === teacher.email)
    ).length;
  };

  const toggleLock = async (teacher: UserData) => {
    const newLocked = !teacher.availabilityLocked;
    try {
      await supabase.from('users').update({ availabilityLocked: newLocked }).eq('id', teacher.id);
      setTeachers(teachers.map(t => t.id === teacher.id ? { ...t, availabilityLocked: newLocked } : t));
    } catch {
      alert('Update failed');
    }
  };

  const handleAddTeacher = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAdding(true);
    try {
      const res = await authFetch('/api/admin/create-teacher', {
        method: 'POST',
        body: JSON.stringify(newTeacher)
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert('Teacher created. Login details were emailed to them.');
      setShowAddModal(false);
      setNewTeacher({ name: '', email: '', password: '' });
      fetchData();
    } catch (err: unknown) {
      alert('Error: ' + getErrorMessage(err));
    }
    setIsAdding(false);
  };

  const handleApproveProfile = async (t: UserData) => {
    try {
      await approveTeacherProfile(t.id ?? '');
      fetchData();
    } catch {
      alert('Failed to approve profile');
    }
  };

  const handleRejectProfile = async (t: UserData) => {
    try {
      await rejectTeacherProfile(t.id ?? '');
      fetchData();
    } catch {
      alert('Failed to reject profile');
    }
  };

  const handleDeleteTeacher = async () => {
    if (!pendingDelete?.id) return;
    setIsDeleting(true);
    try {
      const res = await authFetch('/api/admin/delete-staff', {
        method: 'POST',
        body: JSON.stringify({ userId: pendingDelete.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete teacher.');
      setPendingDelete(null);
      fetchData();
    } catch (err: unknown) {
      alert('Error: ' + getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleToggleLive = async (t: UserData) => {
    try {
      const isCurrentlyLive = t.publicProfile?.isLive || false;
      await toggleTeacherLiveStatus(t.id ?? '', !isCurrentlyLive);
      fetchData();
    } catch {
      alert('Failed to toggle live status');
    }
  };

  if (authLoading || loading) return <PortalSkeleton />;
  if (!hasPermission(userData, 'can_manage_students')) {
    return <div className="p-10 text-center text-gray-500">Access denied. Faculty management permission required.</div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/portal/admin')} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </button>
          <div>
            <h2 className="text-3xl font-headers font-bold text-secondary m-0 flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-indigo-500" /> Faculty Directory
            </h2>
            <p className="text-gray-500 m-0">Manage instructor profiles, schedule locks, and public visibility.</p>
          </div>
        </div>
        {isSuperAdmin && (
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-secondary hover:bg-secondary/90 text-white px-6 py-3 rounded-full font-bold transition-all shadow-md hover:-translate-y-0.5"
          >
            <Plus className="w-5 h-5" /> Add Teacher
          </button>
        )}
      </div>

      <FacultyShowcaseManager />

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : teachers.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[32px] border-2 border-dashed border-gray-200">
          <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="font-bold text-gray-400">No teachers found in the database.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((t) => {
            const studentCount = getStudentCount(t);
            const isLive = t.publicProfile?.isLive || false;
            const hasPendingProfile = !!t.pendingProfileUpdate;

            return (
              <div key={t.id} className="bg-white p-6 rounded-[32px] border border-gray-100 shadow-sm space-y-6 hover:shadow-md transition-shadow flex flex-col">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl shrink-0">
                    {t.name?.charAt(0) || '?'}
                  </div>
                  <div className="min-w-0">
                    <h4 className="font-headers font-bold text-secondary m-0 truncate flex items-center gap-2">
                      <span className="truncate">{t.name || 'Unnamed'}</span>
                      <TestSeatBadge user={t} />
                    </h4>
                    <p className="text-xs text-gray-400 font-bold uppercase tracking-widest truncate">{t.email}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-gray-50 p-3 rounded-2xl">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 m-0">Students</p>
                    <p className="font-bold text-secondary m-0 text-lg">{studentCount}</p>
                  </div>
                  <div className="bg-gray-50 p-3 rounded-2xl">
                    <p className="text-[8px] font-black uppercase tracking-widest text-gray-400 m-0">Schedule</p>
                    <p className={`font-bold m-0 text-sm ${t.availabilityLocked ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {t.availabilityLocked ? 'Locked' : 'Open'}
                    </p>
                  </div>
                </div>

                {/* Profile Management Section */}
                <div className="bg-gray-50 rounded-2xl p-4 space-y-3 flex-1">
                   <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 m-0 mb-2">Public Profile</p>
                   
                   {/* Pending Profile Action */}
                   {hasPendingProfile ? (
                     <div className="p-3 bg-amber-50 border border-amber-100 rounded-xl space-y-3">
                        <p className="text-xs text-amber-800 font-medium m-0">New profile changes waiting for approval.</p>
                        <div className="flex gap-2">
                           <button onClick={() => handleApproveProfile(t)} className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
                              <CheckCircle className="w-3 h-3" /> Approve
                           </button>
                           <button onClick={() => handleRejectProfile(t)} className="flex-1 bg-red-100 hover:bg-red-200 text-red-600 text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition-colors">
                              <XCircle className="w-3 h-3" /> Reject
                           </button>
                        </div>
                     </div>
                   ) : (
                     <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                        <div className="flex items-center gap-2">
                           {isLive ? <Globe className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                           <span className={`text-xs font-bold ${isLive ? 'text-emerald-600' : 'text-gray-500'}`}>
                             {isLive ? 'Live on Website' : 'Hidden from Public'}
                           </span>
                        </div>
                        <button 
                          onClick={() => handleToggleLive(t)}
                          className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-colors ${isLive ? 'bg-red-50 text-red-600 hover:bg-red-100' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                        >
                          {isLive ? 'Hide' : 'Publish'}
                        </button>
                     </div>
                   )}
                </div>

                <div className="flex gap-2">
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setEditingTeacher(t)}
                      className="flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-100 inline-flex items-center justify-center gap-1"
                    >
                      <Pencil className="w-3 h-3" /> Edit Profile
                    </button>
                  )}
                  <button
                    onClick={() => toggleLock(t)}
                    className={`flex-1 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${
                      t.availabilityLocked
                        ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100'
                        : 'bg-amber-50 text-amber-600 border border-amber-100 hover:bg-amber-100'
                    }`}
                  >
                    {t.availabilityLocked ? 'Unlock Schedule' : 'Lock Schedule'}
                  </button>
                  {isSuperAdmin && (
                    <button
                      type="button"
                      onClick={() => setPendingDelete(t)}
                      className="py-3 px-3 rounded-2xl text-[10px] font-black uppercase tracking-widest bg-red-50 text-red-600 border border-red-100 hover:bg-red-100 inline-flex items-center justify-center"
                      title="Delete teacher"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Teacher Modal */}
      {editingTeacher && (
        <EditTeacherProfileModal
          teacher={editingTeacher}
          onClose={() => setEditingTeacher(null)}
          onSaved={() => {
            setEditingTeacher(null);
            fetchData();
          }}
        />
      )}

      {pendingDelete && (
        <ConfirmDeleteModal
          name={pendingDelete.name || pendingDelete.email}
          role="teacher"
          loading={isDeleting}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void handleDeleteTeacher()}
        />
      )}

      {isSuperAdmin && showAddModal && (
        <div className="fixed inset-0 bg-secondary/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[32px] w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-8">
              <h3 className="text-2xl font-bold font-headers text-secondary mb-2">Add New Teacher</h3>
              <p className="text-gray-500 text-sm mb-6">Create a teacher account. They can use these credentials to log in to the Teacher Portal and build their profile.</p>
              
              <form onSubmit={handleAddTeacher} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Full Name</label>
                  <input 
                    type="text" 
                    required 
                    value={newTeacher.name}
                    onChange={e => setNewTeacher({...newTeacher, name: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Email Address</label>
                  <input 
                    type="email" 
                    required 
                    value={newTeacher.email}
                    onChange={e => setNewTeacher({...newTeacher, email: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-500 mb-1">Temporary Password</label>
                  <input 
                    type="password" 
                    required 
                    value={newTeacher.password}
                    onChange={e => setNewTeacher({...newTeacher, password: e.target.value})}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button 
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-gray-500 hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit"
                    disabled={isAdding}
                    className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-primary hover:bg-primary-hover transition-colors flex justify-center items-center"
                  >
                    {isAdding ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create Account'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

