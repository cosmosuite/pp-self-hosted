interface Props {
  file: File | null;
  dimensions: { width: number; height: number } | null;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getFileType(file: File): string {
  const ext = file.name.split(".").pop()?.toUpperCase();
  return ext || file.type.split("/")[1]?.toUpperCase() || "Unknown";
}

export default function ImageDetails({ file, dimensions }: Props) {
  return (
    <div>
      <h3 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
        Image details
      </h3>

      {!file ? (
        <p className="text-xs text-zinc-600 pl-1">No image loaded</p>
      ) : (
        <div className="space-y-1.5">
          <DetailRow label="File name" value={file.name} truncate />
          <DetailRow label="Size" value={formatSize(file.size)} />
          <DetailRow label="Type" value={getFileType(file)} />
          {dimensions && (
            <DetailRow
              label="Dimensions"
              value={`${dimensions.width} x ${dimensions.height}`}
            />
          )}
        </div>
      )}
    </div>
  );
}

function DetailRow({
  label,
  value,
  truncate,
}: {
  label: string;
  value: string;
  truncate?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3 text-xs">
      <span className="text-zinc-500 flex-shrink-0">{label}</span>
      <span
        className={`text-zinc-300 text-right ${truncate ? "truncate max-w-[120px]" : ""}`}
        title={truncate ? value : undefined}
      >
        {value}
      </span>
    </div>
  );
}
