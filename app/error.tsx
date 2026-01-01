"use client"

import Link from "next/link"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h1>
        <p className="text-gray-600 mb-6">
          We couldn&apos;t load this page. Please try again.
        </p>

        {process.env.NODE_ENV !== "production" && error?.message ? (
          <pre className="text-left text-xs bg-gray-100 p-3 rounded overflow-auto mb-6">
            {error.message}
          </pre>
        ) : null}

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            Try again
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-gray-200 text-gray-900 rounded-md hover:bg-gray-300"
          >
            Go home
          </Link>
        </div>
      </div>
    </main>
  )
}

