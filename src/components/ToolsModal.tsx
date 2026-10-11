import React from 'react';
import {
  X,
  Key,
  DownloadCloud,
  ArrowRightLeft,
  BookOpen,
  History,
  Sparkles,
  WifiOff,
} from 'lucide-react';

interface ToolsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenApiKey: () => void;
  onOpenOffline: () => void;
  onOpenCurrency: () => void;
  onOpenPhrasebook: () => void;
  onOpenHistory: () => void;
  onOpenSamples: () => void;
  isMissingApiKey?: boolean;
  isOnline?: boolean;
  historyCount?: number;
}

export const ToolsModal: React.FC<ToolsModalProps> = ({
  isOpen,
  onClose,
  onOpenApiKey,
  onOpenOffline,
  onOpenCurrency,
  onOpenPhrasebook,
  onOpenHistory,
  onOpenSamples,
  isMissingApiKey = false,
  isOnline = true,
  historyCount = 0,
}) => {
  if (!isOpen) return null;

  const tools = [
    {
      id: 'apikey',
      title: 'Gemini API Key AI',
      desc: isMissingApiKey ? 'Đang thiếu Key — Chạm để cài' : 'Cài đặt Gemini Key tốc độ cao',
      icon: <Key className="w-5 h-5 text-emerald-400" />,
      badge: isMissingApiKey ? 'Cần cài' : 'Hoạt động',
      badgeColor: isMissingApiKey ? 'bg-amber-500/20 text-amber-300 border-amber-500/50' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50',
      action: onOpenApiKey,
    },
    {
      id: 'offline',
      title: 'Gói từ điển Ngoại tuyến',
      desc: 'Tải bộ từ điển dịch không cần mạng',
      icon: !isOnline ? <WifiOff className="w-5 h-5 text-amber-400" /> : <DownloadCloud className="w-5 h-5 text-cyan-400" />,
      badge: !isOnline ? 'Mất mạng' : 'Sẵn sàng',
      badgeColor: 'bg-slate-800 text-slate-300 border-slate-700',
      action: onOpenOffline,
    },
    {
      id: 'currency',
      title: 'Quy đổi tiền tệ',
      desc: 'Tính giá tiền ngoại tệ sang VNĐ nhanh',
      icon: <ArrowRightLeft className="w-5 h-5 text-amber-400" />,
      action: onOpenCurrency,
    },
    {
      id: 'phrasebook',
      title: 'Mẫu câu giao tiếp',
      desc: 'Sổ tay mẫu câu du lịch thông dụng',
      icon: <BookOpen className="w-5 h-5 text-purple-400" />,
      action: onOpenPhrasebook,
    },
    {
      id: 'history',
      title: 'Lịch sử ảnh đã quét',
      desc: `${historyCount} bức ảnh đã lưu bản dịch`,
      icon: <History className="w-5 h-5 text-teal-400" />,
      badge: historyCount > 0 ? `${historyCount}` : undefined,
      badgeColor: 'bg-teal-500/20 text-teal-300 border-teal-500/50',
      action: onOpenHistory,
    },
    {
      id: 'samples',
      title: 'Ảnh mẫu thử nghiệm',
      desc: 'Thử nghiệm dịch Menu, Biển hiệu, Báo chí',
      icon: <Sparkles className="w-5 h-5 text-emerald-300" />,
      action: onOpenSamples,
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-white">Công cụ &amp; Cài đặt du lịch</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tools Grid */}
        <div className="p-3 grid grid-cols-1 gap-2 max-h-[70vh] overflow-y-auto">
          {tools.map((t) => (
            <button
              key={t.id}
              onClick={() => {
                onClose();
                t.action();
              }}
              className="flex items-center justify-between p-3 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition text-left group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-slate-700 shrink-0">
                  {t.icon}
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-bold text-slate-100 group-hover:text-white truncate">
                    {t.title}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {t.desc}
                  </div>
                </div>
              </div>

              {t.badge && (
                <span className={`px-2 py-0.5 text-[10px] font-semibold border rounded-md shrink-0 ml-2 ${t.badgeColor}`}>
                  {t.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
