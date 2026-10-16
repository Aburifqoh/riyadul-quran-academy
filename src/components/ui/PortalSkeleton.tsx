import React from 'react';

export default function PortalSkeleton() {
  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-gray-50">
      {/* Sidebar Skeleton */}
      <aside className="w-full lg:w-[260px] bg-white border-b lg:border-b-0 lg:border-r border-gray-200 hidden lg:flex flex-col pt-6 pb-6">
        <div className="px-6 mb-5">
           <div className="h-6 w-32 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
        <div className="flex flex-col gap-4 px-6 mt-4">
           {[1, 2, 3, 4, 5].map((i) => (
             <div key={i} className="flex items-center gap-3">
               <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
               <div className="h-4 w-24 bg-gray-200 rounded-full animate-pulse"></div>
             </div>
           ))}
        </div>
        <div className="mt-auto px-6 flex flex-col gap-4">
           <div className="flex items-center gap-3">
             <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse"></div>
             <div className="h-4 w-20 bg-gray-200 rounded-full animate-pulse"></div>
           </div>
        </div>
      </aside>

      {/* Main Content Skeleton */}
      <div className="flex-1 p-4 lg:p-8">
        <div className="mb-8">
          <div className="h-8 w-48 bg-gray-200 rounded-full animate-pulse mb-3"></div>
          <div className="h-4 w-32 bg-gray-200 rounded-full animate-pulse"></div>
        </div>
        
        {/* Bento Grid Skeleton */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
           <div className="md:col-span-2 h-64 bg-white rounded-3xl border border-gray-100 shadow-sm animate-pulse"></div>
           <div className="h-64 bg-white rounded-3xl border border-gray-100 shadow-sm animate-pulse"></div>
           <div className="h-48 bg-white rounded-3xl border border-gray-100 shadow-sm animate-pulse"></div>
           <div className="h-48 bg-white rounded-3xl border border-gray-100 shadow-sm animate-pulse"></div>
           <div className="h-48 bg-white rounded-3xl border border-gray-100 shadow-sm animate-pulse"></div>
        </div>
      </div>
    </div>
  );
}
