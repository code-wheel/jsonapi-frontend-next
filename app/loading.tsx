/**
 * Loading state shown during page transitions and data fetching.
 */
export default function Loading() {
  return (
    <main className="min-h-screen flex items-center justify-center">
      <div
        className="flex flex-col items-center gap-4"
        role="status"
        aria-live="polite"
        aria-busy="true"
      >
        <div
          className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"
          aria-hidden="true"
        />
        <p className="text-gray-500">Loading...</p>
      </div>
    </main>
  )
}
