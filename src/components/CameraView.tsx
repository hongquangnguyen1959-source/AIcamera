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
  Trash2,
  ExternalLink,
} from 'lucide-react';

interface CameraViewProps {
  onLiveFrame: (imageDataUrl: string) => void;
  onClearTranslations?: () => void;
  isAnalyzing: boolean;
  detectedCount: number;
  children?: React.ReactNode;
}

// Global acquisition lock to prevent Android Camera HAL concurrency deadlocks
let isAcquiringCamera = false;
let globalActiveStream: MediaStream | null = null;

export const CameraView: React.FC<CameraViewProps> = ({
  onLiveFrame,
  onClearTranslations,
  isAnalyzing,
  detectedCount,
  children,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [deviceList, setDeviceList] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [isLivePaused, setIsLivePaused] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);

  const isAnalyzingRef = useRef(isAnalyzing);
  isAnalyzingRef.current = isAnalyzing;
  const isLivePausedRef = useRef(isLivePaused);
  isLivePausedRef.current = isLivePaused;
  const onLiveFrameRef = useRef(onLiveFrame);
  onLiveFrameRef.current = onLiveFrame;

  // Refresh device list to allow cycling through all physical lenses
  const refreshDevices = useCallback(async () => {
    try {
      if (!navigator.mediaDevices?.enumerateDevices) return;
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      setDeviceList(videoDevices);
    } catch (e) {
      console.warn('enumerateDevices error:', e);
    }
  }, []);

  // Safe camera starter that cleanly handles user gestures, autoplay restrictions, and HAL release
  const startCamera = useCallback(async (isUserGesture = false) => {
    if (isAcquiringCamera) return;
    isAcquiringCamera = true;
    setIsInitializing(true);
    setCameraError(null);

    // 1. Release existing stream with 200ms grace period so Android HAL releases the camera lock
    if (globalActiveStream) {
      globalActiveStream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch (_) {}
      });
      globalActiveStream = null;
      await new Promise((r) => setTimeout(r, 200));
    }

    let stream: MediaStream | null = null;

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Trình duyệt không hỗ trợ WebRTC Camera');
      }

      // Attempt 1: Target specific device if selected
      if (selectedDeviceId) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { deviceId: { exact: selectedDeviceId } },
            audio: false,
          });
        } catch (devErr) {
          console.warn('Specific deviceId failed, falling back:', devErr);
        }
      }

      // Attempt 2: Target facingMode ideal
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: { ideal: facingMode },
            },
            audio: false,
          });
        } catch (errA) {
          console.warn('Ideal facingMode failed, trying exact facingMode:', errA);
        }
      }

      // Attempt 3: Target facingMode exact
      if (!stream) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facingMode },
            audio: false,
          });
        } catch (errB) {
          console.warn('Exact facingMode failed, trying any video camera:', errB);
        }
      }

      // Attempt 4: Any camera available on device
      if (!stream) {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
      }

      if (!stream) {
        throw new Error('Không thể khởi tạo luồng camera');
      }

      globalActiveStream = stream;

      const video = videoRef.current;
      if (video) {
        video.srcObject = stream;
        video.muted = true;
        video.defaultMuted = true;
        video.playsInline = true;
        video.setAttribute('playsinline', 'true');
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('muted', '');
        video.setAttribute('autoplay', '');

        try {
          await video.play();
          setCameraReady(true);
          setCameraError(null);
        } catch (playErr) {
          console.warn('Autoplay waiting for direct tap:', playErr);
          if (!isUserGesture) {
            setCameraReady(false);
          }
        }
      }

      // Check flash torch capability
      const track = stream.getVideoTracks()[0];
      const capabilities = track?.getCapabilities?.() as any;
      setHasTorch(Boolean(capabilities && capabilities.torch));

      // Refresh physical lenses list
      refreshDevices();
    } catch (err: any) {
      console.error('Camera startup error:', err);
      setCameraReady(false);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraError('Chưa cấp quyền Camera. Hãy bấm vào biểu tượng ổ khóa 🔒 trên thanh địa chỉ hoặc mở trang trong tab mới để cho phép Camera.');
      } else {
        setCameraError(err.message || 'Không thể mở camera. Vui lòng bấm "Mở lại Camera" hoặc mở trong tab mới.');
      }
    } finally {
      isAcquiringCamera = false;
      setIsInitializing(false);
    }
  }, [facingMode, selectedDeviceId, refreshDevices]);

  // Initial auto-start on mount
  useEffect(() => {
    let isMounted = true;
    startCamera(false);

    return () => {
      isMounted = false;
      if (globalActiveStream) {
        globalActiveStream.getTracks().forEach((track) => {
          try {
            track.stop();
          } catch (_) {}
        });
        globalActiveStream = null;
      }
    };
  }, [facingMode, selectedDeviceId]);

  // Watchdog: If camera is supposed to be ready or paused, keep checking
  useEffect(() => {
    const watchdog = setInterval(() => {
      const v = videoRef.current;
      if (v && globalActiveStream) {
        if (v.paused && !isLivePausedRef.current) {
          v.play().catch(() => {});
        }
        if (v.videoWidth > 0 && !cameraReady) {
          setCameraReady(true);
        }
      }
    }, 1500);

    return () => clearInterval(watchdog);
  }, [cameraReady]);

  const toggleTorch = async () => {
    if (!globalActiveStream) return;
    const track = globalActiveStream.getVideoTracks()[0];
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
    if (deviceList.length > 2) {
      const currentIndex = deviceList.findIndex((d) => d.deviceId === selectedDeviceId);
      const nextIndex = (currentIndex + 1) % deviceList.length;
      setSelectedDeviceId(deviceList[nextIndex].deviceId);
    } else {
      setSelectedDeviceId(null);
      setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
    }
  };

  const restartCamera = () => {
    setSelectedDeviceId(null);
    startCamera(true);
  };

  // High-performance frame capture directly from live video
  const captureLiveFrame = useCallback(() => {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || video.videoHeight === 0) return null;

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
      console.warn('captureLiveFrame error:', err);
      return null;
    }
  }, []);

  // Continuous live scanning loop: Scans live frames every 3.5s
  useEffect(() => {
    let isMounted = true;
    let timeoutId: any = null;
    let lastScanTime = 0;

    const runLiveScanning = () => {
      if (!isMounted) return;

      const now = Date.now();
      const video = videoRef.current;

      if (
        video &&
        video.videoWidth > 0 &&
        !video.paused &&
        !isLivePausedRef.current &&
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

    timeoutId = setTimeout(runLiveScanning, 1000);

    return () => {
      isMounted = false;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [captureLiveFrame]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-black overflow-hidden select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Main Viewport Container */}
      <div className="relative w-full h-full flex items-center justify-center overflow-hidden bg-slate-950">
        {/* Fullscreen Video Stream */}
        <video
          ref={videoRef}
          playsInline
          autoPlay
          muted
          onLoadedMetadata={() => {
            if (videoRef.current) {
              videoRef.current.play().then(() => setCameraReady(true)).catch(() => {});
            }
          }}
          onCanPlay={() => {
            if (videoRef.current) {
              videoRef.current.play().then(() => setCameraReady(true)).catch(() => {});
            }
          }}
          onPlaying={() => {
            setCameraReady(true);
            setCameraError(null);
          }}
          onTimeUpdate={() => {
            if (!cameraReady && videoRef.current && videoRef.current.currentTime > 0) {
              setCameraReady(true);
            }
          }}
          className={`w-full h-full block object-cover ${
            facingMode === 'user' ? 'scale-x-[-1]' : ''
          }`}
        />

        {/* Viewfinder Reticle / Corner brackets */}
        <div className="absolute inset-8 sm:inset-16 pointer-events-none flex flex-col justify-between z-10">
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
          <div className="absolute inset-x-8 sm:inset-x-16 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10b981] animate-pulse pointer-events-none top-1/2 -translate-y-1/2 z-20" />
        )}

        {/* AR Text Overlay rendered directly on top of the live video stream */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden z-20">
          {children}
        </div>

        {/* Top Floating Controls: Flash & Switch Camera & Restart Button */}
        <div className="absolute top-3 right-3 flex items-center gap-2 z-30 pointer-events-auto">
          {hasTorch && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleTorch();
              }}
              className={`w-9 h-9 rounded-full border backdrop-blur-md transition-all flex items-center justify-center shadow-lg ${
                torchOn
                  ? 'bg-amber-500 border-amber-400 text-slate-950 font-bold'
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-300 hover:text-white'
              }`}
              title="Bật/Tắt Đèn Flash"
            >
              {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
            </button>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              switchCamera();
            }}
            className="w-9 h-9 rounded-full bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-slate-200 hover:text-white backdrop-blur-md transition-all flex items-center justify-center shadow-lg cursor-pointer"
            title="Đổi camera trước/sau hoặc đổi ống kính"
          >
            <RefreshCw className="w-4 h-4 text-emerald-400" />
          </button>
        </div>

        {/* Live Status Pill: Positioned cleanly at top center */}
        <div className="absolute top-3 left-3 right-20 sm:inset-x-0 flex sm:justify-center z-20 pointer-events-none pr-4 sm:pr-0">
          {isAnalyzing ? (
            <div className="bg-slate-900/90 border border-emerald-500/80 px-3.5 py-1.5 rounded-full shadow-2xl flex items-center gap-2 backdrop-blur-md animate-pulse">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span className="text-xs font-bold text-emerald-200 truncate">Đang quét dịch sang Tiếng Việt...</span>
            </div>
          ) : detectedCount > 0 ? (
            <div className="bg-slate-900/85 border border-emerald-500/50 px-3.5 py-1 rounded-full shadow-md flex items-center gap-2 backdrop-blur-md">
              <span className="text-xs">🇻🇳</span>
              <span className="text-xs font-bold text-emerald-300 truncate">Đã dịch {detectedCount} đoạn văn bản</span>
            </div>
          ) : isLivePaused ? (
            <div className="bg-amber-950/85 border border-amber-500/60 px-3 py-1 rounded-full shadow-md flex items-center gap-1.5 backdrop-blur-md text-amber-200 text-xs font-semibold">
              <Pause className="w-3.5 h-3.5 text-amber-400" />
              <span>Đang tạm dừng quét Live</span>
            </div>
          ) : (
            <div className="bg-slate-900/80 border border-slate-700/80 px-3.5 py-1.5 rounded-full shadow-lg flex items-center gap-2 backdrop-blur-md text-slate-300 text-xs">
              <Scan className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span className="truncate">Hướng camera vào chữ để dịch trực tiếp</span>
            </div>
          )}
        </div>

        {/* TAP TO START CAMERA (Displayed whenever camera is not yet playing) */}
        {!cameraReady && !cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/85 z-30 p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-emerald-500/60 rounded-2xl p-6 text-center max-w-xs space-y-4 shadow-2xl backdrop-blur-md">
              <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-inner">
                <Camera className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h4 className="font-bold text-white text-base">Bật Camera Dịch Trực Tiếp</h4>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Chạm vào nút bên dưới để cấp quyền và khởi động luồng máy ảnh.
                </p>
              </div>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  startCamera(true);
                }}
                disabled={isInitializing}
                className="w-full py-3.5 px-5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-95 text-white rounded-xl text-xs font-extrabold shadow-xl transition cursor-pointer flex items-center justify-center gap-2"
              >
                <Camera className="w-4 h-4" />
                <span>{isInitializing ? 'Đang mở Camera...' : 'Bật Camera Ngay'}</span>
              </button>

              <div className="pt-1 border-t border-slate-800">
                <a
                  href={typeof window !== 'undefined' ? window.location.href : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 font-semibold inline-flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Mở toàn màn hình trong tab mới</span>
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Camera Permission / Error Dialog */}
        {cameraError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 p-4 animate-in fade-in">
            <div className="bg-slate-900 border border-amber-500/70 rounded-2xl p-6 text-center max-w-sm space-y-4 shadow-2xl backdrop-blur-md">
              <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
              <div className="space-y-1.5">
                <h4 className="text-base font-bold text-white">Chưa Mở Được Camera</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{cameraError}</p>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    restartCamera();
                  }}
                  className="w-full py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg cursor-pointer transition active:scale-95"
                >
                  <RefreshCw className="w-4 h-4" />
                  <span>Thử lại mở Camera</span>
                </button>

                <a
                  href={typeof window !== 'undefined' ? window.location.href : '#'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-emerald-300 hover:text-white border border-slate-700 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Mở trang trong tab mới (Để cấp quyền)</span>
                </a>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* BOTTOM CONTROLS BAR: Pure Live Camera */}
      <div className="absolute bottom-4 inset-x-0 flex items-center justify-center gap-2.5 z-30 pointer-events-auto px-4">
        {/* Nút Tạm Dừng / Tiếp Tục Quét Trực Tiếp */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsLivePaused(!isLivePaused);
          }}
          className={`h-11 px-4 sm:px-5 rounded-full font-bold text-xs flex items-center gap-2 shadow-xl border backdrop-blur-md transition-all active:scale-95 cursor-pointer ${
            isLivePaused
              ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-400 text-white'
              : 'bg-slate-900/90 hover:bg-slate-800 border-slate-700 text-slate-200'
          }`}
          title={isLivePaused ? 'Tiếp tục quét trực tiếp' : 'Tạm dừng để đọc chữ dịch'}
        >
          {isLivePaused ? (
            <>
              <Play className="w-4 h-4 text-white fill-white" />
              <span>Tiếp tục Live</span>
            </>
          ) : (
            <>
              <Pause className="w-4 h-4 text-emerald-400" />
              <span>Tạm dừng</span>
            </>
          )}
        </button>

        {/* Nút Quét Lại Ngay Lập Tức */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            const frame = captureLiveFrame();
            if (frame) {
              onLiveFrame(frame);
            } else {
              startCamera(true);
            }
          }}
          disabled={isAnalyzing}
          className="h-11 px-4 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md shadow-lg transition-transform active:scale-95 cursor-pointer"
          title="Quét lại khung hình này ngay"
        >
          <Scan className={`w-4 h-4 text-emerald-400 ${isAnalyzing ? 'animate-spin' : ''}`} />
          <span>{isAnalyzing ? 'Đang dịch...' : 'Quét ngay'}</span>
        </button>

        {/* Nút Xóa Chữ / Bản Dịch Cũ Trên Màn Hình */}
        {onClearTranslations && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClearTranslations();
            }}
            className="h-11 px-4 rounded-full bg-slate-900/90 hover:bg-rose-950/70 border border-slate-700 hover:border-rose-500/60 text-slate-300 hover:text-rose-200 flex items-center gap-1.5 text-xs font-semibold backdrop-blur-md shadow-lg transition-all active:scale-95 cursor-pointer"
            title="Xóa tất cả các bản dịch cũ đang hiển thị trên màn hình"
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Xóa chữ</span>
          </button>
        )}
      </div>
    </div>
  );
};
