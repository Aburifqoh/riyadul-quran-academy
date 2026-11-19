'use client';

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import CommunityPostComposer from '@/components/community/CommunityPostComposer';

export default function SubmitPost() {
  const { user, userData } = useAuth();

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div>
        <h2 className="text-3xl font-headers font-bold text-gray-900 m-0">Submit Community Post</h2>
        <p className="text-gray-500 m-0 mt-2">
          Write a full article for the Ilmvers Journal. Add headings, images, and a cover photo.
          Submissions stay private until administration approves them.
        </p>
      </div>

      <CommunityPostComposer
        authorName={userData?.name || 'Teacher'}
        authorId={user?.id || userData?.id}
        publishImmediately={false}
      />
    </div>
  );
}
