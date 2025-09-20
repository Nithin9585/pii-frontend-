"use client";

import { QueuedFile } from "@/lib/types";
import { cn } from "@/lib/utils";
import {
  FileText,
  Loader2,
  CheckCircle2,
  XCircle,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

interface FileQueueItemProps {
  file: QueuedFile;
  isActive: boolean;
  onSelect: () => void;
  onRemove: (id: string) => void;
}

const StatusIcon = ({ status }: { status: QueuedFile["status"] }) => {
  switch (status) {
    case "pending":
      return <FileText className="h-5 w-5 text-muted-foreground" />;
    case "uploading":
    case "processing":
      return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    case "redacting":
      return <Loader2 className="h-5 w-5 text-primary animate-spin" />;
    case "completed":
    case "redacted":
      return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    case "error":
      return <XCircle className="h-5 w-5 text-destructive" />;
    default:
      return null;
  }
};

export function FileQueueItem({
  file,
  isActive,
  onSelect,
  onRemove,
}: FileQueueItemProps) {
  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(file.id);
  };

  const statusText = file.status.charAt(0).toUpperCase() + file.status.slice(1);

  return (
    <div
      onClick={onSelect}
      className={cn(
        "flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors",
        isActive
          ? "bg-primary/10"
          : "hover:bg-accent/50",
        file.status === 'error' && 'bg-destructive/10'
      )}
    >
      <Image
        src={file.thumbnailUrl}
        alt={file.file.name}
        width={40}
        height={40}
        className="rounded-md object-cover h-10 w-10"
      />
      <div className="flex-1 overflow-hidden">
        <p className="text-sm font-medium truncate">{file.file.name}</p>
        <p className="text-xs text-muted-foreground">{statusText}</p>
        {file.error && <p className="text-xs text-destructive truncate">{file.error}</p>}
      </div>
      <div className="flex items-center gap-2">
        <StatusIcon status={file.status} />
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={handleRemove}
        >
          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
          <span className="sr-only">Remove file</span>
        </Button>
      </div>
    </div>
  );
}
