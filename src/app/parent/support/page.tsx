'use client';

import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { WHATSAPP_NUMBER } from '@/lib/utils';

const SUPPORT_EMAIL = 'info@ilmversinstitute.com';

const FAQS = [
  {
    q: 'How do I add a child to my account?',
    a: 'Contact us by WhatsApp or email. The institute will link your child\'s student account to your parent profile.',
  },
  {
    q: 'Can I change my child\'s class schedule?',
    a: 'Message the assigned teacher from the portal inbox, or contact the institute to request a schedule change.',
  },
  {
    q: 'What happens if I miss a payment?',
    a: 'Your child\'s portal access may be paused. You can pay from the Billing page. Contact us if you need an extension.',
  },
  {
    q: 'How do I get a payment receipt?',
    a: 'A receipt is emailed after every successful payment. Check the spam folder if it does not arrive.',
  },
  {
    q: 'Can I enrol multiple children?',
    a: 'Yes. Each child has their own student account. Contact us if you would like to discuss a multi-child arrangement.',
  },
];

export default function ParentSupportPage() {
  const { userData } = useAuth();
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [form, setForm] = useState({ subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Assalamu Alaikum, I need support. My name is ${userData?.name || ''}.`)}`;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailto = `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(form.subject)}&body=${encodeURIComponent(form.message)}`;
    window.location.href = mailto;
    setSubmitted(true);
  };

  return (
    <div className="space-y-10 animate-in fade-in duration-500">
      <div>
        <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Support Centre</h2>
        <p className="text-slate-500 mt-1">Get help with your account, billing, or your child&apos;s classes.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group flex items-center gap-4 p-5 bg-[#25D366] hover:bg-[#1ebe5c] rounded-2xl text-white transition-all hover:scale-[1.02] shadow-lg shadow-green-500/20"
        >
          <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">WhatsApp Support</p>
            <p className="text-white/80 text-sm mt-0.5">Usually the fastest reply</p>
          </div>
        </a>

        <a
          href={`mailto:${SUPPORT_EMAIL}`}
          className="group flex items-center gap-4 p-5 bg-white border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50 rounded-2xl text-slate-800 transition-all hover:scale-[1.02]"
        >
          <div className="w-12 h-12 bg-slate-100 group-hover:bg-emerald-100 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors">
            <svg className="w-6 h-6 text-slate-500 group-hover:text-emerald-600 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
          </div>
          <div>
            <p className="font-bold text-lg leading-tight">Email Support</p>
            <p className="text-slate-500 text-sm mt-0.5" suppressHydrationWarning>{SUPPORT_EMAIL}</p>
          </div>
        </a>
      </div>

      {submitted ? (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-8 text-center">
          <p className="text-emerald-800 font-bold text-lg">Message prepared</p>
          <p className="text-emerald-700 text-sm mt-1">Your email app should have opened. If it did not, write to {SUPPORT_EMAIL}.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h3 className="font-bold text-slate-900 text-lg mb-4">Send a Message</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Subject</label>
              <input
                type="text"
                required
                value={form.subject}
                onChange={e => setForm(p => ({ ...p, subject: e.target.value }))}
                placeholder="e.g. Schedule change request"
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Message</label>
              <textarea
                required
                rows={5}
                value={form.message}
                onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                placeholder="Describe your issue or question..."
                className="w-full px-4 py-3 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all resize-none"
              />
            </div>
            <button
              type="submit"
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-xl transition-all hover:scale-[1.01] shadow-md shadow-emerald-500/20"
            >
              Send Message
            </button>
          </form>
        </div>
      )}

      <div>
        <h3 className="font-bold text-slate-900 text-lg mb-4">Frequently Asked Questions</h3>
        <div className="space-y-2">
          {FAQS.map((faq, i) => (
            <div key={faq.q} className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
              <button
                className="w-full text-left px-5 py-4 flex items-center justify-between gap-4 hover:bg-slate-50 transition-colors"
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
              >
                <span className="font-semibold text-slate-900 text-sm">{faq.q}</span>
                <svg className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform ${openFaq === i ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm text-slate-600 border-t border-slate-100 pt-3">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
