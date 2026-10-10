import React from 'react';
import { History, X, Trash2, ArrowRight, Clock, Globe, FileText, Sparkles } from 'lucide-react';
import { ScanHistoryRecord } from '../types';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  records: ScanHistoryRecord[];
  onSelectRecord: (record: ScanHistoryRecord) => void;
  onClearHistory: () => void;
  onDeleteRecord: (id: string) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  records,
  onSelectRecord,
  onClearHistory,
  onDeleteRecord,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/75 backdrop-blur-sm animate-in fade-in">
      <div
        className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Lịch sử quét dịch</h3>
              <p className="text-[11px] text-slate-400">
                {records.length > 0 ? `${records.length} bản quét đã lưu` : 'Chưa có bản ghi'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {records.length > 0 && (
              <button
                onClick={() => {
                  if (confirm('Bạn có chắc chắn muốn xóa toàn bộ lịch sử quét?')) {
                    onClearHistory();
                  }
                }}
                className="px-2.5 py-1 text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 rounded-lg flex items-center gap-1 transition"
                title="Xóa tất cả"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xóa hết</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content list */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {records.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-16 h-16 rounded-2xl bg-slate-800/80 border border-slate-700/60 flex items-center justify-center mb-3 text-slate-500">
                <History className="w-8 h-8" />
              </div>
              <h4 className="text-sm font-semibold text-slate-200 mb-1">Chưa có bản quét nào</h4>
              <p className="text-xs text-slate-400 max-w-xs mb-4">
                Các bản quét qua camera hoặc ảnh tải lên sẽ tự động lưu lại ở đây để bạn xem lại bất cứ lúc nào khi đi du lịch.
              </p>
              <button
                onClick={onClose}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-xl text-xs transition"
              >
                Quay lại quét camera
              </button>
            </div>
          ) : (
            records.map((rec) => {
              const formattedDate = new Date(rec.timestamp).toLocaleString('vi-VN', {
                hour: '2-digit',
                minute: '2-digit',
                day: '2-digit',
                month: '2-digit',
              });

              return (
                <div
                  key={rec.id}
                  className="group relative bg-slate-800/60 hover:bg-slate-800 border border-slate-700/70 hover:border-emerald-500/50 rounded-xl p-3 transition flex gap-3 cursor-pointer overflow-hidden shadow-sm"
                  onClick={() => onSelectRecord(rec)}
                >
                  {/* Thumbnail */}
                  <div className="w-16 h-16 rounded-lg bg-slate-950 border border-slate-700/60 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {rec.imageUrl ? (
                      <img
                        src={rec.imageUrl}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <FileText className="w-6 h-6 text-slate-600" />
                    )}
                    <span className="absolute bottom-0.5 right-0.5 bg-black/80 text-[9px] font-mono px-1 rounded text-emerald-400">
                      {rec.result?.items?.length || 0}
                    </span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mb-0.5">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{formattedDate}</span>
                        <span>•</span>
                        <span className="text-emerald-400 font-medium">
                          {rec.result?.detected_language || rec.sourceLang || 'Tự động'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-200 truncate group-hover:text-emerald-300 transition">
                        {rec.result?.summary_translation || 'Bản dịch AR Camera'}
                      </p>
                      {rec.result?.items?.[0] && (
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          "{rec.result.items[0].translated_text}"
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-1.5 border-t border-slate-700/40 text-[11px]">
                      <span className="text-slate-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        <span>{rec.result?.items?.length || 0} mục đã dịch</span>
                      </span>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onDeleteRecord(rec.id);
                          }}
                          className="p-1 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded transition"
                          title="Xóa bản ghi này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-emerald-400 flex items-center gap-0.5 font-medium group-hover:translate-x-0.5 transition">
                          <span>Xem</span>
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
