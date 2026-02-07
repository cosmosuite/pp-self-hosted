interface Props {
  creditsRemaining: number | null;
  onDownload: () => void;
  hasImage: boolean;
  modelLoaded: boolean;
  error: string | null;
}

export default function TopBar({
  creditsRemaining,
  onDownload,
  hasImage,
  modelLoaded,
  error,
}: Props) {
  return (
    <header className="h-14 flex-shrink-0 bg-[#111118] border-b border-[#2a2a3a] flex items-center justify-between px-5">
      {/* Left: Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-fuchsia-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
        </div>
        <span className="text-sm font-bold text-white tracking-tight">SafeVision</span>

        {/* Status dot */}
        <div className="flex items-center gap-1.5 ml-3">
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              modelLoaded ? "bg-green-400" : "bg-yellow-400 animate-pulse"
            }`}
          />
          <span className="text-[10px] text-zinc-600">
            {modelLoaded ? "Ready" : "Loading model..."}
          </span>
        </div>

        {/* Error */}
        {error && (
          <span className="text-[10px] text-red-400 ml-3 max-w-[200px] truncate" title={error}>
            {error}
          </span>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-3">
        {/* Credits */}
        {creditsRemaining != null && (
          <span className="text-xs text-violet-300 px-2.5 py-1 rounded-full bg-violet-500/10 border border-violet-500/20">
            {creditsRemaining} credits
          </span>
        )}

        {/* Upgrade */}
        <button className="text-xs text-zinc-400 hover:text-zinc-200 px-3 py-1.5 rounded-lg border border-[#2a2a3a] hover:border-zinc-600 transition-colors flex items-center gap-1.5">
          <span className="text-yellow-400">&#9733;</span>
          Upgrade
        </button>

        {/* Done / Download */}
        <button
          onClick={onDownload}
          disabled={!hasImage}
          className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold transition-all ${
            hasImage
              ? "bg-violet-600 hover:bg-violet-500 text-white"
              : "bg-zinc-800 text-zinc-600 cursor-not-allowed"
          }`}
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Done
        </button>

        {/* Sign In */}
        <button className="text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
          Sign In
        </button>
      </div>
    </header>
  );
}
