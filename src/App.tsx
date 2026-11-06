/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  AlertCircle,
  X,
  Key,
  Eye,
  EyeOff,
  Check,
  ExternalLink,
} from 'lucide-react';
import { CameraView } from './components/CameraView';
import { AROverlay } from './components/AROverlay';
import { compressImageForOCR } from './utils/imageCompressor';
import {
  DetectedItem,
  VisionTranslationResult,
} from './types';

// Fast 0ms client-side cache for instant frame rendering
const clientScanCache = new Map<string, { result: VisionTranslationResult; timestamp: number }>();

function getClientFrameSignature(base64: string): string {
  const len = base64.length;
  if (len < 300) return base64;
  return `${len}_${base64.slice(120, 200)}_${base64.slice(-200, -120)}`;
}

export default function App() {
  const [result, setResult] = useState<VisionTranslationResult | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [silentNotice, setSilentNotice] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<DetectedItem | null>(null);
  const [maskCoverMode, setMaskCoverMode] = useState(true);
  const [textSize, setTextSize] = useState<'sm' | 'md' | 'lg'>('sm');

  // Custom User Gemini API Key state for quota exhaustion fallback
  const [customApiKey, setCustomApiKey] = useState<string>(() => {
    try {
      return localStorage.getItem('user_gemini_api_key') || '';
    } catch {
      return '';
    }
  });
  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [inputApiKey, setInputApiKey] = useState(customApiKey);
  const [showKeyPassword, setShowKeyPassword] = useState(false);

  const isAnalyzingRef = useRef(isAnalyzing);
  isAnalyzingRef.current = isAnalyzing;
  const currentScanIdRef = useRef(0);
  const activeAbortRef = useRef<AbortController | null>(null);
  const lastScanTimestamp = useRef(0);

  // Safety Watchdog: Reset stuck analyzing state after 15s
  useEffect(() => {
    if (!isAnalyzing) return;
    const timer = setTimeout(() => {
      if (isAnalyzingRef.current) {
        isAnalyzingRef.current = false;
        setIsAnalyzing(false);
      }
    }, 15000);
    return () => clearTimeout(timer);
  }, [isAnalyzing]);

  // LIVE TRANSLATION HANDLER: Nhận luồng camera trực tiếp và dịch tức thì
  const handleLiveFrame = useCallback(async (imageDataUrl: string) => {
    const scanId = ++currentScanIdRef.current;

    if (isAnalyzingRef.current) return;
    if (Date.now() - lastScanTimestamp.current < 2000) return;

    lastScanTimestamp.current = Date.now();
    isAnalyzingRef.current = true;
    setIsAnalyzing(true);
    setSilentNotice(null);

    const abortController = new AbortController();
    activeAbortRef.current = abortController;
    const abortTimeout = setTimeout(() => abortController.abort(), 18000);

    try {
      // 0ms Cache Hit
      const clientSig = getClientFrameSignature(imageDataUrl);
      const cached = clientScanCache.get(clientSig);
      if (cached && Date.now() - cached.timestamp < 45000 && cached.result?.items?.length > 0) {
        setResult(cached.result);
        clearTimeout(abortTimeout);
        isAnalyzingRef.current = false;
        setIsAnalyzing(false);
        return;
      }

      // Fast image compression: 800px 0.70 JPEG
      const compressedImage = imageDataUrl.length > 350000
        ? await compressImageForOCR(imageDataUrl, 800, 0.70)
        : imageDataUrl;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (customApiKey) {
        headers['x-gemini-api-key'] = customApiKey;
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

      if (currentScanIdRef.current !== scanId) return;

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          setSilentNotice('⏳ Hạn mức AI đang bận. Bạn có thể bấm nút [Mã API 🔑] ở trên để nhập Key riêng.');
        } else {
          setSilentNotice(errData.error || 'Đang quét camera...');
        }
        return;
      }

      const rawData: VisionTranslationResult = await response.json();
      if (currentScanIdRef.current !== scanId) return;

      const data: VisionTranslationResult = {
        ...rawData,
        summary_translation: rawData.summary_translation ? rawData.summary_translation.trim() : '',
        items: (rawData.items || []).map((item) => {
          let text = (item.translated_text || '').trim();
          text = text.replace(/\s*\([^)]*(?:nghĩa|phiên âm|phát âm)[^)]*\)/gi, '').trim();
          return {
            ...item,
            translated_text: text,
          };
        }).filter((item) => item.translated_text.length > 0),
      };

      if (data.items && data.items.length > 0) {
        clientScanCache.set(clientSig, { result: data, timestamp: Date.now() });
        setResult(data);
        setSilentNotice(null);
      } else if (data.summary_translation && !/không\s+(?:có|tìm\s+thấy|phát\s+hiện)\s+văn\s+bản|chưa\s+phát\s+hiện|no\s+text/i.test(data.summary_translation)) {
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
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.warn('Live translation error:', err.message);
      }
    } finally {
      clearTimeout(abortTimeout);
      if (currentScanIdRef.current <= scanId) {
        isAnalyzingRef.current = false;
        setIsAnalyzing(false);
      }
    }
  }, [customApiKey]);

  // Xóa toàn bộ bản dịch cũ đang hiển thị trên màn hình
  const handleClearTranslations = () => {
    setResult(null);
    setSelectedItem(null);
    clientScanCache.clear();
    setSilentNotice('Đã xóa sạch bản dịch trên màn hình');
    setTimeout(() => setSilentNotice(null), 2500);
  };

  // Lưu API Key cá nhân
  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = inputApiKey.trim();
    if (cleanKey) {
      try {
        localStorage.setItem('user_gemini_api_key', cleanKey);
      } catch (_) {}
      setCustomApiKey(cleanKey);
      setShowApiKeyModal(false);
      setSilentNotice('Đã áp dụng API Key mới! Tiếp tục quét dịch.');
      setTimeout(() => setSilentNotice(null), 3000);
    } else {
      handleRemoveCustomApiKey();
    }
  };

  // Xóa API Key cá nhân để dùng lại key hệ thống
  const handleRemoveCustomApiKey = () => {
    try {
      localStorage.removeItem('user_gemini_api_key');
    } catch (_) {}
    setCustomApiKey('');
    setInputApiKey('');
    setShowApiKeyModal(false);
    setSilentNotice('Đã chuyển về API Key mặc định của hệ thống');
    setTimeout(() => setSilentNotice(null), 3000);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Header Bar */}
      <header className="h-12 bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 z-40 backdrop-blur-md">
        {/* Left: Brand & Target Language */}
        <div className="flex items-center gap-1.5 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 shadow-sm shrink-0">
            <Camera className="w-4 h-4 text-slate-950" />
          </div>
          <span className="font-extrabold text-xs text-white tracking-tight truncate hidden sm:inline">
            Dịch Camera Trực Tiếp
          </span>
          <span className="text-[11px] font-bold text-emerald-400 bg-slate-950 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
            <span>🇻🇳</span>
            <span>{result?.detected_language ? `${result.detected_language} ➔ Tiếng Việt` : 'Tự động ➔ Tiếng Việt'}</span>
          </span>
        </div>

        {/* Right: Quick Display Toggles & API Key Trigger */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* Nút Đổi API Key */}
          <button
            onClick={() => {
              setInputApiKey(customApiKey);
              setShowApiKeyModal(true);
            }}
            className={`px-2 py-1 rounded-lg text-xs font-bold border transition cursor-pointer shadow-xs flex items-center gap-1 shrink-0 ${
              customApiKey
                ? 'bg-emerald-950/80 border-emerald-500/80 text-emerald-300 hover:bg-emerald-900/80'
                : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
            }`}
            title="Đổi mã API Key khi hết dung lượng"
          >
            <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span className="text-[11px] font-bold">{customApiKey ? 'Key 🟢' : 'Mã API 🔑'}</span>
          </button>

          {/* Cỡ chữ */}
          <button
            onClick={() => {
              setTextSize((prev) => (prev === 'sm' ? 'md' : prev === 'md' ? 'lg' : 'sm'));
            }}
            className="px-2 py-1 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 border border-slate-700 text-emerald-300 transition cursor-pointer shadow-xs"
            title="Đổi cỡ chữ dịch: Nhỏ / Vừa / To"
          >
            <span>{textSize === 'sm' ? 'Chữ Nhỏ 🔤' : textSize === 'md' ? 'Chữ Vừa 🔤' : 'Chữ To 🔤'}</span>
          </button>

          {/* Hộp nền tương phản */}
          <button
            onClick={() => setMaskCoverMode((prev) => !prev)}
            className={`px-2 py-1 rounded-lg text-xs font-bold border transition cursor-pointer shadow-xs ${
              maskCoverMode
                ? 'bg-slate-800 border-emerald-500/60 text-emerald-300'
                : 'bg-slate-800/80 border-slate-700 text-slate-400'
            }`}
            title="Hộp nền tương phản cao che chữ gốc"
          >
            <span>{maskCoverMode ? 'Hộp nền 🔲' : 'Trong suốt 🪟'}</span>
          </button>
        </div>
      </header>

      {/* Main Viewport: Camera Trực Tiếp & AR Live Overlay (100% Thông thoáng không có ô chú thích che khuất) */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        <CameraView
          onLiveFrame={handleLiveFrame}
          onClearTranslations={handleClearTranslations}
          isAnalyzing={isAnalyzing}
          detectedCount={result?.items?.length || 0}
        >
          {/* AR Text Overlay rendered directly on top of the live stream */}
          {result && (
            <AROverlay
              items={result.items}
              selectedItem={selectedItem}
              onSelectItem={(item) => setSelectedItem(item)}
              showOverlayText={true}
              maskCoverMode={maskCoverMode}
              textSize={textSize}
            />
          )}
        </CameraView>

        {/* Thông báo phụ nếu có */}
        {silentNotice && (
          <div className="absolute top-14 left-4 right-4 sm:left-auto sm:right-4 max-w-sm z-40 bg-slate-900/95 border border-emerald-500/70 rounded-xl px-3.5 py-2 backdrop-blur-md text-xs text-emerald-200 flex items-center justify-between gap-2 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{silentNotice}</span>
            </div>
            <button
              onClick={() => setSilentNotice(null)}
              className="text-slate-400 hover:text-white p-0.5 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </main>

      {/* MODAL NHẬP MÃ API KEY (Khi hết dung lượng) */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Key className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">Thay Đổi Gemini API Key</h3>
                  <p className="text-[11px] text-slate-400">Dùng khi hệ thống thông báo hết dung lượng (429)</p>
                </div>
              </div>
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Mặc định ứng dụng dùng khóa API dùng chung. Nếu gặp thông báo hết dung lượng, bạn có thể dán mã API Key cá nhân miễn phí từ{' '}
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noreferrer"
                className="text-emerald-400 hover:underline font-semibold inline-flex items-center gap-0.5"
              >
                Google AI Studio <ExternalLink className="w-3 h-3" />
              </a>{' '}
              để tiếp tục dịch không giới hạn.
            </p>

            <form onSubmit={handleSaveApiKey} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1.5">
                  Gemini API Key của bạn:
                </label>
                <div className="relative">
                  <input
                    type={showKeyPassword ? 'text' : 'password'}
                    value={inputApiKey}
                    onChange={(e) => setInputApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder:text-slate-600 font-mono tracking-wide pr-10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyPassword(!showKeyPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 p-1 cursor-pointer"
                  >
                    {showKeyPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Mã API Key được lưu an toàn trên trình duyệt của bạn (LocalStorage) và chỉ dùng cho các yêu cầu quét camera.
                </p>
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                {customApiKey ? (
                  <button
                    type="button"
                    onClick={handleRemoveCustomApiKey}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-rose-300 hover:text-rose-200 border border-slate-700 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Dùng lại Key mặc định
                  </button>
                ) : (
                  <div />
                )}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowApiKeyModal(false)}
                    className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="py-2 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-md transition active:scale-95 cursor-pointer flex items-center gap-1.5"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Lưu &amp; Sử Dụng</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
