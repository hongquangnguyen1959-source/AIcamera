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
  textSize?: 'sm' | 'md' | 'lg';
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
  top: number; // percentage 0-100
  left: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
  text: string;
  isShortLabel: boolean;
  isVerticalColumn: boolean;
}

function normalizeTextForComparison(text: string): string {
  return (text || '').toLowerCase().replace(/[\s,.;:!?_()\-–—"']/g, '');
}

// True Coordinate Engine with Strict Anti-Collision & Zero Overlap
function processAndDeduplicateItems(
  rawItems: DetectedItem[],
  textSize: 'sm' | 'md' | 'lg' = 'sm'
): PositionedItem[] {
  if (!rawItems || rawItems.length === 0) return [];

  interface Entry {
    item: DetectedItem;
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
    text: string;
    norm: string;
    area: number;
  }

  const validEntries: Entry[] = [];

  for (const rawItem of rawItems) {
    if (!rawItem.box_2d || rawItem.box_2d.length < 4 || !rawItem.translated_text) continue;
    const cleanText = cleanVerboseText(rawItem.translated_text);
    if (!cleanText || cleanText.length < 1) continue;

    const norm = normalizeTextForComparison(cleanText);
    if (norm.length === 0) continue;

    let [ymin, xmin, ymax, xmax] = rawItem.box_2d;
    if (ymax <= ymin || xmax <= xmin) continue;

    const area = (ymax - ymin) * (xmax - xmin);
    validEntries.push({
      item: { ...rawItem, translated_text: cleanText },
      ymin,
      xmin,
      ymax,
      xmax,
      text: cleanText,
      norm,
      area,
    });
  }

  // Deduplicate redundant overlapping items:
  // Sort descending by text length so longer, complete sentences take precedence over fragments
  validEntries.sort((a, b) => b.text.length - a.text.length);

  const filtered: Entry[] = [];

  for (const entry of validEntries) {
    const isRedundant = filtered.some((accepted) => {
      // 1. Identical text or substring check
      if (accepted.norm === entry.norm) return true;
      if (accepted.norm.includes(entry.norm) && entry.norm.length > 12) return true;

      // 2. High word overlap (Jaccard similarity) when vertically close
      const wordsA = new Set(accepted.text.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
      const wordsB = new Set(entry.text.toLowerCase().split(/\s+/).filter((w) => w.length > 2));
      if (wordsA.size > 0 && wordsB.size > 0) {
        let common = 0;
        for (const w of wordsA) {
          if (wordsB.has(w)) common++;
        }
        const sim = common / Math.min(wordsA.size, wordsB.size);
        if (sim >= 0.55 && Math.abs(accepted.ymin - entry.ymin) < 140) {
          return true;
        }
      }

      // 3. Significant bounding box intersection
      const intYmin = Math.max(accepted.ymin, entry.ymin);
      const intXmin = Math.max(accepted.xmin, entry.xmin);
      const intYmax = Math.min(accepted.ymax, entry.ymax);
      const intXmax = Math.min(accepted.xmax, entry.xmax);

      if (intYmax > intYmin && intXmax > intXmin) {
        const intArea = (intYmax - intYmin) * (intXmax - intXmin);
        const minArea = Math.min(accepted.area, entry.area);
        const overlapRatio = intArea / minArea;

        // One box is mostly inside another box (> 45%)
        if (overlapRatio > 0.45) {
          return true;
        }
      }

      return false;
    });

    if (!isRedundant) {
      filtered.push(entry);
    }
  }

  // Sort back to natural reading order: top-to-bottom, left-to-right
  filtered.sort((a, b) => {
    if (Math.abs(a.ymin - b.ymin) < 25) {
      return a.xmin - b.xmin;
    }
    return a.ymin - b.ymin;
  });

  // Initial Placement
  const positioned: PositionedItem[] = [];

  for (const entry of filtered) {
    let top = Math.max(0.5, Math.min(96.0, entry.ymin / 10));
    let left = Math.max(0.5, Math.min(96.0, entry.xmin / 10));
    const rawWidth = Math.max(2.5, (entry.xmax - entry.xmin) / 10);
    const rawHeight = Math.max(2.0, (entry.ymax - entry.ymin) / 10);

    const isVerticalColumn = rawHeight >= rawWidth * 2.2 && rawWidth <= 14.0;
    const isShortLabel = entry.text.length <= 16 && rawHeight <= 4.5 && !isVerticalColumn;

    // Check if there are other items in the same horizontal band to the right
    let maxAllowedRight = 97.5;
    for (const other of filtered) {
      if (other === entry) continue;
      // Overlaps vertically in bounding box
      const sharesVerticalBand =
        Math.max(entry.ymin, other.ymin) < Math.min(entry.ymax, other.ymax);
      if (sharesVerticalBand && other.xmin > entry.xmin + 25) {
        maxAllowedRight = Math.min(maxAllowedRight, other.xmin / 10 - 1.2);
      }
    }

    let width = rawWidth;
    if (isVerticalColumn) {
      // Tall side pillar / couplet: keep in column with comfortable reading width
      width = Math.min(maxAllowedRight - left, Math.max(rawWidth, 8.5));
    } else if (isShortLabel) {
      // Short buttons or icons: give adequate room to prevent unwanted line breaks
      const labelW = Math.min(35, entry.text.length * 1.5 + 2.5);
      width = Math.min(maxAllowedRight - left, Math.max(rawWidth, labelW));
    } else {
      // Check if this item is a full-width line or paragraph
      const maxWidthInSpace = Math.max(rawWidth, maxAllowedRight - left);
      if (entry.text.length > 25 || rawWidth >= 30) {
        // Stretch across like the original line without invading right neighbors
        width = Math.min(maxAllowedRight - left, Math.max(rawWidth, maxWidthInSpace));
      } else {
        width = Math.min(maxAllowedRight - left, Math.max(rawWidth, Math.min(45, entry.text.length * 1.5 + 3)));
      }
    }

    // Ensure within screen margins
    if (left + width > 98.5) {
      left = Math.max(0.5, 98.5 - width);
    }

    // Realistic DOM rendered height calculation:
    // Takes into account font size scale, characters per line, and vertical padding
    const charWidthFactor = textSize === 'sm' ? 0.65 : textSize === 'md' ? 0.72 : 0.80;
    const charsPerLine = Math.max(10, Math.floor(width / charWidthFactor));
    const numLines = Math.max(1, Math.ceil(entry.text.length / charsPerLine));
    const perLineH = textSize === 'sm' ? 2.5 : textSize === 'md' ? 2.8 : 3.1;
    const estimatedHeight = Math.max(rawHeight, 1.2 + numLines * perLineH);

    positioned.push({
      item: entry.item,
      top,
      left,
      width,
      height: estimatedHeight,
      text: entry.text,
      isShortLabel,
      isVerticalColumn,
    });
  }

  // Multi-Pass Iterative Anti-Collision Relaxation Engine
  // Runs physics-like relaxation passes so NO TWO ITEMS OVERLAP anywhere on screen
  const VERTICAL_GAP = 0.8; // 0.8% clean separation gap between stacked boxes

  for (let pass = 0; pass < 20; pass++) {
    let hasConflict = false;

    // Sort by current vertical position
    positioned.sort((a, b) => a.top - b.top);

    for (let i = 0; i < positioned.length; i++) {
      for (let j = i + 1; j < positioned.length; j++) {
        const A = positioned[i];
        const B = positioned[j];

        // Horizontal overlap test with safety tolerance
        const overlapX =
          Math.min(A.left + A.width, B.left + B.width) - Math.max(A.left, B.left);
        // Vertical collision test: B starts before A ends
        const overlapY = A.top + A.height + VERTICAL_GAP - B.top;

        if (overlapX > 0.5 && overlapY > 0) {
          // Collision detected! Nudge B down so it sits neatly below A
          B.top = Math.min(97.5, A.top + A.height + VERTICAL_GAP);
          hasConflict = true;
        }
      }
    }

    if (!hasConflict) {
      break; // All collisions cleanly resolved!
    }
  }

  // Bottom boundary safety check: if elements cascade past 98%, gently compress spacing
  const maxBottom = Math.max(...positioned.map((p) => p.top + p.height), 0);
  if (maxBottom > 98.5 && positioned.length > 1) {
    const overflow = maxBottom - 98.5;
    for (let i = 1; i < positioned.length; i++) {
      const ratio = i / (positioned.length - 1);
      positioned[i].top = Math.max(0.5, positioned[i].top - overflow * ratio);
    }
  }

  return positioned;
}

// Dynamic font size matching text length, column shape & chosen scale
function getResponsiveFontSize(
  textLength: number,
  isShortLabel: boolean,
  isVerticalColumn: boolean,
  textSizeScale: 'sm' | 'md' | 'lg' = 'sm'
): string {
  if (isVerticalColumn) {
    return '0.62rem';
  }

  if (isShortLabel) {
    if (textSizeScale === 'sm') return '0.70rem'; // ~11.2px
    if (textSizeScale === 'md') return '0.76rem'; // ~12.1px
    return '0.84rem'; // ~13.4px
  }

  // Paragraphs & sentences
  if (textSizeScale === 'sm') {
    if (textLength > 140) return '0.62rem';
    if (textLength > 80) return '0.66rem';
    if (textLength > 35) return '0.70rem';
    return '0.74rem';
  }
  if (textSizeScale === 'md') {
    if (textLength > 140) return '0.68rem';
    if (textLength > 80) return '0.74rem';
    if (textLength > 35) return '0.78rem';
    return '0.82rem';
  }
  // 'lg' scale
  if (textLength > 140) return '0.74rem';
  if (textLength > 80) return '0.80rem';
  return '0.88rem';
}

export const AROverlay: React.FC<AROverlayProps> = ({
  items,
  selectedItem,
  onSelectItem,
  overlayMode = 'replace',
  showOverlayText,
  maskCoverMode = true,
  textSize = 'sm',
}) => {
  if (!items || items.length === 0 || overlayMode === 'hidden') return null;

  const isTextVisible = showOverlayText !== undefined ? showOverlayText : overlayMode === 'replace';
  const layoutItems = React.useMemo(
    () => processAndDeduplicateItems(items, textSize),
    [items, textSize]
  );

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {layoutItems.map(
        ({ item, top, left, width, height, text, isShortLabel, isVerticalColumn }, index) => {
          const isSelected = selectedItem === item;
          const fontSize = getResponsiveFontSize(
            text.length,
            isShortLabel,
            isVerticalColumn,
            textSize
          );

          return (
            <div
              key={`ar-${text.slice(0, 15)}-${index}`}
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
              className={`absolute pointer-events-auto cursor-pointer flex flex-col justify-start items-start animate-in fade-in zoom-in-95 duration-150 ${
                isSelected ? 'scale-[1.01] z-30' : 'z-20'
              }`}
              title={`Bấm để xem chi tiết: ${text}`}
            >
              {isTextVisible ? (
                <div
                  className={`w-full transition-all text-left px-1.5 py-0.5 rounded shadow-md ${
                    isShortLabel ? 'whitespace-nowrap overflow-visible' : 'break-words'
                  } ${
                    isSelected
                      ? 'bg-amber-400 text-slate-950 font-bold rounded ring-2 ring-amber-300 shadow-xl z-30'
                      : maskCoverMode
                      ? 'bg-slate-950/95 text-white font-semibold border border-emerald-500/60 backdrop-blur-sm shadow-xl z-20'
                      : 'bg-black/75 text-emerald-200 font-bold [text-shadow:_0_1px_2px_#000,_0_0_3px_#000] border border-emerald-400/50 z-20'
                  }`}
                  style={{
                    fontSize,
                    lineHeight: isShortLabel ? '1.15' : '1.25',
                  }}
                >
                  {text}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shadow-lg" />
                </div>
              )}
            </div>
          );
        }
      )}
    </div>
  );
};

