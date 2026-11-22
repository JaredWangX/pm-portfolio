'use strict';
(() => {
  const format = n => n.toLocaleString('en-US') + ' ₫';
  const price = document.querySelector('[data-lab="price"]');
  if (price) {
    const input = price.querySelector('input');
    const update = () => {
      const cost = Number(input.value);
      const other = cost + 12000 - Math.min(cost * .15, 15000);
      price.querySelector('output').value = format(cost);
      price.querySelector('[data-grab]').textContent = format(cost);
      price.querySelector('[data-shopee]').textContent = format(other);
      price.querySelector('[data-price-verdict]').textContent = cost === other ? '这组规则下两边相同，均为 ' + format(cost) + '。' : (cost < other ? 'GrabFood' : 'ShopeeFood') + ' 在这组规则下低 ' + format(Math.abs(cost-other)) + '。';
    };
    input.addEventListener('input', update);update();
  }
  const effort = document.querySelector('[data-lab="effort"]');
  if (effort) {
    const input = effort.querySelector('input');
    const update = () => {
      const rework = Number(input.value), total = 30 + rework, saved = 60 - total;
      effort.querySelector('output').value = rework + ' 分钟';
      effort.querySelector('[data-rework-part]').textContent = rework;
      effort.querySelector('[data-total-time]').textContent = total + ' 分钟';
      effort.querySelector('[data-effort-verdict]').textContent = saved === 0 ? '示例条件下与人工基准持平；生成快并未节省总时间。' : '示例条件下' + (saved > 0 ? '节省 ' : '多用 ') + Math.abs(saved) + ' 分钟，约 ' + (Math.abs(saved)/60*100).toFixed(1) + '%。';
    };
    input.addEventListener('input', update);update();
  }
})();
