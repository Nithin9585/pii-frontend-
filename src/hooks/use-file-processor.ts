
// src/hooks/use-file-processor.ts
"use client";

import { useEffect, useCallback } from "react";
import type { QueuedFile, PIIEntity, ProcessingResult, BackendPIIEntity, BackendSignature, SignatureEntity, OcrBlock } from "@/lib/types";
import { v4 as uuidv4 } from "uuid";

const API_BASE_URL = 'https://et-backend-157136045061.us-central1.run.app';

export function useFileProcessor(
  fileQueue: QueuedFile[],
  setFileQueue: React.Dispatch<React.SetStateAction<QueuedFile[]>>,
  useLLM: boolean
) {
  const updateFile = useCallback((id: string, updates: Partial<QueuedFile>) => {
    setFileQueue(prev => prev.map(f => f.id === id ? { ...f, ...updates } : f));
  }, [setFileQueue]);

  useEffect(() => {
    const processFile = async (file: QueuedFile) => {
      if (file.status !== "pending") return;

      updateFile(file.id, { status: "uploading" });

      try {
        const formData = new FormData();
        formData.append("file", file.file);
        formData.append("use_llm", String(useLLM));
        
        updateFile(file.id, { status: "processing" });

        const response = await fetch(`${API_BASE_URL}/process_document`, {
            method: 'POST',
            body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Failed to process document: ${response.statusText} - ${errorText}`);
        }

        const resultData: ProcessingResult = await response.json();
        
        const piiEntities: PIIEntity[] = [];
        const signatureEntities: SignatureEntity[] = [];
        const defaultSelections = new Set<string>();
        
        // Process PII entities
        if (resultData.pii_detection) {
          resultData.pii_detection.forEach((p: BackendPIIEntity) => {
            const entityId = uuidv4();
            piiEntities.push({
              id: entityId,
              type: p.type,
              text: p.value,
              boundingBox: p.bbox,
            });
            defaultSelections.add(entityId);
          });
        }
        
        // Process signatures
        if (resultData.signatures) {
          resultData.signatures.forEach((s: BackendSignature) => {
            const entityId = uuidv4();
            signatureEntities.push({
              id: entityId,
              type: 'SIGNATURE',
              text: 'Signature',
              boundingBox: s.bbox,
            });
            defaultSelections.add(entityId);
          });
        }

        // Extract OCR text
        let ocrText = '';
        if (resultData.ocr && resultData.ocr.pages) {
            resultData.ocr.pages.forEach(page => {
                page.blocks.forEach((block: OcrBlock) => {
                    ocrText += block.text + '\n';
                });
            });
        }
        
        updateFile(file.id, {
          status: "completed",
          result: { ...resultData, ocrText, rawResponse: JSON.stringify(resultData, null, 2) },
          piiEntities: piiEntities,
          signatureEntities: signatureEntities,
          redactionSelections: defaultSelections,
        });

      } catch (error) {
        console.error("File processing error:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        updateFile(file.id, {
          status: "error",
          error: `Processing failed: ${errorMessage}`,
        });
      }
    };

    fileQueue.forEach(processFile);

  }, [fileQueue, updateFile, useLLM]);
}
