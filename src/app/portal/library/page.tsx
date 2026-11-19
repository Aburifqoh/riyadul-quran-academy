'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Library, Search, FileText, Headphones, Link as LinkIcon, Video, BookOpen, ExternalLink, Download } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { getResources } from '@/lib/db';
import { cn } from '@/lib/utils';

const TYPE_ICONS: Record<string, React.ReactNode> = {
  PDF:   <FileText className="w-6 h-6" />,
  Audio: <Headphones className="w-6 h-6" />,
  Video: <Video className="w-6 h-6" />,
  Link:  <LinkIcon className="w-6 h-6" />,
};

const TYPE_COLORS: Record<string, string> = {
  PDF:   'bg-red-50 text-red-500',
  Audio: 'bg-blue-50 text-blue-500',
  Video: 'bg-purple-50 text-purple-500',
  Link:  'bg-[#E6F3F2] text-[#004D4A]',
};

const CATEGORIES = ['All', 'Quran', 'Tajweed', 'Arabic', 'Islamic Studies', 'Other'];

export default function LibraryPage() {
  const { userData } = useAuth();
  const [allResources, setAllResources] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState('All');

  const isTeacher = userData?.role === 'teacher';
  const assignedIds: string[] = userData?.assignedResources || [];

  useEffect(() => {
    getResources().then((data) => {
      setAllResources(data);
      setLoading(false);
    });
  }, []);

  // Teachers see all; students see only assigned
  const visibleResources = isTeacher
    ? allResources
    : allResources.filter((r) => assignedIds.includes(r.id));

  const filtered = visibleResources.filter((r) => {
    const matchSearch = r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || '').toLowerCase().includes(search.toLowerCase());
    const matchCat = activeCategory === 'All' || r.category === activeCategory;
    return matchSearch && matchCat;
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { staggerChildren: 0.07 } }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: 'spring' as const, stiffness: 300, damping: 24 } }
  };

  return (
    <motion.div variants={containerVariants} initial="hidden" animate="visible" className="pb-10 max-w-7xl mx-auto">

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-3xl font-bold font-headers text-secondary m-0 mb-2 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#004D4A] to-[#0F3D38] text-white flex items-center justify-center shadow-sm">
              <Library className="w-5 h-5" />
            </div>
            Learning Library
          </h2>
          <p className="text-gray-500 m-0">
            {isTeacher ? 'All available study materials.' : 'Your assigned study materials, PDFs, and resources.'}
          </p>
        </div>

        <div className="relative w-full md:w-[360px]">
          <input
            type="text"
            className="w-full pl-12 pr-4 py-4 border border-gray-200 rounded-full text-secondary focus:outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-50 transition-all bg-white font-bold shadow-sm"
            placeholder="Search resources..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex gap-2 flex-wrap mb-8">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setActiveCategory(cat)}
            className={cn(
              'px-5 py-2 rounded-full text-sm font-bold transition-all border',
              activeCategory === cat
                ? 'bg-secondary text-white border-secondary shadow-md'
                : 'bg-white text-gray-500 border-gray-200 hover:border-secondary hover:text-secondary'
            )}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-gray-50 rounded-3xl h-48 animate-pulse" />
          ))}
        </div>
      ) : (
        <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          <AnimatePresence>
            {filtered.map((doc) => (
              <motion.div
                key={doc.id}
                variants={itemVariants}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100 hover:border-amber-300 hover:shadow-lg transition-all group cursor-pointer flex flex-col gap-4 relative overflow-hidden"
              >
                <div className="absolute top-[-20%] right-[-10%] w-32 h-32 bg-[#004D4A]/5 blur-[40px] rounded-full pointer-events-none transition-transform group-hover:scale-125 duration-1000" />

                <div className="flex justify-between items-start relative z-10">
                  <div className={cn('w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm', TYPE_COLORS[doc.type] || 'bg-gray-50 text-gray-500')}>
                    {TYPE_ICONS[doc.type] || <BookOpen className="w-6 h-6" />}
                  </div>
                  <span className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-gray-50 text-gray-500 border border-gray-100">
                    {doc.type}
                  </span>
                </div>

                <div className="relative z-10 flex-1">
                  <h3 className="text-base font-bold text-secondary mb-1 group-hover:text-amber-600 transition-colors line-clamp-2">{doc.title}</h3>
                  {doc.description && (
                    <p className="text-xs text-gray-400 line-clamp-2 font-medium">{doc.description}</p>
                  )}
                  {doc.category && (
                    <span className="inline-block mt-2 text-xs font-bold uppercase tracking-wider text-gray-400">{doc.category}</span>
                  )}
                </div>

                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="relative z-10 flex items-center justify-center gap-2 w-full py-3 rounded-full font-bold text-sm bg-gray-50 border border-gray-200 text-secondary hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-all"
                  onClick={(e) => e.stopPropagation()}
                >
                  {doc.type === 'PDF' ? <Download className="w-4 h-4" /> : <ExternalLink className="w-4 h-4" />}
                  {doc.type === 'PDF' ? 'Download' : 'Open'}
                </a>
              </motion.div>
            ))}
          </AnimatePresence>

          {filtered.length === 0 && (
            <motion.div variants={itemVariants} className="col-span-full bg-gray-50 rounded-[32px] p-12 border-2 border-dashed border-gray-200 text-center flex flex-col items-center justify-center min-h-[350px]">
              <div className="w-20 h-20 rounded-full bg-white text-gray-300 flex items-center justify-center shadow-sm mb-6 border border-gray-100">
                <BookOpen className="w-10 h-10" />
              </div>
              <h3 className="text-2xl font-bold font-headers text-gray-400 mb-2">
                {visibleResources.length === 0 ? 'No Resources Assigned Yet' : 'No Results Found'}
              </h3>
              <p className="text-gray-400 max-w-[300px] leading-relaxed">
                {visibleResources.length === 0
                  ? 'Your teacher will assign study materials here. Check back soon.'
                  : `No resources match "${search}" in "${activeCategory}".`}
              </p>
            </motion.div>
          )}
        </motion.div>
      )}
    </motion.div>
  );
}
