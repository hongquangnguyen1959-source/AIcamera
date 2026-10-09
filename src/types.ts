export interface DetectedItem {
  box_2d: [number, number, number, number]; // [ymin, xmin, ymax, xmax] in 0..1000
  original_text?: string;
  translated_text: string;
  pronunciation?: string;
  category?: 'menu' | 'sign' | 'price' | 'warning' | 'instruction' | 'transport' | 'other' | string;
  cultural_tip?: string;
}

export interface DetectedPrice {
  original_price: string;
  currency: string;
  estimated_vnd: string;
}

export interface VisionTranslationResult {
  detected_language: string;
  language_code?: string;
  summary_translation: string;
  travel_advice?: string;
  items: DetectedItem[];
  detected_prices?: DetectedPrice[];
}

export interface ScanHistoryRecord {
  id: string;
  timestamp: number;
  imageUrl: string;
  result: VisionTranslationResult;
  sourceLang: string;
  targetLang: string;
  favorite?: boolean;
}

export interface TravelSample {
  id: string;
  title: string;
  country: string;
  flag: string;
  description: string;
  image: string; // SVG Data URI or image url
  defaultResult?: VisionTranslationResult;
}
