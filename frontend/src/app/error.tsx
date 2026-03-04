"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Route error:", error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="text-5xl">⚠️</div>
      <h2 className="text-2xl font-semibold text-gray-900">
        Something went wrong
      </h2>
      <p className="max-w-md text-gray-600">
        An unexpected error occurred. You can try again or go back to the home
        page.
      </p>
      <div className="flex gap-3">
        <button
          onClick={reset}
          className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
        >
          Try again
        </button>
        <button
          onClick={() => (window.location.href = "/")}
          className="rounded-lg border border-gray-300 px-5 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Go home
        </button>
      </div>
    </div>
  );
}
