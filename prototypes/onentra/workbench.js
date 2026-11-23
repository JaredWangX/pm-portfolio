'use strict';

const product = 'https://jaredwangx.github.io/ai-work-platform/';
const entryRoutes = {
  home: '工作台汇总最近会话、演示任务和交付文件。',
  chat: '从输入框选择模型、技能和业务资料，在同一次会话里查看过程与附件。',
  database: '可查看渠道经营数据和客户服务数据，预览表结构并执行只读查询。',
  tasks: '查看任务指令、北京时间调度规则、运行记录和交付结果。',
  files: '查看生成的 Word、Excel 和 PPT，打开预览或回到相关会话。'
};

for (const workspace of document.querySelectorAll('[data-workbench]')) {
  const frame = workspace.querySelector('[data-workbench-frame]');
  if (workspace.hasAttribute('data-start-route') && location.hash) {
    const route = location.hash.slice(1);
    if (/^(home|chat|database|tasks|files|projects|staff|teams|users|knowledge|skills|market|models|settings|system)(\/[a-z0-9-]+)?$/.test(route)) {
      frame.src = product + location.hash;
    } else if (/^[a-z0-9-]+$/.test(route)) {
      location.replace('replay.html' + location.search + location.hash);
    }
  }
  if (workspace.classList.contains('laptop-workbench')) {
    const fit = () => {
      const {width, height} = workspace.getBoundingClientRect();
      const desktop = width >= 500;
      frame.style.width = desktop ? '1440px' : width + 'px';
      frame.style.height = desktop ? '900px' : height + 'px';
      frame.style.transform = desktop ? `scale(${width / 1440})` : '';
    };
    new ResizeObserver(fit).observe(workspace);
    fit();
  }
  const project = workspace.closest('[data-device-project]');
  const buttons = project?.querySelectorAll('[data-workbench-route]') || [];
  const describe = route => {
    if (!project) return;
    const area = route.split('/')[0];
    for (const button of buttons) button.setAttribute('aria-pressed',
      String(button.dataset.workbenchRoute === route || button.dataset.workbenchRoute === area));
    const paragraph = project.querySelector('[data-workbench-description]');
    if (paragraph) paragraph.textContent = entryRoutes[area] || '通过左侧导航切换团队、资源和设置。';
    const expand = project.querySelector('[data-full-workbench]');
    if (expand) expand.hash = route;
    const liveLink = project.querySelector('[data-current-product]');
    if (liveLink) liveLink.hash = route;
  };
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const route = button.dataset.workbenchRoute;
      const target = product + '#' + route;
      try {
        frame.contentWindow.location.replace(target);
      } catch {
        frame.src = target;
      }
      describe(route);
    });
  }
  const showWorkbench = () => {
    const doc = frame.contentDocument;
    if (doc && !doc.querySelector('#app')?.childElementCount) return;
    workspace.classList.add('workbench-ready');
    if (!doc || !project) return;
    const sync = () => describe(frame.contentWindow.location.hash.slice(1) || 'home');
    frame.contentWindow.addEventListener('hashchange', sync);
    sync();
  };
  frame.addEventListener('load', showWorkbench);
  if (frame.contentDocument?.readyState === 'complete') showWorkbench();
}
