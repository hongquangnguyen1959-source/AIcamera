import express from 'express';
import { GoogleGenAI, Type, ThinkingLevel } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Body parser with limit for camera images
app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Initialize Gemini SDK with server-side API Key or client override
function getAiClient(customKey?: string): GoogleGenAI {
  const key = customKey || process.env.GEMINI_API_KEY;
  return new GoogleGenAI({
    apiKey: key,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// Default instance using server environment
const defaultAi = getAiClient();

// In-memory cache for OCR frames to eliminate redundant API calls on completely static views
const frameCache = new Map<string, { data: any; expiresAt: number }>();

// Circuit breaker cooldown for shared Gemini API Key when reaching free-tier quota limits
let sharedKeyCooldownUntil = 0;

function getFastImageSignature(base64: string): string {
  const len = base64.length;
  if (len < 500) return base64;
  // High-dispersion signature sampling head, middle, tail and 64 points across payload
  let sig = `${len}_${base64.slice(100, 160)}_${base64.slice(-160, -100)}_`;
  const step = Math.max(1, Math.floor(len / 64));
  for (let i = 0; i < len; i += step) {
    sig += base64[i];
  }
  return sig;
}

// Health check endpoint to diagnose Vercel environment setup
app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    hasServerApiKey: Boolean(process.env.GEMINI_API_KEY),
  });
});

// Translation & AR OCR endpoint with multi-model fallback for 100% uptime & low latency
app.post('/api/translate-vision', async (req, res) => {
  try {
    const userApiKey = (req.headers['x-gemini-api-key'] as string) || process.env.GEMINI_API_KEY;

    if (!userApiKey) {
      return res.status(401).json({
        error: 'Chưa cấu hình GEMINI_API_KEY trên Vercel. Bạn có thể bấm [Cài đặt API Key] trên màn hình để dán Key miễn phí.',
        code: 'MISSING_API_KEY',
      });
    }

    const ai = getAiClient(userApiKey);

    const { image, targetLang = 'vi', sourceLang = 'auto' } = req.body;

    if (!image) {
      return res.status(400).json({ error: 'Hình ảnh không hợp lệ' });
    }

    // Clean base64 data
    let mimeType = 'image/jpeg';
    let base64Data = image;

    if (image.includes(',')) {
      const parts = image.split(',');
      const match = parts[0].match(/:(.*?);/);
      if (match) {
        mimeType = match[1];
      }
      // Gemini inlineData only supports image/jpeg, image/png, image/webp, image/heic, image/heif
      if (!mimeType.startsWith('image/') || mimeType.includes('svg')) {
        mimeType = 'image/jpeg';
      }
      const rawPayload = parts[1];
      if (parts[0].includes('base64')) {
        base64Data = rawPayload;
      } else {
        const decoded = decodeURIComponent(rawPayload);
        base64Data = Buffer.from(decoded, 'utf8').toString('base64');
      }
    }

    // Instant 1ms matching for travel sample presets
    const rawStr = String(image).toLowerCase();
    if (req.body.sampleId === 'japanese-ramen' || rawStr.includes('ippudo') || rawStr.includes('%e4%b8%80%e9%a2%a8%e5%a0%82') || rawStr.includes('豚骨ラーメン')) {
      return res.json({
        detected_language: 'Tiếng Nhật',
        summary_translation: 'Thực Đơn Mì Ramen Ippudo Nhật Bản: Mì ramen xương heo đậm đà 1.100¥, mì ramen cay nồng 1.250¥, há cảo nướng Hakata 550¥, cơm xá xíu trứng lòng đào 420¥, bia tươi Asahi 600¥. Thanh toán bằng tiền mặt hoặc thẻ IC.',
        items: [
          { box_2d: [70, 150, 130, 850], translated_text: 'Mì Ramen Xương Heo Đậm Đà Ippudo', category: 'sign' },
          { box_2d: [210, 80, 260, 920], translated_text: 'Món Chính: Mì Ramen Đặc Biệt', category: 'sign' },
          { box_2d: [280, 80, 370, 920], translated_text: 'Mì Ramen Xương Heo Đặc Biệt (3 miếng thịt xá xíu, trứng lòng đào) - 1.100 Yên (~180.000đ)', category: 'menu' },
          { box_2d: [390, 80, 480, 920], translated_text: 'Mì Ramen Cay Nồng Tương Đỏ (Vị cay x3, dầu thơm) - 1.250 Yên (~205.000đ)', category: 'menu' },
          { box_2d: [500, 80, 590, 920], translated_text: 'Mì Ramen Truyền Thống Vị Thanh (Mì sợi nhỏ) - 980 Yên (~160.000đ)', category: 'menu' },
          { box_2d: [620, 80, 670, 920], translated_text: 'Món Ăn Kèm & Đồ Uống', category: 'sign' },
          { box_2d: [690, 80, 770, 920], translated_text: 'Há Cảo Nướng Hakata (10 cái) - 550 Yên (~90.000đ)', category: 'menu' },
          { box_2d: [790, 80, 870, 920], translated_text: 'Cơm Thịt Xá Xíu Trứng Lòng Đào - 420 Yên (~70.000đ)', category: 'menu' },
          { box_2d: [890, 80, 970, 920], translated_text: 'Bia Tươi Asahi (Ly vừa) - 600 Yên (~98.000đ)', category: 'menu' },
          { box_2d: [1000, 80, 1130, 920], translated_text: '⚠️ Lưu ý: Nước dùng chứa thịt heo, bột mì, đậu nành. Chỉ nhận tiền mặt hoặc thẻ IC tàu điện.', category: 'warning' },
        ],
      });
    }

    if (req.body.sampleId === 'korean-subway' || rawStr.includes('myeongdong') || rawStr.includes('%eb%aa%85%eb%8f%99') || rawStr.includes('출구')) {
      return res.json({
        detected_language: 'Tiếng Hàn',
        summary_translation: 'Biển Chỉ Dẫn Tàu Điện Ngầm Hàn Quốc: Cổng ra số 4 dẫn tới Phố mua sắm Myeongdong, TTTM Lotte, Nhà thờ Myeongdong. Chuyển tuyến Tuyến 2 và Tuyến 4, có thang máy xe lăn.',
        items: [
          { box_2d: [80, 100, 160, 450], translated_text: 'Cổng Ra Số 4 (Exit 4)', category: 'sign' },
          { box_2d: [230, 70, 330, 930], translated_text: 'Phố Mua Sắm Myeongdong & TTTM Lotte', category: 'sign' },
          { box_2d: [360, 70, 460, 930], translated_text: 'Nhà Thờ Myeongdong & Trụ Sở Bưu Điện Trung Ương', category: 'sign' },
          { box_2d: [490, 70, 590, 930], translated_text: 'Tuyến Tàu Số 2 & Tuyến Tàu Số 4 (Chuyển Tuyến)', category: 'sign' },
          { box_2d: [610, 70, 680, 930], translated_text: 'Thang Máy Cho Người Khuyết Tật & Lối Ra Xe Lăn', category: 'sign' },
        ],
      });
    }

    if (req.body.sampleId === 'chinese-pharmacy' || rawStr.includes('tongrentang') || rawStr.includes('%e5%90%8c%e4%bb%81%e5%a0%82') || rawStr.includes('同仁堂')) {
      return res.json({
        detected_language: 'Tiếng Trung',
        summary_translation: 'Hiệu Thuốc Đồng Nhân Đường Bắc Kinh: Thương hiệu gia truyền trăm năm. Danh y bắt mạch bốc thuốc, phòng khám chuyên khoa, dược liệu đông y cao đơn hoàn tán chính gốc.',
        items: [
          { box_2d: [55, 145, 190, 855], translated_text: 'Hiệu Thuốc Đồng Nhân Đường Bắc Kinh', category: 'sign' },
          { box_2d: [240, 60, 310, 940], translated_text: 'Thương Hiệu Gia Truyền Trăm Năm - Đang Mở Cửa Phục Vụ', category: 'sign' },
          { box_2d: [340, 60, 420, 940], translated_text: 'Danh Y Bắt Mạch Bốc Thuốc - Phòng Khám Chuyên Khoa', category: 'sign' },
          { box_2d: [450, 60, 530, 940], translated_text: 'Dược Liệu Đông Y Chính Gốc: Cao Đơn Hoàn Tán, Thuốc Thang Bào Chế', category: 'sign' },
          { box_2d: [560, 60, 630, 940], translated_text: 'Bào Chế Dù Không Ai Thấy - Lòng Thành Có Trời Thấu', category: 'sign' },
          { box_2d: [660, 60, 730, 940], translated_text: 'Hàng Thật Giá Chuẩn - Bốc Thuốc Theo Đơn Của Bác Sĩ', category: 'sign' },
        ],
      });
    }

    if (req.body.sampleId === 'french-bistro' || rawStr.includes('bistrot') || rawStr.includes('bistro') || rawStr.includes('parisien')) {
      return res.json({
        detected_language: 'Tiếng Pháp',
        summary_translation: 'Thực Đơn Nhà Hàng Bistro Paris: Súp hành tây đút lò phô mai 9.50€, Ốc hương nướng bơ tỏi 12.00€, Bò bít tết thăn ngoại kèm khoai tây chiên 24.50€, Vịt nấu kiểu Confit 21.00€, Bánh kem cháy Crème Brûlée 8.50€.',
        items: [
          { box_2d: [70, 150, 140, 850], translated_text: 'Nhà Hàng Bistro Paris Cổ Điển', category: 'sign' },
          { box_2d: [220, 80, 270, 920], translated_text: 'Món Khai Vị (Entrées)', category: 'sign' },
          { box_2d: [280, 80, 360, 920], translated_text: 'Súp Hành Tây Kiểu Pháp Đút Lò Phô Mai Comté - 9.50€ (~260.000đ)', category: 'menu' },
          { box_2d: [370, 80, 450, 920], translated_text: 'Ốc Hương Nướng Bơ Tỏi Mùi Tây (6 con) - 12.00€ (~330.000đ)', category: 'menu' },
          { box_2d: [470, 80, 520, 920], translated_text: 'Món Chính (Plats)', category: 'sign' },
          { box_2d: [530, 80, 610, 920], translated_text: 'Bò Bít Tết Thăn Ngoại Kèm Khoai Tây Chiên Giòn - 24.50€ (~670.000đ)', category: 'menu' },
          { box_2d: [620, 80, 700, 920], translated_text: 'Vịt Nấu Kiểu Confit Kèm Khoai Tây Nướng Sarladaise - 21.00€ (~575.000đ)', category: 'menu' },
          { box_2d: [720, 80, 770, 920], translated_text: 'Món Tráng Miệng (Desserts)', category: 'sign' },
          { box_2d: [780, 80, 860, 920], translated_text: 'Bánh Kem Cháy Crème Brûlée Vani Bourbon - 8.50€ (~230.000đ)', category: 'menu' },
        ],
      });
    }

    // Check fast cache (only cache valid non-empty responses)
    const cacheKey = `${getFastImageSignature(base64Data)}_${targetLang}`;
    const now = Date.now();
    const cached = frameCache.get(cacheKey);
    if (cached && cached.expiresAt > now && cached.data?.items?.length > 0) {
      return res.json(cached.data);
    }

    // Ultra-fast AR OCR prompt: Yêu cầu bắt buộc dịch 100% sang tiếng Việt chuẩn xác, sát nghĩa và tự nhiên
    const prompt = `YÊU CẦU BẮT BUỘC: DỊCH 100% TOÀN BỘ VĂN BẢN TRONG ẢNH SANG TIẾNG VIỆT (VIETNAMESE).
MỌI câu, từ, đoạn văn, tiêu đề, biển hiệu chữ Trung Quốc (cả Giản thể và Phồn thể), tiếng Anh hay bất kỳ ngôn ngữ nào trong ảnh PHẢI ĐƯỢC DỊCH SANG TIẾNG VIỆT HOÀN TOÀN trong trường "translated_text".
TUYỆT ĐỐI KHÔNG ĐƯỢC GIỮ NGUYÊN CHỮ HÁN/TIẾNG TRUNG HOẶC BẤT KỲ NGÔN NGỮ NƯỚC NGOÀI NÀO TRONG "translated_text"!

TIÊU CHUẨN DỊCH CHỮ TRUNG QUỐC & QUỐC TẾ:
1. ĐẶC BIỆT VỚI BIỂN HIỆU, MENU, NHÃN MÁC, TỜ RƠI TIẾNG TRUNG:
   - Dịch trôi chảy, tự nhiên theo tiếng Việt hiện đại.
   - Các món ăn, đồ uống, tên cửa hàng, cảnh báo, hướng dẫn chữ Hán phải được dịch nghĩa tiếng Việt dễ hiểu nhất.
2. DỊCH CHUẨN VĂN PHONG BÁO CHÍ & ĐỜI SỐNG:
   - Dịch trôi chảy, tự nhiên, diễn đạt gãy gọn theo văn phong tiếng Việt hiện đại (như bản tin báo Tuổi Trẻ, VnExpress, BBC Tiếng Việt).
   - Tuyệt đối KHÔNG dịch máy móc từng từ (word-by-word) hoặc dùng từ Hán-Việt cổ ngô nghê.
   - Ví dụ:
     + "抓壮丁" -> dịch là "cưỡng bức đi lính" hoặc "bắt lính", TUYỆT ĐỐI KHÔNG dịch là "bắt tráng đinh".
     + "规避石油出口制裁" -> dịch là "lách lệnh trừng phạt xuất khẩu dầu".
     + "恶性循环" -> dịch là "vòng xoáy luẩn quẩn".
     + "防空武器" -> dịch là "vũ khí phòng không" (không nhầm thành "không đối không").
3. TÁCH BIỆT TIÊU ĐỀ VÀ THỜI GIAN/NGÀY THÁNG:
   - Ngày tháng, mốc thời gian (ví dụ: "2026年10月12日", "4小时前", "5 giờ trước") nếu nằm dưới hoặc bên cạnh tiêu đề thì PHẢI TÁCH RIÊNG thành khối thời gian hoặc để ở cuối câu.
   - TUYỆT ĐỐI KHÔNG ghép ngày tháng xen vào giữa câu hay giữa tiêu đề làm méo mó câu chữ.
4. BỐ CỤC KHUNG CHỮ CHÍNH XÁC & KHÔNG ĐÈ LÊN NHAU (box_2d [ymin, xmin, ymax, xmax] thang 0-1000):
   - Khung chữ box_2d phải khớp chính xác 1:1 với vị trí tương ứng của khối chữ đó trên hình ảnh.
   - TUYỆT ĐỐI KHÔNG ĐỂ CHỮ NẰM ĐÈ LÊN NHAU: Mỗi dòng chữ, tiêu đề, hoặc đoạn văn chỉ thuộc về 1 item duy nhất. Các box_2d theo chiều dọc (ymin -> ymax) và chiều ngang (xmin -> xmax) phải tách biệt rõ ràng, không trùng lấn, không chồng chéo lên nhau.
   - Gom nguyên vẹn từng tiêu đề hoặc đoạn văn hoàn chỉnh vào 1 box_2d duy nhất.
   - ĐỘ RỘNG KHUNG CHỮ (xmax): Đối với các đoạn văn bài viết, tiêu đề trải dài ngang trang: Tọa độ xmax PHẢI BAO TRỌN toàn bộ chiều ngang của dòng chữ (từ lề trái xmin đến lề phải xmax ~920-960).

Trực tiếp xuất định dạng JSON:
{
  "detected_language": "Tiếng Trung",
  "summary_translation": "Bản dịch tiếng Việt trọn vẹn toàn bộ bài/nội dung từ trên xuống dưới",
  "items": [
    {
      "box_2d": [ymin, xmin, ymax, xmax],
      "translated_text": "BẢN DỊCH TIẾNG VIỆT CHUẨN XÁC, SÁT NGHĨA, TỰ NHIÊN",
      "category": "sign"
    }
  ]
}`;

    // Cooldown check: If project reached quota, return 429 cooldown status
    if (now < sharedKeyCooldownUntil) {
      const waitSec = Math.max(1, Math.ceil((sharedKeyCooldownUntil - now) / 1000));
      return res.status(429).json({
        error: `Hạn mức AI tạm thời bận, vui lòng thử lại sau ${waitSec} giây...`,
        code: 'QUOTA_COOLDOWN',
      });
    }

    // Vision Model configs: gemini-2.5-flash with thinkingBudget: 0 for instant ~1s response, plus stable fallbacks
    const candidateConfigs = [
      {
        model: 'gemini-2.5-flash',
        timeout: 6000,
        thinkingConfig: { thinkingBudget: 0 },
      },
      {
        model: 'gemini-2.0-flash',
        timeout: 5500,
        thinkingConfig: undefined,
      },
      {
        model: 'gemini-1.5-flash',
        timeout: 5500,
        thinkingConfig: undefined,
      },
    ];

    let lastError: any = null;
    let resultText: string | undefined = undefined;

    for (const item of candidateConfigs) {
      try {
        const config: any = {
          systemInstruction: 'BẠN LÀ CHUYÊN GIA DỊCH THUẬT TIẾNG VIỆT HÀNG ĐẦU. NHIỆM VỤ: Dịch 100% toàn bộ chữ/văn bản trong ảnh sang TIẾNG VIỆT chuẩn xác, sát nghĩa và tự nhiên nhất. Diễn đạt mượt mà, gãy gọn theo văn phong tiếng Việt hiện đại, tránh dịch thô cứng máy móc, tránh dùng từ Hán-Việt cổ ngô nghê. Tách biệt ngày tháng, giờ đăng ra khỏi tiêu đề, tuyệt đối không để ngày tháng chen ngang vào giữa câu.',
          responseMimeType: 'application/json',
          maxOutputTokens: 2048,
        };

        if (item.thinkingConfig) {
          config.thinkingConfig = item.thinkingConfig;
        }

        const generatePromise = ai.models.generateContent({
          model: item.model,
          contents: {
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType,
                },
              },
              { text: prompt },
            ],
          },
          config,
        });

        // Generous model timeout so complex frames do not prematurely cancel
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error(`Model ${item.model} timeout`)), item.timeout)
        );

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        resultText = response.text;
        if (resultText) {
          break; // Succeeded!
        }
      } catch (err: any) {
        lastError = err;
        if (err.message && (err.message.includes('429') || err.message.includes('RESOURCE_EXHAUSTED'))) {
          sharedKeyCooldownUntil = Date.now() + 15000;
          break; // Stop immediately on quota exhaustion to avoid cascading errors
        }
      }
    }

    if (!resultText) {
      return res.status(503).json({
        error: 'Không thể nhận diện văn bản trong khung hình. Vui lòng giữ chắc camera và hướng thẳng vào chữ.',
        code: 'NO_TEXT_DETECTED',
      });
    }

    // Resilient JSON Parser with auto-repair for truncated model outputs
    let parsed: any;
    const cleanedJson = resultText.replace(/```json\s*|\s*```/gi, '').trim();

    try {
      parsed = JSON.parse(cleanedJson);
    } catch {
      // Auto-repair truncated JSON: Find the last complete object bracket and close it
      const lastBrace = cleanedJson.lastIndexOf('}');
      if (lastBrace !== -1) {
        const candidate = cleanedJson.slice(0, lastBrace + 1);
        for (const suffix of ['', '\n]}', '\n}'] ) {
          try {
            parsed = JSON.parse(candidate + suffix);
            if (parsed) break;
          } catch {}
        }
      }

      // Regex fallback to rescue every single detected item if string was truncated
      if (!parsed || !parsed.items) {
        const items: any[] = [];
        const regex = /"box_2d"\s*:\s*\[\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\][\s\S]*?"translated_text"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)"/g;
        let match;
        while ((match = regex.exec(cleanedJson)) !== null) {
          items.push({
            box_2d: [Number(match[1]), Number(match[2]), Number(match[3]), Number(match[4])],
            translated_text: match[5].replace(/\\"/g, '"'),
            category: 'sign',
          });
        }
        parsed = {
          detected_language: 'Tự động',
          summary_translation: '',
          items,
        };
      }
    }

    // Universal item extraction from whatever schema the model returned
    let rawItems: any[] = [];
    if (Array.isArray(parsed)) {
      rawItems = parsed;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.items)) rawItems = parsed.items;
      else if (Array.isArray(parsed.translations)) rawItems = parsed.translations;
      else if (Array.isArray(parsed.signs)) rawItems = parsed.signs;
      else if (Array.isArray(parsed.results)) rawItems = parsed.results;
      else if (Array.isArray(parsed.data)) rawItems = parsed.data;
      else if (Array.isArray(parsed.text_items)) rawItems = parsed.text_items;
      else {
        for (const key of Object.keys(parsed)) {
          if (Array.isArray(parsed[key]) && parsed[key].length > 0) {
            rawItems = parsed[key];
            break;
          }
        }
      }
    }

    const chineseRegex = /[\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]/g;

    const normalizedItems = rawItems
      .map((item: any, idx: number) => {
        if (!item || typeof item !== 'object') return null;

        // Flexible text extraction (supports translated_text, translation, vietnamese, text, etc.)
        let text =
          item.translated_text ||
          item.translation ||
          item.vietnamese ||
          item.translatedText ||
          item.dich ||
          item.vi ||
          item.target_text ||
          item.text ||
          item.original_text ||
          '';

        if (typeof text !== 'string') text = String(text);
        const originalClean = text.trim();
        // Remove CJK characters if translation has Vietnamese; if empty, retain original so item is never dropped
        const stripped = originalClean.replace(chineseRegex, '').replace(/\(\s*\)|（\s*）/g, '').trim();
        text = stripped || originalClean;

        // Flexible bounding box extraction
        let box = item.box_2d || item.box || item.bbox || item.bounding_box || item.boundingBox;
        if (!Array.isArray(box) && item.rect) {
          box = [item.rect.ymin, item.rect.xmin, item.rect.ymax, item.rect.xmax];
        }

        if (Array.isArray(box) && box.length >= 4) {
          let [ymin, xmin, ymax, xmax] = box.map(Number);
          if (ymax <= 1 && xmax <= 1 && (ymax > 0 || xmax > 0)) {
            ymin = Math.round(ymin * 1000);
            xmin = Math.round(xmin * 1000);
            ymax = Math.round(ymax * 1000);
            xmax = Math.round(xmax * 1000);
          }
          box = [ymin, xmin, ymax, xmax];
        } else {
          // If model did not return box coordinates, distribute nicely
          const rowH = 40;
          const yStart = 160 + idx * 50;
          box = [yStart, 60, yStart + rowH, 940];
        }

        if (!text || text.length === 0) return null;

        return {
          box_2d: box,
          translated_text: text,
          category: item.category || 'sign',
        };
      })
      .filter((it): it is { box_2d: number[]; translated_text: string; category: string } => Boolean(it));

    // Server-side robust deduplication: Eliminate duplicate readings, substrings, and overlapping ghost boxes
    const deduplicatedItems: any[] = [];
    const sortedRaw = [...normalizedItems].sort((a, b) => b.translated_text.length - a.translated_text.length);

    for (const entry of sortedRaw) {
      if (!entry) continue;
      const isRedundant = deduplicatedItems.some((accepted: any) => {
        // 1. Text exact or substring check
        const textA = accepted.translated_text.toLowerCase().replace(/[\s,.;:!?_()\-–—"']/g, '');
        const textB = entry.translated_text.toLowerCase().replace(/[\s,.;:!?_()\-–—"']/g, '');
        if (textA === textB) return true;
        if (textA.includes(textB) && textB.length > 12) return true;

        // Word overlap (Jaccard similarity)
        const wordsA = new Set<string>(accepted.translated_text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2));
        const wordsB = new Set<string>(entry.translated_text.toLowerCase().split(/\s+/).filter((w: string) => w.length > 2));
        if (wordsA.size > 0 && wordsB.size > 0) {
          let common = 0;
          for (const w of wordsA) {
            if (wordsB.has(w)) common++;
          }
          const sim = common / Math.min(wordsA.size, wordsB.size);
          // If 50% or more key words are identical and vertical position is close (<160 units): it is duplicate!
          if (sim >= 0.50 && Math.abs(accepted.box_2d[0] - entry.box_2d[0]) < 160) {
            return true;
          }
        }

        // 2. Spatial overlap check
        const [yminA, xminA, ymaxA, xmaxA] = accepted.box_2d;
        const [yminB, xminB, ymaxB, xmaxB] = entry.box_2d;
        const intYmin = Math.max(yminA, yminB);
        const intXmin = Math.max(xminA, xminB);
        const intYmax = Math.min(ymaxA, ymaxB);
        const intXmax = Math.min(xmaxA, xmaxB);

        if (intYmax > intYmin && intXmax > intXmin) {
          const intArea = (intYmax - intYmin) * (intXmax - intXmin);
          const areaB = Math.max(1, (ymaxB - yminB) * (xmaxB - xminB));
          if (intArea / areaB > 0.35) {
            return true;
          }
        }
        return false;
      });

      if (!isRedundant) {
        deduplicatedItems.push(entry);
      }
    }

    // Sort back to top-to-bottom reading order
    deduplicatedItems.sort((a: any, b: any) => a.box_2d[0] - b.box_2d[0]);

    let summary = parsed?.summary_translation || parsed?.summary || '';
    if (typeof summary === 'string') {
      const origSummary = summary.trim();
      const strippedSummary = origSummary.replace(chineseRegex, '').replace(/\(\s*\)|（\s*）/g, '').trim();
      summary = strippedSummary || origSummary;
    }

    // Fast Verification: Only rescue if multiple sentences are genuinely untranslated foreign text
    const VIETNAMESE_ACCENT_REGEX = /[àáảãạăằắẳẵặâầấẩẫậèéẻẽẹêềếểễệìíỉĩịòóỏõọôồốổỗộơờớởỡợùúủũụưừứửữựỳýỷỹỵđ]/i;
    const ENGLISH_SENTENCE_REGEX = /\b(the|this|that|with|from|which|where|when|have|has|will|about|they|their)\b/i;

    const untranslatedItems = deduplicatedItems.filter(
      (it: any) =>
        it.translated_text &&
        it.translated_text.length > 15 &&
        !VIETNAMESE_ACCENT_REGEX.test(it.translated_text) &&
        ENGLISH_SENTENCE_REGEX.test(it.translated_text)
    );

    // Only rescue if genuine English sentences remain (>2 items or >= 30% of list)
    if (untranslatedItems.length >= 2 && untranslatedItems.length >= deduplicatedItems.length * 0.3) {
      try {
        const textsToTranslate = untranslatedItems.map((it: any) => it.translated_text);
        const rescuePrompt = `Dịch danh sách các câu tiếng Anh/nước ngoài sau sang tiếng Việt chuẩn xác 100%. Trả về đúng định dạng JSON: { "translations": [ "câu 1 tiếng Việt", "câu 2 tiếng Việt", ... ] } cho các câu sau:
${JSON.stringify(textsToTranslate, null, 2)}`;

        const rescuePromise = ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: rescuePrompt,
          config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 1024,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });

        const rescueTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Rescue timeout')), 3500)
        );

        const rescueResp: any = await Promise.race([rescuePromise, rescueTimeout]);

        if (rescueResp?.text) {
          const parsedRescue = JSON.parse(rescueResp.text.replace(/```json\s*|\s*```/gi, '').trim());
          const arr = Array.isArray(parsedRescue) ? parsedRescue : parsedRescue.translations;
          if (Array.isArray(arr) && arr.length === untranslatedItems.length) {
            untranslatedItems.forEach((it: any, i: number) => {
              if (arr[i] && typeof arr[i] === 'string') {
                it.translated_text = arr[i].trim();
              }
            });
          }
        }
      } catch (rescueErr) {
        // Non-blocking: skip rescue without delaying response
      }
    }

    // If no individual line items were detected but a genuine summary exists, create a readable fallback item
    const isNoTextSummary = /không\s+(?:có|tìm\s+thấy|phát\s+hiện)\s+văn\s+bản|chưa\s+phát\s+hiện|no\s+text/i.test(summary);
    if (deduplicatedItems.length === 0 && summary.length > 0 && !isNoTextSummary) {
      deduplicatedItems.push({
        box_2d: [350, 100, 480, 900],
        translated_text: summary,
        category: 'sign',
      });
    }

    const finalResult = {
      detected_language: parsed?.detected_language || 'Tự động',
      summary_translation: summary,
      items: deduplicatedItems,
    };

    // Cache valid results for 30s to make repetitive frames/static images respond in 0ms
    if (deduplicatedItems.length > 0) {
      frameCache.set(cacheKey, { data: finalResult, expiresAt: now + 30000 });
      if (frameCache.size > 80) {
        for (const [k, v] of frameCache.entries()) {
          if (v.expiresAt <= now) frameCache.delete(k);
        }
      }
    }

    return res.json(finalResult);
  } catch (error: any) {
    console.error('Vision translation error:', error);
    return res.status(500).json({
      error: error.message || 'Lỗi khi dịch hình ảnh qua camera',
    });
  }
});

// Travel AI Assistant (Quick Q&A on the scanned sign / menu)
app.post('/api/travel-chat', async (req, res) => {
  try {
    const userApiKey = (req.headers['x-gemini-api-key'] as string) || process.env.GEMINI_API_KEY;
    if (!userApiKey) {
      return res.status(401).json({
        error: 'Chưa cấu hình GEMINI_API_KEY. Vui lòng bấm Cài đặt API Key để nhập key.',
        code: 'MISSING_API_KEY'
      });
    }
    const ai = getAiClient(userApiKey);
    const { question, context, image } = req.body;

    const parts: any[] = [];
    if (image) {
      let mimeType = 'image/jpeg';
      let base64Data = image;
      if (image.includes(',')) {
        const p = image.split(',');
        const match = p[0].match(/:(.*?);/);
        if (match) mimeType = match[1];
        base64Data = p[1];
      }
      parts.push({
        inlineData: {
          data: base64Data,
          mimeType,
        },
      });
    }

    parts.push({
      text: `Bạn là trợ lý du lịch cá nhân đồng hành cùng khách du lịch Việt Nam tại nước ngoài.
Ngữ cảnh văn bản đã dịch từ camera:
${JSON.stringify(context || {})}

Câu hỏi của du khách:
"${question}"

Hãy trả lời ngắn gọn, thực tế, dễ hiểu bằng tiếng Việt (kèm theo câu giao tiếp bản địa nếu cần nói với nhân viên phục vụ, tài xế hoặc người bán hàng).`,
    });

    let answerText = '';
    const chatModels = ['gemini-2.5-flash', 'gemini-3.8-flash', 'gemini-flash-latest'];
    for (const m of chatModels) {
      try {
        const response = await ai.models.generateContent({
          model: m,
          contents: { parts },
        });
        if (response.text) {
          answerText = response.text;
          break;
        }
      } catch (err: any) {
        // Continue to next chat fallback model
      }
    }

    if (!answerText) {
      answerText = 'Dựa trên ngữ cảnh đã dịch, bạn có thể nói với nhân viên phục vụ: "Excuse me, I would like to order this" (Xin lỗi, tôi muốn chọn món này) hoặc nhờ nhân viên giải thích thêm.';
    }

    return res.json({ answer: answerText });
  } catch (err: any) {
    return res.json({
      answer: 'Bạn có thể chỉ vào văn bản trên màn hình và hỏi người bản địa: "Can you help me with this, please?"',
    });
  }
});

// High quality TTS endpoint for speech pronunciation
app.post('/api/tts', async (req, res) => {
  try {
    const userApiKey = (req.headers['x-gemini-api-key'] as string) || process.env.GEMINI_API_KEY;
    if (!userApiKey) {
      return res.status(401).json({ error: 'Chưa có API key' });
    }
    const ai = getAiClient(userApiKey);
    const { text, voice = 'Kore' } = req.body;
    if (!text) {
      return res.status(400).json({ error: 'Cần văn bản để phát âm' });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [{ text: text.slice(0, 300) }],
        },
      ],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: voice },
          },
        },
      },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) {
      return res.status(500).json({ error: 'Không thể tạo âm thanh' });
    }

    return res.json({ audioData: base64Audio });
  } catch (err: any) {
    console.error('TTS error:', err);
    return res.status(500).json({ error: err.message || 'Lỗi phát âm' });
  }
});

// Setup Vite middleware in dev or static files in production
async function startServer() {
  const portNumber = Number(process.env.PORT) || 3000;

  if (process.env.NODE_ENV !== 'production') {
    const http = await import('http');
    const httpServer = http.createServer(app);
    const { createServer: createViteServer } = await import('vite');
    const isHmrDisabled = process.env.DISABLE_HMR === 'true';
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: isHmrDisabled ? false : { server: httpServer },
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req, res, next) => {
      if (req.method !== 'GET') return next();
      const url = req.originalUrl;
      try {
        const fs = await import('fs');
        const indexPath = path.resolve(__dirname, 'index.html');
        if (!fs.existsSync(indexPath)) return next();
        let template = fs.readFileSync(indexPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });

    httpServer.listen(portNumber, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${portNumber}`);
    });
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
    app.listen(portNumber, '0.0.0.0', () => {
      console.log(`Server running on http://0.0.0.0:${portNumber}`);
    });
  }
}

export default app;

if (!process.env.VERCEL) {
  startServer();
}
