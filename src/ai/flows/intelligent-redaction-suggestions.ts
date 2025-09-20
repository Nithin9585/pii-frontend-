// src/ai/flows/intelligent-redaction-suggestions.ts
'use server';

/**
 * @fileOverview Provides intelligent redaction suggestions for PII entities and signature regions based on configurable criteria.
 *
 * - intelligentRedactionSuggestions - A function that suggests redaction actions based on document content and criteria.
 * - IntelligentRedactionSuggestionsInput - The input type for the intelligentRedactionSuggestions function.
 * - IntelligentRedactionSuggestionsOutput - The return type for the intelligentRedactionSuggestions function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

// Define schemas for PII entities and signature regions
const PIIEntitySchema = z.object({
  type: z.string().describe('The type of PII entity (e.g., name, address, email).'),
  text: z.string().describe('The actual text of the PII entity.'),
  boundingBox: z
    .array(z.number())
    .length(4)
    .describe('The bounding box coordinates [x1, y1, x2, y2] of the entity.'),
});

const SignatureRegionSchema = z.object({
  boundingBox: z
    .array(z.number())
    .length(4)
    .describe('The bounding box coordinates [x1, y1, x2, y2] of the signature region.'),
});

// Define input schema for the flow
const IntelligentRedactionSuggestionsInputSchema = z.object({
  documentText: z.string().describe('The extracted text content of the document.'),
  piiEntities: z
    .array(PIIEntitySchema)
    .describe('An array of detected PII entities in the document.'),
  signatureRegions: z
    .array(SignatureRegionSchema)
    .describe('An array of detected signature regions in the document.'),
  criteria: z
    .string()
    .describe(
      'Configurable criteria for redaction suggestions (e.g., industry-specific regulations, data sensitivity levels).'
    ),
});
export type IntelligentRedactionSuggestionsInput = z.infer<
  typeof IntelligentRedactionSuggestionsInputSchema
>;

// Define output schema for the flow
const IntelligentRedactionSuggestionsOutputSchema = z.object({
  suggestedRedactions: z
    .array(z.union([PIIEntitySchema, SignatureRegionSchema]))
    .describe('An array of PII entities and signature regions suggested for redaction.'),
  reasoning: z.string().describe('The reasoning behind the redaction suggestions.'),
});
export type IntelligentRedactionSuggestionsOutput = z.infer<
  typeof IntelligentRedactionSuggestionsOutputSchema
>;

// Exported function to call the flow
export async function intelligentRedactionSuggestions(
  input: IntelligentRedactionSuggestionsInput
): Promise<IntelligentRedactionSuggestionsOutput> {
  return intelligentRedactionSuggestionsFlow(input);
}

// Define the prompt
const prompt = ai.definePrompt({
  name: 'intelligentRedactionSuggestionsPrompt',
  input: {schema: IntelligentRedactionSuggestionsInputSchema},
  output: {schema: IntelligentRedactionSuggestionsOutputSchema},
  prompt: `You are an AI assistant that provides intelligent redaction suggestions for documents based on specific criteria.

Given the following document text, PII entities, signature regions, and redaction criteria, determine which entities and regions should be redacted.

Document Text:
{{{documentText}}}

PII Entities:
{{#each piiEntities}}
- Type: {{type}}, Text: {{text}}, Bounding Box: {{boundingBox}}
{{/each}}

Signature Regions:
{{#each signatureRegions}}
- Bounding Box: {{boundingBox}}
{{/each}}

Redaction Criteria:
{{{criteria}}}

Based on the above information, provide a list of PII entities and signature regions that should be redacted, along with a clear explanation of your reasoning.  Return the suggestedRedactions as a list of objects, where each object is either a PIIEntitySchema or a SignatureRegionSchema.
`,
});

// Define the flow
const intelligentRedactionSuggestionsFlow = ai.defineFlow(
  {
    name: 'intelligentRedactionSuggestionsFlow',
    inputSchema: IntelligentRedactionSuggestionsInputSchema,
    outputSchema: IntelligentRedactionSuggestionsOutputSchema,
  },
  async input => {
    const {output} = await prompt(input);
    return output!;
  }
);
