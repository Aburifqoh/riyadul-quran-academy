'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getUserRole } from '@/lib/userDataHelpers';
import PortalSkeleton from '@/components/ui/PortalSkeleton';
import { RevenueBillingOffice } from '@/components/admin/RevenueBillingOffice';

export default function PaymentAdmin() {
  const { userData, loading } = useAuth();
  const router = useRouter();

  if (loading) return <PortalSkeleton />;
  if (getUserRole(userData?.role) !== 'super_admin') {
    return <div className="p-10 text-center text-gray-500">Access denied. Super admin only.</div>;
  }

  return (
    <div className="space-y-6">
      <button
        type="button"
        onClick={() => router.push('/portal/admin')}
        className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-secondary"
      >
        <ArrowLeft className="w-4 h-4" /> Admin Hub
      </button>
      <RevenueBillingOffice />
    </div>
  );
}
