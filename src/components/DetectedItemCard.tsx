import React from 'react';
import { DetectedItem } from '../types';
import { Copy, Check, X, AlertTriangle, Utensils, Tag, Compass, Sparkles } from 'lucide-react';

interface DetectedItemCardProps {
  item: DetectedItem;
  onClose: () => void;
  onAskAboutItem?: (item: DetectedItem) => void;
  onAskAi?: (question: string) => void;
  detectedLang?: string;
  langCode?: string;
}

export const DetectedItemCard: React.FC<DetectedItemCardProps> = ({
  item,
  onClose,
  onAskAboutItem,
  onAskAi,
  detectedLang = 'Tiếng bản địa',
}) => {
  const [copiedTranslated, setCopiedTranslated] = React.useState(false);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTranslated(true);
    setTimeout(() => setCopiedTranslated(false), 2000);
  };

  const getCategoryBadge = (category?: string) => {
    switch (category) {
      case 'menu':
        return { label: 'Món ăn / Ẩm thực', icon: <Utensils className="w-3.5 h-3.5" />, color: 'text-emerald-400 bg-emerald-950/60 border-emerald-800' };
      case 'warning':
        return { label: 'Cảnh báo / Cấm', icon: <AlertTriangle className="w-3.5 h-3.5" />, color: 'text-amber-400 bg-amber-950/60 border-amber-800' };
      case 'price':
        return { label: 'Giá tiền', icon: <Tag className="w-3.5 h-3.5" />, color: 'text-cyan-400 bg-cyan-950/60 border-cyan-800' };
      case 'transport':
        return { label: 'Giao thông / Tàu xe', icon: <Compass className="w-3.5 h-3.5" />, color: 'text-sky-400 bg-sky-950/60 border-sky-800' };
      default:
        return { label: 'Biển hiệu / Chỉ dẫn', icon: <Compass className="w-3.5 h-3.5" />, color: 'text-slate-300 bg-slate-800 border-slate-700' };
    }
  };

  const badge = getCategoryBadge(item.category);

  return (
    <div className="fixed inset-x-3 bottom-16 sm:inset-auto sm:right-6 sm:bottom-28 sm:w-96 max-h-[75vh] z-[100] bg-slate-900 border border-slate-700/90 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-200">
      {/* Header with Sticky Close Button [X] always visible */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 shrink-0 relative z-10">
        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${badge.color}`}>
          {badge.icon}
          <span>{badge.label}</span>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white transition-colors border border-slate-700 flex items-center justify-center shrink-0 shadow-sm cursor-pointer"
          title="Đóng bảng chi tiết"
        >
          <X className="w-5 h-5 text-slate-100" />
        </button>
      </div>

      {/* Scrollable Content Body */}
      <div className="flex-1 overflow-y-auto py-3 space-y-3 pr-1">
        {/* Full Vietnamese Translation */}
        <div className="bg-emerald-950/40 border border-emerald-900/50 rounded-xl p-3.5 space-y-2">
          <div className="text-[11px] font-bold tracking-wider text-emerald-400 uppercase flex items-center justify-between">
            <span>Dịch Tiếng Việt ({detectedLang})</span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => copyToClipboard(item.translated_text)}
                className="p-1 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-900/40 rounded transition-colors"
                title="Sao chép bản dịch"
              >
                {copiedTranslated ? <Check className="w-4 h-4 text-emerald-300" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          <p className="text-sm font-semibold text-white leading-relaxed whitespace-pre-line break-words">
            {item.translated_text}
          </p>
        </div>

        {/* Cultural / Travel Tip */}
        {item.cultural_tip && (
          <div className="bg-amber-950/30 border border-amber-900/40 rounded-xl p-2.5 flex items-start gap-2 text-xs text-amber-200">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <span>{item.cultural_tip}</span>
          </div>
        )}

        {/* Action Button: Ask AI about this word/dish */}
        <button
          onClick={() => {
            if (onAskAboutItem) onAskAboutItem(item);
            else if (onAskAi) onAskAi(`Cho tôi biết thông tin chi tiết về nội dung "${item.translated_text}" này nhé!`);
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium rounded-xl transition-colors shrink-0"
        >
          <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
          <span>Hỏi trợ lý du lịch về nội dung này</span>
        </button>
      </div>
    </div>
  );
};
