
'use client';
import React, { useEffect } from 'react';
import Link from 'next/link';

export default function PrivacyPage() {
  useEffect(() => {
    // Make elements visible on scroll simulation
    const elements = document.querySelectorAll('.animate-on-scroll');
    elements.forEach(el => el.classList.add('visible'));
  }, []);

  return (
    <>
      <main className="w-full max-w-3xl mx-auto px-6 pt-16 pb-20 text-[#2E2E2E]">
        <article className="space-y-4 [&_h1]:font-headers [&_h1]:text-4xl [&_h1]:text-[#004D4A] [&_h1]:mb-4 [&_h2]:font-headers [&_h2]:text-2xl [&_h2]:text-[#004D4A] [&_h2]:mt-8 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:mb-2">
            <span className="date-inline-block px-3.5 py-1.5 rounded-full text-sm font-semibold">Last Updated: April 12, 2026</span>
            <h1>Privacy Policy</h1>
            
            <p>At Ilmvers Online Qur'an & Islamic Learning Institution ("Ilmvers", "we", "us", or "our"), we are committed to protecting the privacy and security of our students, parents, and faculty. This Privacy Policy explains how we collect, use, and safeguard your personal information as you interact with our digital ecosystem.</p>

            <h2>1. Information We Collect</h2>
            <p>We collect information that helps us provide a premium, structured Islamic learning experience:</p>
            <ul>
                <li><strong>Personal Identifiers:</strong> Name, email address, physical address, and contact numbers.</li>
                <li><strong>Academic Data:</strong> Student ages, levels, Tajweed proficiency, Hifz progress, and attendance logs.</li>
                <li><strong>Study assistant:</strong> Messages sent to the Ilmvers study assistant are used to answer study questions. It supports revision and is not a fatwa, a medical opinion, or financial advice. The phonetic Hifz scoring tool is not live.</li>
                <li><strong>Payment Information:</strong> Transaction history and plan details (processed securely via our payment gateways).</li>
            </ul>

            <h2>2. How We Use Your Information</h2>
            <p>Your data is used strictly for educational and institutional improvement:</p>
            <ul>
                <li>To facilitate live Jitsi Meet classrooms and matching with qualified instructors.</li>
                <li>To provide parents with transparent progress reports and visual milestones.</li>
                <li>To keep class records, homework, and teacher notes available to the student and parent.</li>
                <li>To securely store academic resources (Syllabus PDFs, Audio recordings) in your Library.</li>
            </ul>

            <h2>3. Data Retentional & Security</h2>
            <p>We keep account and class records for as long as the student is enrolled, and we delete them when you ask us to close the account. Files are stored with access controls on Cloudflare.</p>

            <h2>4. Third-Party Services</h2>
            <p>We leverage trusted partners to deliver our services:</p>
            <ul>
                <li><strong>Supabase:</strong> Secure database, authentication, and real-time communications.</li>
                <li><strong>Cloudflare:</strong> Global content delivery, secure file storage (R2), and site hosting.</li>
                <li><strong>Study assistant:</strong> Answers study questions. It is not a scholar and it does not issue a fatwa.</li>
                <li><strong>Jitsi Meet:</strong> Encrypted real-time video conferencing for live classrooms.</li>
                <li><strong>Resend:</strong> Transactional email delivery.</li>
            </ul>

            <h2>5. Your Rights</h2>
            <p>Students and parents have the right to request access to their stored academic records, request corrections to personal data, or deactivate their accounts at any time through the Parent Portal.</p>

            <h2>6. Contact Us</h2>
            <p>If you have questions regarding this policy or your data privacy, please contact our Support Desk:</p>
            <p><strong>Email:</strong> info@ilmversinstitute.com<br />
            <strong>WhatsApp:</strong> +234 810 969 0304</p>
        </article>
    </main>
    </>
  );
}
