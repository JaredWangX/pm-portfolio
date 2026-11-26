'use strict';

// Illustrative restaurant branches and matched platform offers for the portfolio prototype.
// All prices, distances, review counts and availability below are demonstration data.
window.wansoCatalog = (() => {
  const dishes = [
    {key:'pho',name:'Phở Gà An Nhiên',dish:'Phở gà đùi',dishZh:'鸡腿汤河粉',category:'越南菜 · 汤河粉',image:'demo/pho.jpg',price:59000,tags:['鸡腿肉','热汤','辣椒另放','一人食'],description:'鸡腿肉搭配细河粉和鸡汤，豆芽、青柠和辣椒分装，适合想吃热食的一餐。',reason:'🍜 鸡腿汤河粉的主食和肉类都符合要求；示例套餐的汤、粉、配料分别包装，送达后再组合。想吃清淡可以备注少盐、辣椒另放。'},
    {key:'mixed',name:'Phở Trộn Mộc',dish:'Phở trộn gà',dishZh:'鸡肉拌河粉',category:'越南菜 · 拌河粉',image:'native/order-quyen.webp',price:62000,tags:['鸡肉','拌河粉','酱汁另放','工作午餐'],description:'鸡肉与拌河粉配酸甜酱汁，酱汁和香草单独包装，适合偏好干拌口感的人。',reason:'🥢 这家的鸡肉拌河粉适合不想喝汤时选，酱汁单独加能控制浓淡。若对花生或鱼露过敏，需要先向店家核实配方。'},
    {key:'rice',name:'Cơm Gà Nắng',dish:'Cơm gà luộc',dishZh:'白切鸡肉饭',category:'越南菜 · 鸡肉饭',image:'demo/chicken-rice.webp',price:54000,tags:['白切鸡','米饭','蔬菜配菜','午餐'],description:'白切鸡、米饭和腌蔬菜组成单人套餐，酱料另装，便于带回工位吃。',reason:'🍚 白切鸡肉饭把主食、肉和配菜装在同一餐盒，适合工作间隙吃。示例菜单的单人份价格较低，可以把预算留给配送。'},
    {key:'banh',name:'Bánh Mì Sớm',dish:'Bánh mì gà',dishZh:'鸡肉越式法棍',category:'越南小吃 · 法棍',image:'demo/banh-mi.jpg',price:36000,tags:['法棍','鸡肉','早餐','方便携带'],description:'烤法棍夹鸡肉、黄瓜和腌菜，可备注不加辣椒，适合通勤早餐或轻量午餐。',reason:'🥖 鸡肉法棍方便携带，餐品价格留有较多预算空间。它比一份米饭套餐轻巧，特别饿的时候可以加配小食。'},
    {key:'veggie',name:'Bếp Xanh',dish:'Cơm đậu hũ rau củ',dishZh:'豆腐时蔬炒饭',category:'素食 · 米饭',image:'demo/tofu-rice.webp',price:49000,tags:['豆腐','时蔬','清淡','植物食材'],vegetarian:true,description:'豆腐块、时蔬和米饭炒制的单人餐，可备注少油、酱汁另放。严格素食需再确认汤底和酱料。',reason:'🥬 豆腐时蔬炒饭以植物食材为主，适合想多吃蔬菜的一餐。若是严格素食，仍需向店家确认鱼露、汤底与共用厨具。'},
    {key:'coffee',name:'Cà Phê Bình Minh',dish:'Cà phê sữa và bánh',dishZh:'越南炼乳咖啡与黄油小面包',category:'咖啡 · 轻食套餐',image:'demo/iced-coffee.webp',price:42000,tags:['咖啡','含乳','糖量可调','下午茶'],vegetarian:true,description:'一杯越南炼乳咖啡搭配一份黄油小面包，适合下午休息；咖啡冷热、冰量和甜度可备注。',reason:'☕ 咖啡与小面包组合同时照顾饮品和轻食，适合不想点正餐的下午。想少甜可备注炼乳减半；含乳与咖啡因，不适合乳制品过敏者。'},
    {key:'tea',name:'Trà Mây',dish:'Trà chanh và bánh yến mạch',dishZh:'柠檬茶与燕麦小饼干',category:'茶饮 · 轻食套餐',image:'demo/lemon-tea.webp',price:45000,tags:['柠檬茶','少甜可选','下午茶','轻食'],vegetarian:true,description:'柠檬茶搭配一份燕麦饼干，适合想喝清爽茶饮的下午，可备注半糖、少冰。',reason:'🧋 柠檬茶偏清爽，搭配小饼干能兼顾一点饱腹感。可以先选半糖少冰；饼干可能含乳、蛋和麸质，有忌口需核实。'},
    {key:'bun',name:'Bún Gà Bình Yên',dish:'Bún gà nấm',dishZh:'香菇鸡肉米线',category:'越南菜 · 米线',image:'demo/pho.jpg',price:57000,tags:['米线','鸡肉','香菇','热汤'],description:'细米线搭配鸡肉、香菇和清汤，配菜单独包装，可按口味加入青柠。',reason:'🍲 香菇鸡肉米线提供了河粉之外的主食选择，仍保留鸡肉与热汤。适合想换一种口感、又不想吃重口酱汁的时候。'}
  ];
  const locations = [
    ['hanoi','还剑区','Hoàn Kiếm'],['hanoi','巴亭区','Ba Đình'],['hanoi','栋多区','Đống Đa'],['hanoi','纸桥区','Cầu Giấy'],['hanoi','二征夫人区','Hai Bà Trưng'],
    ['hcm','第一郡','Quận 1'],['hcm','第三郡','Quận 3'],['hcm','平盛郡','Bình Thạnh'],['hcm','第七郡','Quận 7'],['hcm','守德市','Thủ Đức']
  ];
  const shopNames={
    pho:['Phở Gà An Nhiên','Phở Gà Bình Minh','Phở Ngõ Nhỏ','Phở Gà Hương Quê','Phở Nhà Mình'],
    mixed:['Phở Trộn Mộc','Phở Trộn Lá Chanh','Bếp Phở An','Phở Trộn Phố Nhỏ','Phở Trộn Mai'],
    rice:['Cơm Gà Nắng','Cơm Nhà An','Bếp Gà Xanh','Cơm Gà Hương','Bữa Trưa Việt'],
    banh:['Bánh Mì Sớm','Bánh Mì Góc Phố','Bánh Mì Hương','Bánh Mì Nắng Mai','Bánh Mì Nhà Nhỏ'],
    veggie:['Bếp Xanh','Cơm Chay An','Vườn Nhỏ','Bữa Chay Mộc','Lá Xanh Kitchen'],
    coffee:['Cà Phê Bình Minh','Cà Phê Góc Nhỏ','Mây Coffee','Nắng Coffee','Lá Coffee'],
    tea:['Trà Mây','Trà Góc Vườn','Trà An Nhiên','Trà Nắng Nhẹ','Trà Phố Xanh'],
    bun:['Bún Gà Bình Yên','Bún Nhà Mộc','Bún Gà Hương Sớm','Bún Phố Nhỏ','Bún Gà An']
  };
  const mealNotes=['配菜另装，吃的时候可以自己决定加多少。','示例菜单可选酱料另放，适合偏好清淡口味的人。','单人份包含主食和配菜，不需要另外拼配一餐。','喜欢原味可以在备注中少盐、少酱，店家是否接受需确认。','餐盒与配料分开包装，方便带回工位再吃。'];
  const drinkNotes=['甜度与冰量可备注，小点心独立包装。','可以先选半糖，避免把咖啡本身的风味盖住。','一杯饮品配一份小食，适合短暂休息时慢慢吃。','喜欢清爽口味可选少糖少冰，不额外添加配料。','两人同店点单可以合并配送，记得分别写清口味。'];
  const stores=[];
  for (const [city,district,branch] of locations) {
    for (const dish of dishes) {
      const index=stores.length;
      const variation=Math.floor(index/dishes.length)%5;
      const detail=(['coffee','tea'].includes(dish.key)?drinkNotes:mealNotes)[variation];
      const description=dish.description+' '+detail;
      const price=dish.price+(index%3)*2000;
      const grabFee=8000+(index%4)*2000;
      const shopeeFee=10000+(index%3)*2000;
      const grabDiscount=index%3===0?5000:0;
      const shopeeDiscount=index%2===0?6000:3000;
      const grab={name:'GrabFood',price,fee:grabFee,discount:grabDiscount,total:price+grabFee-grabDiscount};
      const shopee={name:'ShopeeFood',price:price+2000,fee:shopeeFee,discount:shopeeDiscount,total:price+2000+shopeeFee-shopeeDiscount};
      stores.push({
        ...dish,id:'demo-'+(index+1),name:shopNames[dish.key][variation]+' · '+branch,city,district,description,reason:dish.reason+' '+detail,
        image:'../../assets/wanso/'+dish.image,
        rating:4.3+(index%5)/10,reviewCount:180+index*37,distance:0.7+(index%7)*0.3,eta:20+(index%4)*5,
        vegetarian:Boolean(dish.vegetarian),spicy:false,platforms:{grab,shopee},sample:true,
        menu:[{name:dish.dish+' · '+dish.dishZh,price,description},
          {name:'Trà chanh · 青柠茶',price:15000,description:'可选择少糖，不添加额外配料。'},
          {name:'Rau thêm · 加份蔬菜',price:12000,description:'搭配本餐的小份时蔬。'}]
      });
    }
  }
  return stores;
})();
