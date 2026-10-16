import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-4 text-center">
      <h2 className="text-5xl font-bold text-[var(--color-primary)] mb-4">404</h2>
      <h3 className="text-2xl font-bold text-[var(--color-secondary)] mb-4">Page Not Found</h3>
      <p className="text-[#5C5148] mb-8 max-w-md">
        The page you are looking for doesn't exist or has been moved.
      </p>
      <Link href="/" className="inline-flex items-center justify-center px-8 py-3.5 rounded-full font-semibold text-white bg-gradient-to-br from-white to-slate-100-to-br from-[#F59A23] to-[#ffb44d] shadow-[0_4px_15px_rgba(245,154,35,0.3)] hover:-translate-y-1 hover:scale-[1.02] hover:shadow-[0_15px_30px_rgba(245,154,35,0.4)] transition-all duration-300 cursor-pointer border-0">
        Return Home
      </Link>
    </div>
  );
}
