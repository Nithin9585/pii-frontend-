
export type FileStatus =
  | 'pending'
  | 'uploading'
  | 'processing'
  | 'completed'
  | 'error'
  | 'redacting'
  | 'redacted';

export interface BoundingBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
}

// Represents a detected PII entity from the backend
export interface BackendPIIEntity {
  type: string;
  value: string;
  confidence: number;
  bbox: BoundingBox;
}

// Represents a detected signature from the backend
export interface BackendSignature {
  bbox: BoundingBox;
  confidence: number;
}

// This is the PII entity type the UI components will use
export interface PIIEntity {
  id: string;
  type: string;
  text: string;
  boundingBox: BoundingBox;
}

// This is the Signature entity type the UI components will use
export interface SignatureEntity {
  id: string;
  type: 'SIGNATURE';
  text: string;
  boundingBox: BoundingBox;
}

export interface OcrBlock {
  text: string;
  confidence: number;
  position: {
    top_left: [number, number];
    top_right: [number, number];
    bottom_right: [number, number];
    bottom_left: [number, number];
  }
}

export interface ProcessingResult {
  pii_detection?: BackendPIIEntity[];
  signatures?: BackendSignature[];
  ocr?: {
    pages: {
      page_number: number;
      blocks: OcrBlock[];
    }[];
  };
  ocrText?: string;
  rawResponse?: string;
}

export interface QueuedFile {
  id: string;
  file: File;
  thumbnailUrl: string;
  status: FileStatus;
  progress?: number;
  result?: ProcessingResult;
  piiEntities?: PIIEntity[];
  signatureEntities?: SignatureEntity[];
  redactionSelections: Set<string>;
  redactedFileUrl?: string;
  error?: string;
}

export type RedactionStyle = 'blackbox' | 'pixelate' | 'colorfill';

export interface RedactionOptions {
  style: RedactionStyle;
  colorFill: string;
  pixelateAmount: number;
  blackboxOpacity: number;
}
