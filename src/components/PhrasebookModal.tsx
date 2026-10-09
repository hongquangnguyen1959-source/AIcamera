import React, { useState } from 'react';
import { TRAVEL_PHRASEBOOK, Phrase } from '../data/phrasebook';
import { Volume2, X, BookOpen, Utensils, Compass, ShoppingBag, ShieldAlert } from 'lucide-react';
import { speakText } from '../utils/audio';

interface PhrasebookModalProps {
  isOpen?: boolean;
  onClose: () => void;
  defaultLang?: string;
}

export const PhrasebookModal: React.FC<PhrasebookModalProps> = ({
  isOpen = true,
  onClose,
  defaultLang = 'zh',
}) => {
  if (!isOpen) return null;
  const [selectedLang, setSelectedLang] = useState<string>(
    TRAVEL_PHRASEBOOK[defaultLang] ? defaultLang : 'zh'
  );
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  const languages = [
    { code: 'zh', name: 'Tiếng Trung', flag: '🇨🇳' },
    { code: 'en', name: 'Tiếng Anh', flag: '🇬🇧' },
  ];

  const phrases = TRAVEL_PHRASEBOOK[selectedLang] || [];

  const filtered = categoryFilter === 'all'
    ? phrases
    : phrases.filter((p) => p.category === categoryFilter);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-xl max-h-[85vh] rounded-2xl flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Sổ Tay Giao Tiếp Du Lịch Nhanh</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Language Tabs */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          {languages.map((l) => (
            <button
              key={l.code}
              onClick={() => setSelectedLang(l.code)}
              className={`flex items-center gap-1.5 py-1.5 px-3 rounded-xl text-xs font-semibold shrink-0 transition-all ${
                selectedLang === l.code
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <span>{l.flag}</span>
              <span>{l.name}</span>
            </button>
          ))}
        </div>

        {/* Category Filters */}
        <div className="px-4 py-2 flex items-center gap-1.5 overflow-x-auto border-b border-slate-800/60 text-xs">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-2.5 py-1 rounded-lg ${
              categoryFilter === 'all' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Tất cả
          </button>
          <button
            onClick={() => setCategoryFilter('dining')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
              categoryFilter === 'dining' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Utensils className="w-3 h-3" />
            <span>Gọi món</span>
          </button>
          <button
            onClick={() => setCategoryFilter('transport')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
              categoryFilter === 'transport' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>Hỏi đường / Tàu</span>
          </button>
          <button
            onClick={() => setCategoryFilter('shopping')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
              categoryFilter === 'shopping' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShoppingBag className="w-3 h-3" />
            <span>Mua sắm</span>
          </button>
          <button
            onClick={() => setCategoryFilter('emergency')}
            className={`flex items-center gap-1 px-2.5 py-1 rounded-lg ${
              categoryFilter === 'emergency' ? 'bg-slate-700 text-white font-medium' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3 h-3 text-red-400" />
            <span>Khẩn cấp</span>
          </button>
        </div>

        {/* Phrases List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {filtered.map((item, idx) => (
            <div
              key={idx}
              className="bg-slate-800/70 border border-slate-700/60 rounded-xl p-3 flex items-start justify-between gap-3 hover:border-slate-600 transition-colors"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-white">
                  {item.vietnamese}
                </p>
                <p className="text-xs font-mono text-emerald-300">
                  {item.original}
                </p>
                <p className="text-xs text-slate-300 italic">
                  Đọc: {item.phonetic}
                </p>
                {item.note && (
                  <p className="text-[11px] text-amber-300/90 pt-0.5">
                    💡 {item.note}
                  </p>
                )}
              </div>

              <button
                onClick={() => speakText(item.original, item.langCode)}
                className="p-2.5 bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800 text-emerald-400 rounded-xl shrink-0 transition-colors"
                title="Bấm để phát âm câu này"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
