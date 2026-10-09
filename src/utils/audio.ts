/**
 * Text-to-Speech utility supporting Web Speech API with fallback to Gemini 3.8 Flash Lite TTS
 */
export async function speakText(text: string, langCode: string = 'vi-VN'): Promise<void> {
  if (!text) return;

  // 1. Try browser Web Speech API
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      
      // Determine suitable language tag
      let lang = langCode;
      if (langCode === 'ja') lang = 'ja-JP';
      else if (langCode === 'ko') lang = 'ko-KR';
      else if (langCode === 'zh') lang = 'zh-CN';
      else if (langCode === 'th') lang = 'th-TH';
      else if (langCode === 'en') lang = 'en-US';
      else if (langCode === 'fr') lang = 'fr-FR';
      else if (langCode === 'vi') lang = 'vi-VN';

      utterance.lang = lang;
      utterance.rate = 0.95; // Slightly slower for clear travel pronunciation

      let spoken = false;
      utterance.onstart = () => {
        spoken = true;
      };

      window.speechSynthesis.speak(utterance);

      // Return if speech started successfully
      await new Promise((resolve) => setTimeout(resolve, 300));
      if (window.speechSynthesis.speaking) {
        return;
      }
    } catch (e) {
      console.warn('Web Speech API failed, falling back to Gemini TTS', e);
    }
  }

  // 2. Server-side Gemini TTS fallback
  try {
    const res = await fetch('/api/tts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, voice: 'Kore' }),
    });

    if (!res.ok) throw new Error('Lỗi gọi TTS');
    const data = await res.json();
    if (data.audioData) {
      const audio = new Audio(`data:audio/wav;base64,${data.audioData}`);
      await audio.play();
    }
  } catch (err) {
    console.error('TTS playback error:', err);
  }
}
