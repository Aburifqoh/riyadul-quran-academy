'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertCircle, RefreshCw } from 'lucide-react';

export default function PortalErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Portal Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-white rounded-3xl border border-red-100 shadow-sm mt-8 max-w-2xl mx-auto">
      <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mb-6 border-4 border-red-100">
        <AlertCircle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 mb-3">
        Module Loading Error
      </h2>
      <p className="text-gray-500 mb-8 max-w-md">
        We encountered a problem while loading this section of the portal. The rest of your dashboard is still operational.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <button
          onClick={() => reset()}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold text-white bg-red-500 hover:bg-red-600 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Reload Module
        </button>
        <Link href="/portal" className="inline-flex items-center justify-center px-6 py-3 rounded-xl font-bold text-gray-700 bg-gray-100 hover:bg-gray-200 transition-colors">
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
