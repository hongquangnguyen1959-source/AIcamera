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
    // 640px tối ưu hóa chuẩn thị giác: dung lượng ~25KB siêu nhẹ, AI nhận diện tức thì trong <1s
    const maxDim = 640;
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
    // 0.60 JPEG: Nhẹ ~25KB, truyền siêu tốc trong 15ms qua mạng
    return canvas.toDataURL('image/jpeg', 0.60);
  }, [cameraReady, staticImageUrl]);

  // SMART LIVE TRANSLATION LOOP (Tự động nhận diện tức thì khi hướng camera vào văn bản mới)
  useEffect(() => {
    if (!isLiveTranslating || staticImageUrl || !cameraReady) return;

    let isMounted = true;
    let timeoutId: any = null;

    // Canvas nhỏ 16x16 để đo dịch chuyển khung hình siêu nhẹ (0.05ms CPU)
    const motionCanvas = document.createElement('canvas');
    motionCanvas.width = 16;
    motionCanvas.height = 16;
    const motionCtx = motionCanvas.getContext('2d', { willReadFrequently: true });

    let lastThumb: Uint8ClampedArray | null = null;
    let steadyCount = 0;
    let hadMotion = true; // Bắt đầu quét ngay khung hình đầu tiên

    const runLiveLoop = async () => {
      if (!isMounted || !isLiveTranslatingRef.current) return;

      const video = videoRef.current;
      if (
        !isAnalyzingRef.current &&
        video &&
        video.videoWidth > 0 &&
        video.videoHeight > 0 &&
        motionCtx
      ) {
        try {
          motionCtx.drawImage(video, 0, 0, 16, 16);
          const currentThumb = motionCtx.getImageData(0, 0, 16, 16).data;

          if (lastThumb) {
            let diffSum = 0;
            // So sánh độ sai khác giữa 2 khung hình
            for (let i = 0; i < currentThumb.length; i += 8) {
              diffSum += Math.abs(currentThumb[i] - lastThumb[i]);
            }
            const avgDiff = diffSum / (currentThumb.length / 8);

            if (avgDiff > 14) {
              // Camera đang di chuyển sang vị trí mới
              hadMotion = true;
              steadyCount = 0;
            } else {
              // Camera đã dừng ổn định
              steadyCount++;
            }
          } else {
            hadMotion = true;
            steadyCount = 1;
          }

          lastThumb = new Uint8ClampedArray(currentThumb);

          // KÍCH HOẠT DỊCH TỨC THÌ:
          // 1. Khi vừa dừng camera vào dòng chữ mới (steadyCount === 1 sau khi di chuyển)
          // 2. Hoặc định kỳ mỗi 6 giây nếu giữ nguyên camera
          const shouldTriggerScan =
            (hadMotion && steadyCount === 1) ||
            (steadyCount > 0 && steadyCount % 12 === 0);

          if (shouldTriggerScan) {
            hadMotion = false;
            const frameData = captureFrame();
            if (frameData && onLiveFrameRef.current) {
              onLiveFrameRef.current(frameData);
            }
          }
        } catch (e) {
          console.warn('Live motion check deferred', e);
        }
      }

      // Nhịp kiểm tra chuyển động đều đặn mỗi 450ms
      timeoutId = setTimeout(runLiveLoop, isAnalyzingRef.current ? 600 : 450);
    };

    // Quét lần đầu ngay sau 300ms khi mở camera
    timeoutId = setTimeout(runLiveLoop, 300);

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
        {/* Missing API Key helper banner */}
        {isMissingApiKey && !staticImageUrl && (
          <div className="absolute top-14 inset-x-3 sm:inset-x-8 max-w-md mx-auto z-30 bg-slate-950/95 border border-amber-500/60 rounded-2xl p-3 shadow-2xl backdrop-blur-md text-slate-100 flex items-start gap-2.5 pointer-events-auto animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                Chưa có Gemini API Key trên Vercel
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Camera đang tự động dịch bằng gói ngoại tuyến <strong>{activePack.shortName}</strong>. Để dịch AI trực tuyến đa ngôn ngữ, hãy nhập Key miễn phí:
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {onOpenApiKeyModal && (
                  <button
                    onClick={onOpenApiKeyModal}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1 transition"
                  >
                    <Key className="w-3 h-3" />
                    <span>Nhập Key miễn phí (30s)</span>
                  </button>
                )}
                {onOpenOfflinePacks && (
                  <button
                    onClick={onOpenOfflinePacks}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] border border-slate-700 transition"
                  >
                    <span>Quản lý gói ngoại tuyến</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Quota limit helper banner */}
        {!isMissingApiKey && isQuotaExhausted && !staticImageUrl && (
          <div className="absolute top-14 inset-x-3 sm:inset-x-8 max-w-md mx-auto z-30 bg-slate-950/95 border border-amber-500/60 rounded-2xl p-3 shadow-2xl backdrop-blur-md text-slate-100 flex items-start gap-2.5 pointer-events-auto animate-in fade-in">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs">
              <div className="font-bold text-amber-300 flex items-center gap-1.5">
                AI dùng chung đã hết 20 lượt miễn phí hôm nay
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                Ứng dụng đang dịch bằng gói từ điển <strong>{activePack.shortName}</strong>. Bạn có thể dán Gemini API Key miễn phí từ Google AI Studio để tiếp tục dùng AI tốc độ cao:
              </p>
              <div className="flex flex-wrap items-center gap-2 mt-2">
                {onOpenApiKeyModal && (
                  <button
                    onClick={onOpenApiKeyModal}
                    className="px-2.5 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg font-bold text-[11px] shadow-sm flex items-center gap-1 transition"
                  >
                    <Key className="w-3 h-3" />
                    <span>Nhập Key riêng (30s)</span>
                  </button>
                )}
                {onOpenOfflinePacks && (
                  <button
                    onClick={onOpenOfflinePacks}
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-[11px] border border-slate-700 transition"
                  >
                    <span>Đổi gói ngoại tuyến</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
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
          // CONTINUOUS LIVE CAMERA STREAM: Wrapper matches exact aspect ratio of video frame
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

            {/* Viewfinder Target Reticle / Corner brackets */}
            <div className="absolute inset-6 sm:inset-14 pointer-events-none flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="w-7 h-7 border-t-2 border-l-2 border-emerald-400 rounded-tl-lg shadow-sm" />
                <div className="w-7 h-7 border-t-2 border-r-2 border-emerald-400 rounded-tr-lg shadow-sm" />
              </div>
              <div className="flex justify-between">
                <div className="w-7 h-7 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg shadow-sm" />
                <div className="w-7 h-7 border-b-2 border-r-2 border-emerald-400 rounded-br-lg shadow-sm" />
              </div>
            </div>

            {/* Real-time laser scanning line during live analysis */}
            {isLiveTranslating && (
              <div className="absolute inset-x-6 sm:inset-x-14 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-pulse pointer-events-none top-1/2 -translate-y-1/2" />
            )}

            {/* AR Overlay rendered directly on top of the live video */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {children}
            </div>
          </div>
        )}

        {/* Camera Permission / Error Dialog */}
        {cameraError && !staticImageUrl && (
          <div className="absolute inset-x-4 top-20 sm:top-24 max-w-lg mx-auto bg-slate-900/95 border border-amber-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-md z-30 text-center space-y-3">
            <AlertCircle className="w-8 h-8 text-amber-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Chế độ Thử nghiệm Du lịch</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-1.5 px-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Tải ảnh lên</span>
              </button>
              <button
                onClick={() => onSelectSample(TRAVEL_SAMPLES[0])}
                className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-slate-700"
              >
                <span>🇯🇵 Thử Menu Nhật Bản</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compact Top Camera Quick Controls */}
      {staticImageUrl ? (
        <div className="absolute top-3 left-3 z-30 pointer-events-auto">
          <button
            onClick={onClearStaticImage}
            className="py-1 px-3 bg-slate-900/85 hover:bg-slate-800 border border-slate-700/80 text-white rounded-xl text-xs font-semibold backdrop-blur-md flex items-center gap-1.5 shadow-md transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-emerald-400" />
            <span>Mở Camera</span>
          </button>
        </div>
      ) : (
        <div className="absolute top-3 right-3 flex items-center gap-1.5 z-30 pointer-events-auto">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`w-8 h-8 rounded-full border backdrop-blur-md transition-all flex items-center justify-center shadow-md ${
                torchOn
                  ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                  : 'bg-slate-950/60 border-slate-700/60 text-slate-300 hover:text-white'
              }`}
              title="Bật/Tắt Đèn Flash"
            >
              {torchOn ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={switchCamera}
            className="w-8 h-8 rounded-full bg-slate-950/60 hover:bg-slate-900 border border-slate-700/60 text-slate-300 hover:text-white backdrop-blur-md transition-all flex items-center justify-center shadow-md"
            title="Đổi camera trước/sau"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => setIsLiveTranslating(!isLiveTranslating)}
            className={`w-8 h-8 rounded-full border backdrop-blur-md transition-all flex items-center justify-center shadow-md ${
              isLiveTranslating
                ? 'bg-slate-950/60 border-slate-700/60 text-slate-300 hover:text-white'
                : 'bg-emerald-600 border-emerald-500 text-white'
            }`}
            title={isLiveTranslating ? 'Giữ hình ảnh' : 'Tiếp tục dịch live'}
          >
            {isLiveTranslating ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
          </button>
        </div>
      )}

      {/* Bottom Floating Bar: 3 buttons (Tải ảnh, Xóa chữ cũ, Đang dịch) */}
      <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3 sm:gap-4 z-30 pointer-events-auto px-3">
        {/* 1. Tải ảnh */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="h-10 px-4 rounded-full bg-slate-900/85 hover:bg-slate-800 border border-slate-700/80 text-slate-200 flex items-center gap-1.5 backdrop-blur-md shadow-lg text-xs font-semibold transition-transform active:scale-95"
          title="Tải ảnh từ thư viện"
        >
          <ImageIcon className="w-4 h-4 text-sky-400" />
          <span>Tải ảnh</span>
        </button>

        {/* 2. Xóa chữ cũ */}
        <button
          onClick={onClearResult}
          className="h-10 px-4 rounded-full bg-slate-900/85 hover:bg-rose-950/60 border border-slate-700/80 hover:border-rose-600/60 text-slate-200 hover:text-rose-200 flex items-center gap-1.5 backdrop-blur-md shadow-lg text-xs font-semibold transition-transform active:scale-95"
          title="Xóa các chữ dịch cũ trên màn hình"
        >
          <Trash2 className="w-4 h-4 text-rose-400" />
          <span>Xóa chữ cũ</span>
        </button>

        {/* 3. Đang dịch / Quét ngay */}
        <button
          onClick={() => {
            const frame = captureFrame();
            if (frame) {
              onLiveFrame(frame, true);
            }
          }}
          className={`h-11 px-5 rounded-full font-bold text-xs flex items-center gap-2 shadow-xl border backdrop-blur-md transition-transform active:scale-95 cursor-pointer ${
            isAnalyzing
              ? 'bg-emerald-600/90 border-emerald-400 text-white'
              : 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400/60 text-white'
          }`}
          title="Dịch ngay hình ảnh này"
        >
          <Scan className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Đang dịch...' : isLiveTranslating ? 'Đang dịch' : 'Quét ngay'}</span>
        </button>
      </div>
    </div>
  );
};
