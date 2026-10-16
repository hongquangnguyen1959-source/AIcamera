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

    // Check fast cache (only cache valid non-empty responses)
    const cacheKey = `${getFastImageSignature(base64Data)}_${targetLang}`;
    const now = Date.now();
    const cached = frameCache.get(cacheKey);
    if (cached && cached.expiresAt > now && cached.data?.items?.length > 0) {
      return res.json(cached.data);
    }

    // Ultra-fast AR OCR prompt: Yêu cầu bắt buộc dịch 100% sang tiếng Việt chuẩn xác, sát nghĩa và tự nhiên
    const prompt = `YÊU CẦU BẮT BUỘC: DỊCH 100% TOÀN BỘ VĂN BẢN TRONG ẢNH SANG TIẾNG VIỆT (VIETNAMESE).
MỌI câu, đoạn văn, tiêu đề trong ảnh PHẢI ĐƯỢC DỊCH SANG TIẾNG VIỆT HOÀN TOÀN trong trường "translated_text".
TUYỆT ĐỐI KHÔNG ĐƯỢC GIỮ NGUYÊN TIẾNG TRUNG, TIẾNG ANH HOẶC BẤT KỲ NGÔN NGỮ NƯỚC NGOÀI NÀO!

TIÊU CHUẨN DỊCH SÁT NGHĨA & TỰ NHIÊN:
1. DỊCH CHUẨN VĂN PHONG BÁO CHÍ & ĐỜI SỐNG:
   - Dịch trôi chảy, tự nhiên, diễn đạt gãy gọn theo văn phong tiếng Việt hiện đại (như bản tin báo Tuổi Trẻ, VnExpress, BBC Tiếng Việt).
   - Tuyệt đối KHÔNG dịch máy móc từng từ (word-by-word) hoặc dùng từ Hán-Việt cổ ngô nghê.
   - Ví dụ:
     + "抓壮丁" -> dịch là "cưỡng bức đi lính" hoặc "bắt lính", TUYỆT ĐỐI KHÔNG dịch là "bắt tráng đinh".
     + "规避石油出口制裁" -> dịch là "lách lệnh trừng phạt xuất khẩu dầu".
     + "恶性循环" -> dịch là "vòng xoáy luẩn quẩn".
     + "防空武器" -> dịch là "vũ khí phòng không" (không nhầm thành "không đối không").
2. TÁCH BIỆT TIÊU ĐỀ VÀ THỜI GIAN/NGÀY THÁNG:
   - Ngày tháng, mốc thời gian (ví dụ: "2026年10月12日", "4小时前", "5 giờ trước") nếu nằm dưới hoặc bên cạnh tiêu đề thì PHẢI TÁCH RIÊNG thành khối thời gian hoặc để ở cuối câu.
   - TUYỆT ĐỐI KHÔNG ghép ngày tháng xen vào giữa câu hay giữa tiêu đề làm méo mó câu chữ (ví dụ lỗi: "lách lệnh 2026 năm 1012 khẩu dầu" là lỗi nghiêm trọng do chèn ngày tháng vào giữa, câu đúng phải là "lách lệnh trừng phạt xuất khẩu dầu").
3. BỐ CỤC KHUNG CHỮ CHÍNH XÁC & KHÔNG ĐÈ LÊN NHAU (box_2d [ymin, xmin, ymax, xmax] thang 0-1000):
   - Khung chữ box_2d phải khớp chính xác 1:1 với vị trí tương ứng của khối chữ đó trên hình ảnh.
   - TUYỆT ĐỐI KHÔNG ĐỂ CHỮ NẰM ĐÈ LÊN NHAU: Mỗi dòng chữ, tiêu đề, hoặc đoạn văn chỉ thuộc về 1 item duy nhất. Các box_2d theo chiều dọc (ymin -> ymax) và chiều ngang (xmin -> xmax) phải tách biệt rõ ràng, không trùng lấn, không chồng chéo lên nhau.
   - Gom nguyên vẹn từng tiêu đề hoặc đoạn văn hoàn chỉnh vào 1 box_2d duy nhất.
   - ĐỘ RỘNG KHUNG CHỮ (xmax): Đối với các đoạn văn bài viết, tiêu đề trải dài ngang trang (như trang báo, tài liệu): Tọa độ xmax PHẢI BAO TRỌN toàn bộ chiều ngang của dòng chữ (từ lề trái xmin đến lề phải xmax ~920-960). Tuyệt đối không thu hẹp xmax khiến văn bản bị co cụm về một góc trái mà phải trải đều theo dòng chữ gốc. Đối với bảng, cột chữ hoặc biển hiệu có nhiều cột thì giữ đúng tọa độ từng cột.

Trả về định dạng JSON chuẩn:
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

    // Primary Vision Model: gemini-3.8-flash for camera translation with thinkingBudget: 0 for instant response
    const candidateConfigs = [
      {
        model: 'gemini-3.8-flash',
        timeout: 5500,
        thinkingBudget: 0,
      },
      {
        model: 'gemini-2.5-flash',
        timeout: 4500,
        thinkingBudget: 0,
      },
      {
        model: 'gemini-3.1-flash-lite',
        timeout: 5000,
        thinkingBudget: 0,
      },
      {
        model: 'gemini-flash-latest',
        timeout: 6000,
        thinkingBudget: undefined,
      },
    ];

    let lastError: any = null;
    let resultText: string | undefined = undefined;

    for (const item of candidateConfigs) {
      try {
        const config: any = {
          systemInstruction: 'BẠN LÀ CHUYÊN GIA DỊCH THUẬT TIẾNG VIỆT HÀNG ĐẦU. NHIỆM VỤ: Dịch 100% văn bản trong ảnh sang TIẾNG VIỆT chuẩn xác, sát nghĩa và tự nhiên nhất. Diễn đạt mượt mà, gãy gọn theo văn phong tiếng Việt hiện đại, tránh dịch thô cứng máy móc, tránh dùng từ Hán-Việt cổ ngô nghê. Tách biệt ngày tháng, giờ đăng ra khỏi tiêu đề, tuyệt đối không để ngày tháng chen ngang vào giữa câu.',
          responseMimeType: 'application/json',
          maxOutputTokens: 2048,
        };

        if (item.thinkingBudget !== undefined) {
          config.thinkingConfig = { thinkingBudget: item.thinkingBudget };
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

        // Fast model timeout so failures rapidly failover without user lag
        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Model timeout')), item.timeout)
        );

        const response: any = await Promise.race([generatePromise, timeoutPromise]);
        resultText = response.text;
        if (resultText) {
          break; // Succeeded!
        }
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!resultText) {
      let errMsg = 'Máy chủ đang tải cao, vui lòng thử lại sau giây lát';
      if (lastError?.message) {
        try {
          const parsedErr = JSON.parse(lastError.message);
          if (parsedErr?.error?.message) {
            errMsg = parsedErr.error.message;
          }
        } catch {
          errMsg = lastError.message;
        }
      }
      return res.status(503).json({
        error: errMsg,
        code: 'SERVICE_UNAVAILABLE',
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
        text = text.replace(chineseRegex, '').trim();

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
      summary = summary.replace(chineseRegex, '').trim();
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
          model: 'gemini-3.8-flash',
          contents: rescuePrompt,
          config: {
            responseMimeType: 'application/json',
            maxOutputTokens: 1024,
            thinkingConfig: { thinkingBudget: 0 },
          },
        });

        const rescueTimeout = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Rescue timeout')), 2500)
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
      detected_language: parsed?.detected_language || 'Tiếng Trung',
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
    const chatModels = ['gemini-flash-latest', 'gemini-3.8-flash', 'gemini-2.5-flash', 'gemini-3.1-flash-lite'];
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
      return res.status(503).json({ error: 'Không thể kết nối trợ lý AI lúc này, vui lòng thử lại sau.' });
    }

    return res.json({ answer: answerText });
  } catch (err: any) {
    console.error('Travel chat error:', err);
    return res.status(500).json({ error: err.message || 'Lỗi xử lý câu hỏi' });
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
      model: 'gemini-3.8-flash-lite-tts',
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
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: {
          server: httpServer,
        },
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
