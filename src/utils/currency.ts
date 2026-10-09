export interface CurrencyRate {
  code: string;
  name: string;
  symbol: string;
  toVND: number; // 1 unit in VND
  flag: string;
}

export const POPULAR_CURRENCIES: CurrencyRate[] = [
  { code: 'JPY', name: 'Yên Nhật (Nhật Bản)', symbol: '¥', toVND: 165, flag: '🇯🇵' },
  { code: 'KRW', name: 'Won Hàn (Hàn Quốc)', symbol: '₩', toVND: 18.5, flag: '🇰🇷' },
  { code: 'THB', name: 'Baht Thái (Thái Lan)', symbol: '฿', toVND: 720, flag: '🇹🇭' },
  { code: 'CNY', name: 'Nhân dân tệ (Trung Quốc)', symbol: '¥', toVND: 3500, flag: '🇨🇳' },
  { code: 'TWD', name: 'Đài tệ (Đài Loan)', symbol: 'NT$', toVND: 790, flag: '🇹🇼' },
  { code: 'USD', name: 'Đô la Mỹ (Hoa Kỳ)', symbol: '$', toVND: 25400, flag: '🇺🇸' },
  { code: 'EUR', name: 'Euro (Châu Âu)', symbol: '€', toVND: 27500, flag: '🇪🇺' },
  { code: 'SGD', name: 'Đô la Singapore', symbol: 'S$', toVND: 19100, flag: '🇸🇬' },
  { code: 'MYR', name: 'Ringgit (Malaysia)', symbol: 'RM', toVND: 5750, flag: '🇲🇾' },
  { code: 'GBP', name: 'Bảng Anh (Vương quốc Anh)', symbol: '£', toVND: 32800, flag: '🇬🇧' },
  { code: 'AUD', name: 'Đô la Úc (Australia)', symbol: 'A$', toVND: 16400, flag: '🇦🇺' },
];

export function convertToVND(amount: number, currencyCode: string): number {
  const curr = POPULAR_CURRENCIES.find((c) => c.code === currencyCode);
  if (!curr) return 0;
  return Math.round(amount * curr.toVND);
}

export function formatVND(amount: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(amount);
}
