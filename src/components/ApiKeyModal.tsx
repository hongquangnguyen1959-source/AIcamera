import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  AlertTriangle,
  ExternalLink,
  Check,
  Copy,
  Trash2,
  HelpCircle,
  Sparkles,
  Server,
  Smartphone,
  BookOpen,
} from 'lucide-react';
import { getUserApiKey, setUserApiKey, removeUserApiKey } from '../utils/apiKeyStorage';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeySaved?: () => void;
  hasServerKey?: boolean;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({
  isOpen,
  onClose,
  onKeySaved,
  hasServerKey = false,
}) => {
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'input' | 'guide'>('input');
  const [copiedVercelVar, setCopiedVercelVar] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const existing = getUserApiKey();
      if (existing) {
        setApiKeyInput(existing);
        setHasSavedKey(true);
      } else {
        setApiKeyInput('');
        setHasSavedKey(false);
      }
      setSavedSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = () => {
    const clean = apiKeyInput.trim();
    if (!clean) return;
    setUserApiKey(clean);
    setHasSavedKey(true);
    setSavedSuccess(true);
    if (onKeySaved) onKeySaved();
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 1200);
  };

  const handleRemove = () => {
    removeUserApiKey();
    setApiKeyInput('');
    setHasSavedKey(false);
    if (onKeySaved) onKeySaved();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedVercelVar(true);
    setTimeout(() => setCopiedVercelVar(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-start justify-between bg-slate-900/95 sticky top-0 z-10">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl">
              <Key className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                Cài Đặt Gemini API Key
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cung cấp chìa khóa AI để dịch trực tiếp qua camera không giới hạn
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-slate-800 bg-slate-950/40 px-4 pt-2 gap-2 text-xs">
          <button
            onClick={() => setActiveTab('input')}
            className={`pb-2 px-2 font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'input'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span>Nhập Key trên ứng dụng</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`pb-2 px-2 font-semibold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'guide'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>Cách cấu hình trên Vercel</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Status banner */}
          <div className="p-3 rounded-xl border text-xs flex items-start gap-2.5 bg-slate-950/60 border-slate-800">
            {hasSavedKey ? (
              <>
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-emerald-300">
                    Đang sử dụng API Key cá nhân trong máy
                  </span>
                  <p className="text-slate-400 mt-0.5">
                    Khóa được lưu bảo mật trong trình duyệt của bạn và tự động dùng cho camera dịch.
                  </p>
                </div>
              </>
            ) : hasServerKey ? (
              <>
                <ShieldCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-cyan-300">
                    Máy chủ đã có GEMINI_API_KEY
                  </span>
                  <p className="text-slate-400 mt-0.5">
                    Hệ thống đã nhận diện khóa môi trường máy chủ. Bạn vẫn có thể nhập khóa riêng nếu muốn.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold text-amber-300">
                    Chưa phát hiện Gemini API Key
                  </span>
                  <p className="text-slate-400 mt-0.5">
                    Vercel cần API Key để kích hoạt dịch camera trực tiếp. Bạn có thể lấy Key miễn phí trong 30 giây bên dưới!
                  </p>
                </div>
              </>
            )}
          </div>

          {activeTab === 'input' ? (
            <>
              {/* Input section */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Dán Gemini API Key của bạn:</span>
                  <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noreferrer"
                    className="text-emerald-400 hover:underline flex items-center gap-1 font-normal"
                  >
                    <span>Lấy Key miễn phí tại Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => setApiKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
                  />
                  {apiKeyInput && (
                    <button
                      onClick={() => setApiKeyInput('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs px-1.5 py-0.5"
                    >
                      Xóa
                    </button>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 pt-2">
                <button
                  onClick={handleSave}
                  disabled={!apiKeyInput.trim()}
                  className="flex-1 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-900/30"
                >
                  {savedSuccess ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Đã lưu thành công!</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Lưu & Kích hoạt camera dịch ngay</span>
                    </>
                  )}
                </button>

                {hasSavedKey && (
                  <button
                    onClick={handleRemove}
                    className="py-2.5 px-3 bg-red-950/40 hover:bg-red-900/50 border border-red-800/60 text-red-300 rounded-xl text-xs font-medium transition flex items-center gap-1"
                    title="Xóa khóa khỏi trình duyệt"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Gỡ</span>
                  </button>
                )}
              </div>

              {/* Quick instructions */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2 text-xs text-slate-300">
                <h4 className="font-semibold text-slate-200 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-sky-400" />
                  <span>Cách lấy API Key miễn phí (100% không tốn phí):</span>
                </h4>
                <ol className="list-decimal list-inside space-y-1 text-slate-400 pl-1">
                  <li>Truy cập <strong className="text-white">aistudio.google.com/apikey</strong> và đăng nhập Gmail.</li>
                  <li>Bấm <strong className="text-white">"Create API key"</strong>.</li>
                  <li>Sao chép mã (bắt đầu bằng <code className="text-emerald-300 bg-slate-900 px-1 py-0.5 rounded">AIzaSy...</code>) và dán vào ô phía trên.</li>
                </ol>
              </div>
            </>
          ) : (
            <div className="space-y-3 text-xs text-slate-300">
              <p className="text-slate-400 leading-relaxed">
                Nếu bạn muốn tất cả người dùng khi vào trang web Vercel đều tự động dịch được (không cần mỗi người tự nhập key riêng), hãy cấu hình biến môi trường trên Vercel:
              </p>

              <div className="space-y-2">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-200">1. Tên biến môi trường (Variable Name):</span>
                    <button
                      onClick={() => copyToClipboard('GEMINI_API_KEY')}
                      className="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-emerald-400 flex items-center gap-1 text-[11px]"
                    >
                      {copiedVercelVar ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedVercelVar ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>
                  </div>
                  <div className="font-mono text-emerald-300 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800 text-xs">
                    GEMINI_API_KEY
                  </div>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <span className="font-semibold text-slate-200">2. Các bước trên Vercel Dashboard:</span>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-400 pl-1">
                    <li>Mở dự án của bạn trên <strong className="text-white">Vercel.com</strong>.</li>
                    <li>Vào tab <strong className="text-white">Settings</strong> ➔ chọn mục <strong className="text-white">Environment Variables</strong>.</li>
                    <li>Tại mục <strong className="text-white">Key</strong>, dán: <code className="text-emerald-300">GEMINI_API_KEY</code>.</li>
                    <li>Tại mục <strong className="text-white">Value</strong>, dán mã API Key của bạn.</li>
                    <li>Bấm <strong className="text-white">Save</strong>.</li>
                    <li>Qua tab <strong className="text-white">Deployments</strong>, bấm nút 3 chấm <strong className="text-white">...</strong> trên bản deploy gần nhất ➔ chọn <strong className="text-white">Redeploy</strong>.</li>
                  </ol>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between text-xs">
          <span className="text-slate-500">
            Khóa cá nhân được lưu cục bộ trên trình duyệt máy bạn
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg transition"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
