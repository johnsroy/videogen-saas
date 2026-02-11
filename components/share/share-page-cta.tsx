import Link from 'next/link'

export function SharePageCTA() {
  return (
    <div className="flex flex-col items-center gap-3 pt-4 border-t border-gray-800">
      <p className="text-sm text-gray-400">
        Created with <span className="text-white font-medium">VideoGen</span> — AI Video Platform
      </p>
      <Link
        href="/signup"
        className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200"
      >
        Create Your Own Free Video
        <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2}>
          <path d="M5 12h14m-7-7 7 7-7 7" />
        </svg>
      </Link>
    </div>
  )
}
