'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Star, Send, Building, UserCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { submitFeedback } from '@/lib/db';

export default function FeedbackPage() {
  const { user, userData } = useAuth();

  // Build instructor list from student's schedule
  const instructorOptions: string[] = Array.from(
    new Set(
      (userData?.schedule || [])
        .map((s: any) => s.teacherName || s.teacher)
        .filter(Boolean)
    )
  );

  const [instructorRating, setInstructorRating] = useState(0);
  const [hoverInstructorRating, setHoverInstructorRating] = useState(0);
  const [institutionRating, setInstitutionRating] = useState(0);
  const [hoverInstitutionRating, setHoverInstitutionRating] = useState(0);

  const [instructor, setInstructor] = useState(instructorOptions[0] || '');
  const [instructorComments, setInstructorComments] = useState('');
  const [institutionComments, setInstitutionComments] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;
    setIsSubmitting(true);
    setError('');

    const success = await submitFeedback({
      student_id: user.id,
      student_name: userData?.name || 'Anonymous',
      instructor_name: instructor,
      instructor_rating: instructorRating,
      institution_rating: institutionRating,
      instructor_comments: instructorComments,
      institution_comments: institutionComments,
    });

    setIsSubmitting(false);
    if (success) {
      setSubmitted(true);
    } else {
      setError('Failed to submit feedback. Please try again.');
    }
  };

  if (submitted) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <div className="w-24 h-24 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-6 shadow-xl shadow-emerald-100">
          <CheckCircle2 className="w-12 h-12" />
        </div>
        <h2 className="text-3xl font-black font-headers text-slate-800 mb-4">JazakAllahu Khairan</h2>
        <p className="text-slate-600 text-lg max-w-md">
          Your feedback has been submitted securely and anonymously to the Ilmvers Board of Education.
        </p>
        <button
          onClick={() => { setSubmitted(false); setInstructorRating(0); setInstitutionRating(0); setInstructorComments(''); setInstitutionComments(''); }}
          className="mt-8 px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition-colors"
        >
          Submit Another Review
        </button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
      <div className="mb-8">
        <h1 className="text-3xl font-black font-headers text-slate-800 mb-2">Anonymous Feedback</h1>
        <p className="text-slate-500">Your voice helps us maintain the highest standard of Islamic education.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl font-medium text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* Instructor Feedback */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-xl hover:shadow-[#004D4A]/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-[#004D4A]/5 rounded-bl-full pointer-events-none" />

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-[#004D4A] flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Instructor Performance</h2>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Sent to Board of Education</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Select Instructor</label>
              {instructorOptions.length > 0 ? (
                <select
                  value={instructor}
                  onChange={(e) => setInstructor(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#004D4A] focus:ring-2 focus:ring-[#004D4A]/20 transition-all text-slate-700"
                >
                  {instructorOptions.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-400 text-sm">
                  No instructor assigned yet
                </div>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Rating (1–5 Stars)</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverInstructorRating(star)}
                    onMouseLeave={() => setHoverInstructorRating(0)}
                    onClick={() => setInstructorRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star className={`w-8 h-8 ${(hoverInstructorRating || instructorRating) >= star ? 'fill-[#004D4A] text-[#004D4A]' : 'text-slate-200'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Comments / Suggestions</label>
              <textarea
                value={instructorComments}
                onChange={(e) => setInstructorComments(e.target.value)}
                placeholder="Share your experience..."
                rows={4}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-[#004D4A] focus:ring-2 focus:ring-[#004D4A]/20 transition-all text-slate-700 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Institutional Review */}
        <div className="bg-white rounded-[32px] p-8 shadow-sm border border-slate-100 flex flex-col relative overflow-hidden group hover:shadow-xl hover:shadow-emerald-500/5 transition-all duration-300">
          <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full pointer-events-none" />

          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <Building className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-800">Institutional Review</h2>
              <p className="text-xs text-slate-500 uppercase tracking-wider font-bold">Overall Experience</p>
            </div>
          </div>

          <div className="flex-1 flex flex-col gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Institution Rating</label>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverInstitutionRating(star)}
                    onMouseLeave={() => setHoverInstitutionRating(0)}
                    onClick={() => setInstitutionRating(star)}
                    className="p-1 transition-transform hover:scale-110"
                  >
                    <Star className={`w-8 h-8 ${(hoverInstitutionRating || institutionRating) >= star ? 'fill-emerald-500 text-emerald-500' : 'text-slate-200'}`} />
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-slate-700">Testimonial</label>
              <textarea
                value={institutionComments}
                onChange={(e) => setInstitutionComments(e.target.value)}
                placeholder="How has Ilmvers impacted your journey?"
                rows={5}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 transition-all text-slate-700 resize-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="md:col-span-2 flex justify-end mt-4">
          <button
            type="submit"
            disabled={isSubmitting || (instructorRating === 0 && institutionRating === 0)}
            className="flex items-center gap-3 px-8 py-4 bg-slate-900 hover:bg-black text-white font-bold rounded-2xl transition-all shadow-xl shadow-slate-900/20 disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            )}
            <span>Submit Feedback Anonymously</span>
          </button>
        </div>

      </form>
    </div>
  );
}
