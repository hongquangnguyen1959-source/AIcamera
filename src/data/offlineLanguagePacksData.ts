export interface SignboardItem {
  original: string;
  pinyinOrRomaji?: string;
  vietnamese: string;
  category: 'sign' | 'menu' | 'dining' | 'warning' | 'transport' | 'emergency' | 'shopping' | 'instruction' | string;
  note?: string;
}

export interface OfflineLanguagePack {
  id: string;
  name: string;
  shortName: string;
  flag: string;
  sizeMB: number;
  description: string;
  vocabularyCount: number;
  signboardCount: number;
  isPopular: boolean;
  version: string;
  signboards: SignboardItem[];
  commonPhrases: { original: string; pronunciation: string; vietnamese: string; category: string }[];
  dictionary: Record<string, string>;
}

export const POPULAR_LANGUAGE_PACKS: OfflineLanguagePack[] = [
  {
    id: 'zh',
    name: 'Tiếng Trung (Trung Quốc & Đài Loan)',
    shortName: 'Tiếng Trung',
    flag: '🇨🇳',
    sizeMB: 2.1,
    description: 'Biển hiệu đường phố, câu đối cột đền chùa, thực đơn món ăn Tứ Xuyên/Quảng Đông, tàu điện ngầm & chỉ dẫn an toàn.',
    vocabularyCount: 2200,
    signboardCount: 380,
    isPopular: true,
    version: '2026.1',
    signboards: [
      // Biển hiệu cơ bản & cửa hàng
      { original: '出口', pinyinOrRomaji: 'chūkǒu', vietnamese: 'Lối ra', category: 'sign' },
      { original: '入口', pinyinOrRomaji: 'rùkǒu', vietnamese: 'Lối vào', category: 'sign' },
      { original: '同仁堂', pinyinOrRomaji: 'Tóngréntáng', vietnamese: 'Đồng Nhân Đường (Hiệu thuốc bắc gia truyền)', category: 'sign' },
      { original: '药房', pinyinOrRomaji: 'yàofáng', vietnamese: 'Hiệu thuốc / Nhà thuốc', category: 'sign' },
      { original: '洗手间', pinyinOrRomaji: 'xǐshǒujiān', vietnamese: 'Nhà vệ sinh', category: 'sign' },
      { original: '卫生间', pinyinOrRomaji: 'wèishēngjiān', vietnamese: 'Nhà vệ sinh', category: 'sign' },
      { original: '厕所', pinyinOrRomaji: 'cèsuǒ', vietnamese: 'Nhà vệ sinh', category: 'sign' },
      { original: '营业中', pinyinOrRomaji: 'yíngyè zhōng', vietnamese: 'Đang mở cửa kinh doanh', category: 'sign' },
      { original: '打烊', pinyinOrRomaji: 'dǎyàng', vietnamese: 'Đã đóng cửa nghỉ', category: 'sign' },
      { original: '休息中', pinyinOrRomaji: 'xiūxi zhōng', vietnamese: 'Đang tạm nghỉ', category: 'sign' },
      { original: '营业时间', pinyinOrRomaji: 'yíngyè shíjiān', vietnamese: 'Giờ mở cửa phục vụ', category: 'instruction' },
      { original: '百年老字号', pinyinOrRomaji: 'bǎinián lǎozìhào', vietnamese: 'Thương hiệu gia truyền trăm năm', category: 'sign' },
      { original: '中药饮片', pinyinOrRomaji: 'zhōngyào yǐnpiàn', vietnamese: 'Thuốc bắc bào chế sẵn', category: 'sign' },
      { original: '膏丹丸散', pinyinOrRomaji: 'gāodān wánsǎn', vietnamese: 'Cao đơn hoàn tán (Đông y)', category: 'sign' },
      { original: '名医坐堂', pinyinOrRomaji: 'míngyī zuòtáng', vietnamese: 'Danh y trực tiếp khám bốc thuốc', category: 'instruction' },
      { original: '专家门诊', pinyinOrRomaji: 'zhuānjiā ménzhěn', vietnamese: 'Phòng khám bác sĩ chuyên khoa', category: 'instruction' },
      { original: '凭方抓药', pinyinOrRomaji: 'píngfāng zhuāyào', vietnamese: 'Bốc thuốc theo đơn thuốc', category: 'instruction' },
      { original: '遵医嘱', pinyinOrRomaji: 'zūn yīzhǔ', vietnamese: 'Uống thuốc theo lời dặn bác sĩ', category: 'warning' },
      { original: '修合无人见', pinyinOrRomaji: 'xiū hé wú rén jiàn', vietnamese: 'Bào chế dù không ai thấy', category: 'sign', note: 'Câu đối vế trên của Đồng Nhân Đường' },
      { original: '存心有天知', pinyinOrRomaji: 'cún xīn yǒu tiān zhī', vietnamese: 'Lòng thành có trời thấu', category: 'sign', note: 'Câu đối vế dưới của Đồng Nhân Đường' },
      { original: '地道药材', pinyinOrRomaji: 'dìdào yàocái', vietnamese: 'Dược liệu chính gốc thượng hạng', category: 'sign' },
      { original: '货真价实', pinyinOrRomaji: 'huòzhēn jiàshí', vietnamese: 'Hàng thật giá chuẩn không nói thách', category: 'shopping' },
      // Chỉ dẫn & Cảnh báo
      { original: '严禁吸烟', pinyinOrRomaji: 'yánjìn xīyān', vietnamese: 'Nghiêm cấm hút thuốc', category: 'warning' },
      { original: '禁止拍照', pinyinOrRomaji: 'jìnzhǐ pāizhào', vietnamese: 'Cấm chụp ảnh', category: 'warning' },
      { original: '小心地滑', pinyinOrRomaji: 'xiǎoxīn dìhuá', vietnamese: 'Cẩn thận sàn trơn trượt', category: 'warning' },
      { original: '请勿触摸', pinyinOrRomaji: 'qǐngwù chùmō', vietnamese: 'Xin đừng chạm tay vào', category: 'warning' },
      { original: '安全出口', pinyinOrRomaji: 'ānquán chūkǒu', vietnamese: 'Lối thoát hiểm khẩn cấp', category: 'emergency' },
      { original: '地铁站', pinyinOrRomaji: 'dìtiě zhàn', vietnamese: 'Ga tàu điện ngầm', category: 'transport' },
      { original: '公交车', pinyinOrRomaji: 'gōngjiāochē', vietnamese: 'Xe buýt công cộng', category: 'transport' },
      { original: '出租车', pinyinOrRomaji: 'chūzūchē', vietnamese: 'Xe taxi', category: 'transport' },
      { original: '售票处', pinyinOrRomaji: 'shòupiàochù', vietnamese: 'Quầy bán vé', category: 'transport' },
      { original: '候车室', pinyinOrRomaji: 'hòuchēshì', vietnamese: 'Phòng chờ lên xe/tàu', category: 'transport' },
      { original: '检票口', pinyinOrRomaji: 'jiǎnpiàokǒu', vietnamese: 'Cổng soát vé', category: 'transport' },
      { original: '服务台', pinyinOrRomaji: 'fúwùtái', vietnamese: 'Quầy thông tin phục vụ', category: 'instruction' },
      { original: '行李寄存', pinyinOrRomaji: 'xínglǐ jìcún', vietnamese: 'Nơi gửi hành lý', category: 'instruction' },
      // Thực đơn món ăn phổ biến
      { original: '菜单', pinyinOrRomaji: 'càidān', vietnamese: 'Thực đơn gọi món', category: 'menu' },
      { original: '招牌菜', pinyinOrRomaji: 'zhāopáicài', vietnamese: 'Món đặc sản trứ danh của quán', category: 'menu' },
      { original: '宫保鸡丁', pinyinOrRomaji: 'gōngbǎo jīdīng', vietnamese: 'Gà xào Cung Bảo cay ngọt hạt điều', category: 'menu' },
      { original: '麻婆豆腐', pinyinOrRomaji: 'mápó dòufu', vietnamese: 'Đậu phụ Ma Bà cay Tứ Xuyên', category: 'menu' },
      { original: '北京烤鸭', pinyinOrRomaji: 'Běijīng kǎoyā', vietnamese: 'Vịt quay Bắc Kinh giòn rụm', category: 'menu' },
      { original: '小笼包', pinyinOrRomaji: 'xiǎolóngbāo', vietnamese: 'Bánh bao Tiểu Lung Bao nhân súp', category: 'menu' },
      { original: '红烧肉', pinyinOrRomaji: 'hóngshāoròu', vietnamese: 'Thịt kho tàu đậm đà', category: 'menu' },
      { original: '牛肉面', pinyinOrRomaji: 'niúròumiàn', vietnamese: 'Mì bò hầm Đài Loan', category: 'menu' },
      { original: '炒饭', pinyinOrRomaji: 'chǎofàn', vietnamese: 'Cơm chiên / Cơm rang', category: 'menu' },
      { original: '水饺', pinyinOrRomaji: 'shuǐjiǎo', vietnamese: 'Sủi cảo luộc', category: 'menu' },
      { original: '锅贴', pinyinOrRomaji: 'guōtiē', vietnamese: 'Bánh sủi cảo áp chảo', category: 'menu' },
      { original: '买单', pinyinOrRomaji: 'mǎidān', vietnamese: 'Tính tiền / Thanh toán', category: 'shopping' },
      { original: '免税', pinyinOrRomaji: 'miǎnshuì', vietnamese: 'Miễn thuế (Tax Free)', category: 'shopping' },
      { original: '打折', pinyinOrRomaji: 'dǎzhé', vietnamese: 'Giảm giá khuyến mãi', category: 'shopping' },
    ],
    commonPhrases: [
      { original: '你好', pronunciation: 'Nǐ hǎo (Nỉ hảo)', vietnamese: 'Xin chào', category: 'general' },
      { original: '谢谢', pronunciation: 'Xièxie (Xiê xiệ)', vietnamese: 'Cảm ơn bạn', category: 'general' },
      { original: '多少钱？', pronunciation: 'Duōshao qián? (Tua sao chén?)', vietnamese: 'Cái này bao nhiêu tiền?', category: 'shopping' },
      { original: '买单 / 结账', pronunciation: 'Mǎidān / Jiézhàng', vietnamese: 'Làm ơn tính tiền giúp tôi', category: 'dining' },
      { original: '请问洗手间在哪里？', pronunciation: 'Qǐngwèn xǐshǒujiān zài nǎlǐ?', vietnamese: 'Xin hỏi nhà vệ sinh ở đâu?', category: 'transport' },
      { original: '救命！', pronunciation: 'Jiùmìng! (Chiu minh!)', vietnamese: 'Cứu tôi với! (Khẩn cấp)', category: 'emergency' },
      { original: '我不吃辣', pronunciation: 'Wǒ bù chī là', vietnamese: 'Tôi không ăn được cay', category: 'dining' },
    ],
    dictionary: {
      '门': 'Cửa',
      '车': 'Xe',
      '店': 'Cửa hàng / Quán',
      '馆': 'Quán ăn / Bảo tàng',
      '水': 'Nước uống',
      '饭': 'Cơm',
      '面': 'Mì',
      '肉': 'Thịt',
      '茶': 'Trà',
      '酒': 'Rượu / Bia',
      '元': 'Nhân dân tệ (Tệ)',
      '块': 'Đồng (tiền)',
      '开': 'Mở',
      '关': 'Đóng',
      '大': 'Lớn',
      '小': 'Nhỏ',
      '东': 'Đông',
      '西': 'Tây',
      '南': 'Nam',
      '北': 'Bắc',
    },
  },
  {
    id: 'en',
    name: 'Tiếng Anh (Toàn Cầu / Sân Bay / Khách Sạn)',
    shortName: 'Tiếng Anh',
    flag: '🇬🇧',
    sizeMB: 1.8,
    description: 'Bảng hiệu quốc tế, chỉ dẫn sân bay, thủ tục khách sạn, menu nhà hàng Âu - Mỹ và các thông báo khẩn cấp.',
    vocabularyCount: 2500,
    signboardCount: 420,
    isPopular: true,
    version: '2026.1',
    signboards: [
      { original: 'EXIT', vietnamese: 'Lối ra', category: 'sign' },
      { original: 'ENTRANCE', vietnamese: 'Lối vào', category: 'sign' },
      { original: 'EMERGENCY EXIT', vietnamese: 'Lối thoát hiểm khẩn cấp', category: 'emergency' },
      { original: 'RESTROOM / TOILET', vietnamese: 'Nhà vệ sinh', category: 'sign' },
      { original: 'OPEN', vietnamese: 'Đang mở cửa', category: 'sign' },
      { original: 'CLOSED', vietnamese: 'Đã đóng cửa', category: 'sign' },
      { original: 'NO SMOKING', vietnamese: 'Cấm hút thuốc', category: 'warning' },
      { original: 'NO PHOTOGRAPHY', vietnamese: 'Cấm chụp ảnh', category: 'warning' },
      { original: 'DO NOT ENTER', vietnamese: 'Cấm vào', category: 'warning' },
      { original: 'CAUTION WET FLOOR', vietnamese: 'Cẩn thận sàn ướt trơn trượt', category: 'warning' },
      { original: 'PULL / PUSH', vietnamese: 'Kéo vào / Đẩy ra (Cửa)', category: 'instruction' },
      { original: 'DUTY FREE', vietnamese: 'Cửa hàng miễn thuế', category: 'shopping' },
      { original: 'TAX REFUND', vietnamese: 'Quầy hoàn thuế cho du khách', category: 'shopping' },
      { original: 'CURRENCY EXCHANGE', vietnamese: 'Quầy đổi ngoại tệ', category: 'shopping' },
      { original: 'BAGGAGE CLAIM', vietnamese: 'Nơi nhận hành lý ký gửi', category: 'transport' },
      { original: 'DEPARTURES', vietnamese: 'Ga đi / Chuyến bay khởi hành', category: 'transport' },
      { original: 'ARRIVALS', vietnamese: 'Ga đến / Chuyến bay hạ cánh', category: 'transport' },
      { original: 'BOARDING GATE', vietnamese: 'Cổng lên máy bay', category: 'transport' },
      { original: 'CHECK-IN COUNTER', vietnamese: 'Quầy làm thủ tục check-in', category: 'transport' },
      { original: 'TICKET OFFICE', vietnamese: 'Quầy bán vé', category: 'transport' },
      { original: 'INFORMATION DESK', vietnamese: 'Quầy hướng dẫn thông tin', category: 'instruction' },
      { original: 'CHEF RECOMMENDATION', vietnamese: 'Món gợi ý đặc biệt của đầu bếp', category: 'menu' },
      { original: 'BILL / CHECK PLEASE', vietnamese: 'Làm ơn cho xin hóa đơn tính tiền', category: 'dining' },
      { original: 'FREE WI-FI', vietnamese: 'Mạng Wi-Fi miễn phí', category: 'instruction' },
      { original: 'RESERVED', vietnamese: 'Bàn / Chỗ đã được đặt trước', category: 'dining' },
      { original: 'OUT OF ORDER', vietnamese: 'Thiết bị đang bị hỏng ngưng hoạt động', category: 'warning' },
    ],
    commonPhrases: [
      { original: 'Excuse me, where is the restroom?', pronunciation: 'Ích-kiu-z mi, goe iz đờ rét-rum?', vietnamese: 'Xin lỗi, nhà vệ sinh ở đâu ạ?', category: 'transport' },
      { original: 'How much is this?', pronunciation: 'Hao mắt-ch iz đít?', vietnamese: 'Cái này bao nhiêu tiền?', category: 'shopping' },
      { original: 'Could I have the bill, please?', pronunciation: 'Cút ai háp đờ biu, plí-z?', vietnamese: 'Làm ơn cho tôi xin hóa đơn tính tiền', category: 'dining' },
      { original: 'Please help me!', pronunciation: 'Plí-z hép mi!', vietnamese: 'Làm ơn giúp tôi với!', category: 'emergency' },
    ],
    dictionary: {
      'gate': 'Cổng',
      'bus': 'Xe buýt',
      'train': 'Tàu hỏa',
      'water': 'Nước',
      'coffee': 'Cà phê',
      'tea': 'Trà',
      'hospital': 'Bệnh viện',
      'police': 'Cảnh sát',
      'hotel': 'Khách sạn',
    },
  },
];
