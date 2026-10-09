import React from 'react';
import { DetectedItem } from '../types';
import { Volume2 } from 'lucide-react';
import { speakText } from '../utils/audio';

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
  return text
    .replace(CHINESE_REGEX, '')
    .replace(/\s*\([^)]*(?:nghĩa|dịch|giải thích|phiên âm)[^)]*\)/gi, '')
    .trim();
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

// Anti-overlap, full-text layout engine
function processAndDeduplicateItems(rawItems: DetectedItem[]): PositionedItem[] {
  if (!rawItems || rawItems.length === 0) return [];

  const validEntries: { item: DetectedItem; box: number[]; text: string; area: number }[] = [];

  for (const rawItem of rawItems) {
    if (!rawItem.box_2d || rawItem.box_2d.length < 4 || !rawItem.translated_text) continue;
    const cleanText = cleanVerboseText(rawItem.translated_text);
    if (!cleanText) continue;

    const [ymin, xmin, ymax, xmax] = rawItem.box_2d;
    const area = (ymax - ymin) * (xmax - xmin);
    validEntries.push({
      item: { ...rawItem, translated_text: cleanText },
      box: rawItem.box_2d,
      text: cleanText,
      area,
    });
  }

  // Prioritize smaller, specific line items over huge macro containers
  validEntries.sort((a, b) => a.area - b.area);

  const nonColliding: typeof validEntries = [];
  for (const entry of validEntries) {
    const isColliding = nonColliding.some((accepted) =>
      isOverlappingOrNested(accepted.box, entry.box)
    );
    if (!isColliding) {
      nonColliding.push(entry);
    }
  }

  // Sort strictly top-to-bottom by Y position
  nonColliding.sort((a, b) => a.box[0] - b.box[0]);

  // Layout with anti-stacking collision avoidance
  const placed: PositionedItem[] = [];

  for (const entry of nonColliding) {
    const [ymin, xmin, ymax, xmax] = entry.box;
    const origTop = ymin / 10;
    const origH = Math.max(2.4, (ymax - ymin) / 10);
    const origW = (xmax - xmin) / 10;
    const centerX = (xmin + xmax) / 20;

    // Desired width: expand enough so Vietnamese words don't cram into 10 lines
    const neededW = Math.max(origW, Math.min(92, Math.max(14, entry.text.length * 1.35)));
    const left = Math.max(2, Math.min(98 - neededW, centerX - neededW / 2));

    // Calculate height needed to show 100% of the words without clipping
    const linesNeeded = Math.ceil((entry.text.length * 0.72) / Math.max(8, neededW * 0.75));
    const estimatedH = Math.max(origH, Math.max(2.6, linesNeeded * 2.3));

    let top = origTop;

    // Check collision against already placed items in overlapping horizontal range
    for (const p of placed) {
      const hOverlap = !(left + neededW < p.left || left > p.left + p.width);
      if (hOverlap) {
        if (top < p.top + p.height + 0.6) {
          top = p.top + p.height + 0.6;
        }
      }
    }

    // Keep within viewport boundary
    if (top + estimatedH > 97) {
      top = Math.max(2, 97 - estimatedH);
    }

    placed.push({
      item: entry.item,
      top,
      left,
      width: neededW,
      height: estimatedH,
      text: entry.text,
    });
  }

  return placed;
}

// Calculate responsive font size so text is crisp and readable
function getResponsiveFontSize(charCount: number, boxWidthPercent: number): string {
  const density = charCount / Math.max(10, boxWidthPercent);
  if (charCount <= 12) {
    return '0.85rem';
  } else if (charCount <= 28 && density < 0.6) {
    return '0.78rem';
  } else if (charCount <= 50 || density < 1.0) {
    return '0.72rem';
  }
  return '0.66rem';
}

export const AROverlay: React.FC<AROverlayProps> = ({
  items,
  selectedItem,
  onSelectItem,
  overlayMode = 'replace',
  showOverlayText,
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
            key={index}
            style={{
              top: `${top}%`,
              left: `${left}%`,
              width: `${width}%`,
              minHeight: `${height}%`,
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem(item);
            }}
            className={`absolute pointer-events-auto cursor-pointer flex items-center justify-center transition-transform duration-100 ${
              isSelected ? 'scale-[1.03] z-30' : 'z-20'
            }`}
            title={`Dịch: ${text}`}
          >
            {isTextVisible ? (
              <div
                className={`w-full flex items-center justify-center text-center px-2 py-1 rounded-md shadow-md transition-all ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-black shadow-xl ring-2 ring-amber-300'
                    : 'bg-slate-950/85 backdrop-blur-[2px] border border-amber-400/40 text-amber-200'
                }`}
                style={{ fontSize, lineHeight: '1.25' }}
              >
                {/* Chữ dịch sắc nét, thanh thoát, không chiếm chỗ màn hình */}
                <span
                  style={{
                    textShadow: isSelected ? 'none' : '0 1px 2px rgba(0,0,0,0.85)',
                  }}
                  className="font-semibold select-none whitespace-normal break-words leading-tight max-w-full text-center px-1"
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
