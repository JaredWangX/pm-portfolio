'use strict';

// Illustrative restaurant branches and matched platform offers for the portfolio prototype.
// All prices, distances, review counts and availability below are demonstration data.
window.wansoCatalog = (() => {
  const dishes = [
    {key:'pho',name:'Phở Gà An Nhiên',dish:'Phở gà đùi',dishZh:"Phở gà đùi",category:"Món Việt · Phở nước",image:'demo/pho.jpg',price:59000,tags:["Thịt đùi gà", "Nước dùng nóng", "Ớt để riêng", "Một người"],description:"Thịt đùi gà mềm ăn cùng bánh phở và nước dùng gà trong. Giá, chanh và ớt được để riêng để bạn tự nêm khi nhận món.",reason:"🍜 Phở gà đùi phù hợp khi bạn muốn một bữa nóng, có đủ thịt và tinh bột. Nước dùng, bánh phở và rau được đóng riêng; nếu thích thanh đạm, hãy ghi ít muối và để ớt riêng."},
    {key:'mixed',name:'Phở Trộn Mộc',dish:'Phở trộn gà',dishZh:"Phở trộn gà",category:"Món Việt · Phở trộn",image:'native/order-quyen.webp',price:62000,tags:["Thịt gà", "Phở trộn", "Sốt để riêng", "Bữa trưa"],description:"Thịt gà và bánh phở trộn cùng sốt chua ngọt; sốt và rau thơm đóng riêng, hợp với người thích món khô thay vì nước dùng.",reason:"🥢 Phở trộn gà là lựa chọn khi bạn không muốn ăn món nước. Rưới sốt từng ít một để giữ vị vừa miệng; nếu dị ứng lạc, nước mắm hoặc hải sản, cần xác nhận thành phần với quán."},
    {key:'rice',name:'Cơm Gà Nắng',dish:'Cơm gà luộc',dishZh:"Cơm gà luộc",category:"Món Việt · Cơm gà",image:'demo/chicken-rice.webp',price:54000,tags:["Gà luộc", "Cơm", "Rau ăn kèm", "Bữa trưa"],description:"Cơm gà luộc một phần gồm thịt gà, cơm và rau củ muối, kèm sốt riêng; dễ mang về bàn làm việc.",reason:"🍚 Cơm gà luộc có cơm, thịt và rau trong cùng một hộp, phù hợp cho bữa trưa giữa giờ làm. Giá món vừa phải giúp bạn giữ thêm ngân sách cho phí giao hàng."},
    {key:'banh',name:'Bánh Mì Sớm',dish:'Bánh mì gà',dishZh:"Bánh mì gà",category:"Món Việt · Bánh mì",image:'demo/banh-mi.jpg',price:36000,tags:["Bánh mì", "Thịt gà", "Bữa sáng", "Dễ mang theo"],description:"Bánh mì giòn kẹp thịt gà, dưa leo và đồ chua; có thể ghi không ớt, phù hợp bữa sáng hoặc bữa trưa nhẹ.",reason:"🥖 Bánh mì gà dễ mang theo và để lại khoảng ngân sách khá thoải mái. Khẩu phần nhẹ hơn một suất cơm; nếu đang đói nhiều, bạn có thể xem thêm món phụ rồi so lại tổng tiền."},
    {key:'veggie',name:'Bếp Xanh',dish:'Cơm đậu hũ rau củ',dishZh:"Cơm đậu hũ rau củ",category:"Món chay · Cơm",image:'demo/tofu-rice.webp',price:49000,tags:["Đậu hũ", "Rau củ", "Thanh đạm", "Nguyên liệu thực vật"],vegetarian:true,description:"Cơm một phần với đậu hũ và rau củ; có thể ghi ít dầu, sốt để riêng. Người ăn chay nghiêm ngặt nên hỏi lại về nước dùng và gia vị.",reason:"🥬 Cơm đậu hũ rau củ hợp với bữa ăn muốn tăng nguyên liệu thực vật. Nếu ăn chay nghiêm ngặt, vẫn cần xác nhận nước mắm, nước dùng và dụng cụ dùng chung với quán."},
    {key:'coffee',name:'Cà Phê Bình Minh',dish:'Cà phê sữa và bánh',dishZh:"Cà phê sữa và bánh",category:"Cà phê · Ăn nhẹ",image:'demo/iced-coffee.webp',price:42000,tags:["Cà phê", "Có sữa", "Tùy chỉnh độ ngọt", "Buổi chiều"],vegetarian:true,description:"Cà phê sữa Việt Nam kèm bánh mì bơ, phù hợp giờ nghỉ chiều; có thể ghi nóng hoặc lạnh, lượng đá và độ ngọt.",reason:"☕ Cà phê cùng bánh mì bơ vừa có thức uống vừa có món nhẹ cho giờ nghỉ. Muốn bớt ngọt có thể yêu cầu giảm nửa lượng sữa đặc; món có sữa và caffeine, cần cân nhắc nếu bạn dị ứng sữa."},
    {key:'tea',name:'Trà Mây',dish:'Trà chanh và bánh yến mạch',dishZh:"Trà chanh và bánh yến mạch",category:"Trà · Ăn nhẹ",image:'demo/lemon-tea.webp',price:45000,tags:["Trà chanh", "Có thể ít đường", "Buổi chiều", "Ăn nhẹ"],vegetarian:true,description:"Trà chanh kèm bánh quy yến mạch, vị thanh mát cho buổi chiều; có thể ghi nửa đường, ít đá.",reason:"🧋 Trà chanh thanh mát kèm bánh quy tạo một bữa ăn nhẹ vừa đủ. Bạn có thể chọn nửa đường, ít đá; bánh có thể chứa sữa, trứng và gluten, nên kiểm tra nếu có dị ứng."},
    {key:'bun',name:'Bún Gà Bình Yên',dish:'Bún gà nấm',dishZh:"Bún gà nấm",category:"Món Việt · Bún nước",image:'demo/pho.jpg',price:57000,tags:["Bún", "Thịt gà", "Nấm", "Nước dùng nóng"],description:"Bún sợi nhỏ ăn cùng thịt gà, nấm và nước dùng trong; rau ăn kèm đóng riêng, có thể thêm chanh theo khẩu vị.",reason:"🍲 Bún gà nấm đổi kết cấu sợi so với phở nhưng vẫn giữ thịt gà và nước dùng nóng. Hợp khi muốn đổi món mà không cần sốt đậm vị."}
  ];
  const locations = [
    ['hanoi','Hoàn Kiếm','Hoàn Kiếm'],['hanoi','Ba Đình','Ba Đình'],['hanoi','Đống Đa','Đống Đa'],['hanoi','Cầu Giấy','Cầu Giấy'],['hanoi','Hai Bà Trưng','Hai Bà Trưng'],
    ['hcm','Quận 1','Quận 1'],['hcm','Quận 3','Quận 3'],['hcm','Bình Thạnh','Bình Thạnh'],['hcm','Quận 7','Quận 7'],['hcm','Thủ Đức','Thủ Đức']
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
  const mealNotes=["Rau và gia vị để riêng, bạn tự điều chỉnh lượng khi ăn.", "Có thể yêu cầu sốt riêng để dễ điều chỉnh theo khẩu vị.", "Một phần có món chính và rau ăn kèm, thuận tiện cho bữa ăn một người.", "Nếu thích vị nhẹ, hãy ghi ít muối, ít sốt và xác nhận quán có thể đáp ứng.", "Hộp món chính và gia vị tách riêng, tiện mang về bàn làm việc."];
  const drinkNotes={
    "coffee": [
        "Có thể giảm nửa lượng sữa đặc; bánh mì bơ được gói riêng.",
        "Muốn vị cà phê rõ hơn có thể giảm sữa đặc, đồng thời ghi nóng hoặc lạnh.",
        "Cà phê và bánh mì bơ phù hợp cho một khoảng nghỉ ngắn.",
        "Ít sữa đặc giúp giảm độ ngọt; thức uống vẫn chứa sữa và caffeine.",
        "Đặt chung hai phần có thể gộp phí giao hàng; hãy ghi riêng lượng đá và độ ngọt cho từng ly."
    ],
    "tea": [
        "Lượng đường và đá có thể ghi trong lưu ý; bánh yến mạch được gói riêng.",
        "Có thể chọn nửa đường để giữ hương trà và vị chua nhẹ của chanh.",
        "Một ly trà chanh cùng bánh yến mạch phù hợp cho giờ nghỉ chiều.",
        "Thích vị thanh mát có thể chọn ít đường, ít đá và không thêm topping.",
        "Đặt chung hai phần có thể gộp phí giao hàng; hãy ghi độ ngọt và lượng đá của từng ly."
    ]
};
  const secondNames={
    pho:['Phở Gà Lá Chanh','Phở Gà Tre Xanh','Bếp Phở Hoa','Phở Gà Thảo','Phở Hương Sáng'],
    mixed:['Phở Trộn Sen','Phở Trộn Bếp Nhỏ','Phở Trộn An Bình','Phở Mộc Lan','Phở Trộn Hạ'],
    rice:['Cơm Gà Lúa','Bếp Cơm Thảo','Cơm Gà Đồi','Cơm Hương Lúa','Cơm Gà Mùa'],
    banh:['Bánh Mì Lá','Bánh Mì Trúc','Bánh Mì Sen','Bánh Mì Bình An','Bánh Mì Mộc'],
    veggie:['Bếp Chay Sen','Cơm Chay Mùa','Vườn Chay An','Bếp Rau Mộc','Chay Hương Xanh'],
    coffee:['Hạt Coffee','Hiên Coffee','Ban Mai Coffee','Thảo Coffee','Phố Mây Coffee'],
    tea:['Trà Sen Nhỏ','Trà Hạ','Trà Hiên Nhà','Trà Bình An','Trà Mộc Lan'],
    bun:['Bún Gà Tre','Bún Gà Sen','Bún Gà Lá','Bún Mộc Hương','Bún Gà Thảo']
  };
  // Thresholds are illustrative rules, independent of the current basket quantity.
  const merchant=(rateBps,minSpend,cap)=>({rateBps,minSpend,cap});
  const fixed=(id,name,minSpend,amount)=>({id,name,type:'fixed',minSpend,amount});
  const rate=(id,name,minSpend,rateBps,cap)=>({id,name,type:'rate',minSpend,rateBps,cap});
  const promotionBundles=[
      {merchant:merchant(1000,40000,12000),coupons:[fixed('lunch8','Mã giảm bữa trưa',50000,8000),rate('group15','Mã ưu đãi nhóm',75000,1500,18000)],delivery:{minSpend:60000,amount:12000}},
      {coupons:[fixed('meal6','Mã bữa ăn một người',35000,6000),fixed('group16','Mã đặt chung',100000,16000)],delivery:{minSpend:70000,amount:null}},
      {merchant:merchant(1200,0,16000),coupons:[fixed('save10','Mã giảm tiền món',70000,10000)]},
      {coupons:[rate('save12','Mã ưu đãi ăn nhẹ',30000,1200,10000)],delivery:{minSpend:35000,amount:null}},
      {merchant:merchant(500,50000,10000),coupons:[fixed('meal5','Mã ưu đãi hằng ngày',45000,5000)],delivery:{minSpend:90000,amount:10000}},
      {coupons:[rate('meal15','Mã giảm món ăn',40000,1500,15000),fixed('group20','Mã giảm đơn nhóm',120000,20000)],delivery:{minSpend:50000,amount:null}},
      {merchant:merchant(1500,60000,20000),coupons:[fixed('group12','Mã giảm đặt chung',80000,12000)],delivery:{minSpend:100000,amount:12000}},
      {coupons:[fixed('high15','Mã đơn giá trị cao',100000,15000)]}
  ];
  function promotion(index,platform) {
    if(index%11===10)return {}; // Some merchants have no available offer on either platform.
    const tier=(index*7+Math.floor(index/8)*3+(platform==='shopee'?5:0))%8;
    return promotionBundles[tier];
  }
  const stores=[];
  // Seeded branches keep old IDs stable; the catalogue is illustrative, not live platform coverage.
  const cityStores={hanoi:[],hcm:[]}, stats={};
  for(let edition=0;edition<312;edition++) for (const [city,district,branch] of locations) {
    for (const dish of dishes) {
      const index=stores.length;
      const variation=Math.floor(index/dishes.length)%5;
      const detail=(drinkNotes[dish.key]||mealNotes)[variation];
      const description=dish.description+' '+detail;
      const price=dish.price+(index%3)*2000+(edition<2?edition*((index%4)-1):((edition*7+index*3)%15)-7)*1000;
      const grabFee=8000+(index%4)*2000;
      const shopeeFee=10000+(index%3)*2000;
      const grab={name:'GrabFood',price,fee:grabFee,promotion:promotion(index,'grab')};
      const shopee={name:'ShopeeFood',price:price+2000,fee:shopeeFee,promotion:promotion(index,'shopee')};
      const store={
        ...dish,id:'demo-'+(index+1),name:(edition%2?secondNames:shopNames)[dish.key][variation]+' · '+branch+(edition<2?'':' '+String(Math.floor(edition/2)+1).padStart(3,'0')),city,district,description,reason:dish.reason,
        image:'../../assets/wanso/'+dish.image,
        rating:Number((4.1+(index%9)/10).toFixed(1)),reviewCount:96+(index*137)%4200,distance:Number((0.5+(index%(edition<2?11:27))*0.3).toFixed(1)),eta:18+(index%(edition<2?7:13))*3,
        vegetarian:Boolean(dish.vegetarian),spicy:false,platforms:{grab,shopee},sample:true
      };
      for(const key of ['grab','shopee']) {
        const offer=window.wansoOffers.summary(store,key,1);
        Object.assign(store.platforms[key],{discount:offer.discount,total:offer.total,netDeliveryFee:offer.netDeliveryFee});
      }
      stores.push(store);cityStores[city].push(store);
    }
  }
  for(const [city,list] of Object.entries(cityStores)) stats[city]={
    stores:list.length,
    hasDiscount:list.filter(store=>Object.values(store.platforms).some(offer=>offer.discount>0)).length,
    freeDelivery:list.filter(store=>Object.values(store.platforms).some(offer=>offer.netDeliveryFee===0)).length
  };
  window.wansoCatalogByCity=cityStores;
  window.wansoCatalogStats=stats;
  return stores;
})();
