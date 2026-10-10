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

    // Ultra-fast OCR prompt: Nhận diện từng dòng chữ riêng lẻ, vị trí chuẩn 1:1
    const prompt = `Bạn là hệ thống AR Camera dịch trực tiếp thời gian thực sang tiếng Việt.
HÃY QUÉT VÀ DỊCH TẤT CẢ VĂN BẢN TRONG HÌNH ẢNH:
1. Nhận diện các dòng chữ, tiêu đề, đoạn văn bản, biển hiệu hoặc menu có trong hình.
2. Với mỗi dòng chữ hoặc đoạn văn bản, tạo 1 mục trong mảng 'items':
   - "box_2d": [ymin, xmin, ymax, xmax] (tọa độ từ 0 đến 1000) ôm đúng vị trí văn bản đó trên ảnh.
   - "translated_text": Dịch trọn vẹn, tự nhiên sang tiếng Việt, rõ nghĩa 100%, không viết tắt, không cắt bớt chữ. Tuyệt đối không xuất lại chữ Hán hay ký tự gốc.
   - "category": 'menu' | 'sign' | 'instruction' | 'other'
3. Nếu ảnh chụp trang báo, tài liệu hay màn hình có nhiều dòng: Dịch lần lượt từng dòng/đoạn từ trên xuống dưới.
4. "summary_translation": Bản dịch tóm tắt toàn bộ nội dung chính đã nhận diện.
5. "detected_language": Tên ngôn ngữ nguồn (ví dụ: Tiếng Trung, Tiếng Nhật, Tiếng Anh, v.v.).

Xuất định dạng JSON chuẩn:
{
  "detected_language": "Ngôn ngữ nguồn",
  "summary_translation": "Tóm tắt ngắn gọn",
  "items": [
    {
      "box_2d": [ymin, xmin, ymax, xmax],
      "translated_text": "Bản dịch tiếng Việt hoàn chỉnh",
      "category": "sign"
    }
  ]
}`;

    // Multi-model sequence: gemini-3.1-flash-lite FIRST for ultra-fast latency (~1s) and active quota
    const candidateModels = [
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
      'gemini-3.8-flash',
    ];

    let lastError: any = null;
    let resultText: string | undefined = undefined;

    for (const modelName of candidateModels) {
      try {
        const config: any = {
          systemInstruction: 'Bạn là chuyên gia AR OCR trực tiếp tốc độ cao. Dịch chuẩn xác 100% toàn bộ chữ trong ảnh sang tiếng Việt đầy đủ, rõ nghĩa, không viết tắt, không cắt bớt chữ, không xuất chữ Hán.',
          responseMimeType: 'application/json',
          maxOutputTokens: 2500,
        };

        const generatePromise = ai.models.generateContent({
          model: modelName,
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

        const timeoutPromise = new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Model timeout')), 14000)
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
      const errMsg = lastError?.message || 'Máy chủ đang tải cao, vui lòng thử lại sau giây lát';
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
      .filter(Boolean);

    let summary = parsed?.summary_translation || parsed?.summary || '';
    if (typeof summary === 'string') {
      summary = summary.replace(chineseRegex, '').trim();
    }

    // If no individual line items were detected but summary exists, create a readable fallback item
    if (normalizedItems.length === 0 && summary.length > 0) {
      normalizedItems.push({
        box_2d: [350, 100, 480, 900],
        translated_text: summary,
        category: 'sign',
      });
    }

    const finalResult = {
      detected_language: parsed?.detected_language || 'Tự động',
      summary_translation: summary,
      items: normalizedItems,
    };

    // Cache only for 3 seconds to avoid stale results when panning camera
    if (normalizedItems.length > 0) {
      frameCache.set(cacheKey, { data: finalResult, expiresAt: now + 3000 });
      if (frameCache.size > 60) {
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
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const portNumber = Number(process.env.PORT) || 3000;
  app.listen(portNumber, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${portNumber}`);
  });
}

export default app;

if (!process.env.VERCEL) {
  startServer();
}
