'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { getUserRole } from '@/lib/userDataHelpers';

/** Parents use the student portal for classes, inbox, and progress. Billing stays on /parent/billing. */
export default function ParentRedirectPage() {
  const router = useRouter();
  const { userData, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    const role = getUserRole(userData?.role);
    if (role === 'parent' || userData?.accountType === 'parent') {
      router.replace('/portal');
    }
  }, [loading, userData, router]);

  return (
    <div className="flex items-center justify-center min-h-[40vh]">
      <p className="text-gray-500 font-medium">Opening your portal...</p>
    </div>
  );
}
