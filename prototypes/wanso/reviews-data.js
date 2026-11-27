'use strict';

// Illustrative tasting notes, not reviews submitted by real customers.
// Keep the native author/rating/dish/text shape for the shared store component.
window.wansoReviews = (() => {
  const people = [
    ['Minh Anh', 'M'], ['Quốc Việt', 'V'], ['Thanh Hà', 'H'], ['An Nhiên', 'A'],
    ['Mai Linh', 'L'], ['Bảo Ngọc', 'N'], ['Thu Trang', 'T'], ['Đức Huy', 'H'],
    ['Khánh An', 'A'], ['Hạ Vy', 'V'], ['Gia Bảo', 'B'], ['Hoài Nam', 'N']
  ];
  // Each entry refers to one of the first three dishes in the restaurant menu.
  const stories = {
    pho: [
      [d => `🍜 ${d} kết hợp thịt gà, bánh phở và nước dùng nóng. Muốn vị thanh, hãy nếm nước dùng trước rồi mới thêm chanh hoặc ớt. Nếu cần rau thơm riêng, nên ghi rõ thay vì chỉ viết “ăn nhạt”.`, ['Nước dùng thanh', 'Ớt để riêng']],
      [d => `${d} phù hợp cho bữa trưa có cả thịt và tinh bột. Nếu ăn khỏe, hãy xem khẩu phần và giá món thêm trước khi đặt; bánh phở để lâu dễ mềm nên ăn sớm sau khi nhận.`, ['Bữa trưa tiện lợi', 'Nên ăn khi còn nóng']],
      [d => `${d} hợp với người muốn một bữa nóng mà không dùng nhiều sốt. Thịt ức có kết cấu chắc hơn đùi; hãy đối chiếu phần thịt trong tên món và xác nhận với quán nếu bạn có sở thích cụ thể.`, ['Vị nhẹ', 'Chọn phần thịt phù hợp']]
    ],
    mixed: [
      [d => `🥢 ${d} có thịt gà, bánh phở và sốt chua ngọt. Nên rưới một phần sốt, trộn đều rồi mới thêm; ghi riêng yêu cầu về ớt và rau thơm giúp quán hiểu đúng khẩu vị hơn.`, ['Thêm sốt từng ít', 'Phở trộn']],
      [d => `${d} là lựa chọn khi không muốn dùng món nước. Trộn đều để sốt phủ lên sợi phở; người dị ứng lạc, nước mắm hoặc hải sản cần hỏi thành phần của cả món lẫn sốt trước khi chọn.`, ['Thịt đùi gà', 'Kiểm tra thành phần']],
      [d => `${d} phù hợp khi thích gà cùng sợi phở khô. Có thể ghi ít sốt để giữ vị món; nếu muốn thêm rau hoặc món phụ, nên cộng cả phần đó khi so tổng tiền hai nền tảng.`, ['Thịt chắc', 'Có thể ít sốt']]
    ],
    rice: [
      [d => `🍚 ${d} gộp cơm, thịt gà và rau trong một bữa, thuận tiện ăn giữa giờ làm. Hãy xem sốt có được để riêng không; nếu thường ăn nhiều rau, kiểm tra phần rau kèm trước khi quyết định gọi thêm.`, ['Một phần đủ món', 'Sốt để riêng']],
      [d => `${d} phù hợp bữa trưa hằng ngày khi bạn thích cơm với thịt gà. So giá phải cùng khẩu phần và món kèm; nếu cần thêm cơm, hãy tính giá phần thêm để không đánh giá thấp tổng chi phí.`, ['Bữa trưa quen thuộc', 'Có thể thêm cơm']],
      [d => `${d} dành cho người thích hương gà nướng rõ hơn; muốn vị thanh có thể đối chiếu món gà luộc. Nên ghi riêng lượng sốt và mức cay vì tên món không thể hiện hết cách nêm nếm.`, ['Hương gà nướng', 'Chọn theo khẩu vị']]
    ],
    banh: [
      [d => `🥖 ${d} dễ mang theo cho bữa sáng. Thịt gà, dưa leo và đồ chua tạo nhiều kết cấu; nên ăn sớm khi bánh còn giòn. Nếu để ăn muộn, có thể hỏi quán về việc gói riêng phần nhân.`, ['Dễ mang theo', 'Ăn sớm để giữ độ giòn']],
      [d => `${d} là một lựa chọn bánh mì với hương gà nướng. Ghi “không ớt” và “ít đồ chua” thành từng ý sẽ rõ hơn; nếu tránh sữa hoặc trứng, cần kiểm tra cả thành phần sốt.`, ['Nhân gà nướng', 'Ghi chú cụ thể']],
      [d => `${d} hợp bữa sáng nhẹ và có thể đi cùng đồ uống. Nếu dùng cho bữa trưa, hãy kiểm tra kích thước bánh và lượng nhân theo sức ăn; thêm món phụ rồi so lại tổng đã gồm giao hàng.`, ['Bữa sáng nhẹ', 'Tùy chỉnh theo sức ăn']]
    ],
    veggie: [
      [d => `🥬 ${d} có đậu hũ, rau và tinh bột, phù hợp khi muốn thêm nguyên liệu thực vật. Món vẫn có gia vị; nếu ăn chay nghiêm ngặt hoặc có dị ứng, hãy xác nhận sốt và cách chế biến với quán.`, ['Nguyên liệu thực vật', 'Xác nhận gia vị']],
      [d => `${d} hợp với người thích vị nấm và rau. Xem tỷ lệ món chính, rau và đậu hũ trước khi chọn phần thêm; chỉ có nhãn “rau củ” chưa đủ để biết bữa ăn có đáp ứng sức ăn của mình hay không.`, ['Hương nấm', 'Có thể thêm đậu hũ']],
      [d => `${d} có vị cà chua chua ngọt dễ ăn với cơm. Thích vị nguyên bản hơn có thể xem món rau củ; lượng đường, muối và chất gây dị ứng trong sốt cần được quán xác nhận.`, ['Cà chua chua ngọt', 'Nhiều cách chọn vị']]
    ],
    coffee: [
      [d => `☕ ${d} thích hợp cho giờ nghỉ chiều có cà phê và món nhẹ. Sữa đặc tạo độ ngọt và béo; muốn nhẹ hơn có thể hỏi giảm sữa. Nếu tránh sữa, cần kiểm tra nguyên liệu hoặc đổi thức uống.`, ['Cà phê kèm bánh', 'Có thể ghi độ ngọt']],
      [d => `${d} thiên về vị đắng và hương cà phê, hợp ăn cùng bánh. Nên xác nhận dung tích ly và lượng đá; nếu để lâu, có thể chọn ít đá để hạn chế vị bị loãng khi đá tan.`, ['Vị cà phê đen', 'Hợp ăn cùng bánh']],
      [d => `${d} hợp người thích cà phê có vị sữa. Độ ngọt, lượng sữa và kích thước ly là các yêu cầu khác nhau, nên ghi riêng; khả năng điều chỉnh còn phụ thuộc lựa chọn quán cung cấp.`, ['Khuấy đều trước khi uống', 'Có thành phần sữa']]
    ],
    tea: [
      [d => `🍋 ${d} hợp một khoảng nghỉ chiều cùng món nhẹ. Trà và bánh không thay thế một bữa chính đầy đủ; hãy chọn độ ngọt, lượng đá rồi đối chiếu giá của cả combo.`, ['Trà chiều', 'Tùy chọn ít đường']],
      [d => `${d} có vị chanh thanh và hơi chua. Ít đường không có nghĩa hoàn toàn không đường; nếu cần tránh đường, hãy hỏi quán có thể làm không đường không. Thích vị ít chua có thể xem các loại trà khác.`, ['Vị chanh thanh', 'Điều chỉnh độ ngọt']],
      [d => `${d} phù hợp khi muốn đổi sang trà hương trái cây. Nếu thích vị trà rõ, hỏi thêm về trà nền và nguyên liệu tạo vị; nên ghi riêng ít đá, nửa đường thay vì chỉ nói “thanh mát”.`, ['Hương trái cây', 'Có thể ít đá']]
    ],
    bun: [
      [d => `🍲 ${d} có bún sợi nhỏ, thịt gà và nước dùng nóng, phù hợp đổi kết cấu món chính. Có thể ghi riêng rau thơm và gia vị; nên ăn sớm vì sợi bún có thể mềm thêm khi ngâm lâu.`, ['Bún sợi nhỏ', 'Thêm rau sau cùng']],
      [d => `${d} kết hợp thịt đùi và nước dùng. Kiểm tra lượng thịt, bún rồi mới thêm món; thích thanh đạm có thể giảm sốt và ớt, đồng thời xác nhận cách nêm của quán.`, ['Thịt đùi gà', 'Nếm trước khi nêm']],
      [d => `${d} phù hợp với người thích thịt ức và nước dùng trong. Có thể xem phần nấm thêm để đa dạng kết cấu; nếu thích thịt mềm hơn, đối chiếu món đùi cùng quán về giá và khẩu phần.`, ['Nước dùng trong', 'Chọn theo kết cấu']]
    ]
  };
  const archivedExamples={
    moc:[
      ['Phở gà đùi','🍜 Một lựa chọn nóng với thịt đùi gà. Nếm nước dùng trước rồi thêm chanh hoặc ớt theo khẩu vị; nếu cần rau mùi và ớt riêng, ghi rõ và xác nhận quán có thể đáp ứng.'],
      ['Phở trộn gà đùi','Hợp khi muốn ăn phở mà không dùng nước. Thêm sốt từng ít, trộn đều rồi điều chỉnh; ghi “ít sốt, ớt để riêng” rõ hơn một ghi chú chung là “thanh đạm”.'],
      ['Cháo gà thường','Cháo gà phù hợp người thích món nóng và kết cấu mềm. Nếu ăn nhiều, hãy xem lượng cháo và món kèm; yêu cầu ít muối hay không rau thơm nên ghi thành từng ý.']
    ],
    quyen:[
      ['Phở gà đùi nước','🍜 Món nước với thịt đùi gà trong thực đơn. Muốn tự nêm, hãy hỏi quán có thể gói gia vị riêng không; phở để lâu dễ mềm nên ăn sớm sau khi nhận.'],
      ['Bún gà nước','Có thể chọn khi muốn đổi loại sợi. Bún nhỏ và phở rộng có kết cấu khác nhau; nếu quan tâm độ dai hay kích thước, đối chiếu các món cùng quán và hỏi khả năng đổi sợi.'],
      ['Nộm gà','Vị chua ngọt tạo sự tương phản khi dùng cùng món nước nóng. Đây gần với món ăn kèm; nếu muốn thành bữa chính cần thêm tinh bột. Người tránh lạc, nước mắm hoặc rau thơm nên hỏi thành phần trước.']
    ]
  };
  function forStore(value) {
    const archiveId=typeof value==='string'?value:value?.id;
    const archive=archivedExamples[archiveId];
    if(archive)return archive.map(([dish,text],index)=>({id:archiveId+'-review-'+index,name:people[index*3][0],initial:people[index*3][1],rating:index===1?5:4,platform:archiveId==='moc'&&index===1?'shopee':'grab',platformLabel:archiveId==='moc'&&index===1?'ShopeeFood':'GrabFood',dish,text,tags:[],sample:true}));
    const store = typeof value === 'string' ? window.wansoCatalog?.find(item => item.id === value) : value;
    if (!store || !stories[store.key]) return [];
    const seed = [...store.id].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return stories[store.key].map(([story, tags], index) => {
      const menuItem = store.menu?.[index];
      const dish = menuItem?.translations?.vi || menuItem?.name || store.dish;
      const [name, initial] = people[(seed + index * 3) % people.length];
      const platform = (seed + index) % 2 ? 'grab' : 'shopee';
      return {id:store.id + '-review-' + (index + 1),name,initial,rating:index===1?5:4,
        platform,platformLabel:platform==='grab'?'GrabFood':'ShopeeFood',dish,text:story(dish),tags:[...tags],sample:true};
    });
  }
  return {forStore,label:'Gợi ý khẩu vị'};
})();
