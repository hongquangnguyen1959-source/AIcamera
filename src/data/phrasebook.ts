export interface Phrase {
  category: 'dining' | 'transport' | 'shopping' | 'emergency';
  vietnamese: string;
  original: string;
  phonetic: string;
  langCode: string;
  note?: string;
}

export const TRAVEL_PHRASEBOOK: Record<string, Phrase[]> = {
  zh: [
    {
      category: 'dining',
      vietnamese: 'Cho tôi xin một phần này (vừa chỉ vào menu)',
      original: '请给我一份这个 (Qǐng gěi wǒ yí fèn zhège)',
      phonetic: 'Chỉnh cẩy gủa ý phân chưa cơ',
      langCode: 'zh',
      note: 'Dùng khi chọn món ăn chỉ tay vào thực đơn',
    },
    {
      category: 'dining',
      vietnamese: 'Món này có cay không? Tôi không ăn được cay',
      original: '这个辣吗？我不吃辣 (Zhège là ma? Wǒ bù chī là)',
      phonetic: 'Chưa cơ la ma? Gủa bu chư la',
      langCode: 'zh',
      note: 'Rất cần thiết khi đi ăn tại Trung Quốc/Tứ Xuyên',
    },
    {
      category: 'dining',
      vietnamese: 'Làm ơn cho tôi thanh toán / tính tiền',
      original: '服务员，买单 / 结账 (Fúwùyuán, mǎidān / jiézhàng)',
      phonetic: 'Phú u uyên, mãi tan / chế trang',
      langCode: 'zh',
    },
    {
      category: 'transport',
      vietnamese: 'Xin hỏi ga tàu điện ngầm / bến xe ở đâu?',
      original: '请问地铁站 / 公交站在哪里？ (Qǐngwèn dìtiězhàn zài nǎlǐ?)',
      phonetic: 'Chỉnh uân ti thỉa tran trai nả lỉ?',
      langCode: 'zh',
    },
    {
      category: 'transport',
      vietnamese: 'Đi đến nơi này bao nhiêu tiền?',
      original: '去这里要多少钱？ (Qù zhèlǐ yào duōshao qián?)',
      phonetic: 'Khy chưa lỉ dao tua sao chén?',
      langCode: 'zh',
    },
    {
      category: 'shopping',
      vietnamese: 'Cái này bao nhiêu tiền? Có giảm giá không?',
      original: '这个多少钱？能打折吗？ (Zhège duōshao qián? Néng dǎzhé ma?)',
      phonetic: 'Chưa cơ tua sao chén? Nấng tả chứa ma?',
      langCode: 'zh',
    },
    {
      category: 'shopping',
      vietnamese: 'Ở đây có hỗ trợ thanh toán thẻ / Alipay / WeChat không?',
      original: '可以刷卡或用微信/支付宝吗？ (Kěyǐ shuākǎ huò yòng Wēixìn / Zhīfùbǎo ma?)',
      phonetic: 'Khửa dỉ soa khả houa dang Uây-xin / Chư-phu-pảo ma?',
      langCode: 'zh',
    },
    {
      category: 'emergency',
      vietnamese: 'Cứu tôi với! Làm ơn giúp tôi!',
      original: '救命！请帮帮我！ (Jiùmìng! Qǐng bāng bang wǒ!)',
      phonetic: 'Chiu minh! Chỉnh pang pang gủa!',
      langCode: 'zh',
    },
    {
      category: 'emergency',
      vietnamese: 'Xin hãy gọi xe cứu thương giúp tôi!',
      original: '请帮我叫救护车！ (Qǐng bāng wǒ jiào jiùhùchē!)',
      phonetic: 'Chỉnh pang gủa teo chiu hu chưa!',
      langCode: 'zh',
    },
  ],
  en: [
    {
      category: 'dining',
      vietnamese: 'Cho tôi xin gọi món này',
      original: 'Could I have this one, please?',
      phonetic: 'Kút ai he-v đít-s oăn, pờ-li-x',
      langCode: 'en',
    },
    {
      category: 'dining',
      vietnamese: 'Món này có thành phần gì dị ứng không?',
      original: 'Does this dish contain any allergens like nuts or dairy?',
      phonetic: 'Đơ-z đít-s đít-x con-ten...',
      langCode: 'en',
    },
    {
      category: 'dining',
      vietnamese: 'Cho tôi xin hóa đơn tính tiền',
      original: 'Can I have the check/bill, please?',
      phonetic: 'Khen ai he-v đờ bâu, pờ-li-x',
      langCode: 'en',
    },
    {
      category: 'transport',
      vietnamese: 'Làm ơn cho tôi hỏi đường đến ga tàu',
      original: 'Excuse me, which way to the train station?',
      phonetic: 'Éc-x-kiu-z mi, goít-ch uây...',
      langCode: 'en',
    },
    {
      category: 'emergency',
      vietnamese: 'Tôi cần sự giúp đỡ y tế!',
      original: 'I need medical help, please!',
      phonetic: 'Ai nít-đ mế-đi-cồ heo-p, pờ-li-x!',
      langCode: 'en',
    },
  ],
};
