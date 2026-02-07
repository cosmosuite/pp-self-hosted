import { useState } from "react";
import type { BlurMode, BodyPartGroup, EffectSettings } from "../../types";
import BodyPartToggles from "./BodyPartToggles";
import BlurEffectControls from "./BlurEffectControls";

interface Props {
  fullScreenBlur: boolean;
  onFullScreenBlurToggle: () => void;
  isDrawMode: boolean;
  onDrawModeToggle: () => void;
  aiDetectionEnabled: boolean;
  onAiDetectionToggle: () => void;
  bodyPartGroups: BodyPartGroup[];
  onBodyPartToggle: (groupId: string) => void;
  blurMode: BlurMode;
  onBlurModeChange: (mode: BlurMode) => void;
  effectSettings: EffectSettings;
  onEffectSettingsChange: (settings: EffectSettings) => void;
  hasImage: boolean;
}

export default function LeftPanel({
  fullScreenBlur,
  onFullScreenBlurToggle,
  isDrawMode,
  onDrawModeToggle,
  aiDetectionEnabled,
  onAiDetectionToggle,
  bodyPartGroups,
  onBodyPartToggle,
  blurMode,
  onBlurModeChange,
  effectSettings,
  onEffectSettingsChange,
  hasImage,
}: Props) {
  const [effectOpen, setEffectOpen] = useState(true);

  return (
    <aside className="w-[240px] flex-shrink-0 bg-[#111118] border-r border-[#2a2a3a] overflow-y-auto h-full">
      <div className="p-4 space-y-5">
        {/* ── Full screen blur ──────────────────────────────────── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-sm text-zinc-300">Full screen blur</span>
            <span
              className="text-zinc-600 cursor-help text-xs"
              title="Blur the entire image"
            >
              &#9432;
            </span>
          </div>
          <button
            onClick={onFullScreenBlurToggle}
            disabled={!hasImage}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
              fullScreenBlur ? "bg-violet-600" : "bg-zinc-700"
            } ${!hasImage ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                fullScreenBlur ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>

        {/* ── Divider ──────────────────────────────────────────── */}
        <div className="border-t border-[#2a2a3a]" />

        {/* ── Custom blur ──────────────────────────────────────── */}
        <div>
          <div className="flex items-center gap-1.5 mb-2">
            <span className="text-sm text-zinc-300">Custom blur</span>
            <span
              className="text-zinc-600 cursor-help text-xs"
              title="Draw custom blur areas on the image"
            >
              &#9432;
            </span>
          </div>
          <button
            onClick={onDrawModeToggle}
            disabled={!hasImage}
            className={`w-full flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
              isDrawMode
                ? "bg-violet-600 text-white ring-2 ring-violet-400/50"
                : "bg-[#1a1a24] border border-[#2a2a3a] text-zinc-300 hover:border-violet-500/50 hover:text-white"
            } ${!hasImage ? "opacity-40 cursor-not-allowed" : ""}`}
          >
            <span className="text-base">+</span>
            Add custom blur area
            {isDrawMode && (
              <span className="text-[10px] bg-violet-500 px-1.5 py-0.5 rounded-full ml-1">
                ACTIVE
              </span>
            )}
          </button>
        </div>

        {/* ── Divider ──────────────────────────────────────────── */}
        <div className="border-t border-[#2a2a3a]" />

        {/* ── AI Detection ─────────────────────────────────────── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm text-zinc-300">Enable AI detection</span>
            <button
              onClick={onAiDetectionToggle}
              disabled={!hasImage}
              className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
                aiDetectionEnabled ? "bg-violet-600" : "bg-zinc-700"
              } ${!hasImage ? "opacity-40 cursor-not-allowed" : ""}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  aiDetectionEnabled ? "translate-x-4" : ""
                }`}
              />
            </button>
          </div>

          {aiDetectionEnabled && hasImage && (
            <BodyPartToggles groups={bodyPartGroups} onToggle={onBodyPartToggle} />
          )}
        </div>

        {/* ── Divider ──────────────────────────────────────────── */}
        <div className="border-t border-[#2a2a3a]" />

        {/* ── Auto blur application mode ───────────────────────── */}
        <div>
          <p className="text-xs text-zinc-500 mb-2">Auto blur application mode</p>
          <select
            value={blurMode}
            onChange={(e) => onBlurModeChange(e.target.value as BlurMode)}
            className="w-full bg-[#1a1a24] border border-[#2a2a3a] rounded-lg px-3 py-2 text-sm text-zinc-300 appearance-none cursor-pointer focus:outline-none focus:border-violet-500/50"
          >
            <option value="all">Apply Blur to All (Default)</option>
            <option value="selective">Selective</option>
          </select>
          <p className="text-[11px] text-zinc-600 mt-1.5">
            {blurMode === "all"
              ? "Blur will be automatically applied to detected body parts."
              : "Select which detected regions to blur individually."}
          </p>
        </div>

        {/* ── Divider ──────────────────────────────────────────── */}
        <div className="border-t border-[#2a2a3a]" />

        {/* ── Blur effect ──────────────────────────────────────── */}
        <div>
          <button
            onClick={() => setEffectOpen(!effectOpen)}
            className="flex items-center justify-between w-full text-sm text-zinc-300 hover:text-white transition-colors"
          >
            <span>Blur effect</span>
            <svg
              className={`w-4 h-4 text-violet-400 transition-transform ${
                effectOpen ? "rotate-0" : "-rotate-90"
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {effectOpen && (
            <div className="mt-3">
              <BlurEffectControls
                settings={effectSettings}
                onChange={onEffectSettingsChange}
              />
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
