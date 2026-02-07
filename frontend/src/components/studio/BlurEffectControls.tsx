import type { BlurShape, EffectSettings, EffectType } from "../../types";

interface Props {
  settings: EffectSettings;
  onChange: (settings: EffectSettings) => void;
}

const EFFECT_TYPES: { value: EffectType; label: string }[] = [
  { value: "blur", label: "Blur" },
  { value: "pixelation", label: "Pixelation" },
  { value: "solid", label: "Solid" },
];

const SHAPE_OPTIONS: { value: BlurShape; label: string; icon: string; desc: string }[] = [
  { value: "rectangle", label: "Rectangle", icon: "▭", desc: "Square bounding box" },
  { value: "contour", label: "Contour", icon: "⬮", desc: "Elliptical contour shape" },
];

export default function BlurEffectControls({ settings, onChange }: Props) {
  const update = (patch: Partial<EffectSettings>) =>
    onChange({ ...settings, ...patch });

  return (
    <div className="space-y-4">
      {/* Shape selector */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">Shape</p>
        <div className="flex rounded-lg overflow-hidden border border-[#2a2a3a]">
          {SHAPE_OPTIONS.map((s) => (
            <button
              key={s.value}
              onClick={() => update({ shape: s.value })}
              title={s.desc}
              className={`flex-1 py-2 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 ${
                settings.shape === s.value
                  ? "bg-violet-600 text-white"
                  : "bg-[#1a1a24] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              <span className="text-sm leading-none">{s.icon}</span>
              {s.label}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-zinc-600 mt-1">
          {settings.shape === "contour"
            ? "Follows body contours with elliptical shape — looks natural on faces."
            : "Standard rectangular bounding box blur."}
        </p>
      </div>

      {/* Type selector */}
      <div>
        <p className="text-xs text-zinc-500 mb-2">Type</p>
        <div className="flex rounded-lg overflow-hidden border border-[#2a2a3a]">
          {EFFECT_TYPES.map((t) => (
            <button
              key={t.value}
              onClick={() => update({ type: t.value })}
              className={`flex-1 py-2 text-xs font-medium transition-colors ${
                settings.type === t.value
                  ? "bg-violet-600 text-white"
                  : "bg-[#1a1a24] text-zinc-400 hover:text-zinc-200"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Intensity (for blur) */}
      {settings.type === "blur" && (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-zinc-500">Intensity</span>
            <span className="text-zinc-300 font-mono">{settings.intensity}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={settings.intensity}
            onChange={(e) => update({ intensity: parseInt(e.target.value) })}
            className="w-full accent-violet-500 h-1.5"
          />
        </div>
      )}

      {/* Size (for pixelation) */}
      {settings.type === "pixelation" && (
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-zinc-500">Size</span>
            <span className="text-zinc-300 font-mono">{settings.size}</span>
          </div>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            value={settings.size}
            onChange={(e) => update({ size: parseInt(e.target.value) })}
            className="w-full accent-violet-500 h-1.5"
          />
        </div>
      )}

      {/* Color picker (for solid) */}
      {settings.type === "solid" && (
        <div>
          <p className="text-xs text-zinc-500 mb-2">Color</p>
          <div className="flex items-center gap-3">
            <input
              type="color"
              value={settings.solidColor}
              onChange={(e) => update({ solidColor: e.target.value })}
              className="w-8 h-8 rounded border border-[#2a2a3a] cursor-pointer bg-transparent"
            />
            <span className="text-xs text-zinc-400 font-mono">{settings.solidColor}</span>
          </div>
          {/* Quick color presets */}
          <div className="flex gap-2 mt-2">
            {["#000000", "#ffffff", "#ef4444", "#f97316", "#7c3aed"].map((c) => (
              <button
                key={c}
                onClick={() => update({ solidColor: c })}
                className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  settings.solidColor === c ? "border-violet-400 scale-110" : "border-[#2a2a3a]"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
