import React from 'react';
import {
  X,
  ArrowRightLeft,
  BookOpen,
  DownloadCloud,
  History,
  Key,
  Eye,
  FileText,
  Smartphone,
  Sparkles,
  WifiOff,
  Check,
} from 'lucide-react';

interface ToolsMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenCurrency: () => void;
  onOpenPhrasebook: () => void;
  onOpenOfflinePacks: () => void;
  onOpenHistory: () => void;
  onOpenApiKey: () => void;
  isMissingApiKey: boolean;
  isOnline: boolean;
  downloadedPacksCount: number;
  historyCount: number;
  maskCoverMode: boolean;
  setMaskCoverMode: React.Dispatch<React.SetStateAction<boolean>>;
  hasSummaryTranslation: boolean;
  onOpenSummaryTranslation?: () => void;
}

export const ToolsMenuModal: React.FC<ToolsMenuModalProps> = ({
  isOpen,
  onClose,
  onOpenCurrency,
  onOpenPhrasebook,
  onOpenOfflinePacks,
  onOpenHistory,
  onOpenApiKey,
  isMissingApiKey,
  isOnline,
  downloadedPacksCount,
  historyCount,
  maskCoverMode,
  setMaskCoverMode,
  hasSummaryTranslation,
  onOpenSummaryTranslation,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-2xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-800 flex items-center justify-center text-emerald-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Tiện ích du lịch</h3>
              <p className="text-[11px] text-slate-400">Công cụ hỗ trợ dịch thuật &amp; du lịch</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Display Settings Quick Toggle */}
        <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 space-y-2">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Tùy chọn hiển thị AR
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Eye className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="text-xs font-medium text-slate-200">Che chữ gốc</div>
                <div className="text-[10px] text-slate-500">
                  {maskCoverMode ? 'Đang bật: Nền che chữ gốc rõ ràng' : 'Đang tắt: Chữ nổi tự nhiên'}
                </div>
              </div>
            </div>
            <button
              onClick={() => setMaskCoverMode((prev) => !prev)}
              className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                maskCoverMode ? 'bg-emerald-600' : 'bg-slate-800'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-1 ${
                  maskCoverMode ? 'left-6' : 'left-1'
                }`}
              />
            </button>
          </div>

          {hasSummaryTranslation && onOpenSummaryTranslation && (
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-emerald-400" />
                <div className="text-xs font-medium text-slate-200">Đọc bài văn liền mạch</div>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onOpenSummaryTranslation();
                }}
                className="px-2.5 py-1 bg-emerald-600/80 hover:bg-emerald-600 text-white rounded-lg text-xs font-medium transition cursor-pointer"
              >
                Mở đọc
              </button>
            </div>
          )}
        </div>

        {/* Main Travel Tools Grid */}
        <div className="grid grid-cols-2 gap-2.5">
          {/* Currency Converter */}
          <button
            onClick={() => {
              onClose();
              onOpenCurrency();
            }}
            className="flex flex-col items-start p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition text-left group cursor-pointer active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-lg bg-cyan-950/80 border border-cyan-800/60 flex items-center justify-center text-cyan-400 mb-2">
              <ArrowRightLeft className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-cyan-300">Đổi tiền tệ</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Tỷ giá sang VNĐ</span>
          </button>

          {/* Travel Phrasebook */}
          <button
            onClick={() => {
              onClose();
              onOpenPhrasebook();
            }}
            className="flex flex-col items-start p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition text-left group cursor-pointer active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-800/60 flex items-center justify-center text-amber-400 mb-2">
              <BookOpen className="w-4 h-4" />
            </div>
            <span className="text-xs font-bold text-white group-hover:text-amber-300">Sổ tay mẫu câu</span>
            <span className="text-[10px] text-slate-400 mt-0.5">Câu nói du lịch thông dụng</span>
          </button>

          {/* Offline Language Packs */}
          <button
            onClick={() => {
              onClose();
              onOpenOfflinePacks();
            }}
            className="flex flex-col items-start p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition text-left group cursor-pointer active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-950/80 border border-emerald-800/60 flex items-center justify-center text-emerald-400 mb-2">
              {!isOnline ? (
                <WifiOff className="w-4 h-4 text-amber-400" />
              ) : (
                <DownloadCloud className="w-4 h-4" />
              )}
            </div>
            <div className="flex items-center gap-1.5 w-full justify-between">
              <span className="text-xs font-bold text-white group-hover:text-emerald-300">Gói ngoại tuyến</span>
              {downloadedPacksCount > 0 && (
                <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.2 rounded font-bold">
                  {downloadedPacksCount}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">
              {!isOnline ? 'Đang dùng ngoại tuyến' : 'Dịch khi không có mạng'}
            </span>
          </button>

          {/* History */}
          <button
            onClick={() => {
              onClose();
              onOpenHistory();
            }}
            className="flex flex-col items-start p-3 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 transition text-left group cursor-pointer active:scale-[0.98]"
          >
            <div className="w-8 h-8 rounded-lg bg-purple-950/80 border border-purple-800/60 flex items-center justify-center text-purple-400 mb-2">
              <History className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-1.5 w-full justify-between">
              <span className="text-xs font-bold text-white group-hover:text-purple-300">Lịch sử quét</span>
              {historyCount > 0 && (
                <span className="text-[9px] bg-purple-500/20 text-purple-400 px-1.5 py-0.2 rounded font-bold">
                  {historyCount}
                </span>
              )}
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5">Xem lại các lần dịch</span>
          </button>
        </div>

        {/* API Key Configuration Card */}
        <button
          onClick={() => {
            onClose();
            onOpenApiKey();
          }}
          className={`w-full flex items-center justify-between p-3 rounded-xl border transition text-left cursor-pointer ${
            isMissingApiKey
              ? 'bg-amber-500/10 border-amber-500/50 hover:bg-amber-500/20'
              : 'bg-slate-800/50 border-slate-700/60 hover:bg-slate-800'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center">
              <Key className={`w-4 h-4 ${isMissingApiKey ? 'text-amber-400' : 'text-emerald-400'}`} />
            </div>
            <div>
              <div className="text-xs font-bold text-white">
                {isMissingApiKey ? 'Chưa cài Gemini API Key' : 'Gemini API Key'}
              </div>
              <div className="text-[10px] text-slate-400">
                {isMissingApiKey ? 'Nhấn để thêm Key cá nhân' : 'Đã kết nối dịch thuật'}
              </div>
            </div>
          </div>
          <span className="text-xs font-medium text-emerald-400">
            {isMissingApiKey ? 'Cài đặt ngay' : 'Tùy chỉnh'}
          </span>
        </button>
      </div>
    </div>
  );
};
