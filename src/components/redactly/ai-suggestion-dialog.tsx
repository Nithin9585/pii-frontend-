"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { QueuedFile, PIIEntity } from "@/lib/types";
import { getAIRedactionSuggestions } from "@/lib/actions";
import { Loader2, Sparkles } from "lucide-react";
import { IntelligentRedactionSuggestionsInput } from "@/ai/flows/intelligent-redaction-suggestions";

interface AiSuggestionDialogProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  file: QueuedFile;
  updateFile: (id: string, updates: Partial<QueuedFile>) => void;
}

export function AiSuggestionDialog({
  isOpen,
  setIsOpen,
  file,
  updateFile,
}: AiSuggestionDialogProps) {
  const [criteria, setCriteria] = useState(
    "Redact all personally identifiable information (PII) like names, emails, and phone numbers, but keep addresses if they are part of a corporate letterhead. Always redact signatures."
  );
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!file.result || !file.piiEntities || !file.signatureEntities) {
      toast({
        variant: "destructive",
        title: "No data to analyze",
        description: "The document has not been fully processed yet.",
      });
      return;
    }

    setIsLoading(true);
    try {
      const piiEntitiesForAI = file.piiEntities.map(
        ({ id, boundingBox, ...rest }) => ({
          ...rest,
          boundingBox: [
            boundingBox.x1,
            boundingBox.y1,
            boundingBox.x2,
            boundingBox.y2,
          ],
        })
      );

      const signatureRegionsForAI = file.signatureEntities.map(
        ({ boundingBox }) => ({
          boundingBox: [
            boundingBox.x1,
            boundingBox.y1,
            boundingBox.x2,
            boundingBox.y2,
          ],
        })
      );

      const input: IntelligentRedactionSuggestionsInput = {
        documentText: file.result.ocrText || "",
        piiEntities: piiEntitiesForAI,
        signatureRegions: signatureRegionsForAI,
        criteria,
      };

      const result = await getAIRedactionSuggestions(input);
      
      const allEntities = [...(file.piiEntities || []), ...(file.signatureEntities || [])];
      const suggestedIds = new Set<string>();

      result.suggestedRedactions.forEach((suggestedEntity) => {
        const suggestedBoxString = JSON.stringify(suggestedEntity.boundingBox);
        const originalEntity = allEntities.find(
          (e) => {
            const originalBoxArray = [e.boundingBox.x1, e.boundingBox.y1, e.boundingBox.x2, e.boundingBox.y2];
            return JSON.stringify(originalBoxArray) === suggestedBoxString;
          }
        );
        if (originalEntity) {
          suggestedIds.add(originalEntity.id);
        }
      });
      
      updateFile(file.id, { redactionSelections: suggestedIds });
      
      toast({
        title: "AI Suggestions Applied",
        description: `Suggested ${suggestedIds.size} items for redaction. Reasoning: ${result.reasoning}`,
      });
      setIsOpen(false);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "AI Suggestion Failed",
        description:
          error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>AI Redaction Suggestions</DialogTitle>
          <DialogDescription>
            Describe the criteria for redaction. The AI will suggest which
            entities to select based on your rules.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid w-full gap-1.5">
            <Label htmlFor="criteria">Redaction Criteria</Label>
            <Textarea
              id="criteria"
              placeholder="e.g., Redact all names and emails, but keep phone numbers."
              value={criteria}
              onChange={(e) => setCriteria(e.target.value)}
              className="h-32"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading}>
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Get Suggestions
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
