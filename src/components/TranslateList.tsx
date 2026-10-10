import React from 'react';
import { VisionTranslationResult, DetectedItem, DetectedPrice } from '../types';
import { AlertTriangle, Utensils, Tag, Compass, Sparkles, Check, Copy } from 'lucide-react';

interface TranslateListProps {
  result?: VisionTranslationResult;
  items?: DetectedItem[];
  detectedPrices?: DetectedPrice[];
  summaryTranslation?: string;
  travelAdvice?: string;
  selectedItem: DetectedItem | null;
  onSelectItem: (item: DetectedItem) => void;
  onAskAboutItem?: (item: DetectedItem) => void;
  langCode?: string;
}

export const TranslateList: React.FC<TranslateListProps> = ({
  result,
  items: propItems,
  detectedPrices: propPrices,
  summaryTranslation: propSummary,
  travelAdvice: propAdvice,
  selectedItem,
  onSelectItem,
  onAskAboutItem,
  langCode = 'auto',
}) => {
  const items = propItems || result?.items || [];
  const detectedPrices = propPrices || result?.detected_prices || [];
  const summaryTranslation = propSummary || result?.summary_translation || '';
  const travelAdvice = propAdvice || result?.travel_advice || '';
  const detectedLanguage = result?.detected_language || 'Ngôn ngữ nhận diện';

  const [copiedIndex, setCopiedIndex] = React.useState<number | null>(null);

  const copyText = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-4 text-slate-100">
      {/* Travel Advice Banner */}
      {travelAdvice && (
        <div className="bg-sky-950/40 border border-sky-800/60 rounded-xl p-3.5 flex items-start gap-3">
          <Sparkles className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-semibold text-sky-300 uppercase tracking-wider">
              Lưu ý du lịch hữu ích
            </h4>
            <p className="text-xs text-sky-100 leading-relaxed">
              {travelAdvice}
            </p>
          </div>
        </div>
      )}

      {/* Detected Prices Strip */}
      {detectedPrices && detectedPrices.length > 0 && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider">
            <Tag className="w-4 h-4" />
            <span>Giá tiền nhận diện &amp; quy đổi ước tính sang VNĐ</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {detectedPrices.map((p, idx) => (
              <div
                key={idx}
                className="bg-slate-800/80 border border-slate-700/60 rounded-lg p-2.5 flex flex-col justify-between"
              >
                <span className="text-xs text-slate-300 font-mono font-medium">
                  {p.original_price}
                </span>
                <span className="text-sm font-bold text-emerald-400 mt-1">
                  {p.estimated_vnd}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary Translation */}
      {summaryTranslation && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
              Bản dịch tổng quan ({detectedLanguage})
            </span>
          </div>
          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-line">
            {summaryTranslation}
          </p>
        </div>
      )}

      {/* Detected Items List */}
      <div className="space-y-2">
        <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-1">
          Từng dòng chữ phát hiện ({items.length})
        </h4>

        <div className="space-y-2">
          {items.map((item, index) => {
            const isSelected = selectedItem === item;
            return (
              <div
                key={index}
                onClick={() => onSelectItem(item)}
                className={`p-3 rounded-xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-950/40 border-emerald-500 shadow-md ring-1 ring-emerald-500/30'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="text-sm font-bold text-white leading-snug whitespace-pre-line break-words">
                      {item.translated_text}
                    </p>
                    {item.cultural_tip && (
                      <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-300">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span>{item.cultural_tip}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyText(item.translated_text, index);
                      }}
                      className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                      title="Sao chép tiếng Việt"
                    >
                      {copiedIndex === index ? (
                        <Check className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Copy className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
