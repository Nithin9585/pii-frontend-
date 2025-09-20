// src/lib/actions.ts
'use server';

import sharp from 'sharp';
import {
  intelligentRedactionSuggestions,
  IntelligentRedactionSuggestionsInput,
} from '@/ai/flows/intelligent-redaction-suggestions';
import {RedactionOptions, BoundingBox} from './types';

// The python backend is not working for redaction, so we will do it here.
export async function applyRedaction(
  file: File,
  redactions: BoundingBox[],
  options: RedactionOptions
): Promise<Blob> {
  try {
    const imageBuffer = Buffer.from(await file.arrayBuffer());
    const image = sharp(imageBuffer);
    const metadata = await image.metadata();
    const {width = 0, height = 0} = metadata;

    if (width === 0 || height === 0) {
      throw new Error('Could not read image dimensions.');
    }
    
    let compositeOperations: sharp.OverlayOptions[] = [];

    switch (options.style) {
      case 'pixelate':
        // For pixelation, we create a small version of each redacted area and then scale it up.
        // This requires multiple sharp operations.
        const pixelateAmount = Math.max(2, Math.min(50, options.pixelateAmount)) / 100;
        
        for (const box of redactions) {
            const regionWidth = Math.round(box.x2 - box.x1);
            const regionHeight = Math.round(box.y2 - box.y1);

            if (regionWidth > 0 && regionHeight > 0) {
                const regionBuffer = await image
                    .clone()
                    .extract({
                        left: Math.round(box.x1),
                        top: Math.round(box.y1),
                        width: regionWidth,
                        height: regionHeight,
                    })
                    .resize(Math.max(1, Math.round(regionWidth * pixelateAmount)), Math.max(1, Math.round(regionHeight * pixelateAmount)), { kernel: 'nearest' })
                    .resize(regionWidth, regionHeight, { kernel: 'nearest' })
                    .toBuffer();
                
                compositeOperations.push({
                    input: regionBuffer,
                    top: Math.round(box.y1),
                    left: Math.round(box.x1),
                });
            }
        }
        break;

      case 'colorfill':
      case 'blackbox':
      default:
        const color = options.style === 'colorfill' ? options.colorFill : '#000000';
        const opacity = options.style === 'blackbox' ? options.blackboxOpacity : 1;
        
        const svgRects = redactions.map(box => {
          const w = box.x2 - box.x1;
          const h = box.y2 - box.y1;
          return `<rect x="${box.x1}" y="${box.y1}" width="${w}" height="${h}" fill="${color}" fill-opacity="${opacity}" />`;
        }).join('');
        
        const svgOverlay = `<svg width="${width}" height="${height}">${svgRects}</svg>`;
        compositeOperations.push({ input: Buffer.from(svgOverlay) });
        break;
    }

    const redactedImageBuffer = await image
        .composite(compositeOperations)
        .toBuffer();

    return new Blob([redactedImageBuffer], {type: file.type});

  } catch (error: any) {
    console.error(`Error in applyRedaction:`, error);
    throw new Error(`Could not redact document: ${error.message}`);
  }
}


export async function getAIRedactionSuggestions(
  input: IntelligentRedactionSuggestionsInput
) {
  try {
    const result = await intelligentRedactionSuggestions(input);
    return result;
  } catch (error) {
    console.error('Error getting AI redaction suggestions:', error);
    throw new Error('Failed to get AI suggestions.');
  }
}
