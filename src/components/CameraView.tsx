import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  Camera,
  RefreshCw,
  Zap,
  ZapOff,
  Play,
  Pause,
  Scan,
  AlertCircle,
} from 'lucide-react';
import { TRAVEL_SAMPLES } from '../data/travelSamples';
import { TravelSample } from '../types';

interface CameraViewProps {
  onLiveFrame: (imageDataUrl: string) => void;
  isAnalyzing: boolean;
  detectedCount: number;
  onSelectSample: (sample: TravelSample) => void;
  onClearSample: () => void;
  activeSample: TravelSample | null;
  children?: React.ReactNode;
}

export const CameraView: React.FC<CameraViewProps> = ({
  onLiveFrame,
  isAnalyzing,
  detectedCount,
  onSelectSample,
  onClearSample,
  activeSample,
  children,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isLivePaused, setIsLivePaused] = useState(false);
  const [videoAspect, setVideoAspect] = useState<number | null>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const [videoBoxStyle, setVideoBoxStyle] = useState<React.CSSProperties>({});

  const isAnalyzingRef = useRef(isAnalyzing);
  isAnalyzingRef.current = isAnalyzing;
  const isLivePausedRef = useRef(isLivePaused);
  isLivePausedRef.current = isLivePaused;
  const onLiveFrameRef = useRef(onLiveFrame);
  onLiveFrameRef.current = onLiveFrame;
  const activeSampleRef = useRef(activeSample);
  activeSampleRef.current = activeSample;

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

  // Start live camera stream
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
      if (err.name === 'NotAllowedError') {
        setCameraError('Bạn chưa cấp quyền Camera trên trình duyệt. Vui lòng cho phép quyền truy cập camera.');
      } else {
        setCameraError('Không thể mở Camera trên thiết bị này. Bạn có thể chọn các ảnh mẫu bên trên để xem mô phỏng trực tiếp.');
      }
    }
  }, [facingMode, stopExistingStream]);

  const restartCamera = useCallback(() => {
    setCameraReady(false);
    setTimeout(() => {
      startCamera();
    }, 150);
  }, [startCamera]);

  useEffect(() => {
    startCamera();
    return () => {
      stopExistingStream();
    };
  }, [facingMode, startCamera, stopExistingStream]);

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

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // High-performance frame capture directly from live video
  const captureLiveFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || !cameraReady || video.videoWidth === 0 || video.videoHeight === 0) return null;

    try {
      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas');
      }
      const canvas = canvasRef.current;
      const maxDim = 960;
      const scale = Math.min(1, maxDim / Math.max(video.videoWidth, video.videoHeight));
      const targetW = Math.round(video.videoWidth * scale);
      const targetH = Math.round(video.videoHeight * scale);

      if (canvas.width !== targetW || canvas.height !== targetH) {
        canvas.width = targetW;
        canvas.height = targetH;
      }

      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return null;

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(video, 0, 0, targetW, targetH);
      // 0.78 JPEG produces sharp stroke contrast for complex Chinese characters
      return canvas.toDataURL('image/jpeg', 0.78);
    } catch (err) {
      console.warn('captureLiveFrame canvas error:', err);
      return null;
    }
  }, [cameraReady]);

  // CONTINUOUS LIVE SCANNING LOOP: Quét trực tiếp thời gian thực ngay trên camera
  useEffect(() => {
    if (!cameraReady) return;

    let isMounted = true;
    let timeoutId: any = null;
    let lastScanTime = 0;

    const runLiveScanning = () => {
      if (!isMounted) return;

      const now = Date.now();
      // Quét tự động định kỳ nếu không bị tạm dừng, không đang trong mẫu mô phỏng và không bận phân tích
      if (
        !isLivePausedRef.current &&
        !activeSampleRef.current &&
        !isAnalyzingRef.current &&
        now - lastScanTime >= 2500
      ) {
        const frame = captureLiveFrame();
        if (frame && onLiveFrameRef.current) {
          lastScanTime = now;
          onLiveFrameRef.current(frame);
        }
      }

      timeoutId = setTimeout(runLiveScanning, 1000);
    };

    timeoutId = setTimeout(runLiveScanning, 800);

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [cameraReady, captureLiveFrame]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Viewport Container */}
      <div
        ref={viewportRef}
        className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950"
      >
        {/* Continuous Live Video or Sample Preview */}
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
          {activeSample ? (
            <img
              src={activeSample.image}
              alt={activeSample.title}
              className="w-full h-full block object-contain"
            />
          ) : (
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
          )}

          {/* Viewfinder Reticle / Corner brackets */}
          <div className="absolute inset-6 sm:inset-12 pointer-events-none flex flex-col justify-between">
            <div className="flex justify-between">
              <div className="w-8 h-8 border-t-3 border-l-3 border-emerald-400 rounded-tl-xl shadow-sm" />
              <div className="w-8 h-8 border-t-3 border-r-3 border-emerald-400 rounded-tr-xl shadow-sm" />
            </div>
            <div className="flex justify-between">
              <div className="w-8 h-8 border-b-3 border-l-3 border-emerald-400 rounded-bl-xl shadow-sm" />
              <div className="w-8 h-8 border-b-3 border-r-3 border-emerald-400 rounded-br-xl shadow-sm" />
            </div>
          </div>

          {/* Real-time laser scanning line during live analysis */}
          {isAnalyzing && (
            <div className="absolute inset-x-6 sm:inset-x-12 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-pulse pointer-events-none top-1/2 -translate-y-1/2 z-20" />
          )}

          {/* AR Text Overlay rendered directly on top of the live video stream */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
            {children}
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="absolute top-14 inset-x-0 flex justify-center z-30 pointer-events-none px-4">
          {isAnalyzing ? (
            <div className="bg-slate-900/90 border border-emerald-500/80 px-4 py-1.5 rounded-full shadow-2xl flex items-center gap-2 backdrop-blur-md animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-xs font-bold text-emerald-200">Đang quét dịch camera sang Tiếng Việt...</span>
            </div>
          ) : detectedCount > 0 ? (
            <div className="bg-slate-900/85 border border-emerald-500/50 px-3.5 py-1 rounded-full shadow-md flex items-center gap-2 backdrop-blur-md">
              <span className="text-xs">🇻🇳</span>
              <span className="text-xs font-bold text-emerald-300">Đã dịch {detectedCount} đoạn văn bản trực tiếp</span>
            </div>
          ) : isLivePaused ? (
            <div className="bg-amber-950/85 border border-amber-500/60 px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-md text-amber-200 text-xs font-semibold">
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              <span>Đang tạm dừng quét trực tiếp</span>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-700/80 px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-md text-slate-300 text-xs">
              <Scan className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>Đang quét trực tiếp: Hướng camera vào chữ nước ngoài</span>
            </div>
          )}
        </div>

        {/* Camera Permission / Error Dialog */}
        {cameraError && !activeSample && (
          <div className="absolute inset-x-4 top-20 sm:top-24 max-w-md mx-auto bg-slate-900/95 border border-amber-500/50 rounded-2xl p-5 shadow-2xl backdrop-blur-md z-30 text-center space-y-3">
            <AlertCircle className="w-9 h-9 text-amber-400 mx-auto" />
            <h4 className="text-sm font-bold text-white">Chế độ Camera Trực Tiếp</h4>
            <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={restartCamera}
                className="py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-emerald-500/50 shadow-md cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Thử lại Camera</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* TOP BAR: Quick Sample Presets (Thử nhanh 1 chạm trực tiếp trên camera) */}
      <div className="absolute top-3 inset-x-3 flex items-center justify-between z-30 pointer-events-auto gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-1">
          {activeSample && (
            <button
              onClick={onClearSample}
              className="px-2.5 py-1 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold shadow-md flex items-center gap-1 shrink-0 transition cursor-pointer"
            >
              <Camera className="w-3 h-3" />
              <span>Camera thật</span>
            </button>
          )}

          {TRAVEL_SAMPLES.map((sample) => {
            const isSelected = activeSample?.id === sample.id;
            return (
              <button
                key={sample.id}
                onClick={() => onSelectSample(sample)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-semibold backdrop-blur-md shadow-md flex items-center gap-1.5 shrink-0 transition cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500 text-slate-950 font-bold border border-emerald-300'
                    : 'bg-slate-900/85 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-emerald-300'
                }`}
                title={`Thử ngay: ${sample.title}`}
              >
                <span>{sample.flag}</span>
                <span className="whitespace-nowrap">{sample.title.split(' ')[0]}</span>
              </button>
            );
          })}
        </div>

        {/* Top-Right Camera Controls */}
        <div className="flex items-center gap-1.5 shrink-0">
          {hasTorch && (
            <button
              onClick={toggleTorch}
              className={`w-8 h-8 rounded-full border backdrop-blur-md transition-all flex items-center justify-center shadow-md ${
                torchOn
                  ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                  : 'bg-slate-950/70 border-slate-700/70 text-slate-300 hover:text-white'
              }`}
              title="Bật/Tắt Đèn Flash"
            >
              {torchOn ? <Zap className="w-3.5 h-3.5" /> : <ZapOff className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={switchCamera}
            className="w-8 h-8 rounded-full bg-slate-950/70 hover:bg-slate-900 border border-slate-700/70 text-slate-300 hover:text-white backdrop-blur-md transition-all flex items-center justify-center shadow-md cursor-pointer"
            title="Đổi camera trước/sau"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* BOTTOM CONTROLS BAR: Quét Trực Tiếp Thời Gian Thực (Pure Live) */}
      <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-3 z-30 pointer-events-auto px-4">
        {/* Nút Tạm Dừng / Tiếp Tục Quét Trực Tiếp */}
        <button
          onClick={() => setIsLivePaused(!isLivePaused)}
          className={`h-11 px-5 rounded-full font-bold text-xs flex items-center gap-2 shadow-xl border backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
            isLivePaused
              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white'
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
          title={isLivePaused ? 'Tiếp tục quét trực tiếp' : 'Tạm dừng để đọc chữ dịch'}
        >
          {isLivePaused ? (
            <>
              <Play className="w-4 h-4 text-white fill-white" />
              <span>Tiếp tục quét Live</span>
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 text-emerald-400" />
              <span>Tạm dừng để đọc chữ</span>
            </>
          )}
        </button>

        {/* Nút Quét Lại Ngay Lập Tức */}
        <button
          onClick={() => {
            const frame = captureLiveFrame();
            if (frame) {
              onLiveFrame(frame);
            }
          }}
          disabled={isAnalyzing}
          className="h-11 px-4 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md shadow-lg transition-transform active:scale-95 cursor-pointer"
          title="Quét lại khung hình này ngay"
        >
          <Scan className={`w-4 h-4 text-emerald-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Đang dịch...' : 'Quét ngay'}</span>
        </button>
      </div>
    </div>
  );
};
