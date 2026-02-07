import type { BlurTarget } from "../../types";

interface Props {
  targets: BlurTarget[];
  onToggle: (targetId: string) => void;
  onDelete: (targetId: string) => void;
}

export default function CustomBlurList({ targets, onToggle, onDelete }: Props) {
  const customTargets = targets.filter((t) => t.source === "custom");

  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
        Custom blur list
      </h3>

      {customTargets.length === 0 ? (
        <p className="text-xs text-zinc-600 pl-1">No items selected</p>
      ) : (
        <div className="space-y-1">
          {customTargets.map((target, idx) => (
            <div
              key={target.id}
              className="flex items-center gap-2 py-1.5 px-1 rounded hover:bg-[#1f1f2e] transition-colors group"
            >
              <input
                type="checkbox"
                checked={target.enabled}
                onChange={() => onToggle(target.id)}
                className="w-3.5 h-3.5 rounded border-zinc-600 text-violet-600 focus:ring-violet-500/30 bg-[#1a1a24]"
              />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-zinc-300">Area {idx + 1}</p>
                <p className="text-[10px] text-zinc-600">
                  {target.bbox.width}x{target.bbox.height}px
                </p>
              </div>
              <button
                onClick={() => onDelete(target.id)}
                className="opacity-0 group-hover:opacity-100 text-zinc-600 hover:text-red-400 transition-all p-0.5"
                title="Delete"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
