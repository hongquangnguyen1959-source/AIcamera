import React from 'react';
import { DetectedItem } from '../types';

interface AROverlayProps {
  items: DetectedItem[];
  selectedItem: DetectedItem | null;
  onSelectItem: (item: DetectedItem) => void;
  overlayMode?: 'replace' | 'highlight' | 'hidden';
  showOverlayText?: boolean;
  maskCoverMode?: boolean;
  langCode?: string;
}

// Strip CJK ideographs / Chinese characters strictly
const CHINESE_REGEX = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/g;

function cleanVerboseText(text: string): string {
  if (!text) return '';
  const cleaned = text
    .replace(CHINESE_REGEX, '')
    .replace(/\s*\([^)]*(?:nghĩa|dịch|giải thích|phiên âm)[^)]*\)/gi, '')
    .trim();
  return cleaned || text.trim();
}

interface PositionedItem {
  item: DetectedItem;
  top: number;
  left: number;
  width: number;
  height: number;
  text: string;
}

// Check area overlap between two 0-1000 coordinate boxes
function isOverlappingOrNested(boxA: number[], boxB: number[]): boolean {
  const [y1Min, x1Min, y1Max, x1Max] = boxA;
  const [y2Min, x2Min, y2Max, x2Max] = boxB;

  const interYMin = Math.max(y1Min, y2Min);
  const interXMin = Math.max(x1Min, x2Min);
  const interYMax = Math.min(y1Max, y2Max);
  const interXMax = Math.min(x1Max, x2Max);

  if (interYMax <= interYMin || interXMax <= interXMin) {
    return false;
  }

  const interArea = (interYMax - interYMin) * (interXMax - interXMin);
  const areaA = Math.max(1, (y1Max - y1Min) * (x1Max - x1Min));
  const areaB = Math.max(1, (y2Max - y2Min) * (x2Max - x2Min));
  const minArea = Math.min(areaA, areaB);

  // If > 30% of the smaller box overlaps -> duplicate or nested macro container
  return interArea / minArea > 0.3;
}

function normalizeTextForComparison(text: string): string {
  return (text || '').toLowerCase().replace(/[\s,.;:!?_()\-–—"']/g, '');
}

// Layout engine that places translated text directly over corresponding original text
function processAndDeduplicateItems(rawItems: DetectedItem[]): PositionedItem[] {
  if (!rawItems || rawItems.length === 0) return [];

  const validEntries: { item: DetectedItem; box: number[]; text: string; norm: string; area: number }[] = [];

  for (const rawItem of rawItems) {
    if (!rawItem.box_2d || rawItem.box_2d.length < 4 || !rawItem.translated_text) continue;
    const cleanText = cleanVerboseText(rawItem.translated_text);
    if (!cleanText) continue;

    const norm = normalizeTextForComparison(cleanText);
    if (norm.length === 0) continue;

    const [ymin, xmin, ymax, xmax] = rawItem.box_2d;
    const area = (ymax - ymin) * (xmax - xmin);
    validEntries.push({
      item: { ...rawItem, translated_text: cleanText },
      box: rawItem.box_2d,
      text: cleanText,
      norm,
      area,
    });
  }

  // Deduplicate exact repeats
  const filtered: typeof validEntries = [];
  for (const entry of validEntries) {
    const isDuplicate = filtered.some(
      (accepted) =>
        accepted.norm === entry.norm &&
        Math.abs(accepted.box[0] - entry.box[0]) < 40 &&
        Math.abs(accepted.box[1] - entry.box[1]) < 40
    );
    if (!isDuplicate) {
      filtered.push(entry);
    }
  }

  // Position items closely matching the detected bounding box of the source words
  const placed: PositionedItem[] = [];

  for (const entry of filtered) {
    const [ymin, xmin, ymax, xmax] = entry.box;
    const origTop = ymin / 10;
    const origLeft = xmin / 10;
    const origH = Math.max(2.2, (ymax - ymin) / 10);
    const origW = Math.max(4.0, (xmax - xmin) / 10);
    const centerX = origLeft + origW / 2;

    // Expand width moderately if the original text was very short (e.g. 2-3 CJK chars)
    // but keep it tightly anchored around centerX
    const neededW = Math.min(
      75,
      Math.max(origW, Math.min(entry.text.length * 1.4, origW * 1.35 + 3))
    );
    const left = Math.max(0.5, Math.min(99.5 - neededW, centerX - neededW / 2));
    const top = Math.max(0.5, Math.min(99.5 - origH, origTop));

    placed.push({
      item: entry.item,
      top,
      left,
      width: neededW,
      height: origH,
      text: entry.text,
    });
  }

  return placed;
}

// Calculate responsive font size so text is crisp and readable
function getResponsiveFontSize(charCount: number, boxWidthPercent: number): string {
  const density = charCount / Math.max(8, boxWidthPercent);
  if (charCount <= 8) {
    return '0.90rem';
  } else if (charCount <= 20 && density < 0.6) {
    return '0.82rem';
  } else if (charCount <= 40 || density < 1.0) {
    return '0.74rem';
  }
  return '0.68rem';
}

export const AROverlay: React.FC<AROverlayProps> = ({
  items,
  selectedItem,
  onSelectItem,
  overlayMode = 'replace',
  showOverlayText,
  maskCoverMode = false,
}) => {
  if (!items || items.length === 0 || overlayMode === 'hidden') return null;

  const isTextVisible = showOverlayText !== undefined ? showOverlayText : overlayMode === 'replace';
  const layoutItems = processAndDeduplicateItems(items);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {layoutItems.map(({ item, top, left, width, height, text }, index) => {
        const isSelected = selectedItem === item;
        const fontSize = getResponsiveFontSize(text.length, width);

        return (
          <div
            key={`ar-${text.slice(0, 25)}-${index}`}
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: `${width}%`,
              minHeight: `${height}%`,
              transition: 'top 0.15s ease-out, left 0.15s ease-out',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem(item);
            }}
            className={`absolute pointer-events-auto cursor-pointer flex items-center justify-center ${
              isSelected ? 'scale-[1.03] z-30' : 'z-20'
            }`}
            title={`Dịch: ${text}`}
          >
            {isTextVisible ? (
              <div
                className={`w-full flex items-center justify-center text-center transition-all ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xl ring-2 ring-amber-300 rounded px-1.5 py-0.5 z-30'
                    : maskCoverMode
                    ? 'bg-slate-950/90 border border-amber-400/40 text-amber-200 rounded px-1.5 py-0.5 shadow-md'
                    : 'bg-slate-950/85 border border-emerald-400/60 text-emerald-200 font-bold rounded px-1.5 py-0.5 shadow-lg backdrop-blur-xs'
                }`}
                style={{ fontSize, lineHeight: '1.2' }}
              >
                <span
                  style={{
                    textShadow: isSelected
                      ? 'none'
                      : '0 1px 2px rgba(0,0,0,0.9)',
                  }}
                  className="font-bold select-none whitespace-normal break-words leading-tight max-w-full text-center tracking-tight"
                >
                  {text}
                </span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shadow-lg" />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
