'use strict';

const product = 'https://jaredwangx.github.io/ai-work-platform/';
const entryRoutes = {
  home: ['工作台串起会话、项目和业务资料', '从最近工作继续，也可以选用经营分析、文档撰写等助手。', ['最近会话', '项目进度', 'AI 员工']],
  chat: ['一份经营记录，生成周报和核查明细', '读取渠道数据，解释销售变化、定位退款异常，并把结论与负责人写进可编辑文件。', ['经营周报.docx', '渠道明细.xlsx', '退款核对清单']],
  'chat/portfolio-launch': ['把需求笔记变成发布方案和启动会 PPT', '围绕上线时间拆出分工、渠道验收与异常处理，同一次会话交付方案、演示稿和清单。', ['发布方案.docx', '启动会.pptx', '渠道验收.csv']],
  database: ['连接业务数据，查清每个结论的依据', '演示库有 63 笔订单、42 条客服工单。可查看表结构、执行只读 SQL，并把结果带进对话。', ['表结构预览', 'SQL 查询结果', '引用到对话']],
  tasks: ['把重复工作设成按时执行的任务', '选择模型、数据源和北京时间，设置运行频率；查看执行记录、失败原因和本轮交付文件。', ['定时规则', '运行记录', '结果与附件']],
  files: ['从回复到文件，让工作真正交付', '在会话空间或文件页预览 Word、PPT 和 Excel，下载后继续编辑，也可以引用文件发起下一轮修改。', ['正文预览', '可编辑附件', '继续修改']]
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
      frame.style.width = '1280px';
      frame.style.height = `${1280 * height / width}px`;
      frame.style.transform = `scale(${width / 1280})`;
    };
    new ResizeObserver(fit).observe(workspace);
    fit();
  }
  const project = workspace.closest('[data-device-project]');
  const buttons = project?.querySelectorAll('[data-workbench-route]') || [];
  const describe = route => {
    if (!project) return;
    const area = route.split('/')[0];
    const selected = Array.from(buttons).find(button => button.dataset.workbenchRoute === route) ||
      Array.from(buttons).find(button => button.dataset.workbenchRoute.split('/')[0] === area);
    for (const button of buttons) button.setAttribute('aria-pressed', String(button === selected));
    const story = entryRoutes[route] || entryRoutes[area] || entryRoutes.home;
    const paragraph = project.querySelector('[data-workbench-description]');
    if (paragraph) paragraph.textContent = story[1];
    const title = project.querySelector('[data-workbench-title]');
    if (title) title.textContent = story[0];
    const outcomes = project.querySelector('[data-workbench-outcomes]');
    if (outcomes) outcomes.replaceChildren(...story[2].map(label => {
      const item = document.createElement('span'); item.textContent = label; return item;
    }));
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
    const sync = () => {
      const route = frame.contentWindow.location.hash.slice(1) || 'home';
      describe(route);
      // The homepage starts on a completed example, including its delivered files.
      if (/^chat\/portfolio-/.test(route)) requestAnimationFrame(() => {
        const messages = doc.querySelector('.messages');
        if (messages) messages.scrollTop = messages.scrollHeight;
      });
    };
    frame.contentWindow.addEventListener('hashchange', sync);
    sync();
  };
  frame.addEventListener('load', showWorkbench);
  if (frame.contentDocument?.readyState === 'complete') showWorkbench();
}
