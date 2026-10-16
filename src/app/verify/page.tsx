'use client';
import React, { useState, useEffect } from 'react';
import { getCertificate } from '@/lib/db';

export default function VerifyPage() {
  const [certId, setCertId] = useState('');
  const [loading, setLoading] = useState(false);
  const [certificate, setCertificate] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    // Make elements visible on scroll simulation
    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach(el => el.classList.add('visible'));
  }, []);

  const handleVerify = async () => {
    const trimmedId = certId.trim().toUpperCase();
    if (!trimmedId) return;

    setLoading(true);
    setCertificate(null);
    setError(null);
    setNotFound(false);

    try {
      const cert = await getCertificate(trimmedId);

      if (cert) {
        setCertificate(cert);
      } else {
        setNotFound(true);
      }
    } catch (e: any) {
      console.error(e);
      setError('An error occurred during verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="py-16 w-full max-w-[1200px] mx-auto px-8 flex items-center justify-center flex-1 items-start mt-[5vh]">
      <div className="bg-white rounded-2xl p-8 shadow-md border border-white/80 relative overflow-hidden transition-all duration-300 w-full max-w-[600px]">
        <div className="text-center mb-4">
          <div className="w-[50px] h-[50px] bg-[#FDE7C5] text-[#F59A23] rounded-lg flex items-center justify-center text-2xl mb-4 m-[0 auto 16px] [background:#F59A23]">📜</div>
          <h2 className="text-[#5D2E17]">Certificate Verification</h2>
          <p className="text-[#5C5148] mt-2">Enter a valid Ilmvers Student Certificate ID to verify its authenticity.</p>
        </div>

        <div className="mb-4 mb-8">
          <input 
            type="text" 
            className="w-full px-4 py-3 border border-[#ebdcd3] rounded-lg text-[#5C5148] focus:outline-none focus:border-[#F59A23] focus:ring-2 focus:ring-[#F59A23]/20 transition-all bg-white font-inherit text-base text-center text-[1.2rem] font-semibold tracking-[1px] uppercase" 
            placeholder="e.g. ALM-2026-X" 
             
            value={certId}
            onChange={(e) => setCertId(e.target.value)}
          />
        </div>
        <button 
          onClick={handleVerify} 
          className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-semibold text-white bg-gradient-to-br from-white to-slate-100-to-br from-[#F59A23] to-[#ffb44d] shadow-[0_4px_15px_rgba(245,154,35,0.3)] hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_15px_30px_rgba(245,154,35,0.4)] transition-all duration-300 cursor-pointer border-0 w-full mb-8"
          disabled={loading}
        >
          {loading ? 'Authenticating...' : 'Verify Credential'}
        </button>
        
        {/* Loading State */}
        {loading && (
          <div className="text-center p-[20px]">
            <span className="text-[1.5rem] inline-block animate-spin">↻</span><br />
            <span className="text-[0.9rem]">Checking secure database...</span>
          </div>
        )}

        {/* Result States */}
        {certificate && (
          <div className="[border:2px_solid_#28a745] [background:#f8fff9] p-[24px] rounded-[8px] text-center">
            <div className="w-[50px] h-[50px] [background:#28a745] text-white rounded-full flex items-center justify-center text-[1.5rem] m-[0 auto 16px]">✓</div>
            <h3 className="text-[#155724] mb-[8px]">Official Certificate Verified</h3>
            <p className="text-[#383d41] mb-[16px]">This document was securely issued by Ilmvers Academy.</p>
            
            <div className="bg-white [border:1px_solid_#e2e3e5] p-[16px] rounded-[6px] text-left">
              <p className="mb-[8px]"><strong>Student Name:</strong> {certificate.studentName}</p>
              <p className="mb-[8px]"><strong>Program:</strong> {certificate.subject}</p>
              <p className="mb-[8px]"><strong>Instructor:</strong> {certificate.teacherName || "Ilmvers Faculty"}</p>
              <p className="mb-0"><strong>Date of Issue:</strong> {new Date(certificate.requestDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}</p>
            </div>
            <div className="mt-[16px] text-[0.75rem] text-[#888]">Credential ID: <code>{certificate.id}</code></div>
          </div>
        )}

        {notFound && (
          <div className="[border:2px_dashed_#dc3545] [background:#fff5f5] p-[20px] rounded-[8px] text-center">
            <h4 className="text-[#dc3545] mb-[8px]">Certificate Not Found</h4>
            <p className="text-[#721c24]">No official record matches the ID provided. Please ensure you entered the exact code from the certificate.</p>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-lg mb-4 flex items-center gap-3 bg-[#FDE7C5] text-[#5D2E17] border-l-4 border-[#F59A23] text-center">
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
