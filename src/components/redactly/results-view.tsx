
"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import NextImage from "next/image";
import type { QueuedFile, PIIEntity, RedactionStyle, RedactionOptions, SignatureEntity } from "@/lib/types";
import { applyRedaction } from "@/lib/actions";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Loader2,
  FileWarning,
  Code,
  Sparkles,
  Eraser,
  Download,
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { AiSuggestionDialog } from "./ai-suggestion-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";


interface ResultsViewProps {
  file: QueuedFile;
  updateFile: (id: string, updates: Partial<QueuedFile>) => void;
}

const getEntityColor = (type: string) => {
  const colors: { [key: string]: string } = {
    SIGNATURE: "border-yellow-500",
    NAME: "border-blue-500",
    ADDRESS: "border-green-500",
    DEA_NUMBER: "border-purple-500",
    LICENCE_NUMBER: "border-purple-500",
    DATE: "border-red-500",
    PHONE_NUMBER: "border-pink-500",
    DEFAULT: "border-gray-500",
  };
  const upperType = type.toUpperCase();
  return (
    colors[
      Object.keys(colors).find(
        (key) => upperType.includes(key) && key !== "DEFAULT"
      ) || "DEFAULT"
    ]
  );
};


// Live preview component for redaction styles
const RedactionPreview = ({
  options,
  imageUrl,
  box,
  scale,
  imageSize,
}: {
  options: RedactionOptions;
  imageUrl: string;
  box: PIIEntity['boundingBox'];
  scale: number;
  imageSize: { width: number; height: number };
}) => {
  const { style, blackboxOpacity, colorFill, pixelateAmount } = options;

  switch (style) {
    case 'blackbox':
      return <div className="w-full h-full bg-black" style={{ opacity: blackboxOpacity }} />;
    case 'colorfill':
      return <div className="w-full h-full" style={{ backgroundColor: colorFill }} />;
    case 'pixelate':
        // The background image will be the full original image.
        // We position it such that the top-left of the box we want to pixelate
        // is at the top-left of our preview div.
        const pixelation = pixelateAmount / 100;
        const boxWidth = (box.x2 - box.x1) * scale;
        const boxHeight = (box.y2 - box.y1) * scale;
        
        return (
          <div className="w-full h-full overflow-hidden">
            <div
                style={{
                    backgroundImage: `url(${imageUrl})`,
                    backgroundPosition: `-${box.x1 * scale}px -${box.y1 * scale}px`,
                    backgroundSize: `${imageSize.width}px ${imageSize.height}px`,
                    imageRendering: 'pixelated',
                    width: `${boxWidth}px`,
                    height: `${boxHeight}px`,
                    transform: `scale(${1 / pixelation})`,
                    transformOrigin: 'top left',
                    clipPath: `inset(0 ${boxWidth - boxWidth * pixelation}px ${boxHeight - boxHeight * pixelation}px 0)`,
                }}
            >
              <div
                style={{
                  width: `${boxWidth}px`,
                  height: `${boxHeight}px`,
                  transform: `scale(${pixelation})`,
                  transformOrigin: 'top left',
                }}
              ></div>
            </div>
          </div>
        );
    default:
      return null;
  }
};


export function ResultsView({ file, updateFile }: ResultsViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [renderedSize, setRenderedSize] = useState({ width: 0, height: 0 });
  const [isAiDialogOpen, setIsAiDialogOpen] = useState(false);
  const [redactionOptions, setRedactionOptions] = useState<RedactionOptions>({
    style: 'blackbox',
    colorFill: '#3F51B5', // Default to primary color
    pixelateAmount: 10,
    blackboxOpacity: 1,
  });
  const { toast } = useToast();

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setRenderedSize({ width: img.offsetWidth, height: img.offsetHeight });
  };
  
  const updateRenderedSize = useCallback(() => {
    if (imageRef.current) {
      setRenderedSize({
        width: imageRef.current.offsetWidth,
        height: imageRef.current.offsetHeight,
      });
    }
  }, []);

  useEffect(() => {
    window.addEventListener('resize', updateRenderedSize);
    return () => window.removeEventListener('resize', updateRenderedSize);
  }, [updateRenderedSize]);

  useEffect(() => {
    updateRenderedSize();
  }, [file.id, updateRenderedSize]);

  const handleSelectionChange = (entityId: string) => {
    const newSelections = new Set(file.redactionSelections);
    if (newSelections.has(entityId)) {
      newSelections.delete(entityId);
    } else {
      newSelections.add(entityId);
    }
    updateFile(file.id, { redactionSelections: newSelections });
  };
  
  const handleSelectAll = (select: boolean, type: 'pii' | 'signature') => {
    const newSelections = new Set(file.redactionSelections);
    const targetEntities = type === 'pii' ? file.piiEntities : file.signatureEntities;
    
    if (select) {
      targetEntities?.forEach(e => newSelections.add(e.id));
    } else {
      targetEntities?.forEach(e => newSelections.delete(e.id));
    }
    updateFile(file.id, { redactionSelections: newSelections });
  };

  const handleRedactClick = async () => {
    const allEntities = [...(file.piiEntities || []), ...(file.signatureEntities || [])];
    if (allEntities.length === 0 || file.redactionSelections.size === 0) {
      toast({
        variant: "destructive",
        title: "No selections",
        description: "Please select at least one item to redact.",
      });
      return;
    }

    // For real files, ensure the original file data exists. This is crucial for files restored from localStorage.
    if (!file.file || file.file.size === 0) {
        toast({
            variant: "destructive",
            title: "Original File Data Missing",
            description: "Cannot redact a file restored from session. Please re-upload the file to apply redactions.",
        });
        return;
    }

    updateFile(file.id, { status: 'redacting' });

    // Handle real files with server-side action
    try {
      if (!allEntities) throw new Error("No entities to redact.");
      
      const selectedBoundingBoxes = allEntities
        .filter(e => file.redactionSelections.has(e.id))
        .map(e => e.boundingBox);


      const redactedBlob = await applyRedaction(file.file, selectedBoundingBoxes, redactionOptions);
      
      const redactedUrl = URL.createObjectURL(redactedBlob);

      updateFile(file.id, {
        status: 'redacted',
        redactedFileUrl: redactedUrl,
      });

      toast({
        title: "Redaction Successful",
        description: "The document has been redacted.",
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      updateFile(file.id, { status: 'completed', error: `Redaction failed: ${errorMessage}` });
      toast({
        variant: "destructive",
        title: "Redaction Failed",
        description: errorMessage,
      });
      console.error("Redaction error details:", error);
    }
  };

  const handleOptionChange = (key: keyof RedactionOptions, value: any) => {
    setRedactionOptions(prev => ({ ...prev, [key]: value }));
  };


  let formattedResponse = file.result?.rawResponse;
  try {
    if (formattedResponse) {
      formattedResponse = JSON.stringify(JSON.parse(formattedResponse), null, 2);
    }
  } catch (e) {
    // Ignore formatting errors
  }

  const renderStatusView = () => {
    switch (file.status) {
      case "pending":
      case "processing":
      case "uploading":
        return (
          <div className="text-center text-muted-foreground p-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-medium mb-2">Processing Document...</h2>
            <p>This may take some time depending on the document size.</p>
          </div>
        );
      case "redacting":
        return (
          <div className="text-center text-muted-foreground p-8">
            <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
            <h2 className="text-xl font-medium mb-2">Applying Redactions...</h2>
          </div>
        );
      case "error":
        return (
          <div className="text-center text-destructive p-8">
            <FileWarning className="mx-auto h-12 w-12 mb-4" />
            <h2 className="text-xl font-medium mb-2">Processing Failed</h2>
            <p className="max-w-md mx-auto">{file.error || "An unexpected error occurred."}</p>
          </div>
        );
      default:
        return null;
    }
  };

  const isProcessing = file.status !== 'completed' && file.status !== 'redacted';
  const displayUrl = file.status === 'redacted' && file.redactedFileUrl ? file.redactedFileUrl : file.thumbnailUrl;
  
  const scale = naturalSize.width > 0 ? renderedSize.width / naturalSize.width : 0;
  
  const allEntities = [...(file.piiEntities || []), ...(file.signatureEntities || [])];
  
  const areAllPiiSelected = (file.piiEntities?.length || 0) > 0 && file.piiEntities?.every(e => file.redactionSelections.has(e.id));
  const areAllSignaturesSelected = (file.signatureEntities?.length || 0) > 0 && file.signatureEntities?.every(e => file.redactionSelections.has(e.id));


  return (
    <div className="flex flex-col md:flex-row gap-4">
      {isProcessing ? (
         <div className="w-full flex items-center justify-center bg-card border rounded-lg min-h-[400px]">
          {renderStatusView()}
        </div>
      ) : (
        <>
          <div className="w-full md:w-3/5 bg-card border rounded-lg flex items-start justify-center overflow-hidden">
             <div ref={containerRef} className="relative w-full">
                <NextImage
                  ref={imageRef}
                  src={displayUrl}
                  alt={file.file.name}
                  width={naturalSize.width || 1000}
                  height={naturalSize.height || 1000}
                  style={{ 
                    width: '100%',
                    height: 'auto',
                    objectFit: 'contain' 
                  }}
                  onLoad={handleImageLoad}
                  unoptimized // Important for redacted images and consistent sizing
                />
                {file.status !== 'redacted' && allEntities.map((entity) => {
                  const isSelected = file.redactionSelections.has(entity.id);
                  const boxWidth = (entity.boundingBox.x2 - entity.boundingBox.x1) * scale;
                  const boxHeight = (entity.boundingBox.y2 - entity.boundingBox.y1) * scale;
                  const left = entity.boundingBox.x1 * scale;
                  const top = entity.boundingBox.y1 * scale;
                  const colorClass = getEntityColor(entity.type);

                  return (
                    <div
                      key={entity.id}
                      className={`absolute border-2 cursor-pointer ${isSelected ? colorClass : 'border-transparent'}`}
                      style={{
                        left: `${left}px`,
                        top: `${top}px`,
                        width: `${boxWidth}px`,
                        height: `${boxHeight}px`,
                      }}
                      onClick={() => handleSelectionChange(entity.id)}
                    >
                      {isSelected ? (
                        <RedactionPreview
                          options={redactionOptions}
                          imageUrl={displayUrl}
                          box={entity.boundingBox}
                          scale={scale}
                          imageSize={renderedSize}
                        />
                      ) : (
                        <div className={`w-full h-full ${colorClass} border-2 opacity-30 hover:opacity-60`}></div>
                      )}

                      <Badge variant="secondary" className="absolute -top-6 left-0 text-xs whitespace-nowrap">
                        {entity.type}
                      </Badge>
                    </div>
                  );
                })}
            </div>
          </div>
          <div className="w-full md:w-2/5 flex flex-col gap-4">
            <div className="bg-card border rounded-lg p-4 flex flex-col gap-4">
              {file.status === 'redacted' ? (
                 <div className="flex flex-col items-center justify-center h-full text-center p-4">
                    <p className="text-muted-foreground mb-4">Document has been redacted.</p>
                    <Button asChild>
                      <a href={file.redactedFileUrl} download={`redacted-${file.file.name}`}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Redacted File
                      </a>
                    </Button>
                 </div>
              ) : (
                <>
                   <div className="space-y-4">
                    <div>
                      <Label htmlFor="redaction-style">Redaction Style</Label>
                      <Select 
                        value={redactionOptions.style} 
                        onValueChange={(value) => handleOptionChange('style', value as RedactionStyle)}
                      >
                        <SelectTrigger id="redaction-style">
                          <SelectValue placeholder="Select style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="blackbox">Black Box</SelectItem>
                          <SelectItem value="pixelate">Pixelate</SelectItem>
                          <SelectItem value="colorfill">Color Fill</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {redactionOptions.style === 'colorfill' && (
                      <div className="space-y-2">
                        <Label htmlFor="color-fill">Fill Color</Label>
                        <input
                          id="color-fill"
                          type="color"
                          value={redactionOptions.colorFill}
                          onChange={(e) => handleOptionChange('colorFill', e.target.value)}
                          className="w-full h-10 p-1 bg-background border border-input rounded-md cursor-pointer"
                        />
                      </div>
                    )}
                    {redactionOptions.style === 'pixelate' && (
                      <div className="space-y-2">
                        <Label htmlFor="pixelate-amount">Pixelation Amount ({redactionOptions.pixelateAmount}%)</Label>
                         <Slider 
                          id="pixelate-amount"
                          min={2} max={50} step={1}
                          value={[redactionOptions.pixelateAmount]}
                          onValueChange={([value]) => handleOptionChange('pixelateAmount', value)}
                        />
                      </div>
                    )}
                    {redactionOptions.style === 'blackbox' && (
                       <div className="space-y-2">
                        <Label htmlFor="blackbox-opacity">Black Box Opacity ({Math.round(redactionOptions.blackboxOpacity * 100)}%)</Label>
                        <Slider 
                          id="blackbox-opacity"
                          min={0.1} max={1} step={0.1}
                          value={[redactionOptions.blackboxOpacity]}
                          onValueChange={([value]) => handleOptionChange('blackboxOpacity', value)}
                        />
                      </div>
                    )}
                   </div>
                  <Button onClick={handleRedactClick} disabled={file.status === 'redacting'}>
                    {file.status === 'redacting' ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Eraser className="mr-2 h-4 w-4" />
                    )}
                    Redact Selected ({file.redactionSelections.size})
                  </Button>
                
                  {(file.signatureEntities?.length || 0) > 0 && (
                    <>
                    <Separator />
                    <h3 className="font-semibold pt-0">Detected Signatures ({file.signatureEntities?.length || 0})</h3>
                    <div className="flex items-center space-x-2">
                        <Checkbox id="select-all-signatures"
                        checked={areAllSignaturesSelected}
                        onCheckedChange={(checked) => handleSelectAll(checked as boolean, 'signature')}
                        />
                        <Label htmlFor="select-all-signatures">Select All Signatures</Label>
                    </div>
                    <ScrollArea className="flex-1 h-24 pr-3">
                        <div className="space-y-3">
                        {file.signatureEntities?.map((entity) => (
                            <div key={entity.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent/50">
                                <Checkbox
                                id={entity.id}
                                checked={file.redactionSelections.has(entity.id)}
                                onCheckedChange={() => handleSelectionChange(entity.id)}
                                className="mt-1"
                                />
                                <div className="grid gap-1.5 leading-none">
                                <Label htmlFor={entity.id} className="font-medium cursor-pointer">
                                    {entity.text}
                                </Label>
                                <p className="text-xs text-muted-foreground">{entity.type}</p>
                                </div>
                            </div>
                        ))}
                        </div>
                    </ScrollArea>
                    </>
                  )}


                  <Separator />
                  <h3 className="font-semibold border-t pt-4">Detected PII Entities ({file.piiEntities?.length || 0})</h3>
                  <div className="flex items-center space-x-2">
                    <Checkbox id="select-all-pii" 
                      checked={areAllPiiSelected}
                      onCheckedChange={(checked) => handleSelectAll(checked as boolean, 'pii')}
                    />
                    <Label htmlFor="select-all-pii">Select All PII</Label>
                     <Button variant="outline" size="sm" onClick={() => setIsAiDialogOpen(true)}>
                      <Sparkles className="mr-2 h-4 w-4" />
                      AI Suggestions
                    </Button>
                  </div>
                   <ScrollArea className="flex-1 h-64 md:h-auto md:min-h-[calc(100vh-50rem)] pr-3">
                      <div className="space-y-3">
                        {file.piiEntities?.map((entity) => (
                           <div key={entity.id} className="flex items-start space-x-3 p-2 rounded-md hover:bg-accent/50">
                              <Checkbox 
                                id={entity.id}
                                checked={file.redactionSelections.has(entity.id)}
                                onCheckedChange={() => handleSelectionChange(entity.id)}
                                className="mt-1"
                              />
                              <div className="grid gap-1.5 leading-none">
                                <Label htmlFor={entity.id} className="font-medium cursor-pointer">
                                  {entity.text}
                                </Label>
                                <p className="text-xs text-muted-foreground">{entity.type}</p>
                              </div>
                           </div>
                        ))}
                      </div>
                   </ScrollArea>
                </>
              )}
            </div>

            {formattedResponse && (
              <Accordion type="single" collapsible className="w-full bg-card border rounded-lg px-4" >
                <AccordionItem value="item-1" className="border-b-0">
                  <AccordionTrigger className="hover:no-underline py-3">
                    <div className="flex items-center gap-2">
                      <Code className="h-4 w-4" />
                      <span className="font-semibold">Backend Response</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <ScrollArea className="h-48 w-full">
                      <pre className="text-xs bg-muted p-2 rounded-md">
                        <code>{formattedResponse}</code>
                      </pre>
                    </ScrollArea>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            )}
          </div>
          <AiSuggestionDialog
            isOpen={isAiDialogOpen}
            setIsOpen={setIsAiDialogOpen}
            file={file}
            updateFile={updateFile}
          />
        </>
      )}
    </div>
  );
}

    
