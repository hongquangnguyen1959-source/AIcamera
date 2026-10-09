import { TravelSample } from '../types';

// Helper to create an SVG data URL for crisp rendering
function createSvgDataUrl(svgContent: string): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
}

// 1. Japanese Ramen Restaurant Menu
const japaneseMenuSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#1c1917" />
      <stop offset="100%" stop-color="#0c0a09" />
    </linearGradient>
    <linearGradient id="gold" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#f59e0b" />
      <stop offset="100%" stop-color="#fbbf24" />
    </linearGradient>
  </defs>
  <rect width="900" height="1200" fill="url(#bg)" />
  <rect x="30" y="30" width="840" height="1140" fill="none" stroke="#d97706" stroke-width="3" rx="16" />
  <rect x="40" y="40" width="820" height="1120" fill="none" stroke="#78350f" stroke-width="1" rx="12" />

  <!-- Title -->
  <text x="450" y="110" fill="#fef08a" font-size="44" font-weight="900" text-anchor="middle" font-family="sans-serif">一風堂 本格豚骨ラーメン</text>
  <text x="450" y="150" fill="#fed7aa" font-size="22" text-anchor="middle" font-family="sans-serif">IPPUDO AUTHENTIC RAMEN MENU</text>
  <line x1="200" y1="180" x2="700" y2="180" stroke="#f59e0b" stroke-width="2" />

  <!-- Section 1: Ramen -->
  <rect x="60" y="210" width="780" height="52" fill="#78350f" rx="8" />
  <text x="80" y="246" fill="#fef3c7" font-size="28" font-weight="bold" font-family="sans-serif">名物 ラーメン (MÓN CHÍNH - RAMEN)</text>

  <!-- Item 1 -->
  <rect x="60" y="280" width="780" height="90" fill="#292524" rx="10" stroke="#44403c" />
  <text x="90" y="325" fill="#ffffff" font-size="28" font-weight="bold" font-family="sans-serif">特製 濃厚豚骨ラーメン</text>
  <text x="90" y="355" fill="#a8a29e" font-size="18" font-family="sans-serif">自家製チャーシュー3枚・味玉・海苔・青ネギ入り</text>
  <text x="730" y="335" fill="#facc15" font-size="32" font-weight="bold" text-anchor="end" font-family="sans-serif">¥1,100</text>

  <!-- Item 2 -->
  <rect x="60" y="390" width="780" height="90" fill="#292524" rx="10" stroke="#44403c" />
  <text x="90" y="435" fill="#ffffff" font-size="28" font-weight="bold" font-family="sans-serif">辛味噌 激辛赤丸ラーメン</text>
  <text x="90" y="465" fill="#f87171" font-size="18" font-family="sans-serif">辛さ3倍・山椒の香り・自家製香味油 (辛い)</text>
  <text x="730" y="445" fill="#facc15" font-size="32" font-weight="bold" text-anchor="end" font-family="sans-serif">¥1,250</text>

  <!-- Item 3 -->
  <rect x="60" y="500" width="780" height="90" fill="#292524" rx="10" stroke="#44403c" />
  <text x="90" y="545" fill="#ffffff" font-size="28" font-weight="bold" font-family="sans-serif">白丸元味 あっさり豚骨</text>
  <text x="90" y="575" fill="#a8a29e" font-size="18" font-family="sans-serif">創業当時からの定番・細麺・豚骨スープ</text>
  <text x="730" y="555" fill="#facc15" font-size="32" font-weight="bold" text-anchor="end" font-family="sans-serif">¥980</text>

  <!-- Section 2: Sides -->
  <rect x="60" y="620" width="780" height="52" fill="#78350f" rx="8" />
  <text x="80" y="656" fill="#fef3c7" font-size="28" font-weight="bold" font-family="sans-serif">一品料理 &amp; お飲み物 (MÓN ĂN KÈM &amp; ĐỒ UỐNG)</text>

  <!-- Item 4 -->
  <rect x="60" y="690" width="780" height="80" fill="#292524" rx="10" stroke="#44403c" />
  <text x="90" y="735" fill="#ffffff" font-size="26" font-weight="bold" font-family="sans-serif">博多 ひとくち焼き餃子 (10個)</text>
  <text x="730" y="740" fill="#facc15" font-size="30" font-weight="bold" text-anchor="end" font-family="sans-serif">¥550</text>

  <!-- Item 5 -->
  <rect x="60" y="790" width="780" height="80" fill="#292524" rx="10" stroke="#44403c" />
  <text x="90" y="835" fill="#ffffff" font-size="26" font-weight="bold" font-family="sans-serif">温玉 チャーシューご飯</text>
  <text x="730" y="840" fill="#facc15" font-size="30" font-weight="bold" text-anchor="end" font-family="sans-serif">¥420</text>

  <!-- Item 6 -->
  <rect x="60" y="890" width="780" height="80" fill="#292524" rx="10" stroke="#44403c" />
  <text x="90" y="935" fill="#ffffff" font-size="26" font-weight="bold" font-family="sans-serif">アサヒ 生ビール (中ジョッキ)</text>
  <text x="730" y="940" fill="#facc15" font-size="30" font-weight="bold" text-anchor="end" font-family="sans-serif">¥600</text>

  <!-- Notice & Warning at bottom -->
  <rect x="60" y="1000" width="780" height="130" fill="#450a0a" rx="10" stroke="#991b1b" stroke-width="2" />
  <text x="90" y="1040" fill="#fecaca" font-size="22" font-weight="bold" font-family="sans-serif">⚠️ お客様へのお知らせ (LƯU Ý KHÁCH HÀNG)</text>
  <text x="90" y="1075" fill="#fee2e2" font-size="18" font-family="sans-serif">• 当店のスープは豚骨・小麦・大豆を含みます (Dị ứng: Chứa thịt heo, bột mì, đậu nành)</text>
  <text x="90" y="1105" fill="#fee2e2" font-size="18" font-family="sans-serif">• お会計は現金または交通系ICカードのみ対応 (Chỉ nhận tiền mặt và thẻ IC tàu điện)</text>
</svg>`;

// 2. Korean Subway Exit & Transit Sign
const koreanSignSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="700" viewBox="0 0 900 700">
  <defs>
    <linearGradient id="signBg" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#1e293b" />
      <stop offset="100%" stop-color="#0f172a" />
    </linearGradient>
  </defs>
  <rect width="900" height="700" fill="url(#signBg)" />
  <rect x="20" y="20" width="860" height="660" fill="none" stroke="#334155" stroke-width="4" rx="16" />

  <!-- Exit badge -->
  <circle cx="120" cy="120" r="50" fill="#fbbf24" />
  <text x="120" y="132" fill="#000000" font-size="44" font-weight="900" text-anchor="middle" font-family="sans-serif">4</text>
  <text x="190" y="110" fill="#ffffff" font-size="42" font-weight="bold" font-family="sans-serif">4번 출구</text>
  <text x="190" y="145" fill="#94a3b8" font-size="22" font-family="sans-serif">Exit 4 / Cổng ra số 4</text>

  <!-- Destinations -->
  <line x1="60" y1="200" x2="840" y2="200" stroke="#475569" stroke-width="2" />
  
  <rect x="60" y="230" width="780" height="100" fill="#1e293b" rx="12" stroke="#3b82f6" stroke-width="2" />
  <text x="90" y="280" fill="#ffffff" font-size="34" font-weight="bold" font-family="sans-serif">명동 쇼핑거리 &amp; 롯데백화점</text>
  <text x="90" y="315" fill="#93c5fd" font-size="20" font-family="sans-serif">Myeongdong Shopping Street &amp; Lotte Department Store</text>

  <rect x="60" y="350" width="780" height="100" fill="#1e293b" rx="12" stroke="#10b981" stroke-width="2" />
  <text x="90" y="400" fill="#ffffff" font-size="34" font-weight="bold" font-family="sans-serif">N서울타워 케이블카 방면</text>
  <text x="90" y="435" fill="#a7f3d0" font-size="20" font-family="sans-serif">Toward N Seoul Tower Cable Car (Hướng đi cáp treo tháp Namsan)</text>

  <!-- Warning Box -->
  <rect x="60" y="480" width="780" height="140" fill="#7f1d1d" rx="12" stroke="#ef4444" stroke-width="3" />
  <text x="90" y="525" fill="#ffffff" font-size="28" font-weight="bold" font-family="sans-serif">⚠️ 역내 흡연 및 쓰레기 무단투기 금지</text>
  <text x="90" y="565" fill="#fecaca" font-size="20" font-family="sans-serif">No Smoking &amp; No Littering in Station (Cấm hút thuốc &amp; xả rác trong ga tàu)</text>
  <text x="90" y="598" fill="#fca5a5" font-size="18" font-family="sans-serif">위반 시 100,000원 과태료 부과 (Phạt 100,000 Won nếu vi phạm ~ 1.850.000 VNĐ)</text>
</svg>`;

// 3. Thai Street Food Menu
const thaiMenuSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1000" viewBox="0 0 900 1000">
  <defs>
    <linearGradient id="thaiBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#18181b" />
      <stop offset="100%" stop-color="#27272a" />
    </linearGradient>
  </defs>
  <rect width="900" height="1000" fill="url(#thaiBg)" />
  <rect x="25" y="25" width="850" height="950" fill="none" stroke="#eab308" stroke-width="3" rx="16" />

  <!-- Header -->
  <text x="450" y="90" fill="#facc15" font-size="44" font-weight="bold" text-anchor="middle" font-family="sans-serif">ครัวสยาม สตรีทฟู้ด</text>
  <text x="450" y="130" fill="#fef08a" font-size="22" text-anchor="middle" font-family="sans-serif">SIAM STREET FOOD KITCHEN BANGKOK</text>
  <line x1="150" y1="160" x2="750" y2="160" stroke="#ca8a04" stroke-width="2" />

  <!-- Item 1 -->
  <rect x="60" y="190" width="780" height="95" fill="#3f3f46" rx="10" stroke="#71717a" />
  <text x="90" y="235" fill="#ffffff" font-size="30" font-weight="bold" font-family="sans-serif">ผัดไทยกุ้งสด (Pad Thai Kung Sod)</text>
  <text x="90" y="265" fill="#fde047" font-size="18" font-family="sans-serif">Phở xào kiểu Thái tôm tươi, đậu phộng, chanh tươi</text>
  <text x="730" y="245" fill="#4ade80" font-size="34" font-weight="bold" text-anchor="end" font-family="sans-serif">80 ฿</text>

  <!-- Item 2 -->
  <rect x="60" y="305" width="780" height="95" fill="#3f3f46" rx="10" stroke="#71717a" />
  <text x="90" y="350" fill="#ffffff" font-size="30" font-weight="bold" font-family="sans-serif">ต้มยำกุ้งน้ำข้น (Tom Yum Kung)</text>
  <text x="90" y="380" fill="#f87171" font-size="18" font-family="sans-serif">Canh tôm chua cay Tom Yum nước cốt dừa, sả ớt (Rất cay)</text>
  <text x="730" y="360" fill="#4ade80" font-size="34" font-weight="bold" text-anchor="end" font-family="sans-serif">150 ฿</text>

  <!-- Item 3 -->
  <rect x="60" y="420" width="780" height="95" fill="#3f3f46" rx="10" stroke="#71717a" />
  <text x="90" y="465" fill="#ffffff" font-size="30" font-weight="bold" font-family="sans-serif">ข้าวเหนียวมะม่วง (Mango Sticky Rice)</text>
  <text x="90" y="495" fill="#fef08a" font-size="18" font-family="sans-serif">Xôi xoài nước cốt dừa thơm ngọt</text>
  <text x="730" y="475" fill="#4ade80" font-size="34" font-weight="bold" text-anchor="end" font-family="sans-serif">120 ฿</text>

  <!-- Item 4 -->
  <rect x="60" y="535" width="780" height="95" fill="#3f3f46" rx="10" stroke="#71717a" />
  <text x="90" y="580" fill="#ffffff" font-size="30" font-weight="bold" font-family="sans-serif">ชาไทยเย็น (Thai Iced Milk Tea)</text>
  <text x="90" y="610" fill="#fb923c" font-size="18" font-family="sans-serif">Trà sữa Thái đỏ truyền thống đá mát lạnh</text>
  <text x="730" y="590" fill="#4ade80" font-size="34" font-weight="bold" text-anchor="end" font-family="sans-serif">45 ฿</text>

  <!-- Travel Tip -->
  <rect x="60" y="660" width="780" height="140" fill="#1e3a5f" rx="12" stroke="#38bdf8" stroke-width="2" />
  <text x="90" y="705" fill="#e0f2fe" font-size="24" font-weight="bold" font-family="sans-serif">💡 LƯU Ý KHI GỌI MÓN TẠI THÁI LAN:</text>
  <text x="90" y="740" fill="#bae6fd" font-size="19" font-family="sans-serif">• Nếu không ăn cay, hãy nói: &quot;Mai phet&quot; (Không cay) hoặc &quot;Phet nid noi&quot; (Ít cay)</text>
  <text x="90" y="770" fill="#bae6fd" font-size="19" font-family="sans-serif">• Tỷ giá ước tính: 1 THB ≈ 720 VNĐ (80 THB ≈ 57.000 VNĐ)</text>
</svg>`;

// 4. French Cafe Bistro Receipt / Menu
const frenchMenuSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="850" viewBox="0 0 900 850">
  <rect width="900" height="850" fill="#111827" />
  <rect x="25" y="25" width="850" height="800" fill="none" stroke="#60a5fa" stroke-width="3" rx="16" />

  <!-- Header -->
  <text x="450" y="90" fill="#93c5fd" font-size="40" font-weight="bold" text-anchor="middle" font-family="sans-serif">Café &amp; Bistro Le Marais</text>
  <text x="450" y="130" fill="#e5e7eb" font-size="22" text-anchor="middle" font-family="sans-serif">75004 PARIS - MENU DU JOUR</text>
  <line x1="200" y1="160" x2="700" y2="160" stroke="#3b82f6" stroke-width="2" />

  <!-- Items -->
  <rect x="60" y="190" width="780" height="90" fill="#1f2937" rx="10" stroke="#374151" />
  <text x="90" y="235" fill="#ffffff" font-size="28" font-weight="bold" font-family="sans-serif">Croissant au Beurre d&apos;Isigny</text>
  <text x="90" y="265" fill="#9ca3af" font-size="18" font-family="sans-serif">Bánh sừng bò bơ Pháp truyền thống nướng giòn</text>
  <text x="730" y="245" fill="#38bdf8" font-size="32" font-weight="bold" text-anchor="end" font-family="sans-serif">3,50 €</text>

  <rect x="60" y="300" width="780" height="90" fill="#1f2937" rx="10" stroke="#374151" />
  <text x="90" y="345" fill="#ffffff" font-size="28" font-weight="bold" font-family="sans-serif">Café Crème au Lait d&apos;Avoine</text>
  <text x="90" y="375" fill="#9ca3af" font-size="18" font-family="sans-serif">Cà phê sữa kem nóng kiểu Paris</text>
  <text x="730" y="355" fill="#38bdf8" font-size="32" font-weight="bold" text-anchor="end" font-family="sans-serif">4,80 €</text>

  <rect x="60" y="410" width="780" height="90" fill="#1f2937" rx="10" stroke="#374151" />
  <text x="90" y="455" fill="#ffffff" font-size="28" font-weight="bold" font-family="sans-serif">Soupe à l&apos;Oignon Gratinée</text>
  <text x="90" y="485" fill="#9ca3af" font-size="18" font-family="sans-serif">Súp hành tây nướng phô mai Gruyère đút lò</text>
  <text x="730" y="465" fill="#38bdf8" font-size="32" font-weight="bold" text-anchor="end" font-family="sans-serif">14,00 €</text>

  <rect x="60" y="520" width="780" height="90" fill="#1f2937" rx="10" stroke="#374151" />
  <text x="90" y="565" fill="#ffffff" font-size="28" font-weight="bold" font-family="sans-serif">Steak Frites Sauce Béarnaise</text>
  <text x="90" y="595" fill="#9ca3af" font-size="18" font-family="sans-serif">Thịt bò bít tết kèm khoai tây chiên sốt bơ trứng thảo mộc</text>
  <text x="730" y="575" fill="#38bdf8" font-size="32" font-weight="bold" text-anchor="end" font-family="sans-serif">24,50 €</text>

  <!-- Service note -->
  <rect x="60" y="640" width="780" height="130" fill="#064e3b" rx="12" stroke="#059669" stroke-width="2" />
  <text x="90" y="680" fill="#a7f3d0" font-size="22" font-weight="bold" font-family="sans-serif">💶 GHI CHÚ DU LỊCH PHÁP / CHÂU ÂU:</text>
  <text x="90" y="715" fill="#d1fae5" font-size="18" font-family="sans-serif">• Service compris: Giá đã bao gồm phí phục vụ (không bắt buộc tip thêm)</text>
  <text x="90" y="745" fill="#d1fae5" font-size="18" font-family="sans-serif">• Tỷ giá: 1 EUR ≈ 27.500 VNĐ (Món bò bít tết 24,50 € ≈ 673.000 VNĐ)</text>
</svg>`;

// 5. Chinese Traditional Store Signboard (Tong Ren Tang Pharmacy with Side Pillars)
const chineseSignboardSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="750" viewBox="0 0 900 750">
  <defs>
    <linearGradient id="cnBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#450a0a" />
      <stop offset="100%" stop-color="#180202" />
    </linearGradient>
  </defs>
  <rect width="900" height="750" fill="url(#cnBg)" />
  <rect x="15" y="15" width="870" height="720" fill="none" stroke="#f59e0b" stroke-width="4" rx="16" />

  <!-- Main Traditional Gold Store Plaque -->
  <rect x="130" y="40" width="640" height="170" fill="#78350f" rx="12" stroke="#fef08a" stroke-width="3" />
  <text x="450" y="145" fill="#fef08a" font-size="64" font-weight="900" text-anchor="middle" font-family="'SimSun', 'STSong', serif">北京同仁堂</text>

  <!-- Left Side Pillar Vertical Couplet (Câu đối cột bên trái) -->
  <rect x="30" y="230" width="85" height="470" fill="#581c87" rx="10" stroke="#fbbf24" stroke-width="2" />
  <text x="72" y="285" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">但</text>
  <text x="72" y="345" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">愿</text>
  <text x="72" y="405" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">世</text>
  <text x="72" y="465" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">间</text>
  <text x="72" y="525" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">人</text>
  <text x="72" y="585" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">无</text>
  <text x="72" y="645" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">病</text>

  <!-- Right Side Pillar Vertical Couplet (Câu đối cột bên phải) -->
  <rect x="785" y="230" width="85" height="470" fill="#581c87" rx="10" stroke="#fbbf24" stroke-width="2" />
  <text x="827" y="285" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">何</text>
  <text x="827" y="345" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">妨</text>
  <text x="827" y="405" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">架</text>
  <text x="827" y="465" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">上</text>
  <text x="827" y="525" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">药</text>
  <text x="827" y="585" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">生</text>
  <text x="827" y="645" fill="#fef08a" font-size="32" font-weight="bold" text-anchor="middle" font-family="'SimSun', serif">尘</text>

  <!-- Subtitle banner -->
  <rect x="130" y="230" width="640" height="75" fill="#292524" rx="10" stroke="#a16207" />
  <text x="450" y="278" fill="#ffffff" font-size="28" font-weight="bold" text-anchor="middle" font-family="sans-serif">百年老字号 · 中药饮片 · 膏丹丸散</text>

  <!-- Business Hours & Services -->
  <rect x="130" y="325" width="640" height="110" fill="#1c1917" rx="10" stroke="#525252" />
  <text x="160" y="370" fill="#38bdf8" font-size="24" font-weight="bold" font-family="sans-serif">⏰ 营业时间: 08:00 - 21:00</text>
  <text x="160" y="410" fill="#a3e635" font-size="22" font-weight="bold" font-family="sans-serif">👨‍⚕️ 执业药师在线咨询 · 免费煎药</text>

  <!-- Notice Box -->
  <rect x="130" y="455" width="640" height="245" fill="#831843" rx="12" stroke="#f43f5e" stroke-width="2" />
  <text x="160" y="500" fill="#fecdd3" font-size="24" font-weight="bold" font-family="sans-serif">📢 顾客须知</text>
  <text x="160" y="545" fill="#ffe4e6" font-size="20" font-family="sans-serif">• 本店经营道地中药材，品质保证</text>
  <text x="160" y="590" fill="#ffe4e6" font-size="20" font-family="sans-serif">• 支持微信支付、支付宝及各类国际银行卡</text>
  <text x="160" y="635" fill="#fef08a" font-size="20" font-weight="bold" font-family="sans-serif">• 消费满500元可开具离境退税单据</text>
</svg>`;

export const TRAVEL_SAMPLES: TravelSample[] = [
  {
    id: 'cn-pharmacy',
    title: 'Bảng Hiệu Tiệm Thuốc Bắc Kinh',
    country: 'Trung Quốc',
    flag: '🇨🇳',
    description: 'Bảng hiệu biển chữ Trung Quốc Phồn/Giản thể, giờ mở cửa & lưu ý tư vấn dược sĩ.',
    image: createSvgDataUrl(chineseSignboardSvg),
    defaultResult: {
      detected_language: 'Tiếng Trung (Trung Quốc)',
      language_code: 'zh',
      summary_translation: 'Hiệu thuốc Bắc Kinh Đồng Nhân Đường (thương hiệu trăm năm). Giờ mở cửa 08:00 - 21:00. Dược sĩ tư vấn trực tiếp & sắc thuốc miễn phí. Hỗ trợ WeChat Pay, Alipay, thẻ quốc tế và hóa đơn hoàn thuế trên 500 tệ.',
      travel_advice: 'Có thể thanh toán qua WeChat Pay/Alipay quốc tế. Hóa đơn trên 500 tệ nhớ xin biên lai hoàn thuế xuất cảnh (Tax Refund).',
      items: [
        {
          box_2d: [55, 145, 190, 855],
          original_text: '北京同仁堂',
          translated_text: 'Hiệu Thuốc Đồng Nhân Đường Bắc Kinh',
          pronunciation: 'Běijīng Tóngréntáng',
          category: 'sign',
          cultural_tip: 'Hiệu thuốc Đông y danh tiếng có lịch sử hơn 350 năm từ thời nhà Thanh.',
        },
        {
          box_2d: [305, 40, 680, 115],
          original_text: '但愿世间人无病',
          translated_text: 'Nguyện cầu nhân thế không bệnh tật (Cột trái)',
          category: 'sign',
        },
        {
          box_2d: [305, 870, 680, 945],
          original_text: '何妨架上药生尘',
          translated_text: 'Dẫu cho thuốc trên giá phủ bụi mờ (Cột phải)',
          category: 'sign',
        },
        {
          box_2d: [305, 145, 395, 855],
          original_text: '百年老字号 · 中药饮片 · 膏丹丸散',
          translated_text: 'Thương hiệu trăm năm · Dược liệu Đông y · Cao đơn hoàn tán',
          category: 'sign',
        },
        {
          box_2d: [435, 175, 495, 825],
          original_text: '营业时间: 08:00 - 21:00',
          translated_text: '⏰ Giờ mở cửa: 08:00 - 21:00 hàng ngày',
          category: 'instruction',
        },
        {
          box_2d: [545, 175, 605, 825],
          original_text: '执业药师在线咨询 · 免费煎药',
          translated_text: '👨‍⚕️ Dược sĩ tư vấn trực tiếp · Sắc thuốc miễn phí',
          category: 'instruction',
        },
        {
          box_2d: [645, 175, 705, 825],
          original_text: '顾客须知',
          translated_text: '📢 Lưu ý dành cho khách mua hàng',
          category: 'warning',
        },
        {
          box_2d: [720, 175, 775, 825],
          original_text: '本店经营道地中药材，品质保证',
          translated_text: '• Dược liệu chính gốc, cam kết chuẩn chất lượng',
          category: 'instruction',
        },
        {
          box_2d: [780, 175, 835, 825],
          original_text: '支持微信支付、支付宝及各类国际银行卡',
          translated_text: '• Chấp nhận WeChat Pay, Alipay và thẻ quốc tế',
          category: 'instruction',
        },
        {
          box_2d: [840, 175, 900, 825],
          original_text: '消费满500元可开具离境退税单据',
          translated_text: '• Mua từ 500 tệ (~1.800.000đ) được xuất hóa đơn hoàn thuế',
          category: 'price',
        },
      ],
    },
  },
  {
    id: 'jp-ramen',
    title: 'Menu Mì Ramen Nhật Bản',
    country: 'Nhật Bản',
    flag: '🇯🇵',
    description: 'Bảng menu quán ramen với giá Yên Nhật, cảnh báo dị ứng thịt heo, cách gọi mì cay.',
    image: createSvgDataUrl(japaneseMenuSvg),
    defaultResult: {
      detected_language: 'Tiếng Nhật (Nhật Bản)',
      language_code: 'ja',
      summary_translation: 'Thực đơn mì Ramen Ippudo chính hiệu. Món đặc trưng gồm Mì Ramen xương heo đậm đà đặc biệt (1.100¥), Mì Ramen tương miso cay nồng đỏ (1.250¥), Mì Ramen thanh đạm nguyên bản (980¥). Món ăn kèm có Bánh xếp áp chảo Hakata (550¥).',
      travel_advice: 'Có thể yêu cầu độ cứng của sợi mì (Katame = sợi cứng, Futsuu = bình thường). Ăn xong có thể gọi thêm mì (Kaedama).',
      detected_prices: [
        { original_price: '¥1,100', currency: 'JPY', estimated_vnd: '187.000 VNĐ' },
        { original_price: '¥1,250', currency: 'JPY', estimated_vnd: '212.000 VNĐ' },
        { original_price: '¥980', currency: 'JPY', estimated_vnd: '166.000 VNĐ' },
        { original_price: '¥550', currency: 'JPY', estimated_vnd: '93.500 VNĐ' },
      ],
      items: [
        {
          box_2d: [75, 100, 140, 900],
          original_text: '一風堂 本格豚骨ラーメン',
          translated_text: '🍜 Mì Ramen Hầm Xương Heo Đích Thực Ippudo',
          pronunciation: 'Ippūdō Honkaku Tonkotsu Rāmen',
          category: 'menu',
        },
        {
          box_2d: [230, 80, 310, 920],
          original_text: '特製 濃厚豚骨ラーメン (¥1,100)',
          translated_text: 'Đặc Biệt: Mì Ramen Xương Heo Đậm Đà (¥1,100 ~ 187k)',
          category: 'menu',
          cultural_tip: 'Gồm 3 lát xá xíu, trứng lòng đào tamago, rong biển và hành tây xanh.',
        },
        {
          box_2d: [325, 80, 405, 920],
          original_text: '辛味噌 激辛赤丸ラーメン (¥1,250)',
          translated_text: '🌶️ Mì Ramen Tương Miso Đỏ Siêu Cay (¥1,250 ~ 212k)',
          category: 'menu',
        },
        {
          box_2d: [415, 80, 495, 920],
          original_text: '白丸元味 あっさり豚骨 (¥980)',
          translated_text: 'Mì Ramen Shiromaru Vị Thanh Đạm (¥980 ~ 166k)',
          category: 'menu',
        },
        {
          box_2d: [570, 80, 640, 920],
          original_text: '博多 ひとくち焼き餃子 (10個) (¥550)',
          translated_text: '🥟 Bánh Xếp Nướng Hakata Một Miếng (10 cái) (¥550 ~ 93k)',
          category: 'menu',
        },
      ],
    },
  },
  {
    id: 'kr-subway',
    title: 'Biển Báo Ga Tàu Seoul',
    country: 'Hàn Quốc',
    flag: '🇰🇷',
    description: 'Biển chỉ dẫn cổng ra tàu điện ngầm Myeongdong & cảnh báo mức phạt cấm hút thuốc.',
    image: createSvgDataUrl(koreanSignSvg),
    defaultResult: {
      detected_language: 'Tiếng Hàn (Hàn Quốc)',
      language_code: 'ko',
      summary_translation: 'Ga Tàu Điện Ngầm Myeongdong (Tuyến số 4). Cổng ra số 6 dẫn tới Phố đi bộ và Trung tâm mua sắm Myeongdong. Cảnh báo khu vực cấm hút thuốc hoàn toàn, phạt tiền 100.000 Won.',
      travel_advice: 'Tại Hàn Quốc, hút thuốc sai nơi quy định bị phạt rất nặng (100.000 Won ≈ 1.850.000đ). Cổng 6 là lối ra thẳng khu chợ đêm.',
      detected_prices: [
        { original_price: '100,000원', currency: 'KRW', estimated_vnd: '1.850.000 VNĐ' },
      ],
      items: [
        {
          box_2d: [70, 150, 185, 850],
          original_text: '명동역 4호선',
          translated_text: '🚇 Ga Myeongdong - Tuyến Tàu Số 4',
          pronunciation: 'Myeong-dong yeok',
          category: 'transport',
        },
        {
          box_2d: [225, 200, 360, 800],
          original_text: '6번 출구 - 명동거리 / 쇼핑몰',
          translated_text: '➡️ Cổng Ra Số 6: Phố Mua Sắm Myeongdong',
          category: 'transport',
        },
        {
          box_2d: [480, 80, 680, 920],
          original_text: '🚭 금연구역 - 과태료 100,000원',
          translated_text: '🚫 Khu Vực Cấm Hút Thuốc: Phạt 100.000 Won (~1.850.000đ)',
          category: 'warning',
          cultural_tip: 'Seoul kiểm tra camera phạt nguội hành vi hút thuốc nơi công cộng rất nghiêm.',
        },
      ],
    },
  },
  {
    id: 'th-food',
    title: 'Quán Ăn Đường Phố Bangkok',
    country: 'Thái Lan',
    flag: '🇹🇭',
    description: 'Menu món Thái Pad Thai, Tom Yum tôm cay & trà sữa, kèm lưu ý gọi không cay.',
    image: createSvgDataUrl(thaiMenuSvg),
    defaultResult: {
      detected_language: 'Tiếng Thái (Thái Lan)',
      language_code: 'th',
      summary_translation: 'Menu Quán Ăn Đường Phố Bangkok: Món Phở Xào Pad Thai Tôm Tươi (80 Baht), Canh Chua Cay Tom Yum Goong (150 Baht), Trà Sữa Thái Đỏ Truyền Thống (45 Baht). Có thể dặn "Mai Phet" nếu không ăn được cay.',
      travel_advice: '1 Baht Thái ≈ 730 VNĐ. Nếu không ăn được cay hãy nói với người bán "Mài phết" (Không cay) hoặc "Phết nít nòi" (Cay ít).',
      detected_prices: [
        { original_price: '80 ฿', currency: 'THB', estimated_vnd: '58.000 VNĐ' },
        { original_price: '150 ฿', currency: 'THB', estimated_vnd: '110.000 VNĐ' },
        { original_price: '45 ฿', currency: 'THB', estimated_vnd: '33.000 VNĐ' },
      ],
      items: [
        {
          box_2d: [60, 100, 140, 900],
          original_text: 'ร้านอาหารไทยชาววัง',
          translated_text: '🍽️ Quán Ẩm Thực Thái Lan Truyền Thống',
          category: 'menu',
        },
        {
          box_2d: [200, 70, 310, 930],
          original_text: 'ผัดไทยกุ้งสด (80 ฿)',
          translated_text: '🦐 Phở Xào Kiểu Thái Pad Thai Tôm Tươi (80 ฿ ~ 58k)',
          category: 'menu',
        },
        {
          box_2d: [340, 70, 450, 930],
          original_text: 'ต้มยำกุ้งน้ำข้น (150 ฿)',
          translated_text: '🍲 Canh Chua Cay Tom Yum Tôm Nước Cốt Dừa (150 ฿ ~ 110k)',
          category: 'menu',
        },
        {
          box_2d: [480, 70, 590, 930],
          original_text: 'ชาไทยโบราณ (45 ฿)',
          translated_text: '🧋 Trà Sữa Thái Đỏ Thơm Béo Truyền Thống (45 ฿ ~ 33k)',
          category: 'menu',
        },
      ],
    },
  },
  {
    id: 'fr-bistro',
    title: 'Menu Bistro Paris Nước Pháp',
    country: 'Pháp',
    flag: '🇫🇷',
    description: 'Bảng thực đơn quán cà phê và bít tết Paris, giá Euro và quy đổi tiền tệ sang VNĐ.',
    image: createSvgDataUrl(frenchMenuSvg),
    defaultResult: {
      detected_language: 'Tiếng Pháp (Pháp)',
      language_code: 'fr',
      summary_translation: 'Bistro Cà Phê & Nhà Hàng Paris. Món khai vị Súp hành tây nướng phô mai Gruyère đút lò (14,00 €). Món chính Bò bít tết kèm khoai tây chiên sốt bơ trứng thảo mộc Béarnaise (24,50 €). Giá đã bao gồm phí phục vụ (Service compris).',
      travel_advice: '1 EUR ≈ 27.500 VNĐ. Ở Pháp, dòng chữ "Service compris" nghĩa là hóa đơn đã tính tiền phục vụ, không bắt buộc để lại tiền boa.',
      detected_prices: [
        { original_price: '14,00 €', currency: 'EUR', estimated_vnd: '385.000 VNĐ' },
        { original_price: '24,50 €', currency: 'EUR', estimated_vnd: '673.000 VNĐ' },
      ],
      items: [
        {
          box_2d: [60, 100, 140, 900],
          original_text: 'Le Bistro Parisien',
          translated_text: '☕ Quán Cà Phê & Bistro Paris',
          category: 'menu',
        },
        {
          box_2d: [340, 70, 440, 930],
          original_text: 'Soupe à l\'Oignon Gratinée (14,00 €)',
          translated_text: '🥣 Súp Hành Tây Nướng Phô Mai Gruyère Đút Lò (14 € ~ 385k)',
          category: 'menu',
        },
        {
          box_2d: [460, 70, 560, 930],
          original_text: 'Steak Frites Sauce Béarnaise (24,50 €)',
          translated_text: '🥩 Bò Bít Tết Khoai Tây Chiên Sốt Bơ Thảo Mộc (24,5 € ~ 673k)',
          category: 'menu',
        },
      ],
    },
  },
];
