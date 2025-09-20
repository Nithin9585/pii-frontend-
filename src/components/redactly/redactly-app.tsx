
"use client";

import { useState, useEffect } from "react";
import type { PIIEntity, QueuedFile, SignatureEntity } from "@/lib/types";
import { FileUploader } from "./file-uploader";
import { useFileProcessor } from "@/hooks/use-file-processor";
import { FileQueueItem } from "./file-queue-item";
import { ResultsView } from "./results-view";
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { v4 as uuidv4 } from "uuid";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

export function RedactlyApp() {
  const [fileQueue, setFileQueue] = useState<QueuedFile[]>([]);
  const [activeFileId, setActiveFileId] = useState<string | null>(null);
  const [useLLM, setUseLLM] = useState(true);

  useFileProcessor(fileQueue, setFileQueue, useLLM);

  const handleFilesAdded = (files: File[]) => {
    const newQueuedFiles: QueuedFile[] = files.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      thumbnailUrl: URL.createObjectURL(file),
      status: "pending",
      redactionSelections: new Set(),
    }));

    // Prevent duplicates by checking file names
    const existingFileNames = new Set(fileQueue.map(f => f.file.name));
    const uniqueNewFiles = newQueuedFiles.filter(f => !existingFileNames.has(f.file.name));

    setFileQueue((prev) => [...prev, ...uniqueNewFiles].slice(0, 30));
  };
  
  const handleRemoveFile = (id: string) => {
    setFileQueue((prev) => prev.filter((f) => f.id !== id));
    if (activeFileId === id) {
      setActiveFileId(fileQueue.length > 1 ? fileQueue.filter(f => f.id !== id)[0]?.id || null : null);
    }
  };

  const updateFileInQueue = (id: string, updates: Partial<QueuedFile>) => {
    setFileQueue(prev => prev.map(f => {
        if (f.id === id) {
            // CRITICAL FIX: Ensure the original file object is preserved when updating
            return { ...f, ...updates };
        }
        return f;
    }));
  };

  const activeFile = fileQueue.find((f) => f.id === activeFileId);
  const completedFiles = fileQueue.filter(f => f.status === 'redacted' && f.redactedFileUrl);

  const handleDownloadAll = () => {
    completedFiles.forEach(file => {
      if (file.redactedFileUrl) {
        const a = document.createElement('a');
        a.href = file.redactedFileUrl;
        a.download = `redacted-${file.id}`; // Use ID for uniqueness
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    });
  };
  
  const selectFirstCompletedFile = () => {
    if (fileQueue.length > 0 && !activeFileId) {
       const firstCompleted = fileQueue.find(f => f.status === 'completed' || f.status === 'redacted');
       if (firstCompleted) {
         setActiveFileId(firstCompleted.id);
       }
    }
  };

  useEffect(() => {
    selectFirstCompletedFile();
  }, [fileQueue]);


  return (
    <div className="w-full h-full flex flex-col md:flex-row gap-6">
      <div className="md:w-1/3 lg:w-1/4 flex flex-col gap-4">
        <FileUploader onFilesAdded={handleFilesAdded} fileCount={fileQueue.length} />
        <div className="flex items-center space-x-2 bg-card border p-3 rounded-lg">
            <Switch id="use-llm" checked={useLLM} onCheckedChange={setUseLLM} />
            <Label htmlFor="use-llm" className="cursor-pointer">Use LLM for Detection</Label>
        </div>
        {fileQueue.length > 0 && (
          <div className="bg-card border rounded-lg p-4 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <h3 className="font-semibold">Upload Queue ({fileQueue.length})</h3>
              {completedFiles.length > 1 && (
                 <Button variant="outline" size="sm" onClick={handleDownloadAll}>
                   <Download className="mr-2 h-4 w-4" />
                   Download All
                 </Button>
              )}
            </div>
            <ScrollArea className="h-[calc(100vh-25rem)] pr-3">
              <div className="flex flex-col gap-3">
                {fileQueue.map((queuedFile) => (
                  <FileQueueItem
                    key={queuedFile.id}
                    file={queuedFile}
                    isActive={queuedFile.id === activeFileId}
                    onSelect={() => setActiveFileId(queuedFile.id)}
                    onRemove={handleRemoveFile}
                  />
                ))}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>
      <div className="md:w-2/3 lg:w-3/4 flex-1">
        {activeFile ? (
          <ResultsView key={activeFile.id} file={activeFile} updateFile={updateFileInQueue} />
        ) : (
          <div className="flex h-full items-center justify-center bg-card border rounded-lg">
            <div className="text-center text-muted-foreground p-8">
              <h2 className="text-xl font-medium mb-2">Welcome to Redactly</h2>
              <p>Upload a document to begin, then select it from the queue to view and redact.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
