'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error("Global Error:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen px-4 text-center bg-[#FAF9F6] relative overflow-hidden">
      {/* Background Ornaments */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#004D4A]/5 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#004D4A]/5 rounded-full blur-[100px] pointer-events-none" />

      <div className="bg-white/80 backdrop-blur-xl p-10 md:p-14 rounded-[40px] shadow-2xl border border-white max-w-lg w-full relative z-10 animate-fade-in">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner border-4 border-red-100">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
        </div>
        
        <h2 className="text-3xl font-black font-headers text-[#004D4A] mb-4">
          Unexpected System Error
        </h2>
        <p className="text-[#5A6E6C] mb-8 leading-relaxed">
          We apologize, but an unexpected error occurred while loading this page. Our engineering team has been notified.
        </p>
        
        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="w-full py-4 rounded-full font-bold text-white bg-gradient-to-r from-[#004D4A] to-[#166B67] shadow-[0_10px_20px_rgba(0,77,74,0.3)] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(0,77,74,0.4)] transition-all duration-300 flex items-center justify-center gap-2"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path><path d="M3 3v5h5"></path></svg>
            Attempt Recovery
          </button>
          
          <Link href="/" className="w-full py-4 rounded-full font-bold text-[#004D4A] bg-[#004D4A]/5 hover:bg-[#004D4A]/10 transition-all duration-300">
            Return to Homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
