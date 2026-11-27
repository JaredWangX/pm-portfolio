'use strict';

// Portfolio fixtures, not live restaurant menus. Shape and grouping follow
// MerchantDetailView.swift / MenuContent; the archived real menus stay separate.
(() => {
  const languages = ['vi', 'zh', 'en', 'ja', 'ko'];
  const words = values => Object.fromEntries(languages.map((language, index) => [language, values[index]]));
  const categories = {
    main: words(['Món chính', '主食与招牌菜', 'Main dishes', '主食・おすすめ', '식사·추천 메뉴']),
    combo: words(['Combo', '组合套餐', 'Combos', 'セット', '세트 메뉴']),
    side: words(['Món thêm', '配菜与加料', 'Sides and extras', 'サイド・追加', '곁들임·추가']),
    drink: words(['Đồ uống', '饮品', 'Drinks', 'ドリンク', '음료']),
    coffee: words(['Cà phê', '咖啡', 'Coffee', 'コーヒー', '커피']),
    tea: words(['Trà', '茶饮', 'Tea', 'お茶', '차']),
    bakery: words(['Bánh và đồ ăn nhẹ', '烘焙与小食', 'Bakery and snacks', 'パン・軽食', '베이커리·간식'])
  };
  const descriptions = {
    pho: words(['Phở nước dùng trong; rau thơm và ớt để riêng theo yêu cầu.', '清汤河粉，香草和辣椒可备注另放；配料以所选菜品为准。', 'Clear-broth pho. Request herbs and chilli separately; toppings depend on the selected dish.', 'あっさりしたスープのフォー。香草と唐辛子は別添えを指定できます。具材は選んだ料理によります。', '맑은 국물 쌀국수입니다. 허브와 고추는 따로 요청할 수 있으며, 재료는 선택한 메뉴에 따라 달라집니다.']),
    mixed: words(['Phở trộn với nước sốt để riêng; vui lòng xác nhận thành phần lạc và nước mắm.', '拌河粉搭配分装酱汁；花生、鱼露等配料请按忌口确认。', 'Mixed pho with sauce on the side. Check peanut and fish-sauce ingredients if needed.', 'タレを別添えにした混ぜフォー。ピーナッツや魚醤の使用は必要に応じて確認してください。', '소스를 따로 제공하는 비빔 쌀국수입니다. 땅콩과 피시소스 등 알레르기 재료를 확인해 주세요.']),
    rice: words(['Cơm phần một người, ăn kèm rau và nước sốt riêng.', '单人份米饭与主菜组合，搭配蔬菜和单独酱料。', 'A single-serving rice meal with vegetables and sauce on the side.', '野菜と別添えソース付きの一人分のご飯セットです。', '채소와 별도 소스를 곁들인 1인분 밥 메뉴입니다.']),
    banh: words(['Bánh mì kẹp; có thể yêu cầu điều chỉnh dưa leo, đồ chua và ớt.', '越式法棍夹馅；黄瓜、酸菜和辣椒可按口味备注。', 'Vietnamese baguette sandwich. Request changes to cucumber, pickles or chilli.', 'ベトナム風バゲットサンド。きゅうり、なます、唐辛子は好みに合わせて指定できます。', '베트남식 바게트 샌드위치입니다. 오이, 절임 채소, 고추는 취향에 따라 요청할 수 있습니다.']),
    veggie: words(['Món ăn từ nguyên liệu thực vật; người ăn chay nghiêm ngặt nên xác nhận gia vị và nước dùng.', '以植物食材为主的餐品；严格素食需核实调味料、汤底与共用厨具。', 'Plant-based ingredients. Strict vegetarians should confirm seasonings, stock and shared utensils.', '植物性食材を中心とした料理です。厳格な菜食の方は調味料、だし、共用調理器具を確認してください。', '식물성 재료 중심의 메뉴입니다. 엄격한 채식을 한다면 양념, 육수, 공용 조리도구를 확인해 주세요.']),
    coffee: words(['Cà phê pha theo phần; vui lòng xác nhận sữa, độ ngọt và lượng đá.', '单份咖啡，可备注冰量与甜度；含乳品项请提前确认。', 'One serving of coffee. Specify ice and sweetness, and check milk ingredients.', '一杯分のコーヒー。氷や甘さを指定し、乳成分は事前に確認してください。', '커피 1잔입니다. 얼음과 당도를 요청하고 우유 성분을 확인해 주세요.']),
    tea: words(['Trà pha theo phần; có thể yêu cầu ít đường hoặc ít đá.', '单份茶饮，可选少糖或少冰；口味以所选品项为准。', 'One serving of tea. Request less sugar or ice; flavours depend on the selected drink.', '一杯分のお茶。甘さ控えめや氷少なめを指定できます。味は選んだ品目によります。', '차 1잔입니다. 당도와 얼음을 조절할 수 있으며, 맛은 선택한 메뉴에 따라 달라집니다.']),
    bun: words(['Bún với nước dùng và phần ăn đã chọn; rau thơm có thể để riêng.', '米线搭配所选主菜与汤底，香草可备注另放。', 'Rice vermicelli with the selected main ingredient and broth. Request herbs separately.', '選んだ具材とスープを合わせた米麺。香草は別添えを指定できます。', '선택한 주재료와 국물을 곁들인 쌀국수입니다. 허브는 따로 요청할 수 있습니다.']),
    side: words(['Phần thêm cho một người; vui lòng xác nhận cách nấu và gia vị.', '适合一人份正餐加配，做法与调味可向店家确认。', 'An extra portion for one meal. Confirm preparation and seasoning with the restaurant.', '一人分の食事に追加するサイドです。調理法や味付けはお店に確認してください。', '1인분 식사에 곁들이는 추가 메뉴입니다. 조리법과 양념은 매장에 확인해 주세요.']),
    coffeeExtra: words(['Mục thêm hoặc thay thế cho một ly cà phê; không phải đồ uống riêng.', '咖啡的加料或替换项，需要与饮品一起选择，不能作为独立饮品。', 'An add-on or substitution for a coffee, not a separate drink.', 'コーヒーの追加・変更オプションです。単独のドリンクではありません。', '커피에 추가하거나 대체하는 옵션으로, 별도 음료가 아닙니다.']),
    drink: words(['Đồ uống một phần; vui lòng xác nhận đường, sữa và dung tích khi chọn.', '单份饮品，选择时可核对甜度、含乳情况与容量。', 'One drink. Check sweetness, milk content and serving size when choosing.', '一杯分の飲み物。甘さ、乳成分、容量を確認してお選びください。', '음료 1개입니다. 선택 시 당도, 우유 성분, 용량을 확인해 주세요.']),
    bakery: words(['Đồ ăn nhẹ một phần; vui lòng xác nhận sữa, trứng, hạt và gluten nếu dị ứng.', '单份烘焙或小食；乳、蛋、坚果及麸质过敏者请核实配料。', 'One bakery or snack portion. Check milk, egg, nut and gluten ingredients if allergic.', '一人分のパン・軽食。乳、卵、ナッツ、小麦のアレルギーがある場合は原材料を確認してください。', '베이커리 또는 간식 1개입니다. 우유, 달걀, 견과류, 글루텐 알레르기가 있다면 성분을 확인해 주세요.']),
    combo: words(['Combo gồm đồ uống và món ăn nhẹ đã ghi trong tên; một phần cho một người.', '包含名称所列的饮品与小食，一份套餐适合一人。', 'Includes the drink and snack named in the menu. One combo serves one person.', 'メニュー名に記載のドリンクと軽食を含む、一人分のセットです。', '메뉴명에 표시된 음료와 간식이 포함된 1인 세트입니다.'])
  };

  // Rows: Vietnamese, Chinese, English, Japanese, Korean, sample Grab price, category.
  const menus = {
    pho: [
      ['Phở gà đùi', '鸡腿汤河粉', 'Chicken thigh pho', '鶏もも肉のフォー', '닭다리살 쌀국수', 59000, 'main'],
      ['Phở gà xé', '手撕鸡肉汤河粉', 'Shredded chicken pho', 'ほぐし鶏のフォー', '찢은 닭고기 쌀국수', 55000, 'main'],
      ['Phở ức gà', '鸡胸肉汤河粉', 'Chicken breast pho', '鶏むね肉のフォー', '닭가슴살 쌀국수', 57000, 'main'],
      ['Phở gà nấm', '鸡肉香菇汤河粉', 'Chicken and mushroom pho', '鶏肉ときのこのフォー', '닭고기 버섯 쌀국수', 64000, 'main'],
      ['Gà thêm', '加份鸡肉', 'Extra chicken', '鶏肉追加', '닭고기 추가', 18000, 'side'],
      ['Trứng chần', '水波蛋', 'Poached egg', 'ポーチドエッグ', '수란', 10000, 'side'],
      ['Bánh phở thêm', '加份河粉', 'Extra pho noodles', 'フォー麺追加', '쌀국수 면 추가', 10000, 'side'],
      ['Rau luộc', '清烫蔬菜', 'Blanched vegetables', 'ゆで野菜', '데친 채소', 12000, 'side'],
      ['Trà chanh', '青柠茶', 'Lime tea', 'ライムティー', '라임차', 15000, 'drink'],
      ['Nước suối', '瓶装饮用水', 'Bottled water', 'ボトルウォーター', '생수', 10000, 'drink']
    ],
    mixed: [
      ['Phở trộn gà', '鸡肉拌河粉', 'Mixed chicken pho', '鶏肉の混ぜフォー', '닭고기 비빔 쌀국수', 62000, 'main'],
      ['Phở trộn gà đùi', '鸡腿拌河粉', 'Mixed pho with chicken thigh', '鶏もも肉の混ぜフォー', '닭다리살 비빔 쌀국수', 68000, 'main'],
      ['Phở trộn ức gà', '鸡胸拌河粉', 'Mixed pho with chicken breast', '鶏むね肉の混ぜフォー', '닭가슴살 비빔 쌀국수', 60000, 'main'],
      ['Phở trộn gà nấm', '鸡肉香菇拌河粉', 'Mixed chicken and mushroom pho', '鶏肉ときのこの混ぜフォー', '닭고기 버섯 비빔 쌀국수', 66000, 'main'],
      ['Gà xé thêm', '加份手撕鸡', 'Extra shredded chicken', 'ほぐし鶏追加', '찢은 닭고기 추가', 18000, 'side'],
      ['Bánh phở thêm', '加份河粉', 'Extra pho noodles', 'フォー麺追加', '쌀국수 면 추가', 10000, 'side'],
      ['Dưa leo muối', '腌黄瓜', 'Pickled cucumber', 'きゅうりの漬物', '오이 피클', 12000, 'side'],
      ['Trứng luộc', '水煮蛋', 'Boiled egg', 'ゆで卵', '삶은 달걀', 10000, 'side'],
      ['Trà chanh', '青柠茶', 'Lime tea', 'ライムティー', '라임차', 15000, 'drink'],
      ['Nước suối', '瓶装饮用水', 'Bottled water', 'ボトルウォーター', '생수', 10000, 'drink']
    ],
    rice: [
      ['Cơm gà luộc', '白切鸡肉饭', 'Poached chicken rice', 'ゆで鶏ご飯', '삶은 닭고기 덮밥', 54000, 'main'],
      ['Cơm gà xé', '手撕鸡肉饭', 'Shredded chicken rice', 'ほぐし鶏ご飯', '찢은 닭고기 덮밥', 50000, 'main'],
      ['Cơm gà nướng', '烤鸡肉饭', 'Grilled chicken rice', '焼き鶏ご飯', '구운 닭고기 덮밥', 59000, 'main'],
      ['Cơm gà nấm', '香菇鸡肉饭', 'Chicken and mushroom rice', '鶏肉ときのこご飯', '닭고기 버섯 덮밥', 62000, 'main'],
      ['Trứng ốp la', '煎蛋', 'Fried egg', '目玉焼き', '달걀 프라이', 10000, 'side'],
      ['Rau luộc', '清烫蔬菜', 'Blanched vegetables', 'ゆで野菜', '데친 채소', 12000, 'side'],
      ['Cơm trắng thêm', '加份白米饭', 'Extra steamed rice', '白ご飯追加', '공깃밥 추가', 8000, 'side'],
      ['Canh rau', '蔬菜清汤', 'Vegetable soup', '野菜スープ', '채소 수프', 12000, 'side'],
      ['Trà chanh', '青柠茶', 'Lime tea', 'ライムティー', '라임차', 15000, 'drink'],
      ['Nước suối', '瓶装饮用水', 'Bottled water', 'ボトルウォーター', '생수', 10000, 'drink']
    ],
    banh: [
      ['Bánh mì gà', '鸡肉越式法棍', 'Chicken banh mi', '鶏肉のバインミー', '닭고기 반미', 36000, 'main'],
      ['Bánh mì gà nướng', '烤鸡越式法棍', 'Grilled chicken banh mi', '焼き鶏のバインミー', '구운 닭고기 반미', 40000, 'main'],
      ['Bánh mì trứng', '鸡蛋越式法棍', 'Egg banh mi', '卵のバインミー', '달걀 반미', 28000, 'main'],
      ['Bánh mì đậu hũ', '豆腐越式法棍', 'Tofu banh mi', '豆腐のバインミー', '두부 반미', 32000, 'main'],
      ['Trứng thêm', '加份鸡蛋', 'Extra egg', '卵追加', '달걀 추가', 8000, 'side'],
      ['Gà thêm', '加份鸡肉', 'Extra chicken', '鶏肉追加', '닭고기 추가', 15000, 'side'],
      ['Khoai tây nướng', '烤土豆小份', 'Small roasted potato portion', 'ローストポテト小', '구운 감자 소', 18000, 'side'],
      ['Cà phê sữa đá', '越南冰奶咖啡', 'Vietnamese iced milk coffee', 'ベトナム風アイスミルクコーヒー', '베트남 아이스 연유커피', 28000, 'drink'],
      ['Trà chanh', '青柠茶', 'Lime tea', 'ライムティー', '라임차', 15000, 'drink'],
      ['Nước suối', '瓶装饮用水', 'Bottled water', 'ボトルウォーター', '생수', 10000, 'drink']
    ],
    veggie: [
      ['Cơm đậu hũ rau củ', '豆腐时蔬炒饭', 'Tofu and vegetable fried rice', '豆腐と野菜のチャーハン', '두부 채소 볶음밥', 49000, 'main'],
      ['Cơm nấm rau củ', '香菇时蔬饭', 'Mushroom and vegetable rice', 'きのこと野菜ご飯', '버섯 채소 덮밥', 50000, 'main'],
      ['Cơm đậu hũ sốt cà chua', '番茄豆腐饭', 'Tofu in tomato sauce with rice', 'トマトソース豆腐ご飯', '토마토 소스 두부 덮밥', 52000, 'main'],
      ['Gỏi cuốn chay', '蔬菜鲜春卷', 'Fresh vegetable spring rolls', '野菜の生春巻き', '채소 월남쌈', 38000, 'main'],
      ['Đậu hũ thêm', '加份豆腐', 'Extra tofu', '豆腐追加', '두부 추가', 15000, 'side'],
      ['Rau luộc', '清烫蔬菜', 'Blanched vegetables', 'ゆで野菜', '데친 채소', 12000, 'side'],
      ['Cơm trắng thêm', '加份白米饭', 'Extra steamed rice', '白ご飯追加', '공깃밥 추가', 8000, 'side'],
      ['Sữa đậu nành', '豆浆', 'Soy milk', '豆乳', '두유', 18000, 'drink'],
      ['Trà chanh', '青柠茶', 'Lime tea', 'ライムティー', '라임차', 15000, 'drink'],
      ['Nước suối', '瓶装饮用水', 'Bottled water', 'ボトルウォーター', '생수', 10000, 'drink']
    ],
    coffee: [
      ['Cà phê sữa và bánh', '越南炼乳咖啡与黄油小面包', 'Vietnamese milk coffee and butter roll', 'ベトナムミルクコーヒーとバターロール', '베트남 연유커피와 버터 롤', 48000, 'combo'],
      ['Cà phê đen đá', '越南冰黑咖啡', 'Vietnamese iced black coffee', 'ベトナム風アイスブラックコーヒー', '베트남 아이스 블랙커피', 25000, 'coffee'],
      ['Cà phê sữa đá', '越南冰奶咖啡', 'Vietnamese iced milk coffee', 'ベトナム風アイスミルクコーヒー', '베트남 아이스 연유커피', 32000, 'coffee'],
      ['Cà phê muối', '越南盐咖啡', 'Vietnamese salt coffee', 'ベトナム風塩コーヒー', '베트남 소금 커피', 38000, 'coffee'],
      ['Cà phê cốt dừa', '椰奶咖啡', 'Coconut coffee', 'ココナッツコーヒー', '코코넛 커피', 42000, 'coffee'],
      ['Bánh mì bơ', '黄油小面包', 'Butter roll', 'バターロール', '버터 롤', 18000, 'bakery'],
      ['Bánh sừng bò sô cô la', '巧克力可颂', 'Chocolate croissant', 'チョコレートクロワッサン', '초콜릿 크루아상', 25000, 'bakery'],
      ['Bánh chuối', '香蕉蛋糕', 'Banana cake', 'バナナケーキ', '바나나 케이크', 28000, 'bakery'],
      ['Thêm một shot cà phê', '加一份浓缩咖啡', 'Extra espresso shot', 'エスプレッソ追加', '에스프레소 샷 추가', 8000, 'side'],
      ['Đổi sữa yến mạch', '更换燕麦奶', 'Oat milk substitution', 'オーツミルクに変更', '오트밀크로 변경', 10000, 'side']
    ],
    tea: [
      ['Trà chanh và bánh yến mạch', '柠檬茶与燕麦小饼干', 'Lemon tea and oat cookies', 'レモンティーとオーツクッキー', '레몬차와 오트 쿠키', 45000, 'combo'],
      ['Trà chanh', '柠檬茶', 'Lemon tea', 'レモンティー', '레몬차', 25000, 'tea'],
      ['Trà đào', '蜜桃茶', 'Peach tea', 'ピーチティー', '복숭아차', 30000, 'tea'],
      ['Trà chanh dây', '百香果茶', 'Passion fruit tea', 'パッションフルーツティー', '패션프루트차', 32000, 'tea'],
      ['Trà tắc mật ong', '蜂蜜金橘茶', 'Honey kumquat tea', 'はちみつキンカンティー', '꿀 금귤차', 35000, 'tea'],
      ['Bánh quy yến mạch', '燕麦小饼干', 'Oat cookies', 'オーツクッキー', '오트 쿠키', 18000, 'bakery'],
      ['Bánh quy dừa', '椰香小饼干', 'Coconut cookies', 'ココナッツクッキー', '코코넛 쿠키', 18000, 'bakery'],
      ['Bánh mì nướng bơ', '黄油烤吐司', 'Butter toast', 'バタートースト', '버터 토스트', 20000, 'bakery'],
      ['Trà đá', '冰茶', 'Iced tea', 'アイスティー', '아이스티', 15000, 'tea'],
      ['Nước suối', '瓶装饮用水', 'Bottled water', 'ボトルウォーター', '생수', 10000, 'drink']
    ],
    bun: [
      ['Bún gà nấm', '香菇鸡肉米线', 'Chicken and mushroom rice vermicelli', '鶏肉ときのこの米麺', '닭고기 버섯 쌀국수', 57000, 'main'],
      ['Bún gà đùi', '鸡腿汤米线', 'Chicken thigh rice vermicelli soup', '鶏もも肉の米麺スープ', '닭다리살 쌀국수', 60000, 'main'],
      ['Bún ức gà', '鸡胸汤米线', 'Chicken breast rice vermicelli soup', '鶏むね肉の米麺スープ', '닭가슴살 쌀국수', 55000, 'main'],
      ['Bún đậu hũ nấm', '豆腐香菇米线', 'Tofu and mushroom rice vermicelli', '豆腐ときのこの米麺', '두부 버섯 쌀국수', 52000, 'main'],
      ['Gà thêm', '加份鸡肉', 'Extra chicken', '鶏肉追加', '닭고기 추가', 18000, 'side'],
      ['Nấm thêm', '加份香菇', 'Extra mushrooms', 'きのこ追加', '버섯 추가', 12000, 'side'],
      ['Bún thêm', '加份米线', 'Extra rice vermicelli', '米麺追加', '쌀국수 면 추가', 10000, 'side'],
      ['Trứng chần', '水波蛋', 'Poached egg', 'ポーチドエッグ', '수란', 10000, 'side'],
      ['Trà chanh', '青柠茶', 'Lime tea', 'ライムティー', '라임차', 15000, 'drink'],
      ['Nước suối', '瓶装饮用水', 'Bottled water', 'ボトルウォーター', '생수', 10000, 'drink']
    ]
  };

  for (const store of window.wansoCatalog) {
    const template = menus[store.key];
    if (!template) continue;
    const offset = store.platforms.grab.price - template[0][5];
    Object.defineProperty(store,'menu',{configurable:true,enumerable:true,get() {
      const menu = template.map((row, index) => {
      const categoryKey = row[6];
      const name = index === 0 ? store.dish : row[0];
      const translations = {...words(row.slice(0, 5)), vi: name};
      if (index === 0) translations.zh = store.dishZh;
      const descriptionKey = store.key === 'coffee' && categoryKey === 'side' ? 'coffeeExtra' : categoryKey === 'main' ? store.key : categoryKey;
      const translatedDescriptions = {...descriptions[descriptionKey]};
      if (index === 0) translatedDescriptions.zh = store.description;
      const grab = index === 0 ? store.platforms.grab.price : row[5] + (categoryKey === 'main' ? offset : 0);
      const shopee = index === 0 ? store.platforms.shopee.price : grab + (index % 3 === 0 ? 0 : index % 2 ? 1000 : 2000);
      return {
        id: store.id + '-menu-' + (index + 1), name, translations,
        category: categories[categoryKey].vi,
        categoryTranslations: categories[categoryKey],
        prices: {grab, shopee}, price: grab,
        description: translatedDescriptions.zh, descriptions: translatedDescriptions,
        sample: true
      };
    });
      Object.defineProperty(store,'menu',{value:menu,writable:true,configurable:true,enumerable:true});
      return menu;
    }});
    const city = store.city === 'hanoi' ? '河内' : '胡志明市';
    store.address = store.district + ' · ' + city + '（演示位置）';
    store.hours = ['coffee', 'tea'].includes(store.key) ? '07:00–22:00（演示营业时间）' : '06:00–22:00（演示营业时间）';
    store.platforms.grab.rating = Number(Math.max(4, store.rating - .1).toFixed(1));
    store.platforms.shopee.rating = Number(Math.min(4.9, store.rating + .1).toFixed(1));
    store.platforms.grab.reviewCount = Math.round(store.reviewCount * .58);
    store.platforms.shopee.reviewCount = store.reviewCount - store.platforms.grab.reviewCount;
    store.menuDataSource = 'portfolio-demo';
  }
})();
