import React, { useState } from 'react';
import { VisionTranslationResult, DetectedItem } from '../types';
import { Sparkles, Send, X, Volume2, Loader2, MessageSquareQuote } from 'lucide-react';
import { speakText } from '../utils/audio';

interface TravelAskModalProps {
  onClose: () => void;
  result: VisionTranslationResult;
  selectedItem?: DetectedItem | null;
  image?: string;
}

export const TravelAskModal: React.FC<TravelAskModalProps> = ({
  onClose,
  result,
  selectedItem,
  image,
}) => {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [answer, setAnswer] = useState<string | null>(null);

  const defaultSuggestions = selectedItem
    ? [
        `Món "${selectedItem.translated_text}" có cay hay có dị ứng gì không?`,
        `Làm sao nói với nhân viên để gọi "${selectedItem.original_text}"?`,
        `Món này ăn kèm với gì thì ngon nhất?`,
      ]
    : [
        'Món nào ở đây không cay và dễ ăn nhất?',
        'Có món nào chứa thịt heo hay hải sản không?',
        'Biển báo này có quy định cấm hoặc mức phạt gì không?',
        'Cách nói cảm ơn và xin hóa đơn ở đây là gì?',
      ];

  const handleAsk = async (q: string) => {
    if (!q.trim() || loading) return;
    setLoading(true);
    setAnswer(null);

    try {
      const res = await fetch('/api/travel-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: q,
          context: {
            detected_language: result.detected_language,
            summary: result.summary_translation,
            selected_item: selectedItem,
            all_items: result.items.slice(0, 15),
          },
          image,
        }),
      });

      if (!res.ok) throw new Error('Lỗi gửi câu hỏi');
      const data = await res.json();
      setAnswer(data.answer);
    } catch (err: any) {
      setAnswer('Có lỗi xảy ra khi hỏi trợ lý: ' + (err.message || 'Thử lại sau ít phút'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-lg rounded-2xl flex flex-col shadow-2xl overflow-hidden max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Hỏi Trợ Lý Du Lịch Thực Địa</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          {/* Context Tag */}
          {selectedItem && (
            <div className="bg-emerald-950/40 border border-emerald-800/60 rounded-xl p-3 text-xs space-y-1">
              <span className="text-emerald-400 font-semibold uppercase">Đang hỏi về:</span>
              <p className="text-sm font-bold text-white">{selectedItem.translated_text} ({selectedItem.original_text})</p>
            </div>
          )}

          {/* Quick suggestions */}
          <div className="space-y-1.5">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Câu hỏi nhanh gợi ý:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {defaultSuggestions.map((sug, i) => (
                <button
                  key={i}
                  disabled={loading}
                  onClick={() => {
                    setQuestion(sug);
                    handleAsk(sug);
                  }}
                  className="text-left text-xs bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 py-1.5 px-2.5 rounded-lg transition-colors flex items-center gap-1.5"
                >
                  <MessageSquareQuote className="w-3 h-3 text-emerald-400 shrink-0" />
                  <span>{sug}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Answer Box */}
          {loading && (
            <div className="bg-slate-800/50 rounded-xl p-4 flex items-center justify-center gap-3 text-slate-300 text-sm">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              <span>Trợ lý AI đang tra cứu ngữ cảnh du lịch...</span>
            </div>
          )}

          {answer && (
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
                  Lời giải đáp từ Trợ lý
                </span>
                <button
                  onClick={() => speakText(answer, 'vi-VN')}
                  className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2 py-1 rounded bg-slate-700 transition-colors"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Đọc to</span>
                </button>
              </div>
              <p className="text-sm text-slate-100 whitespace-pre-line leading-relaxed">
                {answer}
              </p>
            </div>
          )}
        </div>

        {/* Custom Input */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAsk(question);
            }}
            placeholder="Nhập câu hỏi khác về ảnh này..."
            className="flex-1 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
          />
          <button
            onClick={() => handleAsk(question)}
            disabled={!question.trim() || loading}
            className="p-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
