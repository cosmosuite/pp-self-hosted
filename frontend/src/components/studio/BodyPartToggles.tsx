import type { BodyPartGroup } from "../../types";

interface Props {
  groups: BodyPartGroup[];
  onToggle: (groupId: string) => void;
}

const GROUP_ICONS: Record<string, string> = {
  face: "👤",
  breasts: "🔒",
  buttocks: "🔒",
  genitalia: "🔒",
  belly: "🔒",
  anus: "🔒",
  feet: "🦶",
  armpits: "🔒",
};

export default function BodyPartToggles({ groups, onToggle }: Props) {
  return (
    <div className="space-y-1">
      {groups.map((group) => (
        <div
          key={group.id}
          className="flex items-center justify-between py-2 px-1 rounded-lg hover:bg-[#1f1f2e] transition-colors"
        >
          <div className="flex items-center gap-2.5">
            <span className="text-sm w-5 text-center">{GROUP_ICONS[group.id] || "🔒"}</span>
            <span className="text-sm text-zinc-300">{group.label}</span>
          </div>
          <button
            onClick={() => onToggle(group.id)}
            className={`relative w-9 h-5 rounded-full transition-colors flex-shrink-0 ${
              group.enabled ? "bg-violet-600" : "bg-zinc-700"
            }`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                group.enabled ? "translate-x-4" : ""
              }`}
            />
          </button>
        </div>
      ))}
    </div>
  );
}
