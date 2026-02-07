import type { BlurTarget } from "../../types";

interface Props {
  targets: BlurTarget[];
  onToggle: (targetId: string) => void;
}

export default function TargetList({ targets, onToggle }: Props) {
  const aiTargets = targets.filter((t) => t.source === "ai");

  if (aiTargets.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
          Target List
        </h3>
        <p className="text-xs text-zinc-600 pl-1">No items selected</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        Target List
      </h3>
      <div className="space-y-1">
        {aiTargets.map((target) => (
          <label
            key={target.id}
            className="flex items-center gap-2.5 py-1.5 px-1 rounded hover:bg-[#1f1f2e] cursor-pointer transition-colors"
          >
            <input
              type="checkbox"
              checked={target.enabled}
              onChange={() => onToggle(target.id)}
              className="w-3.5 h-3.5 rounded border-zinc-600 text-violet-600 focus:ring-violet-500/30 bg-[#1a1a24]"
            />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-zinc-300 truncate">
                {target.label.replace(/_/g, " ").replace("EXPOSED", "").trim()}
              </p>
              {target.confidence != null && (
                <p className="text-[10px] text-zinc-600">
                  {(target.confidence * 100).toFixed(0)}% confidence
                </p>
              )}
            </div>
          </label>
        ))}
      </div>
    </div>
  );
}
