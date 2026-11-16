'use client';
import React from 'react';
import { usePathname } from 'next/navigation';
import { WHATSAPP_NUMBER } from '@/lib/utils';

export const FloatingButtons = () => {
  const pathname = usePathname();

  // Hide on ALL portal pages — students, teachers, and admins don't need these
  if (pathname?.startsWith('/portal')) return null;

  return (
    <>
      {/* WhatsApp Support */}
      <a
        href={`https://wa.me/${WHATSAPP_NUMBER}?text=Hello%20Ilmvers%20Support!%20I%20have%20a%20question.`}
        target="_blank"
        className="fixed bottom-[15px] right-[15px] md:bottom-[20px] md:right-[20px] w-[50px] h-[50px] md:w-[55px] md:h-[55px] rounded-full bg-[#25D366] flex items-center justify-center shadow-[0_4px_15px_rgba(37,211,102,0.4)] z-[1000] transition-all duration-300 hover:scale-110"
        rel="noopener noreferrer"
        title="WhatsApp Support"
        aria-label="WhatsApp Support"
      >
        <svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" width="28" height="28" fill="white">
          <path d="M16 3C8.832 3 3 8.832 3 16c0 2.34.633 4.61 1.836 6.594L3.063 29l6.582-1.727A12.94 12.94 0 0016 29c7.168 0 13-5.832 13-13S23.168 3 16 3zm0 2c6.086 0 11 4.914 11 11s-4.914 11-11 11a10.94 10.94 0 01-5.594-1.531l-.406-.242-3.906 1.024 1.047-3.797-.265-.43A10.94 10.94 0 015 16C5 9.914 9.914 5 16 5zm-3.422 5.313c-.23 0-.601.086-.918.43-.316.344-1.203 1.172-1.203 2.855s1.23 3.313 1.406 3.543c.176.23 2.395 3.793 5.895 5.164 2.91 1.148 3.504.918 4.133.86.629-.059 2.016-.825 2.305-1.626.289-.8.289-1.484.203-1.625-.086-.14-.316-.23-.66-.402-.344-.172-2.016-1-2.36-1.113-.343-.114-.6-.172-.859.172-.257.344-1.003 1.11-1.23 1.344-.23.23-.46.258-.805.086-.344-.172-1.457-.535-2.781-1.715-1.027-.918-1.723-2.05-1.926-2.394-.203-.344-.02-.531.152-.703.156-.156.344-.407.516-.61.172-.2.23-.343.344-.573.113-.23.058-.43-.028-.602-.086-.172-.847-2.054-1.18-2.809-.29-.664-.597-.676-.86-.676z"/>
        </svg>
      </a>
    </>
  );
};
