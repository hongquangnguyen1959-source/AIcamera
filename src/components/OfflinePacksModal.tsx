import React, { useState, useEffect } from 'react';
import {
  X,
  Download,
  Trash2,
  CheckCircle2,
  WifiOff,
  Wifi,
  HardDrive,
  Search,
  Volume2,
  Sparkles,
  ArrowDownToLine,
  RotateCcw,
  BookOpen,
  Info,
} from 'lucide-react';
import { POPULAR_LANGUAGE_PACKS, OfflineLanguagePack } from '../data/offlineLanguagePacksData';
import {
  getSavedPacksState,
  savePackState,
  getTotalDownloadedSizeMB,
  getActivePackId,
  setActivePackId,
  downloadPackAsJsonFile,
} from '../utils/languagePackStorage';
import { searchOfflineVocabulary, OfflineMatchResult } from '../utils/offlineTranslator';
import { speakText } from '../utils/audio';

interface OfflinePacksModalProps {
  isOpen: boolean;
  onClose: () => void;
  isOnline: boolean;
  onSelectPackForOfflineScan?: (packId: string) => void;
}

export const OfflinePacksModal: React.FC<OfflinePacksModalProps> = ({
  isOpen,
  onClose,
  isOnline,
  onSelectPackForOfflineScan,
}) => {
  const [downloadingPacks, setDownloadingPacks] = useState<Record<string, number>>({});
  const [downloadedState, setDownloadedState] = useState<Record<string, boolean>>({});
  const [activePackId, setActivePackIdState] = useState<string>(() => getActivePackId());
  const [activeTab, setActiveTab] = useState<'packs' | 'test'>('packs');

  // Test search query state
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<OfflineMatchResult[]>([]);
  const [selectedPackFilter, setSelectedPackFilter] = useState<string>('all');

  // Refresh saved state on mount and open
  useEffect(() => {
    if (isOpen) {
      const state = getSavedPacksState();
      const map: Record<string, boolean> = {};
      POPULAR_LANGUAGE_PACKS.forEach((p) => {
        map[p.id] = Boolean(state[p.id]?.downloaded);
      });
      setDownloadedState(map);
      setActivePackIdState(getActivePackId());
    }
  }, [isOpen]);

  // Handle instant search when query changes
  useEffect(() => {
    if (!testQuery.trim()) {
      // Default to top 6 common signs
      setTestResults(searchOfflineVocabulary('出口'));
      return;
    }
    const lang = selectedPackFilter === 'all' ? undefined : selectedPackFilter;
    const res = searchOfflineVocabulary(testQuery, lang);
    setTestResults(res);
  }, [testQuery, selectedPackFilter]);

  if (!isOpen) return null;

  // Simulate smooth realistic download progress
  const startDownload = (pack: OfflineLanguagePack) => {
    if (downloadingPacks[pack.id]) return;

    setDownloadingPacks((prev) => ({ ...prev, [pack.id]: 10 }));

    let current = 10;
    const interval = setInterval(() => {
      current += Math.floor(Math.random() * 25) + 15;
      if (current >= 100) {
        clearInterval(interval);
        setDownloadingPacks((prev) => {
          const next = { ...prev };
          delete next[pack.id];
          return next;
        });
        savePackState(pack.id, true);
        setDownloadedState((prev) => ({ ...prev, [pack.id]: true }));
      } else {
        setDownloadingPacks((prev) => ({ ...prev, [pack.id]: current }));
      }
    }, 280);
  };

  // Remove downloaded pack
  const removePack = (packId: string) => {
    savePackState(packId, false);
    setDownloadedState((prev) => ({ ...prev, [packId]: false }));
  };

  // Download all popular packs
  const downloadAllPopular = () => {
    POPULAR_LANGUAGE_PACKS.filter((p) => p.isPopular && !downloadedState[p.id]).forEach(
      (pack, idx) => {
        setTimeout(() => {
          startDownload(pack);
        }, idx * 400);
      }
    );
  };

  const totalDownloadedMB = getTotalDownloadedSizeMB();
  const downloadedCount = Object.values(downloadedState).filter(Boolean).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[92vh] flex flex-col bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between bg-slate-900/95 sticky top-0 z-10">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
                <ArrowDownToLine className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  Gói Ngôn Ngữ Ngoại Tuyến
                  <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    Offline Ready
                  </span>
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                  Dịch nhanh biển hiệu, chỉ dẫn & thực đơn ngay cả khi không có mạng 4G/Wifi
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Bar */}
        <div className="px-4 py-3 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-slate-300">
              <HardDrive className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                Đã tải:{' '}
                <strong className="text-white font-semibold">{downloadedCount}</strong> /{' '}
                {POPULAR_LANGUAGE_PACKS.length} gói ({totalDownloadedMB} MB)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {isOnline ? (
                <span className="flex items-center gap-1 text-emerald-400">
                  <Wifi className="w-3.5 h-3.5" /> Trực tuyến
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-400 font-medium">
                  <WifiOff className="w-3.5 h-3.5" /> Đang ngoại tuyến
                </span>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab('packs')}
              className={`px-3 py-1 rounded-lg font-medium transition ${
                activeTab === 'packs'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              Danh sách gói
            </button>
            <button
              onClick={() => setActiveTab('test')}
              className={`px-3 py-1 rounded-lg font-medium transition flex items-center gap-1.5 ${
                activeTab === 'test'
                  ? 'bg-emerald-500 text-slate-950 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5" /> Thử tra từ offline
            </button>
          </div>
        </div>

        {/* Body content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {activeTab === 'packs' && (
            <>
              {/* Batch Action Banner */}
              <div className="p-3.5 bg-gradient-to-r from-emerald-950/40 via-slate-900 to-sky-950/40 border border-emerald-500/20 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-slate-200">
                      Gói Dành Riêng Cho Tiếng Trung &amp; Tiếng Anh
                    </h4>
                    <p className="text-xs text-slate-400">
                      Tải sẵn từ điển Tiếng Trung 🇨🇳 và Tiếng Anh 🇬🇧 để tra cứu biển báo và chỉ dẫn khi mất mạng
                    </p>
                  </div>
                </div>
                <button
                  onClick={downloadAllPopular}
                  className="px-3.5 py-2 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl transition flex items-center gap-1.5 whitespace-nowrap shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  Tải tất cả gói phổ biến
                </button>
              </div>

              {/* Language Pack Cards */}
              <div className="grid gap-3 sm:grid-cols-2">
                {POPULAR_LANGUAGE_PACKS.map((pack) => {
                  const isDownloaded = downloadedState[pack.id];
                  const progress = downloadingPacks[pack.id];
                  const isDownloading = typeof progress === 'number';

                  return (
                    <div
                      key={pack.id}
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                        isDownloaded
                          ? 'bg-slate-800/80 border-emerald-500/30 shadow-sm'
                          : 'bg-slate-800/40 border-slate-700/60 hover:border-slate-600'
                      }`}
                    >
                      <div>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2.5">
                            <span className="text-2xl" role="img" aria-label={pack.name}>
                              {pack.flag}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-sm sm:text-base text-white">
                                  {pack.name}
                                </h3>
                              </div>
                              <span className="text-xs text-slate-400">
                                {pack.sizeMB} MB • v{pack.version}
                              </span>
                            </div>
                          </div>

                          {isDownloaded && (
                            <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 whitespace-nowrap">
                              <CheckCircle2 className="w-3 h-3" /> Đã sẵn sàng
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed mb-3">
                          {pack.description}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mb-3">
                          <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50">
                            🏷️ {pack.signboardCount}+ biển hiệu
                          </span>
                          <span className="bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700/50">
                            📖 {pack.vocabularyCount}+ từ vựng
                          </span>
                        </div>
                      </div>

                      {/* Download Status & Action Button */}
                      <div className="pt-2 border-t border-slate-700/50">
                        {isDownloading ? (
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-xs font-medium text-emerald-400">
                              <span>Đang tải gói...</span>
                              <span>{progress}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-200"
                                style={{ width: `${progress}%` }}
                              />
                            </div>
                          </div>
                        ) : isDownloaded ? (
                          <div className="flex flex-col gap-2">
                            <div className="flex items-center justify-between gap-1.5">
                              {onSelectPackForOfflineScan && (
                                <button
                                  onClick={() => {
                                    setActivePackId(pack.id);
                                    setActivePackIdState(pack.id);
                                    onSelectPackForOfflineScan(pack.id);
                                    onClose();
                                  }}
                                  className={`flex-1 px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center justify-center gap-1.5 ${
                                    activePackId === pack.id
                                      ? 'bg-emerald-500 text-slate-950 shadow-sm'
                                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30'
                                  }`}
                                >
                                  {activePackId === pack.id ? '✓ Đang dùng dịch camera' : 'Chọn dùng gói này'}
                                </button>
                              )}

                              <button
                                onClick={() => downloadPackAsJsonFile(pack)}
                                className="px-2.5 py-1.5 text-xs bg-slate-700/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-600 transition flex items-center gap-1"
                                title="Tải tệp JSON dữ liệu về máy điện thoại"
                              >
                                <ArrowDownToLine className="w-3.5 h-3.5 text-sky-400" />
                                <span>Tệp .JSON</span>
                              </button>

                              <button
                                onClick={() => removePack(pack.id)}
                                className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition"
                                title="Xóa gói để giải phóng bộ nhớ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => startDownload(pack)}
                              className="flex-1 py-2 px-3 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition flex items-center justify-center gap-1.5 shadow-sm"
                            >
                              <Download className="w-3.5 h-3.5" />
                              Tải về máy ({pack.sizeMB} MB)
                            </button>
                            <button
                              onClick={() => downloadPackAsJsonFile(pack)}
                              className="py-2 px-2.5 text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 hover:text-white rounded-lg border border-slate-600 transition flex items-center gap-1"
                              title="Tải trực tiếp tệp .JSON về máy"
                            >
                              <ArrowDownToLine className="w-3.5 h-3.5 text-sky-400" />
                              <span className="hidden sm:inline">Lưu .JSON</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Informational tip */}
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 flex items-start gap-2.5 text-xs text-slate-400">
                <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                <p>
                  Gói ngoại tuyến được lưu trữ an toàn trong trình duyệt của bạn. Khi điện thoại mất sóng
                  hoặc bật Chế độ máy bay, camera dịch sẽ tự động dùng gói này để tra cứu và dịch các biển hiệu,
                  thực đơn và cụm từ khẩn cấp tức thì mà không cần mạng.
                </p>
              </div>
            </>
          )}

          {activeTab === 'test' && (
            <div className="space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={testQuery}
                  onChange={(e) => setTestQuery(e.target.value)}
                  placeholder="Nhập chữ Hán, Katakana, Hangul hoặc tiếng Việt (vd: 出口, 同仁堂, 严禁吸烟)..."
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
                {testQuery && (
                  <button
                    onClick={() => setTestQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Quick sample chips */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-slate-400 mr-1">Thử nhanh:</span>
                {[
                  { text: '出口', label: '出口 (Lối ra)' },
                  { text: '同仁堂', label: '同仁堂 (Đồng Nhân Đường)' },
                  { text: '严禁吸烟', label: '严禁吸烟 (Cấm hút thuốc)' },
                  { text: '洗手间', label: '洗手间 (Nhà vệ sinh)' },
                  { text: '免税', label: '免税 (Tax Free)' },
                  { text: '화장실', label: '화장실 (Hàn)' },
                  { text: 'ทางออก', label: 'ทางออก (Thái)' },
                ].map((item) => (
                  <button
                    key={item.text}
                    onClick={() => setTestQuery(item.text)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg border border-slate-700/60 transition"
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Results display */}
              <div className="space-y-2.5 max-h-[48vh] overflow-y-auto pr-1">
                {testResults.length === 0 ? (
                  <div className="text-center py-8 text-slate-400">
                    <BookOpen className="w-8 h-8 mx-auto text-slate-500 mb-2 opacity-60" />
                    <p className="text-sm">Không tìm thấy từ vựng này trong cơ sở dữ liệu đã tải.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      Hãy thử từ khóa ngắn hơn như "出口", "入口", "menzei", "WC"...
                    </p>
                  </div>
                ) : (
                  testResults.map((item, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-slate-800/80 border border-slate-700/70 rounded-xl flex items-center justify-between gap-3 hover:border-emerald-500/40 transition"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg font-bold text-white tracking-wide">
                            {item.original}
                          </span>
                          {item.pinyinOrRomaji && (
                            <span className="text-xs text-sky-400 font-mono bg-sky-950/60 px-2 py-0.5 rounded border border-sky-800/40">
                              {item.pinyinOrRomaji}
                            </span>
                          )}
                          <span className="text-[10px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded uppercase">
                            {item.sourceLangName}
                          </span>
                        </div>
                        <div className="text-sm font-semibold text-emerald-400">
                          {item.vietnamese}
                        </div>
                        {item.note && (
                          <div className="text-xs text-slate-400 mt-0.5 italic">
                            💡 {item.note}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => speakText(item.original, 'zh')}
                        className="p-2.5 bg-slate-700/70 hover:bg-emerald-600 hover:text-slate-950 text-slate-300 rounded-xl transition shrink-0"
                        title="Nghe phát âm"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs text-slate-400">
          <span>Hỗ trợ dịch chuẩn hóa OCR biển hiệu ngoại tuyến 100% tiếng Việt</span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium rounded-xl transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
