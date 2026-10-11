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
}

function normalizeTextForComparison(text: string): string {
  return (text || '').toLowerCase().replace(/[\s,.;:!?_()\-–—"']/g, '');
}

// Check if two horizontal ranges [leftA, leftA+widthA] and [leftB, leftB+widthB] overlap significantly
function hasHorizontalOverlap(
  leftA: number,
  widthA: number,
  leftB: number,
  widthB: number
): boolean {
  const rightA = leftA + widthA;
  const rightB = leftB + widthB;
  const overlapLeft = Math.max(leftA, leftB);
  const overlapRight = Math.min(rightA, rightB);
  const overlapWidth = overlapRight - overlapLeft;

  if (overlapWidth <= 0) return false;

  const minBoxWidth = Math.min(widthA, widthB);
  return (overlapWidth / minBoxWidth) > 0.20 || overlapWidth > 3.5;
}

// 1:1 Precise Layout Engine with per-column vertical anti-collision
function processAndDeduplicateItems(rawItems: DetectedItem[]): PositionedItem[] {
  if (!rawItems || rawItems.length === 0) return [];

  const validEntries: {
    item: DetectedItem;
    ymin: number;
    xmin: number;
    ymax: number;
    xmax: number;
    text: string;
    norm: string;
  }[] = [];

  for (const rawItem of rawItems) {
    if (!rawItem.box_2d || rawItem.box_2d.length < 4 || !rawItem.translated_text) continue;
    const cleanText = cleanVerboseText(rawItem.translated_text);
    if (!cleanText || cleanText.length < 1) continue;

    const norm = normalizeTextForComparison(cleanText);
    if (norm.length === 0) continue;

    const [ymin, xmin, ymax, xmax] = rawItem.box_2d;
    validEntries.push({
      item: { ...rawItem, translated_text: cleanText },
      ymin,
      xmin,
      ymax,
      xmax,
      text: cleanText,
      norm,
    });
  }

  // Filter out duplicate text items occupying virtually the same spatial position
  const filtered: typeof validEntries = [];
  for (const entry of validEntries) {
    const isDuplicate = filtered.some((accepted) => {
      if (accepted.norm === entry.norm) return true;
      const cyA = (accepted.ymin + accepted.ymax) / 2;
      const cyB = (entry.ymin + entry.ymax) / 2;
      const cxA = (accepted.xmin + accepted.xmax) / 2;
      const cxB = (entry.xmin + entry.xmax) / 2;
      if (Math.abs(cyA - cyB) < 25 && Math.abs(cxA - cxB) < 40 && accepted.norm === entry.norm) {
        return true;
      }
      return false;
    });

    if (!isDuplicate) {
      filtered.push(entry);
    }
  }

  // Sort items strictly top-to-bottom by ymin
  filtered.sort((a, b) => a.ymin - b.ymin);

  // Position items with column-aware vertical collision avoidance
  const positioned: PositionedItem[] = [];

  for (const entry of filtered) {
    const desiredLeft = Math.max(0.2, Math.min(94, entry.xmin / 10));
    const rawW = Math.max(12.0, (entry.xmax - entry.xmin) / 10);
    const width = Math.min(99.5 - desiredLeft, rawW);

    // Dynamic height calculation based on text length to prevent text overflow
    const approxLines = Math.max(1, Math.ceil(entry.text.length / Math.max(12, Math.floor(width * 0.9))));
    const calculatedHeight = Math.max((entry.ymax - entry.ymin) / 10, approxLines * 2.4);
    const height = Math.max(2.2, Math.min(35, calculatedHeight));

    let top = Math.max(0.2, Math.min(96, entry.ymin / 10));

    // Collision check: find maximum bottom edge among placed items that horizontally overlap
    let maxOverlappingBottom = 0;
    for (const placed of positioned) {
      if (hasHorizontalOverlap(desiredLeft, width, placed.left, placed.width)) {
        const pBottom = placed.top + placed.height;
        if (pBottom > maxOverlappingBottom) {
          maxOverlappingBottom = pBottom;
        }
      }
    }

    if (maxOverlappingBottom > 0 && top < maxOverlappingBottom + 0.4) {
      top = Math.min(95, maxOverlappingBottom + 0.5);
    }

    positioned.push({
      item: entry.item,
      top,
      left: desiredLeft,
      width,
      height,
      text: entry.text,
    });
  }

  return positioned;
}

// Dynamic compact font size matching text length & chosen textSize scale
function getResponsiveFontSize(textLength: number, textSizeScale: 'sm' | 'md' | 'lg' = 'sm'): string {
  if (textSizeScale === 'sm') {
    if (textLength > 180) return '0.58rem'; // ~9.2px compact
    if (textLength > 100) return '0.62rem'; // ~9.9px
    if (textLength > 40) return '0.66rem'; // ~10.5px
    return '0.70rem'; // ~11.2px
  }
  if (textSizeScale === 'md') {
    if (textLength > 180) return '0.65rem'; // ~10.4px
    if (textLength > 100) return '0.70rem'; // ~11.2px
    return '0.75rem'; // ~12px
  }
  // 'lg' scale
  if (textLength > 180) return '0.74rem'; // ~11.8px
  return '0.82rem'; // ~13.1px
}

export const AROverlay: React.FC<AROverlayProps> = ({
  items,
  selectedItem,
  onSelectItem,
  overlayMode = 'replace',
  showOverlayText,
  textSize = 'sm',
}) => {
  if (!items || items.length === 0 || overlayMode === 'hidden') return null;

  const isTextVisible = showOverlayText !== undefined ? showOverlayText : overlayMode === 'replace';
  const layoutItems = processAndDeduplicateItems(items);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden">
      {layoutItems.map(({ item, top, left, width, height, text }, index) => {
        const isSelected = selectedItem === item;
        const fontSize = getResponsiveFontSize(text.length, textSize);

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
            className={`absolute pointer-events-auto cursor-pointer flex flex-col justify-start items-start ${
              isSelected ? 'scale-[1.01] z-30' : 'z-20'
            }`}
            title={`Bấm để chọn bản dịch: ${text}`}
          >
            {isTextVisible ? (
              <div
                className={`w-full h-full transition-all overflow-y-auto rounded-md p-1 sm:p-1.5 text-left break-words shadow-sm ${
                  isSelected
                    ? 'bg-amber-400/90 text-slate-950 font-bold ring-2 ring-amber-300 z-30'
                    : 'bg-slate-950/60 backdrop-blur-[2px] border border-emerald-400/35 text-emerald-100 font-medium hover:bg-slate-950/80 z-20'
                }`}
                style={{ fontSize, lineHeight: '1.28' }}
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
      })}
    </div>
  );
};

