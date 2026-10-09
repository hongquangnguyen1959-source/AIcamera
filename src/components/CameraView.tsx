import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  RotateCcw,
  Zap,
  ZapOff,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
  Play,
  Pause,
  Upload,
  Radio,
  Scan,
  Key,
  Trash2,
} from 'lucide-react';
import { TRAVEL_SAMPLES } from '../data/travelSamples';
import { POPULAR_LANGUAGE_PACKS } from '../data/offlineLanguagePacksData';
import { TravelSample } from '../types';

interface CameraViewProps {
  onLiveFrame: (imageDataUrl: string, isManualSnap?: boolean) => void;
  isAnalyzing: boolean;
  isLiveTranslating: boolean;
  setIsLiveTranslating: (val: boolean) => void;
  staticImageUrl: string | null;
  onSelectSample: (sample: TravelSample) => void;
  onClearStaticImage: () => void;
  onClearResult?: () => void;
  detectedCount: number;
  isOnline?: boolean;
  onOpenOfflinePacks?: () => void;
  activePackId?: string;
  isMissingApiKey?: boolean;
  isQuotaExhausted?: boolean;
  onOpenApiKeyModal?: () => void;
  children?: React.ReactNode;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onLiveFrame,
  isAnalyzing,
  isLiveTranslating,
  setIsLiveTranslating,
  staticImageUrl,
  onSelectSample,
  onClearStaticImage,
  onClearResult,
  detectedCount,
  isOnline = true,
  onOpenOfflinePacks,
  activePackId = 'zh',
  isMissingApiKey = false,
  isQuotaExhausted = false,
  onOpenApiKeyModal,
  children,
}) => {
  const [showSamplePicker, setShowSamplePicker] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Stable refs to prevent effect re-trigger churn
  const isAnalyzingRef = useRef(isAnalyzing);
  isAnalyzingRef.current = isAnalyzing;
  const isLiveTranslatingRef = useRef(isLiveTranslating);
  isLiveTranslatingRef.current = isLiveTranslating;
  const onLiveFrameRef = useRef(onLiveFrame);
  onLiveFrameRef.current = onLiveFrame;

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isRestarting, setIsRestarting] = useState(false);
  const [videoAspect, setVideoAspect] = useState<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [videoBoxStyle, setVideoBoxStyle] = useState<React.CSSProperties>({});

  const updateVideoBox = useCallback(() => {
    const parent = viewportRef.current;
    const v = videoRef.current;
    if (!parent || !v || v.videoWidth <= 0 || v.videoHeight <= 0) return;
    const aspect = v.videoWidth / v.videoHeight;
    setVideoAspect(aspect);

    const pW = parent.clientWidth;
    const pH = parent.clientHeight;
    if (pW <= 0 || pH <= 0) return;

    const parentAspect = pW / pH;
    if (aspect > parentAspect) {
      const w = pW;
      const h = Math.round(pW / aspect);
      setVideoBoxStyle({ width: `${w}px`, height: `${h}px` });
    } else {
      const h = pH;
      const w = Math.round(pH * aspect);
      setVideoBoxStyle({ width: `${w}px`, height: `${h}px` });
    }
  }, []);

  const updateVideoAspect = useCallback(() => {
    updateVideoBox();
  }, [updateVideoBox]);

  useEffect(() => {
    updateVideoBox();
    window.addEventListener('resize', updateVideoBox);
    return () => window.removeEventListener('resize', updateVideoBox);
  }, [updateVideoBox]);

  // Stop active media stream tracks cleanly
  const stopExistingStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (e) {}
      });
      streamRef.current = null;
    }
  }, []);

  // Start camera stream safely without leaving abandoned tracks
  const startCamera = useCallback(async () => {
    try {
      setCameraError(null);
      stopExistingStream();

      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = mediaStream;

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = mediaStream;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.muted = true;
        try {
          await video.play();
        } catch (playErr) {
          console.warn('Video auto-play deferred:', playErr);
        }
      }

      setCameraReady(true);
      setIsRestarting(false);

      // Check for torch capability
      const track = mediaStream.getVideoTracks()[0];
      const capabilities = track.getCapabilities?.() as any;
      if (capabilities && capabilities.torch) {
        setHasTorch(true);
      } else {
        setHasTorch(false);
      }
    } catch (err: any) {
      console.warn('Camera access issue:', err);
      setCameraReady(false);
      setIsRestarting(false);
      if (err.name === 'NotAllowedError') {
        setCameraError('Bạn chưa cấp quyền Camera trên trình duyệt. Vui lòng cho phép quyền truy cập camera.');
      } else {
        setCameraError('Không thể mở Camera trên thiết bị này. Bạn có thể chọn ảnh mẫu du lịch bên dưới để thử nghiệm.');
      }
    }
  }, [facingMode, stopExistingStream]);

  // Restart camera stream (used for manual refresh or recovering from freezes)
  const restartCamera = useCallback(() => {
    setIsRestarting(true);
    setCameraReady(false);
    setTimeout(() => {
      startCamera();
    }, 150);
  }, [startCamera]);

  useEffect(() => {
    if (!staticImageUrl) {
      startCamera();
    }

    return () => {
      stopExistingStream();
    };
  }, [facingMode, staticImageUrl, startCamera, stopExistingStream]);

  // Hardware watchdog: Auto-detect if video playback gets stalled/frozen by browser
  useEffect(() => {
    if (staticImageUrl) return;

    let lastProgressTime = -1;
    let frozenCount = 0;

    const watchdog = setInterval(() => {
      const video = videoRef.current;
      if (!video || !cameraReady || !streamRef.current) return;

      // Check if playback currentTime is advancing
      if (video.currentTime === lastProgressTime && !video.paused) {
        frozenCount++;
        if (frozenCount >= 2) {
          // Video decoder stalled; nudge playback
          video.play().catch(() => {});
        }
        if (frozenCount >= 4) {
          // Re-attach stream to video element to kick-start decoder
          if (streamRef.current) {
            video.srcObject = streamRef.current;
            video.play().catch(() => {});
          }
          frozenCount = 0;
        }
      } else {
        frozenCount = 0;
        lastProgressTime = video.currentTime;
      }
    }, 1500);

    return () => clearInterval(watchdog);
  }, [cameraReady, staticImageUrl]);

  // Auto-resume playback if mobile browser unexpectedly pauses the video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const onUnexpectedPause = () => {
      if (isLiveTranslatingRef.current && !staticImageUrl) {
        video.play().catch(() => {});
      }
    };

    video.addEventListener('pause', onUnexpectedPause);
    video.addEventListener('stalled', onUnexpectedPause);

    return () => {
      video.removeEventListener('pause', onUnexpectedPause);
      video.removeEventListener('stalled', onUnexpectedPause);
    };
  }, [staticImageUrl]);

  // Toggle torch / flash
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    try {
      await (track as any).applyConstraints({
        advanced: [{ torch: !torchOn }],
      });
      setTorchOn(!torchOn);
    } catch (e) {
      console.warn('Torch toggle failed', e);
    }
  };

  // Flip camera between environment (rear) and user (front)
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // High-performance, non-blocking frame capture directly from video element
  const captureFrame = useCallback(() => {
    if (staticImageUrl) {
      return staticImageUrl;
    }
    const video = videoRef.current;
    if (!video || !cameraReady) return null;
    if (video.videoWidth === 0 || video.videoHeight === 0) return null;

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas');
    }
    const canvas = canvasRef.current;
    const maxDim = 720;
    const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
    const targetW = Math.round(video.videoWidth * scale);
    const targetH = Math.round(video.videoHeight * scale);

    if (canvas.width !== targetW || canvas.height !== targetH) {
      canvas.width = targetW;
      canvas.height = targetH;
    }

    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, targetW, targetH);
    // 0.58 JPEG produces crisp OCR with tiny ~35KB payload for true 1-second latency
    return canvas.toDataURL('image/jpeg', 0.58);
  }, [cameraReady, staticImageUrl]);

  // SMOOTH LIVE TRANSLATION LOOP (Completely non-blocking, leaves video stream uninterrupted at 60fps)
  useEffect(() => {
    if (!isLiveTranslating || staticImageUrl || !cameraReady) return;

    let isMounted = true;
    let timeoutId: any = null;

    const runLiveLoop = async () => {
      if (!isMounted || !isLiveTranslatingRef.current) return;

      const video = videoRef.current;
      if (
        !isAnalyzingRef.current &&
        video &&
        video.videoWidth > 0 &&
        video.videoHeight > 0
      ) {
        const frameData = captureFrame();
        if (frameData && onLiveFrameRef.current) {
          onLiveFrameRef.current(frameData);
        }
      }

      // Throttle interval to 8 seconds if shared quota is exhausted to avoid rate-limit spamming
      const loopInterval = isQuotaExhausted ? 8000 : 750;
      timeoutId = setTimeout(runLiveLoop, loopInterval);
    };

    timeoutId = setTimeout(runLiveLoop, 100);

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [isLiveTranslating, staticImageUrl, cameraReady, captureFrame, isQuotaExhausted]);

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        onLiveFrame(dataUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const activePack =
    POPULAR_LANGUAGE_PACKS.find((p) => p.id === activePackId) || POPULAR_LANGUAGE_PACKS[0];

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        accept="image/*"
        onChange={handleFileUpload}
        className="hidden"
      />

      {/* Main Viewport Container */}
      <div
        ref={viewportRef}
        className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950"
      >
        {staticImageUrl ? (
          // Static Preset Image Mode: shrinkwrap wrapper guarantees exact coordinate alignment
          <div className="relative inline-flex items-center justify-center max-w-full max-h-full">
            <img
              src={staticImageUrl}
              alt="Scanned frame"
              className="max-w-full max-h-full w-auto h-auto block select-none object-contain"
            />
            {/* AR Overlay rendered directly on top of the image */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {children}
            </div>
          </div>
        ) : (
          // CONTINUOUS LIVE CAMERA STREAM
          <div
            className="relative flex items-center justify-center max-w-full max-h-full overflow-hidden"
            style={
              videoBoxStyle.width
                ? videoBoxStyle
                : videoAspect
                ? { aspectRatio: `${videoAspect}` }
                : { width: '100%', height: '100%' }
            }
          >
            <video
              ref={videoRef}
              playsInline
              autoPlay
              muted
              onLoadedMetadata={updateVideoBox}
              onCanPlay={updateVideoBox}
              className={`w-full h-full block object-fill ${
                facingMode === 'user' ? 'scale-x-[-1]' : ''
              }`}
            />

            {/* Subtle Viewfinder Target Reticle (Only visible before scanning to guide alignment) */}
            {detectedCount === 0 && (
              <div className="absolute inset-8 sm:inset-16 pointer-events-none flex flex-col justify-between opacity-50 transition-opacity">
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-t-2 border-l-2 border-emerald-400/70 rounded-tl-lg" />
                  <div className="w-5 h-5 border-t-2 border-r-2 border-emerald-400/70 rounded-tr-lg" />
                </div>
                <div className="flex justify-between">
                  <div className="w-5 h-5 border-b-2 border-l-2 border-emerald-400/70 rounded-bl-lg" />
                  <div className="w-5 h-5 border-b-2 border-r-2 border-emerald-400/70 rounded-br-lg" />
                </div>
              </div>
            )}

            {/* AR Overlay rendered directly on top of the live video */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {children}
            </div>
          </div>
        )}

        {/* Camera Permission / Error Dialog (Only shown if camera denied and no static image) */}
        {cameraError && !staticImageUrl && (
          <div className="absolute inset-x-4 top-20 max-w-sm mx-auto bg-slate-900/95 border border-slate-700 rounded-2xl p-4 shadow-2xl backdrop-blur-md z-30 text-center space-y-3">
            <AlertCircle className="w-7 h-7 text-amber-400 mx-auto" />
            <h4 className="text-xs font-bold text-white">Chưa cấp quyền Camera</h4>
            <p className="text-[11px] text-slate-300 leading-relaxed">{cameraError}</p>
            <div className="flex items-center justify-center gap-2 pt-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải ảnh</span>
              </button>
              <button
                onClick={() => setShowSamplePicker(true)}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                <span>Ảnh mẫu</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Top Floating Utility Controls (Discreet & Non-Intrusive) */}
      <div className="absolute top-3 inset-x-3 sm:top-4 sm:inset-x-4 flex items-center justify-between z-30 pointer-events-none">
        {/* Left: Back to live camera button if viewing static image */}
        <div>
          {staticImageUrl && (
            <button
              onClick={onClearStaticImage}
              className="pointer-events-auto py-1.5 px-3 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white rounded-full text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-lg transition-transform active:scale-95"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-400" />
              <span>Camera trực tiếp</span>
            </button>
          )}
        </div>

        {/* Right: Camera utility cluster (Live/Pause, Torch, Flip) */}
        {!staticImageUrl && (
          <div className="flex items-center gap-1.5 pointer-events-auto bg-slate-950/70 border border-slate-800 rounded-full p-1 backdrop-blur-md shadow-lg">
            {/* Live / Pause Button */}
            <button
              onClick={() => setIsLiveTranslating(!isLiveTranslating)}
              className={`p-1.5 rounded-full text-xs transition-colors ${
                isLiveTranslating
                  ? 'text-emerald-400 hover:text-white'
                  : 'bg-emerald-600 text-white shadow-xs'
              }`}
              title={isLiveTranslating ? 'Tạm dừng để giữ khung hình' : 'Tiếp tục dịch trực tiếp'}
            >
              {isLiveTranslating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            </button>

            {hasTorch && (
              <button
                onClick={toggleTorch}
                className={`p-1.5 rounded-full transition-colors ${
                  torchOn ? 'text-amber-400' : 'text-slate-400 hover:text-white'
                }`}
                title="Bật/Tắt đèn Flash"
              >
                {torchOn ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
              </button>
            )}

            {/* Flip Camera */}
            <button
              onClick={switchCamera}
              className="p-1.5 rounded-full text-slate-400 hover:text-white transition-colors"
              title="Đổi camera trước/sau"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Clean Bottom Floating Dock */}
      <div className="absolute bottom-4 inset-x-4 flex items-center justify-center gap-3 z-30 pointer-events-none">
        {/* Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="pointer-events-auto h-11 w-11 rounded-full bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center justify-center backdrop-blur-md shadow-lg transition-transform active:scale-95"
          title="Tải ảnh từ thư viện"
        >
          <ImageIcon className="w-4.5 h-4.5 text-sky-400" />
        </button>

        {/* Clear Translation Overlay Button (if any text currently visible) */}
        {detectedCount > 0 && onClearResult && (
          <button
            onClick={onClearResult}
            className="pointer-events-auto h-11 w-11 rounded-full bg-slate-900/85 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-700/60 text-slate-300 hover:text-rose-300 flex items-center justify-center backdrop-blur-md shadow-lg transition-transform active:scale-95"
            title="Xóa chữ dịch cũ"
          >
            <Trash2 className="w-4.5 h-4.5 text-rose-400" />
          </button>
        )}

        {/* Central Prominent Shutter Button */}
        <button
          onClick={() => {
            const frame = captureFrame();
            if (frame) {
              onLiveFrame(frame, true);
            }
          }}
          className="pointer-events-auto h-12 px-5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow-xl shadow-emerald-950/50 border border-emerald-400/40 backdrop-blur-md transition-transform active:scale-95 cursor-pointer"
          title="Dịch ngay hình ảnh này"
        >
          <Scan className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Đang dịch...' : 'Quét ngay'}</span>
        </button>

        {/* Travel Samples Trigger Button */}
        <button
          onClick={() => setShowSamplePicker(true)}
          className="pointer-events-auto h-11 px-3.5 rounded-full bg-slate-900/85 hover:bg-slate-800 border border-slate-700 text-amber-300 flex items-center gap-1.5 backdrop-blur-md shadow-lg text-xs font-medium transition-transform active:scale-95"
          title="Thử các ảnh mẫu du lịch"
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span className="hidden xs:inline">Mẫu thử</span>
        </button>
      </div>

      {/* Travel Samples Modal Drawer (Clean slide-up popup only when requested) */}
      {showSamplePicker && (
        <div
          className="absolute inset-0 z-50 bg-black/70 backdrop-blur-xs flex flex-col justify-end pointer-events-auto animate-in fade-in"
          onClick={() => setShowSamplePicker(false)}
        >
          <div
            className="bg-slate-900 border-t border-slate-800 rounded-t-3xl p-4 max-h-[70vh] overflow-y-auto space-y-3 shadow-2xl animate-in slide-in-from-bottom"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Chọn ảnh mẫu du lịch thử nghiệm
                </h3>
              </div>
              <button
                onClick={() => setShowSamplePicker(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1 rounded-lg bg-slate-800"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
              {TRAVEL_SAMPLES.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onSelectSample(s);
                    setShowSamplePicker(false);
                  }}
                  className="flex items-start gap-3 p-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/70 text-left transition-all active:scale-[0.98]"
                >
                  <span className="text-2xl mt-0.5">{s.flag}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-xs text-white truncate">{s.title}</div>
                    <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                      {s.country} · {s.description}
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
};
