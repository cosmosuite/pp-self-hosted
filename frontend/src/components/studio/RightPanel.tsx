import type { BlurTarget, ImageDimensions } from "../../types";
import TargetList from "./TargetList";
import CustomBlurList from "./CustomBlurList";
import ImageDetails from "./ImageDetails";

interface Props {
  targets: BlurTarget[];
  onToggleTarget: (targetId: string) => void;
  onDeleteCustom: (targetId: string) => void;
  file: File | null;
  dimensions: ImageDimensions | null;
}

export default function RightPanel({
  targets,
  onToggleTarget,
  onDeleteCustom,
  file,
  dimensions,
}: Props) {
  return (
    <aside className="w-[220px] flex-shrink-0 bg-[#111118] border-l border-[#2a2a3a] overflow-y-auto h-full">
      <div className="p-4 space-y-5">
        <TargetList targets={targets} onToggle={onToggleTarget} />

        <div className="border-t border-[#2a2a3a]" />

        <CustomBlurList
          targets={targets}
          onToggle={onToggleTarget}
          onDelete={onDeleteCustom}
        />

        <div className="border-t border-[#2a2a3a]" />

        <ImageDetails file={file} dimensions={dimensions} />
      </div>
    </aside>
  );
}
