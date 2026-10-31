/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  Volume2,
  Copy,
  Check,
  AlertCircle,
  X,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';
import { CameraView } from './components/CameraView';
import { AROverlay } from './components/AROverlay';
import { compressImageForOCR } from './utils/imageCompressor';
import { speakText } from './utils/audio';
import {
  DetectedItem,
  VisionTranslationResult,
  TravelSample,
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
  const [isCopied, setIsCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [activeSample, setActiveSample] = useState<TravelSample | null>(null);
  const [isBottomCardMinimized, setIsBottomCardMinimized] = useState(false);

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
  const handleLiveFrame = useCallback(async (imageDataUrl: string, isSample = false) => {
    const scanId = ++currentScanIdRef.current;

    if (isAnalyzingRef.current) return;
    if (Date.now() - lastScanTimestamp.current < 2000 && !isSample) return;

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

      const response = await fetch('/api/translate-vision', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: compressedImage,
          targetLang: 'vi',
          sourceLang: 'auto',
          sampleId: isSample && activeSample ? activeSample.id : undefined,
        }),
        signal: abortController.signal,
      });

      if (currentScanIdRef.current !== scanId) return;

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        if (response.status === 429) {
          setSilentNotice('⏳ Hạn mức AI đang bận. Đang giữ nguyên bản dịch hiện tại.');
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
  }, [activeSample]);

  // Chọn ảnh mẫu để mô phỏng camera trực tiếp
  const handleSelectSample = (sample: TravelSample) => {
    setActiveSample(sample);
    setSelectedItem(null);
    if (sample.defaultResult) {
      setResult(sample.defaultResult);
    }
    handleLiveFrame(sample.image, true);
  };

  // Quay lại camera thực tế
  const handleClearSample = () => {
    setActiveSample(null);
    setResult(null);
    setSelectedItem(null);
    setSilentNotice(null);
  };

  // Phát âm tiếng Việt
  const handleSpeak = (text: string) => {
    if (!text) return;
    setIsPlayingAudio(true);
    speakText(text, 'vi-VN');
    setTimeout(() => setIsPlayingAudio(false), 3000);
  };

  // Sao chép văn bản
  const handleCopy = (text: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const displaySummary = selectedItem
    ? selectedItem.translated_text
    : result?.summary_translation || (result?.items?.map((it) => it.translated_text).join('\n') || '');

  return (
    <div className="flex flex-col h-screen w-screen bg-slate-950 text-slate-100 font-sans overflow-hidden">
      {/* Header Bar */}
      <header className="h-12 bg-slate-900/90 border-b border-slate-800 px-3 sm:px-4 flex items-center justify-between shrink-0 z-40 backdrop-blur-md">
        {/* Left: Brand & Target Language */}
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center text-slate-950 shadow-sm shrink-0">
            <Camera className="w-4 h-4 text-slate-950" />
          </div>
          <span className="font-extrabold text-xs text-white tracking-tight">
            Dịch Camera Trực Tiếp
          </span>
          <span className="text-[11px] font-bold text-emerald-400 bg-slate-950 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
            <span>🇻🇳</span>
            <span>{result?.detected_language ? `${result.detected_language} ➔ Tiếng Việt` : 'Tự động ➔ Tiếng Việt'}</span>
          </span>
        </div>

        {/* Right: Quick Display Toggles */}
        <div className="flex items-center gap-1.5 shrink-0">
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

      {/* Main Viewport: Camera Trực Tiếp & AR Live Overlay */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        <CameraView
          onLiveFrame={handleLiveFrame}
          isAnalyzing={isAnalyzing}
          detectedCount={result?.items?.length || 0}
          onSelectSample={handleSelectSample}
          onClearSample={handleClearSample}
          activeSample={activeSample}
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
          <div className="absolute top-14 left-4 right-4 sm:left-auto sm:right-4 max-w-sm z-40 bg-slate-900/95 border border-amber-500/70 rounded-xl px-3.5 py-2 backdrop-blur-md text-xs text-amber-200 flex items-center justify-between gap-2 shadow-2xl animate-in fade-in">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{silentNotice}</span>
            </div>
            <button
              onClick={() => setSilentNotice(null)}
              className="text-slate-400 hover:text-white p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Thanh xem nhanh nội dung tiếng Việt ở dưới đáy màn hình (Live Translation Ticker) */}
        {result && result.items && result.items.length > 0 && (
          <div className="absolute inset-x-3 bottom-18 sm:inset-x-8 max-w-lg mx-auto z-40 bg-slate-900/95 border border-emerald-500/60 rounded-2xl p-3 shadow-2xl backdrop-blur-lg flex flex-col animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-extrabold text-white">
                  Bản dịch trực tiếp ({result.detected_language || 'Tự động'})
                </span>
                {selectedItem && (
                  <button
                    onClick={() => setSelectedItem(null)}
                    className="text-[10px] text-emerald-400 underline ml-1 cursor-pointer"
                  >
                    Tất cả
                  </button>
                )}
              </div>

              <div className="flex items-center gap-1.5">
                {/* Nút nghe đọc */}
                <button
                  onClick={() => handleSpeak(displaySummary)}
                  className={`p-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                    isPlayingAudio
                      ? 'bg-emerald-600 border-emerald-500 text-white'
                      : 'bg-slate-800 border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700'
                  }`}
                  title="Nghe đọc tiếng Việt"
                >
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden xs:inline">Đọc</span>
                </button>

                {/* Nút sao chép */}
                <button
                  onClick={() => handleCopy(displaySummary)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition cursor-pointer"
                  title="Sao chép nội dung dịch"
                >
                  {isCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Đã chép</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-sky-400" />
                      <span className="hidden xs:inline">Chép</span>
                    </>
                  )}
                </button>

                {/* Thu gọn / Mở rộng */}
                <button
                  onClick={() => setIsBottomCardMinimized(!isBottomCardMinimized)}
                  className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  {isBottomCardMinimized ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* Nội dung bản dịch */}
            {!isBottomCardMinimized && (
              <div className="pt-2 text-xs text-slate-200 leading-relaxed font-sans max-h-24 overflow-y-auto whitespace-pre-line selection:bg-emerald-900 selection:text-white">
                {displaySummary}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
