import React from 'react';
import { DetectedItem } from '../types';

interface AROverlayProps {
  items: DetectedItem[];
  selectedItem: DetectedItem | null;
  onSelectItem: (item: DetectedItem) => void;
  overlayMode?: 'replace' | 'highlight' | 'hidden';
  showOverlayText?: boolean;
  maskCoverMode?: boolean;
  textSize?: 'sm' | 'md' | 'lg';
}

const CHINESE_REGEX = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\u3000-\u303f\uff00-\uffef]/g;

function cleanVerboseText(text: string): string {
  if (!text) return '';
  const cleaned = text
    .replace(CHINESE_REGEX, '')
    .replace(/\s*\([^)]*(?:nghĩa|dịch|giải thích|phiên âm)[^)]*\)/gi, '')
    .replace(/\(\s*\)|（\s*）/g, '')
    .trim();
  return cleaned || text.trim();
}

interface PositionedItem {
  item: DetectedItem;
  centerX: number; // percentage 0-100
  centerY: number; // percentage 0-100
  boxWidth: number; // percentage 0-100
  boxHeight: number; // percentage 0-100
  text: string;
}

function processItems(rawItems: DetectedItem[]): PositionedItem[] {
  if (!rawItems || rawItems.length === 0) return [];

  const validEntries: PositionedItem[] = [];

  for (const rawItem of rawItems) {
    if (!rawItem.box_2d || rawItem.box_2d.length < 4 || !rawItem.translated_text) continue;
    const cleanText = cleanVerboseText(rawItem.translated_text);
    if (!cleanText || cleanText.length < 1) continue;

    const [ymin, xmin, ymax, xmax] = rawItem.box_2d;
    if (ymax <= ymin || xmax <= xmin) continue;

    const centerX = Math.max(1, Math.min(99, (xmin + xmax) / 20));
    const centerY = Math.max(1, Math.min(99, (ymin + ymax) / 20));
    const boxWidth = Math.max(1, Math.min(98, (xmax - xmin) / 10));
    const boxHeight = Math.max(1, Math.min(98, (ymax - ymin) / 10));

    // Deduplicate only if identical text at virtually the exact same position
    const isDuplicate = validEntries.some((existing) => {
      const dist = Math.hypot(existing.centerX - centerX, existing.centerY - centerY);
      return dist < 2.5 && existing.text.toLowerCase() === cleanText.toLowerCase();
    });

    if (!isDuplicate) {
      validEntries.push({
        item: { ...rawItem, translated_text: cleanText },
        centerX,
        centerY,
        boxWidth,
        boxHeight,
        text: cleanText,
      });
    }
  }

  return validEntries;
}

function getBadgeFontSize(
  textLength: number,
  boxHeight: number,
  textSizeScale: 'sm' | 'md' | 'lg' = 'sm'
): string {
  // If original bounding box is very small (e.g. small button label)
  if (boxHeight < 3.5 || textLength <= 8) {
    if (textSizeScale === 'sm') return '0.62rem';
    if (textSizeScale === 'md') return '0.70rem';
    return '0.78rem';
  }

  if (textSizeScale === 'sm') {
    if (textLength > 40) return '0.62rem';
    if (textLength > 20) return '0.68rem';
    return '0.74rem';
  }
  if (textSizeScale === 'md') {
    if (textLength > 40) return '0.68rem';
    if (textLength > 20) return '0.74rem';
    return '0.80rem';
  }
  // lg
  if (textLength > 40) return '0.74rem';
  if (textLength > 20) return '0.80rem';
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
  const layoutItems = React.useMemo(() => processItems(items), [items]);

  return (
    <div className="absolute inset-0 pointer-events-none z-20 overflow-hidden select-none">
      {layoutItems.map(({ item, centerX, centerY, boxWidth, boxHeight, text }, index) => {
        const isSelected = selectedItem === item;
        const fontSize = getBadgeFontSize(text.length, boxHeight, textSize);
        const isShort = text.length <= 12;

        return (
          <div
            key={`ar-${index}-${text.slice(0, 10)}`}
            style={{
              top: `${centerY}%`,
              left: `${centerX}%`,
              transform: 'translate(-50%, -50%)',
              maxWidth: '92%',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onSelectItem(item);
            }}
            className={`absolute pointer-events-auto cursor-pointer flex items-center justify-center animate-in fade-in zoom-in-95 duration-100 ${
              isSelected ? 'scale-[1.05] z-40' : 'z-20'
            }`}
            title={`Bấm để xem: ${text}`}
          >
            {isTextVisible ? (
              <div
                className={`transition-all text-center px-1.5 py-0.5 rounded shadow-lg flex items-center justify-center ${
                  isShort ? 'whitespace-nowrap' : 'break-words max-w-[280px]'
                } ${
                  isSelected
                    ? 'bg-amber-400 text-slate-950 font-bold rounded ring-2 ring-amber-300 shadow-2xl z-40'
                    : maskCoverMode
                    ? 'bg-slate-950/95 text-white font-bold border border-emerald-400/80 backdrop-blur-sm shadow-xl'
                    : 'bg-black/80 text-emerald-300 font-bold [text-shadow:_0_1px_2px_#000] border border-emerald-400/60'
                }`}
                style={{
                  fontSize,
                  lineHeight: '1.2',
                  minWidth: `${Math.max(boxWidth, 2.5)}%`,
                  minHeight: `${Math.max(boxHeight, 1.8)}%`,
                }}
              >
                {text}
              </div>
            ) : (
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shadow-lg" />
            )}
          </div>
        );
      })}
    </div>
  );
};
