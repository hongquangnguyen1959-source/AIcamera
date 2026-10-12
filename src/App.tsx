/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Layers,
  ListFilter,
  ArrowRightLeft,
  BookOpen,
  History,
  Sparkles,
  Globe2,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  Radio,
  FileText,
  X,
  DownloadCloud,
  WifiOff,
  Key,
  Volume2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
} from 'lucide-react';
import { CameraView } from './components/CameraView';
import { AROverlay } from './components/AROverlay';
import { DetectedItemCard } from './components/DetectedItemCard';
import { TranslateList } from './components/TranslateList';
import { CurrencyConverter } from './components/CurrencyConverter';
import { PhrasebookModal } from './components/PhrasebookModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { TravelAskModal } from './components/TravelAskModal';
import { OfflinePacksModal } from './components/OfflinePacksModal';
import { ToolsModal } from './components/ToolsModal';
import { ApiKeyModal } from './components/ApiKeyModal';
import { PWAInstallButton } from './components/PWAInstallButton';
import { compressImageForOCR } from './utils/imageCompressor';
import { translateOfflineSnapshot } from './utils/offlineTranslator';
import { getDownloadedPacks, getActivePackId, setActivePackId } from './utils/languagePackStorage';
import { getUserApiKey } from './utils/apiKeyStorage';
import { speakText } from './utils/audio';
import { TRAVEL_SAMPLES } from './data/travelSamples';
import {
  DetectedItem,
  VisionTranslationResult,
  ScanHistoryRecord,
  TravelSample,
} from './types';

const STORAGE_KEY = 'travel_camera_translator_history_v2';

export default function App() {
  const [staticImageUrl, setStaticImageUrl] = useState<string | null>(null);
  const [result, setResult] = useState<VisionTranslationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isLiveTranslating, setIsLiveTranslating] = useState(true);
  const [silentNotice, setSilentNotice] = useState<string | null>(null);

  const [selectedItem, setSelectedItem] = useState<DetectedItem | null>(null);
  const [showOverlayText, setShowOverlayText] = useState(true);
  const [maskCoverMode, setMaskCoverMode] = useState(true); // Mặc định bật hộp nền mờ tương phản cao để chữ không bị chìm/đè lên chữ gốc
  const [showFullArticle, setShowFullArticle] = useState(false);
  const [activeTab, setActiveTab] = useState<'photo' | 'live' | 'list'>('photo');
  const [viewMode, setViewMode] = useState<'ar' | 'list'>('ar');
  const [isPhotoSheetExpanded, setIsPhotoSheetExpanded] = useState(false);
  const [copiedAll, setCopiedAll] = useState(false);

  // Modals & Drawers
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showCurrencyModal, setShowCurrencyModal] = useState(false);
  const [showPhrasebookModal, setShowPhrasebookModal] = useState(false);
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [showAskModal, setShowAskModal] = useState(false);
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [showSamplesModal, setShowSamplesModal] = useState(false);
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('sm');
  const [hasServerKey, setHasServerKey] = useState<boolean>(true);
  const [isMissingApiKey, setIsMissingApiKey] = useState<boolean>(false);
  const [isQuotaExhausted, setIsQuotaExhausted] = useState<boolean>(false);
  const [activePackId, setActivePackIdState] = useState<string>(() => getActivePackId());
  const [isOnline, setIsOnline] = useState<boolean>(() => {
    return typeof navigator !== 'undefined' ? navigator.onLine : true;
  });

  // Check server health & API key configuration on Vercel
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        setHasServerKey(Boolean(data.hasServerApiKey));
        if (!data.hasServerApiKey && !getUserApiKey()) {
          setIsMissingApiKey(true);
        }
      })
      .catch(() => {});
  }, []);

  // Track online/offline connectivity
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setSilentNotice('Đã kết nối lại Internet - Sử dụng AI siêu tốc');
      setTimeout(() => setSilentNotice(null), 3500);
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSilentNotice('📶 Đã ngắt kết nối mạng - Tự động chuyển sang gói ngôn ngữ ngoại tuyến');
      setTimeout(() => setSilentNotice(null), 5000);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // History state
  const [historyRecords, setHistoryRecords] = useState<ScanHistoryRecord[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Save history on change (safely prevent QuotaExceededError)
  useEffect(() => {
    try {
      const safeRecords = historyRecords.slice(0, 20).map((r) => ({
        ...r,
        imageUrl: r.imageUrl && r.imageUrl.length < 50000 ? r.imageUrl : '',
      }));
      localStorage.setItem(STORAGE_KEY, JSON.stringify(safeRecords));
    } catch (e) {
      console.warn('Storage quota exceeded', e);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch (_) {}
    }
  }, [historyRecords]);

  const isAnalyzingRef = useRef(isAnalyzing);
  isAnalyzingRef.current = isAnalyzing;
  const currentScanIdRef = useRef(0);
  const consecutiveEmptyFrames = useRef(0);
  const activeAbortRef = useRef<AbortController | null>(null);
  const lastScanTimestamp = useRef(0);

  // Safety Watchdog: Auto-reset stuck analyzing state after 10s if network or promise hangs
  useEffect(() => {
    if (!isAnalyzing) return;
    const timer = setTimeout(() => {
      if (isAnalyzingRef.current) {
        isAnalyzingRef.current = false;
        setIsAnalyzing(false);
      }
    }, 10000);
    return () => clearTimeout(timer);
  }, [isAnalyzing]);

  // LIVE TRANSLATION HANDLER: Receives frames continuously without stopping the live camera
  const handleLiveFrame = useCallback(async (frameDataUrl: string, isManualSnap?: boolean) => {
    const scanId = ++currentScanIdRef.current;

    // If user clicked manual snap, abort pending background frame to prioritize this fresh frame
    if (isManualSnap) {
      if (activeAbortRef.current) {
        activeAbortRef.current.abort();
      }
      consecutiveEmptyFrames.current = 0;
      setSilentNotice('Đang nhận diện & dịch ảnh chụp...');
    } else {
      if (isAnalyzingRef.current) return;
      // Nhịp quét nhanh: cho phép nhận diện tức thì khi camera ổn định
      if (Date.now() - lastScanTimestamp.current < 400) return;
    }

    lastScanTimestamp.current = Date.now();
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);

    const abortController = new AbortController();
    activeAbortRef.current = abortController;
    // 25s timeout for manual snaps, 10s for continuous live video frames
    const timeoutMs = isManualSnap ? 25000 : 10000;
    const abortTimeout = setTimeout(() => abortController.abort(), timeoutMs);

    try {
      // Offline fallback: If device is offline, check offline database
      if (!navigator.onLine) {
        if (isManualSnap && currentScanIdRef.current === scanId) {
          const offlineData = translateOfflineSnapshot(undefined, activePackId);
          setResult(offlineData);
          setSilentNotice('📶 Ngoại tuyến: Đã dịch bằng gói từ điển.');
        } else {
          setSilentNotice(`📶 Đang ngoại tuyến: Vui lòng kết nối Internet để dịch bảng qua AI.`);
        }
        return;
      }

      // Fast image payload: ensure SVGs and high-res manual photo snaps are properly rasterized to JPEG
      const compressedImage = frameDataUrl.startsWith('data:image/svg')
        ? await compressImageForOCR(frameDataUrl, 1080, 0.85)
        : isManualSnap
        ? await compressImageForOCR(frameDataUrl, 1080, 0.85)
        : frameDataUrl.length < 250000
        ? frameDataUrl
        : await compressImageForOCR(frameDataUrl, 720, 0.65);

      const userKey = getUserApiKey();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (userKey) {
        headers['x-gemini-api-key'] = userKey;
      }

      const response = await fetch('/api/translate-vision', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          image: compressedImage,
          targetLang: 'vi',
          sourceLang: 'auto',
        }),
        signal: abortController.signal,
      });

      if (currentScanIdRef.current !== scanId && !isManualSnap) return;

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 401 || errData.code === 'MISSING_API_KEY') {
          setIsMissingApiKey(true);
          setSilentNotice('⚠️ Chưa cấu hình GEMINI_API_KEY. Bấm vào biểu tượng 🔑 để dán Key miễn phí.');
          return;
        }
        if (response.status === 503 || response.status === 429) {
          if (response.status === 429 || errData.code === 'QUOTA_EXHAUSTED' || errData.isQuota) {
            setIsQuotaExhausted(true);
          }

          // If viewing a travel sample, ensure default sample translation is shown
          if (staticImageUrl) {
            const matchedSample = TRAVEL_SAMPLES.find((s) => s.image === staticImageUrl);
            if (matchedSample && matchedSample.defaultResult) {
              setResult(matchedSample.defaultResult);
              setSilentNotice(`Đang hiển thị bản dịch mẫu (${matchedSample.country}).`);
              return;
            }
          }

          const noticeMsg = errData.error || (response.status === 429 ? 'Hạn ngạch AI đang bận. Bấm "Dịch lại" để quét lại.' : 'Máy chủ AI tạm bận. Bấm "Dịch lại" để quét lại.');
          setSilentNotice(`⚠️ ${noticeMsg}`);
          return;
        } else if (response.status === 500) {
          setSilentNotice(errData.error || 'Máy chủ AI đang bận. Bấm "Dịch lại" để thử lại.');
          return;
        }
        setSilentNotice(errData.error || 'Lỗi kết nối máy chủ dịch.');
        return;
      }

      setIsMissingApiKey(false);
      setIsQuotaExhausted(false);
      setSilentNotice(null);

      const rawData: VisionTranslationResult = await response.json();
      
      if (currentScanIdRef.current !== scanId && !isManualSnap) return;

      // Safeguard: Ensure translated_text is never empty
      const data: VisionTranslationResult = {
        ...rawData,
        summary_translation: rawData.summary_translation ? rawData.summary_translation.trim() : '',
        items: (rawData.items || []).map(item => {
          let text = (item.translated_text || '').trim();
          // Remove leftover explanatory brackets if any
          text = text.replace(/\s*\([^)]*(?:nghĩa|phiên âm|phát âm)[^)]*\)/gi, '').trim();
          return {
            ...item,
            translated_text: text
          };
        }).filter(item => item.translated_text.length > 0)
      };
      
      // Update translated bounding boxes and texts directly over the live camera stream
      if (data) {
        if (data.items && data.items.length > 0) {
          consecutiveEmptyFrames.current = 0;
          setResult(data);
          setSilentNotice(null);
        } else if (data.summary_translation && !/không\s+(?:có|tìm\s+thấy|phát\s+hiện)\s+văn\s+bản|chưa\s+phát\s+hiện|no\s+text/i.test(data.summary_translation)) {
          consecutiveEmptyFrames.current = 0;
          setResult({
            ...data,
            items: [
              {
                box_2d: [350, 80, 480, 920],
                translated_text: data.summary_translation,
                category: 'sign',
              },
            ],
          });
          setSilentNotice(null);
        } else {
          // No items detected in this frame (e.g. panned away or no text)
          if (isManualSnap) {
            setSilentNotice('Không tìm thấy văn bản rõ ràng trong bức ảnh này. Hãy thử chụp gần hơn.');
          } else if (!staticImageUrl) {
            consecutiveEmptyFrames.current++;
            if (consecutiveEmptyFrames.current >= 6) {
              setResult(null); // Clear stale boxes only after multiple seconds of continuous empty frames
            }
          }
        }

        // Save to history periodically (only if has detected items)
        if (data.items && data.items.length > 0) {
          const newRecord: ScanHistoryRecord = {
            id: 'scan_' + Date.now(),
            timestamp: Date.now(),
            imageUrl: frameDataUrl.length > 50000 ? '' : frameDataUrl,
            result: data,
            sourceLang: data.detected_language,
            targetLang: 'Tiếng Việt',
          };
          setHistoryRecords((prev) => {
            // Avoid duplicate identical history within 10 seconds
            if (prev[0] && Date.now() - prev[0].timestamp < 10000) {
              return [newRecord, ...prev.slice(1)];
            }
            return [newRecord, ...prev];
          });
        }
      }
    } catch (err: any) {
      if (err.name === 'AbortError') {
        if (isManualSnap) {
          setSilentNotice('⏱️ Quá thời gian chờ máy chủ. Vui lòng bấm "Dịch lại" để quét lại.');
        }
      } else {
        console.warn('Frame processing dropped:', err.message);
        if (isManualSnap) {
          setSilentNotice('⚠️ Quá trình nhận diện bị gián đoạn. Vui lòng bấm "Dịch lại".');
        }
      }
    } finally {
      clearTimeout(abortTimeout);
      if (currentScanIdRef.current <= scanId) {
        isAnalyzingRef.current = false;
        setIsAnalyzing(false);
      }
    }
  }, [staticImageUrl, activePackId]);

  // Handle photo capture or uploaded image: sets static image and translates immediately
  const handleCapturePhoto = useCallback((photoDataUrl: string) => {
    setStaticImageUrl(photoDataUrl);
    setResult(null); // Clear stale results immediately so user gets clean fresh translation
    setSelectedItem(null);
    setIsPhotoSheetExpanded(false);
    setIsLiveTranslating(false);
    handleLiveFrame(photoDataUrl, true);
  }, [handleLiveFrame]);

  // Select sample preset (switches to static sample view with instant translation display)
  const handleSelectSample = (sample: TravelSample) => {
    setStaticImageUrl(sample.image);
    if (sample.defaultResult) {
      setResult(sample.defaultResult);
    }
    handleLiveFrame(sample.image, true);
  };

  // Clear static image and return to continuous live camera
  const handleClearStaticImage = () => {
    setStaticImageUrl(null);
    setIsLiveTranslating(true);
  };

  // Handle history item selection
  const handleSelectHistoryRecord = (record: ScanHistoryRecord) => {
    setStaticImageUrl(record.imageUrl);
    setResult(record.result);
    setSelectedItem(null);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Single Ultra-Clean Header Bar */}
      <header className="h-12 bg-slate-900 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 z-40">
        {/* Left: App Brand & Language */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 shadow-sm shrink-0">
            <Camera className="w-4 h-4 text-slate-950" />
          </div>
          <span className="font-bold text-xs text-white tracking-tight hidden xs:inline">
            Dịch Camera
          </span>
          <span className="text-[11px] font-semibold text-emerald-400 bg-slate-950 border border-slate-800 px-2 py-0.5 rounded-full">
            {result?.detected_language ? `${result.detected_language} ➔ VN` : 'Tự động ➔ Tiếng Việt'}
          </span>
        </div>

        {/* Center: Mode Pill Toggle */}
        <div className="flex items-center bg-slate-950 p-1 rounded-full border border-slate-800 shadow-inner">
          <button
            onClick={() => {
              setActiveTab('photo');
              setIsLiveTranslating(false);
              if (viewMode === 'list') setViewMode('ar');
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              activeTab === 'photo'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Chụp Ảnh
          </button>
          <button
            onClick={() => {
              setActiveTab('live');
              setStaticImageUrl(null);
              setIsLiveTranslating(true);
              if (viewMode === 'list') setViewMode('ar');
            }}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-all ${
              activeTab === 'live'
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            AR Live
          </button>
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Font Size Quick Toggle Button */}
          <button
            onClick={() => {
              setTextSize((prev) => (prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'sm'));
            }}
            className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 hover:text-emerald-200 transition cursor-pointer flex items-center gap-1 shadow-xs"
            title="Bấm để chuyển cỡ chữ dịch: Nhỏ / Vừa / To"
          >
            <span>{textSize === 'sm' ? 'Chữ Nhỏ 🔤' : textSize === 'md' ? 'Chữ Vừa 🔤' : 'Chữ To 🔤'}</span>
          </button>

          {/* Backdrop Mode Toggle Button */}
          <button
            onClick={() => {
              setMaskCoverMode((prev) => !prev);
            }}
            className={`px-2 py-1 rounded-lg text-xs font-bold border transition cursor-pointer flex items-center gap-1 shadow-xs ${
              maskCoverMode
                ? 'bg-slate-800 border-emerald-500/60 text-emerald-300 hover:text-emerald-200'
                : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
            }`}
            title="Bật/Tắt hộp nền mờ che chữ gốc để không bị đè chữ"
          >
            <span>{maskCoverMode ? 'Hộp nền 🔲' : 'Trong suốt 🪟'}</span>
          </button>

          {/* List View Toggle Button when results exist */}
          {result && (
            <button
              onClick={() => {
                const nextMode = viewMode === 'ar' ? 'list' : 'ar';
                setViewMode(nextMode);
                if (nextMode === 'list') setActiveTab('list');
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold border transition-colors flex items-center gap-1 ${
                viewMode === 'list'
                  ? 'bg-emerald-600 border-emerald-500 text-white'
                  : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white'
              }`}
            >
              <ListFilter className="w-3.5 h-3.5" />
              <span>Danh sách ({result.items?.length || 0})</span>
            </button>
          )}

          {/* Tools Menu Trigger */}
          <button
            onClick={() => setShowToolsModal(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white transition cursor-pointer relative"
            title="Công cụ bổ sung"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-400" />
            {isMissingApiKey && (
              <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-0.5 right-0.5 animate-ping" />
            )}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col md:flex-row overflow-hidden">
        {/* Viewport: Camera / Photo View with AR overlay */}
        <div className={`relative flex-1 h-full overflow-hidden ${
          viewMode === 'list' && result ? 'hidden md:block md:w-1/2' : 'w-full'
        }`}>
          <CameraView
            onLiveFrame={handleLiveFrame}
            onCapturePhoto={handleCapturePhoto}
            isAnalyzing={isAnalyzing}
            isLiveTranslating={isLiveTranslating}
            setIsLiveTranslating={setIsLiveTranslating}
            staticImageUrl={staticImageUrl}
            onSelectSample={handleSelectSample}
            onClearStaticImage={handleClearStaticImage}
            detectedCount={result?.items?.length || 0}
            onClearResult={() => setResult(null)}
            isOnline={isOnline}
            onOpenOfflinePacks={() => setShowOfflineModal(true)}
            activePackId={activePackId}
            isMissingApiKey={isMissingApiKey}
            isQuotaExhausted={isQuotaExhausted}
            onOpenApiKeyModal={() => setShowApiKeyModal(true)}
            activeTab={activeTab}
          >
            {/* AR Text Overlay rendered directly on top of the live video or static image */}
            {result && (
              <AROverlay
                items={result.items}
                selectedItem={selectedItem}
                onSelectItem={(item) => setSelectedItem(item)}
                showOverlayText={showOverlayText}
                maskCoverMode={maskCoverMode}
                textSize={textSize}
              />
            )}
          </CameraView>

          {/* Transient silent notice if any */}
          {silentNotice && (
            <div className="absolute top-4 left-4 z-30 pointer-events-none bg-amber-950/85 border border-amber-600/50 rounded-xl px-3 py-1.5 backdrop-blur-sm text-[11px] text-amber-200 flex items-center gap-1.5 animate-in fade-in shadow-lg">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>{silentNotice}</span>
            </div>
          )}



          {/* Selected Item Floating Details Card - Removed to prevent obstructing the translated photo view */}



          {/* Full Continuous Article Reader Overlay */}
          {showFullArticle && result?.summary_translation && (
            <div className="absolute inset-x-3 bottom-16 sm:inset-x-8 sm:bottom-20 max-h-[60vh] z-40 bg-slate-900/95 border border-emerald-500/60 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-4">
              <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-4.5 h-4.5 text-emerald-400" />
                  <h4 className="font-bold text-xs sm:text-sm text-white">
                    Bản Dịch Bài Văn Liền Mạch ({result.detected_language})
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowFullArticle(false)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto pt-3 text-xs sm:text-sm text-slate-100 leading-relaxed font-sans whitespace-pre-line selection:bg-emerald-900 selection:text-white">
                {result.summary_translation}
              </div>
            </div>
          )}
        </div>

        {/* Side Panel for Desktop / Full List Mode */}
        {result && (
          <div
            className={`flex-col bg-slate-950 border-t md:border-t-0 md:border-l border-slate-800 overflow-y-auto p-4 md:w-1/2 lg:w-5/12 ${
              viewMode === 'list' ? 'flex w-full h-full' : 'hidden md:flex'
            }`}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-bold text-sm text-white">
                  Chi Tiết Văn Bản Đã Dịch
                </h3>
              </div>

              <button
                onClick={() => setShowAskModal(true)}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hỏi trợ lý AI</span>
              </button>
            </div>

            <div className="pt-4 flex-1">
              <TranslateList
                result={result}
                selectedItem={selectedItem}
                onSelectItem={(item) => setSelectedItem(item)}
                onAskAboutItem={(item) => {
                  setSelectedItem(item);
                  setShowAskModal(true);
                }}
              />
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      {/* Central Tools & Travel Modal */}
      <ToolsModal
        isOpen={showToolsModal}
        onClose={() => setShowToolsModal(false)}
        onOpenApiKey={() => setShowApiKeyModal(true)}
        onOpenOffline={() => setShowOfflineModal(true)}
        onOpenCurrency={() => setShowCurrencyModal(true)}
        onOpenPhrasebook={() => setShowPhrasebookModal(true)}
        onOpenHistory={() => setShowHistoryDrawer(true)}
        onOpenSamples={() => setShowSamplesModal(true)}
        isMissingApiKey={isMissingApiKey}
        isOnline={isOnline}
        historyCount={historyRecords.length}
      />

      {showCurrencyModal && (
        <CurrencyConverter
          onClose={() => setShowCurrencyModal(false)}
          initialCurrency={
            result?.detected_prices?.[0]?.currency || 'JPY'
          }
        />
      )}

      {showPhrasebookModal && (
        <PhrasebookModal
          onClose={() => setShowPhrasebookModal(false)}
          defaultLang={result?.language_code || 'ja'}
        />
      )}

      {showHistoryDrawer && (
        <HistoryDrawer
          isOpen={showHistoryDrawer}
          onClose={() => setShowHistoryDrawer(false)}
          records={historyRecords}
          onSelectRecord={handleSelectHistoryRecord}
          onClearHistory={() => setHistoryRecords([])}
          onDeleteRecord={(id) =>
            setHistoryRecords((prev) => prev.filter((r) => r.id !== id))
          }
        />
      )}

      {showAskModal && result && (
        <TravelAskModal
          onClose={() => setShowAskModal(false)}
          result={result}
          selectedItem={selectedItem}
          image={staticImageUrl || undefined}
        />
      )}

      {/* Offline Language Packs Manager Modal */}
      {showOfflineModal && (
        <OfflinePacksModal
          isOpen={showOfflineModal}
          onClose={() => setShowOfflineModal(false)}
          isOnline={isOnline}
          onSelectPackForOfflineScan={(packId) => {
            setActivePackId(packId);
            setActivePackIdState(packId);
            const offlineData = translateOfflineSnapshot(undefined, packId);
            setResult(offlineData);
            setSilentNotice(`Đã chuyển sang gói ngoại tuyến ${packId.toUpperCase()}`);
            setTimeout(() => setSilentNotice(null), 4000);
          }}
        />
      )}

      {/* Gemini API Key Configuration Modal */}
      {showApiKeyModal && (
        <ApiKeyModal
          isOpen={showApiKeyModal}
          onClose={() => setShowApiKeyModal(false)}
          hasServerKey={hasServerKey}
          onKeySaved={() => {
            setIsMissingApiKey(!getUserApiKey() && !hasServerKey);
            setIsQuotaExhausted(false);
            setSilentNotice('Đã lưu API Key! Đang kết nối dịch camera AI...');
            setTimeout(() => setSilentNotice(null), 3000);
          }}
        />
      )}

      {/* Travel Samples Picker Modal */}
      {showSamplesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-sm rounded-2xl p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-sm text-white">Ảnh mẫu du lịch</h3>
              </div>
              <button
                onClick={() => setShowSamplesModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-400 mb-3">
              Chọn ảnh mẫu để thử nghiệm tính năng dịch AR mà không cần quét camera thực tế:
            </p>
            <div className="space-y-2">
              {TRAVEL_SAMPLES.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => {
                    handleSelectSample(sample);
                    setShowSamplesModal(false);
                  }}
                  className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-800/70 hover:bg-slate-800 border border-slate-700/60 hover:border-emerald-500/40 text-left transition group"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="text-xl">{sample.flag}</span>
                    <div>
                      <p className="text-xs font-semibold text-slate-200 group-hover:text-emerald-300 transition">
                        {sample.title}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {sample.country} • {sample.description}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
