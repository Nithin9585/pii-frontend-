"use client";

import { useState, useRef, useCallback } from "react";
import { UploadCloud, File as FileIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface FileUploaderProps {
  onFilesAdded: (files: File[]) => void;
  fileCount: number;
}

const MAX_FILES = 30;

export function FileUploader({ onFilesAdded, fileCount }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(Array.from(e.target.files));
    }
  };

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDragIn = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragOut = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  }, [fileCount]);

  const processFiles = (files: File[]) => {
    const totalFiles = fileCount + files.length;
    if (totalFiles > MAX_FILES) {
      toast({
        variant: "destructive",
        title: "File limit exceeded",
        description: `You can only upload a maximum of ${MAX_FILES} files.`,
      });
      return;
    }
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length !== files.length) {
        toast({
            title: "Unsupported file type",
            description: "Only image files are supported for now.",
        });
    }
    if(imageFiles.length > 0) {
        onFilesAdded(imageFiles);
    }
  };

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center w-full p-8 border-2 border-dashed rounded-lg cursor-pointer transition-colors duration-300",
        isDragging
          ? "border-primary bg-primary/10"
          : "border-border hover:border-primary/50 hover:bg-accent/50"
      )}
      onDragEnter={handleDragIn}
      onDragLeave={handleDragOut}
      onDragOver={handleDrag}
      onDrop={handleDrop}
      onClick={() => fileInputRef.current?.click()}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*"
        className="hidden"
        onChange={handleFileChange}
      />
      <div className="flex flex-col items-center justify-center text-center">
        <UploadCloud className={cn("w-12 h-12 mb-4", isDragging ? "text-primary" : "text-muted-foreground")} />
        <p className="mb-2 text-sm font-semibold text-foreground">
          Drag & drop files here, or click to select
        </p>
        <p className="text-xs text-muted-foreground">
          Supports images (PNG, JPG, etc). Max 30 files.
        </p>
      </div>
    </div>
  );
}
