'use client';

import { displayValue, getAttendanceArray, asStringArray, getUserRole, hasPendingProfileUpdate } from '@/lib/userDataHelpers';
import type { UserData } from '@/types/user';
import type { AdminPermissionKey } from '@/lib/permissions';
import { hasPermission, DEFAULT_ADMIN_PERMISSIONS } from '@/lib/permissions';

import type { AdminRecord } from '@/types/records';
import type { JsonValue } from '@/types/json';
import { getErrorMessage } from '@/lib/errors';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { fetchAllUsersParsed } from '@/lib/fetchAllUsers';
import { authFetch } from '@/lib/authFetch';
import {
  billingStatus,
  grantPaidCycle,
  isSubscriptionActive,
  isSandboxAccount,
  paidThisCycle,
  recordedTuitionAmount,
  revokePaidAccess,
} from '@/lib/billing';
import {
  ATTENDANCE_PRESENT_MINUTES,
  approveTeacherProfile,
  rejectTeacherProfile,
  toggleTeacherLiveStatus,
  getResources,
  addResource,
  deleteResource,
  assignResourceToStudent,
  unassignResourceFromStudent,
  updateAssessmentStatus,
  getPendingAssessments,
  getAllFeedback,
  setResourceStatus,
  assignResourceToTeacherStudents,
} from '@/lib/db';
import { uploadMedia } from '@/lib/uploadMedia';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Banknote, Briefcase, FileSignature, CheckCircle, LayoutDashboard, CreditCard, Library, BookOpen, Upload, Trash2, X, UserPlus, UserMinus, Star, MessageSquare, Calendar, ChevronLeft, ChevronRight, Pencil } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatWallClock } from '@/lib/timeFormat';
import { TestSeatBadge } from '@/components/admin/TestSeatBadge';
import MatchmakingTab from './MatchmakingTab';
import ScheduleRequestsTab from './ScheduleRequestsTab';
import { RoleBadge } from '@/components/admin/RoleBadge';
import { CreateStaffModal } from '@/components/admin/CreateStaffModal';
import { ConfirmDeleteModal } from '@/components/admin/ConfirmDeleteModal';
import { PermissionsTogglePanel } from '@/components/admin/PermissionsTogglePanel';
import { AdminActivityFeed } from '@/components/admin/AdminActivityFeed';
import { EditTeacherProfileModal } from '@/components/admin/EditTeacherProfileModal';
import { RevenueBillingOffice } from '@/components/admin/RevenueBillingOffice';

export default function AdminOverview() {
  const { userData } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    pendingPayments: 0,
    activeClasses: 0,
    estimatedMonthlyRevenue: 0,
    realizedMonthlyRevenue: 0
  });

  const [assessments, setAssessments] = useState<AdminRecord[]>([]);
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [unreadMessages, setUnreadMessages] = useState(0);

  // Assessment review modal
  const [reviewingAssessment, setReviewingAssessment] = useState<AdminRecord | null>(null);
  const [isUpdatingAssessment, setIsUpdatingAssessment] = useState(false);

  // Library state
  const [resources, setResources] = useState<AdminRecord[]>([]);
  const [resourceForm, setResourceForm] = useState({ title: '', type: 'PDF', category: 'Other', description: '', url: '' });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [isUploadingResource, setIsUploadingResource] = useState(false);
  const [assigningResource, setAssigningResource] = useState<AdminRecord | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const tabScrollerRef = useRef<HTMLDivElement>(null);
  const [tabOverflow, setTabOverflow] = useState({ left: false, right: false });

  const [feedbackList, setFeedbackList] = useState<AdminRecord[]>([]);
  const [pendingScheduleRequests, setPendingScheduleRequests] = useState(0);
  
  // Forms & Newsletter state
  const [contactMessages, setContactMessages] = useState<AdminRecord[]>([]);
  const [newsletterSubscribers, setNewsletterSubscribers] = useState<AdminRecord[]>([]);

  // Edit User State
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: '',
    status: '',
    paymentVerified: false,
    tuitionPlan: '',
    planDays: 2
  });
  const [isUpdatingUser, setIsUpdatingUser] = useState(false);

  // Advanced Super Admin state
  const [isCreateStaffModalOpen, setIsCreateStaffModalOpen] = useState(false);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [editingTeacher, setEditingTeacher] = useState<UserData | null>(null);
  const [pendingDelete, setPendingDelete] = useState<UserData | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const allUsers = await fetchAllUsersParsed();
      setUsers(allUsers);

      const students = allUsers.filter(d => {
        const role = getUserRole(d.role);
        return role === 'student' || role === 'parent';
      });
      const liveStudents = students.filter(d => !isSandboxAccount(d));
      const teachers = allUsers.filter(d => getUserRole(d.role) === 'teacher' && !isSandboxAccount(d));
      const unpaid = liveStudents.filter(d => !isSubscriptionActive(d));
      
      let activeSessionCount = 0;
      let estimatedRevenue = 0;
      let realizedRevenue = 0;

      liveStudents.forEach(s => {
        if (s.schedule && Array.isArray(s.schedule)) activeSessionCount += s.schedule.length;
        const planAmount = recordedTuitionAmount(s);
        if (isSubscriptionActive(s) && !s.scholarship) estimatedRevenue += planAmount;
        if (paidThisCycle(s)) realizedRevenue += planAmount;
      });

      setStats({ totalStudents: liveStudents.length, totalTeachers: teachers.length, pendingPayments: unpaid.length, activeClasses: activeSessionCount, estimatedMonthlyRevenue: estimatedRevenue, realizedMonthlyRevenue: realizedRevenue });

      const pendingAssessments = await getPendingAssessments();
      setAssessments(pendingAssessments);

      const allResources = await getResources({ includeUnapproved: true });
      setResources(allResources);

      const feedback = await getAllFeedback();
      setFeedbackList(feedback);

      if (userData?.id) {
        try {
          const res = await authFetch('/api/messages/read');
          const data = await res.json();
          if (res.ok && typeof data.count === 'number') setUnreadMessages(data.count);
        } catch {
          setUnreadMessages(0);
        }
      }

      // Fetch public site contact messages and newsletter subscribers
      const { data: contactData } = await supabase.from('contact_messages').select('*').order('created_at', { ascending: false });
      if (contactData) setContactMessages(contactData);

      const { data: newsletterData } = await supabase.from('newsletter_subscribers').select('*').order('created_at', { ascending: false });
      if (newsletterData) setNewsletterSubscribers(newsletterData);

      if (getUserRole(userData?.role) === 'super_admin') {
        const { getPendingScheduleRequestCount } = await import('@/lib/scheduleRequests');
        const count = await getPendingScheduleRequestCount();
        setPendingScheduleRequests(count);
      }

    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  }, [userData]);

  useEffect(() => {
    if (!userData) return;
    const role = getUserRole(userData.role);
    if (role !== 'admin' && role !== 'super_admin') {
      if (role === 'teacher') {
        router.push('/portal/teacher');
      } else {
        router.push('/portal');
      }
    }
  }, [userData, router]);

  useEffect(() => {
    if (!userData) return;
    if (getUserRole(userData.role) !== 'admin' && getUserRole(userData.role) !== 'super_admin') return;
    let cancelled = false;
    (async () => {
      await fetchData();
      if (cancelled) return;
    })();
    return () => {
      cancelled = true;
    };
  }, [userData, fetchData]);

  const handleAssessmentAction = async (id: string, status: 'approved' | 'rejected') => {
    setIsUpdatingAssessment(true);
    await updateAssessmentStatus(id, status);
    setReviewingAssessment(null);
    setIsUpdatingAssessment(false);
    const updated = await getPendingAssessments();
    setAssessments(updated);
  };

  const handleResourceUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceForm.title) return;
    setIsUploadingResource(true);
    try {
      let finalUrl = resourceForm.url;
      if (uploadFile) {
        finalUrl = await uploadMedia(uploadFile, 'admin-materials');
      }
      if (!finalUrl) { alert('Please provide a URL or upload a file.'); setIsUploadingResource(false); return; }
      const result = await addResource({
        ...resourceForm,
        url: finalUrl,
        uploaded_by: userData?.name || 'Admin',
        source: 'admin',
        status: 'approved',
      });
      if (result) {
        setResourceForm({ title: '', type: 'PDF', category: 'Other', description: '', url: '' });
        setUploadFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        const allResources = await getResources({ includeUnapproved: true });
        setResources(allResources);
      }
    } catch (err: unknown) {
      alert('Error: ' + getErrorMessage(err));
    }
    setIsUploadingResource(false);
  };

  const handleDeleteResource = async (id: string) => {
    if (!confirm('Delete this resource?')) return;
    await deleteResource(id);
    setResources(prev => prev.filter(r => r.id !== id));
  };

  const handleReviewTeacherMaterial = async (resource: AdminRecord, status: 'approved' | 'rejected') => {
    const id = String(resource.id || '');
    if (!id) return;
    const result = await setResourceStatus(id, status);
    if (!result.success) {
      alert(result.error || 'Could not update material status. Run teacher_materials.sql in Supabase.');
      return;
    }
    if (status === 'approved' && typeof resource.submitted_by === 'string' && resource.submitted_by) {
      const assigned = await assignResourceToTeacherStudents(id, resource.submitted_by);
      alert(assigned > 0
        ? `Approved and assigned to ${assigned} of this teacher’s students.`
        : 'Approved. Assign it to students below if they are not already rostered to this teacher.');
    }
    setResources(prev => prev.map(r => r.id === id ? { ...r, status } : r));
  };

  const handleAssignResource = async (studentId: string, resourceId: string, assign: boolean) => {
    if (assign) await assignResourceToStudent(studentId, resourceId);
    else await unassignResourceFromStudent(studentId, resourceId);
    const allUsers = await fetchAllUsersParsed();
    setUsers(allUsers);
  };

  const isSuperAdmin = getUserRole(userData?.role) === 'super_admin';

  const canDeleteAccount = (target: UserData) => {
    const role = getUserRole(target.role);
    return role === 'admin' || role === 'teacher' || role === 'student' || role === 'parent';
  };

  const confirmDeleteAccount = async () => {
    const target = pendingDelete;
    if (!target?.id || !canDeleteAccount(target)) return;
    setIsUpdatingUser(true);
    try {
      const res = await authFetch('/api/admin/delete-staff', {
        method: 'POST',
        body: JSON.stringify({ userId: target.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to delete account.');
      setEditingUser(null);
      setPendingDelete(null);
      await fetchData();
    } catch (err: unknown) {
      alert(getErrorMessage(err));
    } finally {
      setIsUpdatingUser(false);
    }
  };

  let tabs = [
    { id: 'overview', label: 'Overview', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'directory', label: 'User Directory', icon: <Users className="w-4 h-4" />, permission: 'can_manage_students' },
    { id: 'finance', label: 'Finance & Billing', icon: <Banknote className="w-4 h-4" />, superAdminOnly: true },
    { id: 'profiles', label: 'Faculty Profiles', icon: <Briefcase className="w-4 h-4" />, permission: 'can_manage_students' },
    { id: 'assignments', label: 'Pairing & Roster', icon: <CheckCircle className="w-4 h-4" />, permission: 'can_manage_students' },
    { id: 'library', label: 'Library', icon: <Library className="w-4 h-4" />, permission: 'can_manage_cms_gallery' },
    { id: 'attendance', label: 'Attendance Logs', icon: <CheckCircle className="w-4 h-4" />, permission: 'can_manage_students' },
    { id: 'feedback', label: 'Feedback', icon: <Star className="w-4 h-4" />, permission: 'can_manage_students' },
    { id: 'messages', label: 'Contact Messages', icon: <MessageSquare className="w-4 h-4" />, superAdminOnly: true },
    { id: 'subscribers', label: 'Newsletters', icon: <Users className="w-4 h-4" />, superAdminOnly: true },
  ];

  if (isSuperAdmin) {
    tabs.push({ id: 'schedule_requests', label: 'Schedule Requests', icon: <Calendar className="w-4 h-4" />, superAdminOnly: true });
    tabs.push({ id: 'activity', label: 'Admin Activity', icon: <LayoutDashboard className="w-4 h-4" /> });
  }

  // Filter tabs dynamically based on user role and permissions
  tabs = tabs.filter(t => {
    if (t.superAdminOnly && !isSuperAdmin) return false;
    if (t.permission && !hasPermission(userData, t.permission as AdminPermissionKey)) return false;
    return true;
  });

  const updateTabOverflow = useCallback(() => {
    const el = tabScrollerRef.current;
    if (!el) return;
    setTabOverflow({
      left: el.scrollLeft > 4,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
    });
  }, []);

  useEffect(() => {
    const el = tabScrollerRef.current;
    if (!el) return;
    updateTabOverflow();
    el.addEventListener('scroll', updateTabOverflow, { passive: true });
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateTabOverflow) : null;
    ro?.observe(el);
    window.addEventListener('resize', updateTabOverflow);
    return () => {
      el.removeEventListener('scroll', updateTabOverflow);
      ro?.disconnect();
      window.removeEventListener('resize', updateTabOverflow);
    };
  }, [updateTabOverflow, tabs.length, loading]);

  useEffect(() => {
    const el = tabScrollerRef.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>(`[data-tab-id="${activeTab}"]`);
    active?.scrollIntoView({ inline: 'nearest', block: 'nearest', behavior: 'smooth' });
  }, [activeTab]);

  const scrollTabs = (dir: -1 | 1) => {
    tabScrollerRef.current?.scrollBy({ left: dir * 240, behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh]">
         <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
         <p className="mt-4 text-gray-500 font-medium font-headers animate-pulse">Loading Admin Systems...</p>
      </div>
    );
  }

  const teachers = users.filter(u => getUserRole(u.role) === 'teacher');
  const pendingFaculty = teachers.filter(t => hasPendingProfileUpdate(t.pendingProfileUpdate));
  const approvedFaculty = teachers.filter(t => !hasPendingProfileUpdate(t.pendingProfileUpdate));

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 300, damping: 24 } }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-10">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h2 className="text-2xl sm:text-4xl font-bold font-headers text-secondary m-0 leading-tight">Master Control Panel</h2>
        </div>
        
        {/* Tab strip — arrows so mouse/keyboard users can reach overflow tabs */}
        <div className="flex items-center gap-2 w-full md:w-auto md:max-w-[min(100%,760px)] min-w-0">
          <button
            type="button"
            aria-label="Show previous tabs"
            onClick={() => scrollTabs(-1)}
            disabled={!tabOverflow.left}
            className="shrink-0 w-9 h-9 rounded-full border border-gray-200 bg-white text-secondary shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div
            ref={tabScrollerRef}
            className="flex-1 min-w-0 flex bg-white border border-gray-200 rounded-full p-1.5 shadow-sm overflow-x-auto no-scrollbar"
          >
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                data-tab-id={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-5 py-2.5 text-sm font-bold rounded-full whitespace-nowrap transition-all flex items-center gap-2",
                  activeTab === tab.id 
                    ? "bg-secondary text-white shadow-md" 
                    : "text-gray-500 hover:text-secondary hover:bg-gray-100"
                )}
              >
                {tab.icon}
                {tab.label}
                {tab.id === 'library' && resources.some(r => r.status === 'pending') && (
                  <span className={cn(
                    'text-[10px] font-black px-1.5 py-0.5 rounded-full',
                    activeTab === tab.id ? 'bg-white text-[#004D4A]' : 'bg-[#004D4A] text-white'
                  )}>
                    {resources.filter(r => r.status === 'pending').length}
                  </span>
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            aria-label="Show more tabs"
            onClick={() => scrollTabs(1)}
            disabled={!tabOverflow.right}
            className="shrink-0 w-9 h-9 rounded-full border border-gray-200 bg-white text-secondary shadow-sm flex items-center justify-center hover:bg-gray-50 disabled:opacity-30 disabled:pointer-events-none"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'overview' && (
          <motion.div 
            key="overview"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Unread Message Alert */}
            {unreadMessages > 0 && (
              <div 
                className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-amber-100 transition-colors" 
                onClick={() => router.push('/portal/admin/communications')}
              >
                 <div className="flex items-center gap-3">
                   <div className="relative flex h-3 w-3">
                     <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                     <span className="relative inline-flex rounded-full h-3 w-3 bg-[#004D4A]"></span>
                   </div>
                   <p className="text-amber-800 font-bold m-0 text-sm">
                     You have {unreadMessages} unread message{unreadMessages > 1 ? 's' : ''}. Check the Comms center.
                   </p>
                 </div>
                 <MessageSquare className="w-5 h-5 text-amber-600" />
              </div>
            )}

            {resources.some(r => r.status === 'pending') && (
              <div
                className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-amber-100 transition-colors"
                onClick={() => setActiveTab('library')}
              >
                <div className="flex items-center gap-3">
                  <Library className="w-5 h-5 text-amber-600" />
                  <p className="text-amber-800 font-bold m-0 text-sm">
                    {resources.filter(r => r.status === 'pending').length} teacher material{resources.filter(r => r.status === 'pending').length > 1 ? 's' : ''} waiting for approval.
                  </p>
                </div>
                <span className="bg-[#004D4A] text-white text-xs font-black px-3 py-1 rounded-full">Review</span>
              </div>
            )}

            {isSuperAdmin && pendingScheduleRequests > 0 && (
              <div
                className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center justify-between shadow-sm cursor-pointer hover:bg-red-100 transition-colors"
                onClick={() => setActiveTab('schedule_requests')}
              >
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-red-600" />
                  <p className="text-red-800 font-bold m-0 text-sm">
                    {pendingScheduleRequests} schedule request{pendingScheduleRequests > 1 ? 's' : ''} awaiting your review.
                  </p>
                </div>
                <span className="bg-red-500 text-white text-xs font-black px-3 py-1 rounded-full">Review</span>
              </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
              {hasPermission(userData, 'can_manage_students') && (
                <>
                  <StatCard title="Total Students" value={stats.totalStudents} icon={<Users className="w-6 h-6" />} color="bg-blue-50 text-blue-600" onClick={() => setActiveTab('directory')} />
                  <StatCard title="Faculty Members" value={stats.totalTeachers} icon={<Briefcase className="w-6 h-6" />} color="bg-indigo-50 text-indigo-600" onClick={() => setActiveTab('directory')} />
                </>
              )}
              {isSuperAdmin && (
                <>
                  <StatCard title="Pending Payments" value={stats.pendingPayments} icon={<Banknote className="w-6 h-6" />} color="bg-amber-50 text-amber-600" alert={stats.pendingPayments > 0} onClick={() => setActiveTab('finance')} />
                  <StatCard title="Est. Monthly Rev" value={`$${stats.estimatedMonthlyRevenue}`} icon={<CreditCard className="w-6 h-6" />} color="bg-emerald-50 text-emerald-600" onClick={() => setActiveTab('finance')} />
                  <StatCard title="Realized Revenue" value={`$${stats.realizedMonthlyRevenue}`} icon={<Banknote className="w-6 h-6" />} color="bg-emerald-50 text-emerald-700" onClick={() => setActiveTab('finance')} />
                </>
              )}
            </div>

            {/* Bento Grid Action Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
               
               {/* Pending Assessments */}
               {hasPermission(userData, 'can_manage_students') && (
                 <motion.section variants={itemVariants} className="lg:col-span-3 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-center mb-6">
                       <h3 className="text-2xl font-bold font-headers text-secondary m-0">Pending Assessments</h3>
                       <span className="text-xs font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-4 py-2 rounded-full border border-amber-200">
                          {assessments.length} Pending
                       </span>
                    </div>
                    
                    <div className="space-y-4">
                    {assessments.length === 0 ? (
                      <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                         <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                         <p className="text-gray-500 font-bold m-0">All assessments have been reviewed!</p>
                      </div>
                    ) : (
                      assessments.map(a => (
                        <div key={a.id} className="flex justify-between items-center p-5 bg-gray-50 border border-gray-100 rounded-2xl hover:border-amber-200 hover:bg-amber-50 transition-colors group">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-secondary font-bold shadow-sm">
                              {(a.name || '?').charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-secondary m-0 text-lg">{a.name}</p>
                              <p className="text-sm font-medium text-gray-500 m-0">{displayValue(a.goal)} {displayValue(a.age) ? `(${a.age} yrs)` : ''}</p>
                              <p className="text-xs text-gray-400 m-0">{a.email} {a.phone ? `• ${a.phone}` : ''}</p>
                            </div>
                          </div>
                          <button
                            onClick={() => setReviewingAssessment(a)}
                            className="bg-white border border-gray-200 text-secondary hover:border-primary hover:text-primary hover:shadow-md text-sm font-bold px-6 py-2.5 rounded-full transition-all shrink-0"
                          >
                            Review
                          </button>
                        </div>
                      ))
                    )}
                  </div>
               </motion.section>
             )}
              {!hasPermission(userData, 'can_manage_students') && (
                <motion.div variants={itemVariants} className="lg:col-span-3 bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm text-center">
                   <p className="text-gray-500 font-medium font-headers">Welcome to the Admin Portal overview. Please select features from the sidebar menu to get started.</p>
                </motion.div>
              )}
             </div>
           </motion.div>
        )}

        {/* Directory Tab */}
        {activeTab === 'directory' && (
          <motion.div key="directory" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-2xl font-bold font-headers text-secondary">User Directory</h3>
               <div className="flex gap-4">
                 {isSuperAdmin && (
                   <>
                     <button onClick={() => setIsCreateStaffModalOpen(true)} className="bg-primary text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-primary/90 transition-colors">
                       Create Staff User
                     </button>
                     <button
                       type="button"
                       onClick={() => {
                         const rows = users.filter(u => getUserRole(u.role) !== 'super_admin' && !isSandboxAccount(u));
                         const header = 'Name,Email,Role,Status,Plan';
                         const body = rows.map((u) => {
                           const role = getUserRole(u.role) || '';
                           const status = billingStatus(u).label;
                           const plan = u.tuitionPlan || '';
                           return [u.name, u.email, role, status, plan]
                             .map((value) => `"${String(value || '').replace(/"/g, '""')}"`)
                             .join(',');
                         });
                         const blob = new Blob([[header, ...body].join('\n')], { type: 'text/csv;charset=utf-8' });
                         const url = URL.createObjectURL(blob);
                         const link = document.createElement('a');
                         link.href = url;
                         link.download = `ilmvers-directory-${new Date().toISOString().slice(0, 10)}.csv`;
                         link.click();
                         URL.revokeObjectURL(url);
                       }}
                       className="bg-secondary text-white px-6 py-2.5 rounded-full font-bold text-sm hover:bg-secondary/90 transition-colors"
                     >
                       Export CSV
                     </button>
                   </>
                 )}
               </div>
            </div>
            <div className="overflow-x-auto rounded-2xl border border-gray-100">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 border-b border-gray-100 text-secondary uppercase tracking-wider text-xs font-black">
                  <tr>
                    <th className="p-5">Name</th>
                    <th className="p-5">Email</th>
                    <th className="p-5">Role</th>
                    <th className="p-5">Status</th>
                    <th className="p-5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {users.filter(u => getUserRole(u.role) !== 'super_admin').map(u => {
                    const rowRole = getUserRole(u.role);
                    const isStaffRow = rowRole === 'teacher' || rowRole === 'admin';
                    return (
                    <React.Fragment key={u.id}>
                    <tr className="hover:bg-gray-50/50 transition-colors group">
                      <td className="p-5 font-bold text-secondary">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span>{u.name}</span>
                          <TestSeatBadge user={u} />
                        </div>
                      </td>
                      <td className="p-5">{u.email}</td>
                      <td className="p-5">
                         <RoleBadge role={(rowRole || u.role) as 'super_admin' | 'admin' | 'teacher' | 'student' | 'parent'} />
                      </td>
                      <td className="p-5">
                        {isStaffRow ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-600 border border-indigo-100">
                            Staff
                          </span>
                        ) : (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            billingStatus(u).tone === 'paid' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                            : billingStatus(u).tone === 'scholarship' ? 'bg-indigo-50 text-indigo-600 border border-indigo-100'
                            : billingStatus(u).tone === 'expired' ? 'bg-red-50 text-red-600 border border-red-100'
                            : 'bg-amber-50 text-amber-600 border border-amber-100'
                          }`}>
                            {billingStatus(u).label}
                          </span>
                        )}
                      </td>
                      <td className="p-5 text-right">
                        <button 
                          onClick={() => {
                            setEditingUser(u);
                            setEditForm({
                              name: u.name || '',
                              email: u.email || '',
                              role: u.role || 'student',
                              status: u.status || 'pending',
                              paymentVerified: u.paymentVerified || false,
                              tuitionPlan: u.tuitionPlan || '',
                              planDays: u.planDays || 2
                            });
                          }}
                          className="text-sm font-bold text-blue-600 hover:text-blue-800 transition-colors mr-4"
                        >
                          Edit User
                        </button>
                        {isSuperAdmin && canDeleteAccount(u) && (
                          <button
                            type="button"
                            onClick={() => setPendingDelete(u)}
                            className="text-sm font-bold text-red-600 hover:text-red-800 transition-colors mr-4"
                          >
                            Delete
                          </button>
                        )}
                        {isSuperAdmin && rowRole === 'admin' && (
                          <button
                            onClick={() => setExpandedUserId(expandedUserId === u.id ? null : u.id)}
                            className="text-sm font-bold text-gray-500 hover:text-gray-800 transition-colors"
                          >
                            {expandedUserId === u.id ? 'Close Access' : 'Manage Access'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expandedUserId === u.id && rowRole === 'admin' && (
                      <tr className="bg-gray-50 border-t border-gray-100">
                        <td colSpan={5} className="p-0">
                          <PermissionsTogglePanel
                            targetUserId={u.id}
                            targetName={u.name ?? ''}
                            currentPermissions={(u.permissions ?? DEFAULT_ADMIN_PERMISSIONS) as Record<AdminPermissionKey, boolean>}
                            callerId={userData?.id || ''}
                            onUpdated={() => fetchData()}
                          />
                        </td>
                      </tr>
                    )}
                    </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {/* Finance & Billing Tab */}
        {activeTab === 'finance' && (
          <motion.div key="finance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <RevenueBillingOffice compact />
          </motion.div>
        )}

        {/* Faculty Profiles Tab */}
        {activeTab === 'profiles' && (
          <motion.div key="profiles" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
               <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-2xl font-bold font-headers text-secondary">Faculty Profile Approvals</h3>
                   <p className="text-gray-500 m-0">
                     Review pending updates{isSuperAdmin ? ', edit any teacher profile, and' : ' and'} manage public visibility.
                   </p>
                 </div>
               </div>

               <div className="space-y-8">
                 {teachers.length === 0 ? (
                   <div className="text-center py-16 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                      <Briefcase className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <h4 className="text-xl font-bold font-headers text-gray-400 mb-2">No faculty found</h4>
                      <p className="text-gray-400">Teacher accounts will appear here once they exist in the directory.</p>
                   </div>
                 ) : (
                   <>
                     <div>
                       <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">
                         Pending approvals ({pendingFaculty.length})
                       </h4>
                       {pendingFaculty.length === 0 ? (
                         <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
                            <p className="text-gray-400 font-medium m-0">No new profile updates waiting.</p>
                         </div>
                       ) : pendingFaculty.map(t => (
                         <FacultyProfileCard
                           key={t.id}
                           teacher={t}
                           profile={t.pendingProfileUpdate}
                           pending
                           onEdit={isSuperAdmin ? () => setEditingTeacher(t) : undefined}
                           onReject={async () => { if (await rejectTeacherProfile(t.id)) fetchData(); }}
                           onApprove={async () => { if (await approveTeacherProfile(t.id)) fetchData(); }}
                         />
                       ))}
                     </div>
                     <div>
                       <h4 className="text-sm font-black uppercase tracking-widest text-gray-400 mb-4">
                         Approved profiles ({approvedFaculty.length})
                       </h4>
                       {approvedFaculty.length === 0 ? (
                         <p className="text-gray-400 text-sm">No approved faculty profiles yet.</p>
                       ) : approvedFaculty.map(t => (
                         <FacultyProfileCard
                           key={t.id}
                           teacher={t}
                           profile={t.publicProfile}
                           pending={false}
                           onEdit={isSuperAdmin ? () => setEditingTeacher(t) : undefined}
                           onToggleLive={async () => {
                             const live = !!t.publicProfile?.isLive;
                             if (await toggleTeacherLiveStatus(t.id, !live)) fetchData();
                           }}
                         />
                       ))}
                     </div>
                   </>
                 )}
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'schedule_requests' && isSuperAdmin && (
          <ScheduleRequestsTab key="schedule_requests" />
        )}

        {/* Assignments / Matchmaking Tab */}
        {activeTab === 'assignments' && (
          <MatchmakingTab key="assignments" />
        )}

        {/* Library Tab */}
        {activeTab === 'library' && (
          <motion.div key="library" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
            {/* Upload Form */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-bold font-headers text-secondary mb-6 flex items-center gap-3">
                <Upload className="w-6 h-6 text-[#D4AF37]" /> Add New Resource
              </h3>
              <form onSubmit={handleResourceUpload} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Title *</label>
                  <input required type="text" value={resourceForm.title} onChange={e => setResourceForm({...resourceForm, title: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-amber-50 focus:border-amber-400 outline-none" placeholder="e.g. Tajweed Rules PDF" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Type</label>
                    <select value={resourceForm.type} onChange={e => setResourceForm({...resourceForm, type: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none">
                      {['PDF','Audio','Video','Link'].map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Category</label>
                    <select value={resourceForm.category} onChange={e => setResourceForm({...resourceForm, category: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none">
                      {['Quran','Tajweed','Arabic','Islamic Studies','Other'].map(c => <option key={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Description</label>
                  <input type="text" value={resourceForm.description} onChange={e => setResourceForm({...resourceForm, description: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none" placeholder="Brief description..." />
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-2">URL (or upload file below)</label>
                  <input type="url" value={resourceForm.url} onChange={e => setResourceForm({...resourceForm, url: e.target.value})} className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none" placeholder="https://..." />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Upload File to R2</label>
                  <input ref={fileInputRef} type="file" onChange={e => setUploadFile(e.target.files?.[0] || null)} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm" />
                  {uploadFile && <p className="text-xs text-emerald-600 font-bold mt-1">✓ {uploadFile.name} selected — will override URL field</p>}
                </div>
                <div className="md:col-span-2">
                  <button type="submit" disabled={isUploadingResource} className="px-8 py-3 bg-[#004D4A] hover:bg-[#0F3D38] text-white font-bold rounded-full transition-all disabled:opacity-50 flex items-center gap-2">
                    <Upload className="w-4 h-4" />{isUploadingResource ? 'Uploading...' : 'Add Resource'}
                  </button>
                </div>
              </form>
            </div>

            <div className="bg-amber-50 p-8 rounded-[32px] border border-amber-100 shadow-sm">
                <h3 className="text-2xl font-bold font-headers text-secondary mb-2">Pending teacher materials</h3>
                <p className="text-sm text-amber-800 m-0 mb-6">Teachers submit files here. Approve to send them to that teacher’s students. You can still assign more students afterwards.</p>
                <div className="space-y-3">
                  {resources.filter(r => r.status === 'pending').length === 0 ? (
                    <p className="text-sm text-amber-800/70 m-0 bg-white/60 border border-amber-100 rounded-2xl p-5">No teacher submissions waiting. New uploads from Faculty Materials will appear here.</p>
                  ) : resources.filter(r => r.status === 'pending').map(r => (
                    <div key={r.id} className="bg-white border border-amber-100 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-secondary">{displayValue(r.title)}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-[#004D4A]">{displayValue(r.type)}</span>
                        </div>
                        <p className="text-sm text-gray-500 m-0 mt-1">
                          Submitted by {displayValue(r.submitted_by_name || r.uploaded_by || 'Teacher')}
                          {r.description ? ` · ${displayValue(r.description)}` : ''}
                        </p>
                        {typeof r.url === 'string' && r.url && (
                          <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-xs font-bold text-emerald-700 mt-1 inline-block">Preview file</a>
                        )}
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <button type="button" onClick={() => handleReviewTeacherMaterial(r, 'approved')} className="px-4 py-2 rounded-full bg-emerald-600 text-white text-xs font-bold">Approve</button>
                        <button type="button" onClick={() => handleReviewTeacherMaterial(r, 'rejected')} className="px-4 py-2 rounded-full bg-white border border-red-200 text-red-600 text-xs font-bold">Reject</button>
                      </div>
                    </div>
                  ))}
                </div>
            </div>

            {/* Resource List with Student Assignment */}
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-bold font-headers text-secondary mb-6 flex items-center gap-3">
                <BookOpen className="w-6 h-6 text-[#D4AF37]" /> All Resources ({resources.filter(r => r.status !== 'pending' && r.status !== 'rejected').length})
              </h3>
              <div className="space-y-3">
                {resources.filter(r => r.status !== 'pending' && r.status !== 'rejected').length === 0 ? (
                  <div className="text-center py-10 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <p className="text-gray-400 font-bold">No resources added yet.</p>
                  </div>
                ) : resources.filter(r => r.status !== 'pending' && r.status !== 'rejected').map(r => (
                  <div key={r.id} className="border border-gray-100 rounded-2xl p-5 bg-gray-50 hover:bg-white transition-all group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-secondary">{displayValue(r.title)}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-600 border border-amber-100">{displayValue(r.type)}</span>
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-gray-100 text-gray-500">{displayValue(r.category)}</span>
                          {r.source === 'teacher' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700">Teacher</span>
                          )}
                        </div>
                        {r.description && <p className="text-sm text-gray-500 m-0 mt-1">{displayValue(r.description)}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={() => setAssigningResource(assigningResource?.id === r.id ? null : r)} className="text-xs font-bold px-4 py-2 rounded-full border border-blue-200 text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-1">
                          <UserPlus className="w-3 h-3" /> Assign
                        </button>
                        <button onClick={() => handleDeleteResource(r.id ?? '')} className="text-xs font-bold px-3 py-2 rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Student Assignment Panel */}
                    {assigningResource?.id === r.id && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Assign to Students:</p>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                          {users.filter(u => {
                            const role = getUserRole(u.role);
                            return role === 'student' || role === 'parent';
                          }).map(s => {
                            const isAssigned = (s.assignedResources ?? []).includes(r.id ?? '');
                            return (
                              <button
                                key={s.id}
                                onClick={() => handleAssignResource(s.id ?? '', r.id ?? '', !isAssigned)}
                                className={cn(
                                  'text-xs font-bold px-3 py-2 rounded-xl border transition-all flex items-center gap-1.5',
                                  isAssigned ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-white border-gray-200 text-gray-500 hover:border-blue-300'
                                )}
                              >
                                {isAssigned ? <UserMinus className="w-3 h-3" /> : <UserPlus className="w-3 h-3" />}
                                <span className="truncate">{s.name}</span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Attendance Logs Tab */}
        {activeTab === 'attendance' && (
          <motion.div key="attendance" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <div className="flex justify-between items-center mb-6">
                 <div>
                   <h3 className="text-2xl font-bold font-headers text-secondary">Automated Attendance Logs</h3>
                   <p className="text-gray-500 m-0">Review auto-tracked class durations. Red indicates absence or incomplete duration (&lt; {ATTENDANCE_PRESENT_MINUTES}m).</p>
                 </div>
              </div>
              
              <div className="overflow-x-auto rounded-2xl border border-gray-100">
                <table className="w-full text-left text-sm text-gray-600">
                  <thead className="bg-gray-50 border-b border-gray-100 text-secondary uppercase tracking-wider text-xs font-black">
                    <tr>
                      <th className="p-5">Student / User</th>
                      <th className="p-5">Date</th>
                      <th className="p-5">Subject</th>
                      <th className="p-5">Duration Tracked</th>
                      <th className="p-5 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {users.flatMap(u => 
                      getAttendanceArray(u.attendanceLog).map((log, idx: number) => ({
                         userId: u.id,
                         userName: u.name,
                         role: u.role,
                         ...log,
                         uniqueId: `${u.id}-${idx}`
                      }))
                    ).sort((a, b) => new Date(b.date ?? '').getTime() - new Date(a.date ?? '').getTime())
                     .map(log => {
                       const isPresent = (log.durationMinutes ?? 0) >= ATTENDANCE_PRESENT_MINUTES || String(log.status || '').toLowerCase() === 'present';
                       return (
                         <tr key={log.uniqueId} className="hover:bg-gray-50/50 transition-colors">
                           <td className="p-5">
                             <span className="font-bold text-secondary">{log.userName}</span>
                             <span className="ml-2 px-2 py-0.5 bg-gray-100 text-gray-500 rounded-md text-[10px] font-bold uppercase">{log.role}</span>
                           </td>
                           <td className="p-5 font-medium">{new Date(log.date ?? '').toLocaleDateString()} {formatWallClock(log.date ?? '')}</td>
                           <td className="p-5 font-medium">{log.subject || 'Live Class'}</td>
                           <td className="p-5 font-bold text-secondary">{log.durationMinutes || 0} mins</td>
                           <td className="p-5 text-right">
                             <span className={cn(
                               "px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider",
                               isPresent ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"
                             )}>
                               {isPresent ? 'Present' : 'Incomplete/Absent'}
                             </span>
                           </td>
                         </tr>
                       );
                     })}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Admin Activity Tab */}
        {activeTab === 'activity' && isSuperAdmin && (
          <motion.div key="activity" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <AdminActivityFeed />
          </motion.div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <motion.div key="feedback" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-bold font-headers text-secondary mb-6 flex items-center gap-3">
                <Star className="w-6 h-6 text-[#D4AF37]" /> Student Feedback ({feedbackList.length})
              </h3>
              {feedbackList.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 font-bold">No feedback submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {feedbackList.map((f: AdminRecord) => (
                    <div key={f.id} className="p-6 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-secondary">Instructor: {String(f.instructor_name || '—')}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{f.created_at ? new Date(String(f.created_at)).toLocaleString() : '—'}</p>
                        </div>
                        <div className="flex gap-4 text-right">
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Instructor</p>
                            <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${Number(f.instructor_rating || 0) >= s ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}</div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Institution</p>
                            <div className="flex gap-0.5">{[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${Number(f.institution_rating || 0) >= s ? 'fill-emerald-400 text-emerald-400' : 'text-gray-200'}`} />)}</div>
                          </div>
                        </div>
                      </div>
                      {f.instructor_comments && <p className="text-sm text-gray-600 bg-amber-50 p-3 rounded-xl mb-2 italic">📝 Instructor: &quot;{String(f.instructor_comments)}&quot;</p>}
                      {f.institution_comments && <p className="text-sm text-gray-600 bg-emerald-50 p-3 rounded-xl italic">🏫 Institution: &quot;{String(f.institution_comments)}&quot;</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'messages' && (
          <motion.div key="messages" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-bold font-headers text-secondary mb-6 flex items-center gap-3">
                <MessageSquare className="w-6 h-6 text-primary" /> Contact Messages ({contactMessages.length})
              </h3>
              {contactMessages.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 font-bold">No messages received yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {contactMessages.map((msg: AdminRecord) => (
                    <div key={msg.id} className="p-6 border border-gray-100 rounded-2xl bg-gray-50 hover:bg-white hover:shadow-sm transition-all">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <p className="font-bold text-secondary text-lg">{msg.name}</p>
                          <a href={`mailto:${msg.email}`} className="text-sm text-primary hover:underline">{msg.email}</a>
                        </div>
                        <p className="text-xs text-gray-400 font-medium bg-gray-100 px-3 py-1 rounded-full">{msg.created_at ? new Date(String(msg.created_at)).toLocaleString() : '—'}</p>
                      </div>
                      <p className="text-gray-700 whitespace-pre-wrap bg-white p-4 rounded-xl border border-gray-100">{String(msg.message || '')}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

        {activeTab === 'subscribers' && (
          <motion.div key="subscribers" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            <div className="bg-white p-8 rounded-[32px] border border-gray-100 shadow-sm">
              <h3 className="text-2xl font-bold font-headers text-secondary mb-6 flex items-center gap-3">
                <Users className="w-6 h-6 text-emerald-500" /> Newsletter Subscribers ({newsletterSubscribers.length})
              </h3>
              {newsletterSubscribers.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                  <p className="text-gray-400 font-bold">No subscribers yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {newsletterSubscribers.map((sub: AdminRecord) => (
                    <div key={String(sub.id ?? sub.email ?? '')} className="p-4 border border-gray-100 rounded-xl bg-gray-50 flex items-center justify-between">
                      <span className="font-medium text-gray-700 truncate">{sub.email}</span>
                      <span className="text-xs text-gray-400 shrink-0">{new Date(String(sub.created_at ?? '')).toLocaleDateString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        )}

      </AnimatePresence>

      {/* Assessment Review Modal */}
      {reviewingAssessment && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl relative">
            <button onClick={() => setReviewingAssessment(null)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
            <h3 className="text-2xl font-bold font-headers text-secondary mb-6">Assessment Review</h3>
            <div className="space-y-4 mb-8">
              <div className="grid grid-cols-2 gap-4">
                <div><p className="text-xs font-bold uppercase text-gray-400 mb-1">Full Name</p><p className="font-bold text-secondary">{displayValue(reviewingAssessment.name)}</p></div>
                <div><p className="text-xs font-bold uppercase text-gray-400 mb-1">Age</p><p className="font-bold text-secondary">{displayValue(reviewingAssessment.age) || '—'}</p></div>
                <div><p className="text-xs font-bold uppercase text-gray-400 mb-1">Email</p><p className="font-bold text-secondary text-sm">{displayValue(reviewingAssessment.email) || '—'}</p></div>
                <div><p className="text-xs font-bold uppercase text-gray-400 mb-1">Phone</p><p className="font-bold text-secondary">{displayValue(reviewingAssessment.phone) || '—'}</p></div>
                <div><p className="text-xs font-bold uppercase text-gray-400 mb-1">Level</p><p className="font-bold text-secondary">{displayValue(reviewingAssessment.level) || '—'}</p></div>
                <div><p className="text-xs font-bold uppercase text-gray-400 mb-1">Nationality</p><p className="font-bold text-secondary">{displayValue(reviewingAssessment.nationality) || '—'}</p></div>
                <div><p className="text-xs font-bold uppercase text-gray-400 mb-1">Country</p><p className="font-bold text-secondary">{displayValue(reviewingAssessment.country) || '—'}</p></div>
                <div><p className="text-xs font-bold uppercase text-gray-400 mb-1">City</p><p className="font-bold text-secondary">{displayValue(reviewingAssessment.city) || '—'}</p></div>
                <div><p className="text-xs font-bold uppercase text-gray-400 mb-1">Heard about us</p><p className="font-bold text-secondary">{displayValue(reviewingAssessment.referral) || '—'}</p></div>
              </div>
              <div><p className="text-xs font-bold uppercase text-gray-400 mb-1">Learning Goal</p><p className="font-bold text-secondary">{displayValue(reviewingAssessment.goal) || '—'}</p></div>
              {reviewingAssessment.notes && <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100"><p className="text-xs font-bold uppercase text-gray-400 mb-1">Notes</p><p className="text-sm text-secondary">{displayValue(reviewingAssessment.notes)}</p></div>}
              <p className="text-xs text-gray-400">Submitted: {new Date(String(reviewingAssessment.created_at ?? '')).toLocaleString()}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleAssessmentAction(reviewingAssessment.id ?? '', 'rejected')} disabled={isUpdatingAssessment} className="flex-1 py-3 rounded-full font-bold bg-red-50 text-red-600 hover:bg-red-100 border border-red-200 transition-colors disabled:opacity-50">Reject</button>
              <button onClick={() => handleAssessmentAction(reviewingAssessment.id ?? '', 'approved')} disabled={isUpdatingAssessment} className="flex-1 py-3 rounded-full font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-md transition-all disabled:opacity-50">{isUpdatingAssessment ? 'Saving...' : 'Approve'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-[32px] p-8 max-w-lg w-full shadow-2xl relative">
            <button 
              onClick={() => setEditingUser(null)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
            </button>
            <h3 className="text-2xl font-bold font-headers text-secondary mb-6 flex items-center gap-2">
               <FileSignature className="w-6 h-6 text-blue-500" /> Edit User Profile
            </h3>
            <form onSubmit={async (e) => {
              e.preventDefault();
              setIsUpdatingUser(true);
              // We'll update directly using supabase here to avoid circular imports or missing db.ts exports
              const wasPaid = isSubscriptionActive(editingUser);
              const billingPatch = editForm.paymentVerified && !wasPaid
                ? grantPaidCycle({ tuitionPlan: editForm.tuitionPlan })
                : !editForm.paymentVerified && wasPaid
                  ? revokePaidAccess()
                  : {};
              const { error } = await supabase.from('users').update({
                name: editForm.name,
                email: editForm.email,
                role: editForm.role,
                status: billingPatch.status ?? editForm.status,
                paymentVerified: editForm.paymentVerified,
                tuitionPlan: editForm.role === 'student' ? editForm.tuitionPlan : null,
                planDays: editForm.role === 'student' ? editForm.planDays : null,
                ...billingPatch,
              }).eq('id', editingUser.id);
              
              setIsUpdatingUser(false);
              if (error) {
                alert("Failed to update user: " + getErrorMessage(error));
              } else {
                setEditingUser(null);
                fetchData(); // Refresh list
              }
            }} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Full Name</label>
                <input 
                  type="text" 
                  value={editForm.name} 
                  onChange={e => setEditForm({...editForm, name: e.target.value})} 
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-50 focus:border-blue-400 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Email</label>
                <input 
                  type="email" 
                  value={editForm.email} 
                  disabled
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-400 cursor-not-allowed outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Role</label>
                  <select 
                    value={editForm.role} 
                    onChange={e => setEditForm({...editForm, role: e.target.value})} 
                    disabled={!isSuperAdmin}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed"
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="parent">Parent</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Status</label>
                  <select 
                    value={editForm.status} 
                    onChange={e => setEditForm({...editForm, status: e.target.value})} 
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="pending">Pending</option>
                    <option value="suspended">Suspended</option>
                  </select>
                </div>
              </div>
              {editForm.role === 'student' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Tuition Plan</label>
                    <select
                      value={editForm.tuitionPlan}
                      onChange={e => setEditForm({...editForm, tuitionPlan: e.target.value})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none"
                    >
                      <option value="">No Plan / Custom</option>
                      <option value="group">Group Class</option>
                      <option value="onetoone">One-to-One Class</option>
                      <option value="ijazah">Ijazah Program</option>
                      <option value="hifdh_intensive">Hifz Intensive</option>
                      <option value="Weekend School">Weekend School</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Weekly Day Slots (Generous Slots)</label>
                    <input
                      type="number"
                      min={1}
                      max={7}
                      value={editForm.planDays}
                      onChange={e => setEditForm({...editForm, planDays: parseInt(e.target.value) || 2})}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-50 outline-none"
                    />
                  </div>
                </div>
              )}
              <div className="pt-2">
                <label className="flex items-center gap-3 p-4 border border-gray-200 rounded-xl cursor-pointer hover:bg-gray-50">
                  <input 
                    type="checkbox" 
                    checked={editForm.paymentVerified} 
                    onChange={e => setEditForm({...editForm, paymentVerified: e.target.checked})}
                    className="w-5 h-5 text-blue-600 rounded"
                  />
                  <div>
                    <p className="text-sm font-bold text-secondary m-0">Payment Verified</p>
                    <p className="text-xs text-gray-500 m-0">Starts a 30-day paid cycle. Use Finance & Billing to award a scholarship and pick a plan.</p>
                  </div>
                </label>
              </div>
              
              <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
                {isSuperAdmin && canDeleteAccount(editingUser) ? (
                  <button 
                    type="button" 
                    disabled={isUpdatingUser}
                    onClick={() => setPendingDelete(editingUser)}
                    className="px-6 py-3 rounded-full font-bold text-red-600 bg-red-50 hover:bg-red-100 transition-colors disabled:opacity-50"
                  >
                    Delete Account
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setEditingUser(null)} className="px-6 py-3 rounded-full font-bold text-gray-500 hover:bg-gray-100">Cancel</button>
                  <button type="submit" disabled={isUpdatingUser} className="px-6 py-3 rounded-full font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md">
                    {isUpdatingUser ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Staff Modal */}
      <CreateStaffModal
        isOpen={isCreateStaffModalOpen}
        onClose={() => setIsCreateStaffModalOpen(false)}
        onCreated={() => { setIsCreateStaffModalOpen(false); fetchData(); }}
      />

      {pendingDelete && (
        <ConfirmDeleteModal
          name={pendingDelete.name || pendingDelete.email}
          role={getUserRole(pendingDelete.role)}
          loading={isUpdatingUser}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => void confirmDeleteAccount()}
        />
      )}

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
    </div>
  );
}

function FacultyProfileCard({
  teacher,
  profile,
  pending,
  onApprove,
  onReject,
  onToggleLive,
  onEdit,
}: {
  teacher: UserData;
  profile?: Record<string, JsonValue> | null;
  pending: boolean;
  onApprove?: () => void;
  onReject?: () => void;
  onToggleLive?: () => void;
  onEdit?: () => void;
}) {
  const isLive = !!teacher.publicProfile?.isLive;
  const list = (key: 'qualifications' | 'specialization' | 'languages') => asStringArray(profile?.[key]);
  return (
    <div className={`bg-white border rounded-2xl p-6 shadow-sm mb-4 ${pending ? 'border-amber-200' : 'border-gray-200'}`}>
      <div className="flex justify-between items-start mb-6 border-b border-gray-100 pb-4 gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center font-bold text-xl">
            {(teacher.name ?? '?').charAt(0)}
          </div>
          <div>
            <h4 className="text-lg font-bold text-secondary m-0 flex items-center gap-2 flex-wrap">
              <span>{teacher.name}</span>
              <TestSeatBadge user={teacher} />
            </h4>
            <p className="text-sm text-gray-500 m-0">{teacher.email}</p>
            <p className="text-xs text-gray-400 m-0 mt-0.5">
              {displayValue(profile?.gender) || teacher.gender || 'Gender not set'}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          {onEdit && (
            <button
              type="button"
              onClick={onEdit}
              className="px-4 py-2 rounded-full text-sm font-bold border border-indigo-200 text-indigo-600 hover:bg-indigo-50 inline-flex items-center gap-1.5"
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          )}
          {pending ? (
            <>
              <button onClick={onReject} className="px-4 py-2 rounded-full text-sm font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors">Reject</button>
              <button onClick={onApprove} className="px-4 py-2 rounded-full text-sm font-bold bg-emerald-500 text-white hover:bg-emerald-600 shadow-sm transition-all">Approve Update</button>
            </>
          ) : (
            <>
              <span className={`px-3 py-1 rounded-full text-xs font-bold border ${isLive ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-500 border-gray-200'}`}>
                {isLive ? 'Live on website' : 'Hidden'}
              </span>
              {onToggleLive && (
                <button onClick={onToggleLive} className="px-4 py-2 rounded-full text-sm font-bold border border-gray-200 text-gray-600 hover:bg-gray-50">
                  {isLive ? 'Hide' : 'Publish'}
                </button>
              )}
            </>
          )}
        </div>
      </div>
      <div className="grid md:grid-cols-2 gap-8">
        <div>
          <strong className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Qualifications</strong>
          {list('qualifications').length > 0 ? (
            <ul className="list-disc pl-5 m-0 space-y-1">
              {list('qualifications').map((q, i) => <li key={i} className="text-sm text-secondary font-medium">{q}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-secondary font-medium m-0">{displayValue(profile?.qualifications) || '—'}</p>
          )}
        </div>
        <div>
          <strong className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Specialization</strong>
          {list('specialization').length > 0 ? (
            <ul className="list-disc pl-5 m-0 space-y-1">
              {list('specialization').map((s, i) => <li key={i} className="text-sm text-secondary font-medium">{s}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-secondary font-medium m-0">{displayValue(profile?.specialization) || '—'}</p>
          )}
        </div>
        <div>
          <strong className="block text-xs uppercase tracking-widest text-gray-400 mb-2">Spoken Languages</strong>
          {list('languages').length > 0 ? (
            <ul className="list-disc pl-5 m-0 space-y-1">
              {list('languages').map((l, i) => <li key={i} className="text-sm text-secondary font-medium">{l}</li>)}
            </ul>
          ) : (
            <p className="text-sm text-secondary font-medium m-0">{displayValue(profile?.languages) || '—'}</p>
          )}
        </div>
        <div>
          <strong className="block text-xs uppercase tracking-widest text-gray-400 mb-2">About / Bio</strong>
          <p className="text-sm text-secondary font-medium leading-relaxed m-0 bg-gray-50 p-4 rounded-xl border border-gray-100 whitespace-pre-wrap">{displayValue(profile?.about) || '—'}</p>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, color, alert, onClick }: { title: string, value: number | string, icon: React.ReactNode, color: string, alert?: boolean, onClick?: () => void }) {
  return (
    <motion.div 
       variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
       onClick={onClick}
       className={`p-6 rounded-[32px] border border-gray-100 bg-white shadow-sm hover:shadow-md transition-shadow relative overflow-hidden ${onClick ? 'cursor-pointer hover:-translate-y-1' : ''}`}
    >
       {alert && <div className="absolute top-4 right-4 w-3 h-3 bg-red-500 rounded-full animate-pulse" />}
       <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-4 ${color}`}>
          {icon}
       </div>
       <p className="text-[0.7rem] font-black uppercase tracking-widest text-gray-400 m-0 mb-1">{title}</p>
       <p className={`text-4xl font-black font-headers text-secondary m-0`}>{value}</p>
    </motion.div>
  );
}

