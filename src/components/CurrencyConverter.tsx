import React, { useState } from 'react';
import { POPULAR_CURRENCIES, convertToVND, formatVND } from '../utils/currency';
import { ArrowRightLeft, X } from 'lucide-react';

interface CurrencyConverterProps {
  isOpen?: boolean;
  onClose: () => void;
  defaultCurrency?: string;
  initialCurrency?: string;
  initialAmount?: number;
}

export const CurrencyConverter: React.FC<CurrencyConverterProps> = ({
  isOpen = true,
  onClose,
  defaultCurrency,
  initialCurrency = 'JPY',
  initialAmount = 1000,
}) => {
  const [selectedCurrency, setSelectedCurrency] = useState(defaultCurrency || initialCurrency);
  const [amount, setAmount] = useState<number>(initialAmount);

  if (!isOpen) return null;

  const currentRate = POPULAR_CURRENCIES.find((c) => c.code === selectedCurrency) || POPULAR_CURRENCIES[0];
  const convertedVND = convertToVND(amount || 0, selectedCurrency);

  // Quick preset buttons based on currency
  const getPresets = () => {
    switch (selectedCurrency) {
      case 'JPY':
        return [500, 1000, 2000, 5000, 10000];
      case 'KRW':
        return [5000, 10000, 20000, 50000, 100000];
      case 'THB':
        return [50, 100, 200, 500, 1000];
      case 'USD':
      case 'EUR':
        return [5, 10, 20, 50, 100];
      default:
        return [10, 50, 100, 500, 1000];
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-base text-white">Quy Đổi Tiền Tệ Du Lịch</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Currency Selector */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Chọn Ngoại Tệ
          </label>
          <div className="grid grid-cols-3 gap-1.5">
            {POPULAR_CURRENCIES.slice(0, 6).map((c) => (
              <button
                key={c.code}
                onClick={() => setSelectedCurrency(c.code)}
                className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-xl text-xs font-medium border transition-all ${
                  selectedCurrency === c.code
                    ? 'bg-emerald-600 border-emerald-500 text-white font-bold shadow-md'
                    : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <span>{c.flag}</span>
                <span>{c.code}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Input foreign amount */}
        <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-3.5 space-y-1">
          <div className="flex justify-between text-xs text-slate-400">
            <span>{currentRate.name}</span>
            <span>Tỷ giá: 1 {currentRate.code} ≈ {currentRate.toVND} VNĐ</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xl font-bold text-emerald-400 w-8">{currentRate.symbol}</span>
            <input
              type="number"
              min="0"
              value={amount || ''}
              onChange={(e) => setAmount(Number(e.target.value) || 0)}
              placeholder="0"
              className="w-full bg-transparent text-2xl font-bold text-white focus:outline-hidden font-mono"
            />
          </div>
        </div>

        {/* Presets */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          {getPresets().map((preset) => (
            <button
              key={preset}
              onClick={() => setAmount(preset)}
              className="py-1 px-2.5 rounded-lg text-xs bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-700 shrink-0 font-mono"
            >
              +{preset.toLocaleString()} {currentRate.symbol}
            </button>
          ))}
        </div>

        {/* Converted VND Output */}
        <div className="bg-emerald-950/60 border border-emerald-800/80 rounded-xl p-4 text-center space-y-1">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Ước tính quy đổi sang Tiền Việt
          </span>
          <p className="text-3xl font-extrabold text-white tracking-tight">
            {formatVND(convertedVND)}
          </p>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold rounded-xl text-sm transition-colors"
        >
          Đã hiểu &amp; Quay lại
        </button>
      </div>
    </div>
  );
};
