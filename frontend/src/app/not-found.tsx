import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-6xl font-bold text-gray-300">404</div>
      <h2 className="text-2xl font-semibold text-gray-900">Page not found</h2>
      <p className="max-w-md text-gray-600">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
      >
        Go home
      </Link>
    </div>
  );
}
