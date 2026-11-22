# 原版产品展示与阅读体验复核

本次修改围绕三个问题：Wanso 展示与原稿不一致、ONENTRA 的在线入口不够直接，以及首页小字和详情页旧配色。模型服务、订单接口及两个项目的业务数据均未变更。

## Wanso 的来源与选择

重新核对了旧宣传截图、iOS 实机截图、原作品集以及已有安卓个人中心截图。旧宣传稿中的头像入口、餐厅卡片和第四个导航，与作品集版本存在差异，不能拼成同一套页面。

首页和案例页现在使用原作品集的页面作为展示基准。首页保留 Bếp Nhà、Phở Góc Phố 的原始卡片；推荐、菜单、连续追问、比价、收藏和历史沿用第 6–18 页的原图。个人中心与设置使用已有实机截图。26 个来源页面仍在 `prototypes/wanso/screens.json` 中逐项记录。

原图不重新排版，不改写餐品、价格或按钮位置。播放器按每张图的真实比例显示，删除了此前重复绘制底部导航、延长空白区域的处理。汉堡、烤鸡和粉店分别对应不同的流程，不把它们当成同一份订单。

展示入口是可点击的流程原型，支持页面按钮、场景选择、前后翻页、暂停、放大和键盘操作。原稿未提供的页面会说明边界。自由输入、模型回答、菜单计算与本地偏好保留在独立的“试用模型”入口，不把后做的浏览器客户端当作正式产品画面。

## ONENTRA 在线入口

案例首屏和产品展示区均将“直接使用 ONENTRA”指向 `https://jaredwangx.github.io/ai-work-platform/`。首页案例卡也提供同一入口。设计原型仍可单独查看，名称与在线产品入口区分。

已在浏览器实际点击入口：新标签页打开公开工作台，能看到需求输入区、模型、技能、知识库、数据库等资源入口。此项验证确认链接落点与页面可用性，不代表重新验证所有后端任务。

## 视觉调整

- 从旧样式源头替换暖色文字、背景、按钮悬停和编号颜色，统一首页、案例、阅读文档及原型播放器的蓝色体系。产品原图中的食物、平台标识等原始颜色保留。
- 首页主体文字为桌面 18px、手机 17px，导航、按钮和元信息分层放大；段落、标题采用一致的深蓝层级。
- 案例加入“本餐约束 → 选什么 / 在哪买”和“资料 → 任务 → 联合交付”两幅流程图。个人优势用四组图形辅助区分能力，保留完整说明。
- 案例和文档卡片使用共享网格行，让同排的标题、正文、图示及操作区对齐，避免靠固定高度挤压文字。窄屏标题平衡换行。
- 调整手机锚点位置，避免跳到产品区时，上一个区块的按钮露在固定导航下方。

## 验证

`tests/portfolio_smoke.py` 的 17 组检查通过，覆盖两套原型的流程、图像比例、暂停、错误重试、完整文档、目录与打印、联系入口、弹窗以及 9 个页面在 5 种宽度下的布局。`tests/wanso_interaction.py` 的 10 组检查通过，覆盖独立模型客户端的菜单、份数、费用、偏好、聊天请求、失败重试及删除确认；本轮聊天测试使用受控响应。

另外核对了 7 个页面的实际文字颜色，没有残留橙色；点击原图中的探索、比价详情及返回按钮，确认按钮区域仍与原图对应。删除重复底部绘制后，再次验证了这些跳转。

依照 Talos 的 `SOP/web/web-dev` 工作流截图并查看了桌面、平板和手机效果。截图存放在本地忽略目录 `work/portfolio-original-review/`。SOP 检查没有控制台错误、横向溢出、图片加载失败或文字对比度问题。保留文档类别标签和章节眉标，帮助区分需求、复盘与目录层级；它们属于工具的风格提示，不是功能错误。

## 范围

本轮没有重建 Wanso 原生应用，也没有恢复旧的订单或用户服务器。公开原型呈现历史设计与示例价格；独立模型体验继续使用现有接口。没有把历史示例标记为实时菜单或真实订单。

## Taste 模板检查记录

`GATE: OPEN 76 (rounds used up)`。此结果不是通过。本轮按工具建议补足了编号对比度与 iframe 焦点样式；最终报告仍包含模板规则与本作品集结构不一致的项，例如要求每节恰好占一至两屏、首屏必须只展示 Hero、卡片内部文字必须对齐页面最外边线、把电脑键盘当作内容列检查。这里保留了用户要求的连续作品集、等宽玻璃卡片、电脑和手机展示，未为满足整屏模板而裁切内容或增加大片空白。浏览器布局和交互验证的结果见上文。

未设置豁免，以下保留最终工具记录，以便后续区分模板偏好和实际问题。

<details>
<summary>查看模板检查的全部未通过项</summary>

- **hero-fill**：section#work "两个作品，直接体验。"。the next section shows on the first screen: it starts at 425px on a 900px screen (the hero ends at 427px)
- **nav**：header &gt; div.navwrap &gt; a.identity "W 王稼瑞 AI 产品经理"。nav link wraps to a second line
- **no-visual**：main#main &gt; section.portfolio-intro.wrap "对技术好奇， 也对使用它的人好奇。"。no picture, effect or mock in this section; a feature section needs a visual
- **copy-headline**：main#main &gt; section.portfolio-intro.wrap &gt; div.intro-heading &gt; h1 "对技术好奇， 也对使用它的人好奇。"。"对技术好奇， 也对使用它的人好奇。" does not name what is sold (ai, from flags)
- **copy-fact**：main#main &gt; section.portfolio-intro.wrap &gt; div.intro-heading &gt; h1 "对技术好奇， 也对使用它的人好奇。"。the first screen holds no number, price, date, place, platform or genre
- **section-tile**：section#cases "页面背后的产品判断"。the section is 996px tall (1.11 screens at 1440x900), not one screen or two: the screen one screen on from its top (scroll 2639px) shows 7px of it and 804px of the next section, its heading "判断要有依据， 设计要经得起追问。" on screen
- **focus-visible**：div.device-surface:nth-of-type(3) &gt; div.laptop &gt; div.laptop-lid:nth-of-type(1) &gt; iframe.device-frame "ONENTRA 电脑交互原型"。Tab stop 17, iframe "ONENTRA 电脑交互原型": it shows no change when focused
- **run-on**：article.device-project.computer-project:nth-of-type(1) &gt; div.device-title:nth-of-type(1) &gt; div &gt; h3 "ONENTRAAI 工作平台"。"ONENTRA | AI 工作平台": the heading runs its first sentence into the grey second one with no stop
- **moment-none**：(the page)。a software page (--type) deals no moment: every kind carries one, two on a long page (moments.md)
- **hero-screen**：main#main &gt; section.portfolio-intro.wrap "对技术好奇，也对使用它的人好奇。 华中科技大学计算机硕士在读。做过模型与 Age"。the hero ends at 427px on a 900px screen, 473px above the fold: it ends at the fold, 1px either way (SR-1)
- **hero-screen**：section#work "两个作品，直接体验。 ONENTRAAI 工作平台阅读案例 ↗工作台发起任务自动"。473px of the next section shows on the first screen (from 427px on a 900px screen): nothing below the hero shows at load (SR-1)
- **section-height**：footer.wrap "王稼瑞 产品经理作品集作品集 PDF ↗GitHub ↗回到顶部 ↑"。the section is 108px tall (0.1 screens), 792px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2)
- **section-height**：section#contact "很高兴认识你聊聊产品，也聊聊各自的新发现。我是王稼瑞，一个乐观、爱体验，也喜欢和"。the section is 479px tall (0.5 screens), 421px short of one screen (900px): every section after the hero is one screen or two, 2px either way (SR-2)
- **section-height**：section#work "两个作品，直接体验。 ONENTRAAI 工作平台阅读案例 ↗工作台发起任务自动"。the section is 1312px tall (1.5 screens), 412px over one screen (900px): every section after the hero is one screen or two, 2px either way (and 4 more like it: "产品思考与文档判断要有依据，设计要经得起追问。从", "关于我从技术学习，到真实的产品实践一路走来，我喜", "项目案例 页面背后的产品判断 2026.01 —") (SR-2)
- **section-height**：section#strengths "个人优势理解问题，也能把事情推进去 专业能力把需求拆清楚，把标准定具体从用户场景"。the section starts at 4391px, 109px above the screen grid (5 x 900px): sections start on whole screens (and 5 more like it: "对技术好奇，也对使用它的人好奇。 华中科技大学计", "项目案例 页面背后的产品判断 2026.01 —", "关于我从技术学习，到真实的产品实践一路走来，我喜") (SR-2)
- **section-height**：section#documents "产品思考与文档判断要有依据，设计要经得起追问。从需求规则到交付验收，展开两个项目"。the section's content does not fit it: its lowest content ends 1591px below its top, past 1584px (the section less 72px of bottom padding) (and 1 more like it: "关于我从技术学习，到真实的产品实践一路走来，我喜") (SR-2)
- **section-air**：section#about &gt; div.experience-grid &gt; details.experience-detail:nth-of-type(1) &gt; div.experience-detail-body "面向研发测试团队的车端资源异常诊断与处置，参与 vexusAIOS Agent "。a top border across 100% of the container, between the section's content: sections and their parts are told apart by air and ground, not lines (SR-3)
- **section-air**：div.experience-grid &gt; details.experience-detail:nth-of-type(1) &gt; div.experience-detail-body &gt; div.experience-result "这一段让我更理解业务有效性、模型表现和工程成本，需要放在一起判断。"。a top border across 95% of the container, between the section's content: sections and their parts are told apart by air and ground, not lines (SR-3)
- **section-air**：section#about &gt; div.honors "其他积累美国大学生数学建模竞赛 M 奖、全国大学生市场调查与分析大赛省级一等奖、"。a top border across 100% of the container, between the section's content: sections and their parts are told apart by air and ground, not lines (SR-3)
- **one-section**：main#main &gt; section.portfolio-intro.wrap &gt; div.intro-heading &gt; h1 "对技术好奇，也对使用它的人好奇。"。the screen at scroll 0px (stride 0) shows 338px of section 1 and the heading of section 1 whole and the content of 2 sections, over 24px each beside section 2: a screen shows one section (another may peek 8px, 24px WARN) (SR-4)
- **one-section**：section#about "关于我从技术学习，到真实的产品实践一路走来，我喜欢钻研技术，也越来越享受和人一起"。the screen at scroll 6926px (the top of section 7) shows 224px of section 6 and the content of 3 sections, over 24px each beside section 7: a screen shows one section (another may peek 8px, 24px WARN) (and 3 more like it: scroll 3600px, scroll 900px, scroll 4500px) (SR-4)
- **container-edges**：header "W王稼瑞AI 产品经理作品体验产品思考个人优势关于我联系我 一起聊聊 ↗导航 作"。the nav's content runs 40px from the left and 40px from the right (read from its outermost blocks: no .wrap): the margin is 64-120px at 1440px (one container, equal margins, 2px either way) (SR-6)
- **container-edges**：main#main &gt; section.portfolio-intro.wrap "对技术好奇，也对使用它的人好奇。 华中科技大学计算机硕士在读。做过模型与 Age"。the content of section 1 runs 40px from the left and 40px from the right (read from its outermost blocks: no .wrap): the margin is 64-120px at 1440px (one container, equal margins, 2px either way) (SR-6)
- **container-edges**：section#work "两个作品，直接体验。 ONENTRAAI 工作平台阅读案例 ↗工作台发起任务自动"。the content of section 2 runs 40px from the left and 40px from the right (read from its outermost blocks: no .wrap): the margin is 64-120px at 1440px (one container, equal margins, 2px either way) (and 6 more like it: "项目案例 页面背后的产品判断 2026.01 —", "产品思考与文档判断要有依据，设计要经得起追问。从", "个人优势理解问题，也能把事情推进去 专业能力把需") (SR-6)
- **container-edges**：a.skip "跳至正文"。a &lt;a&gt; at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (SR-6)
- **container-edges**：div.portfolio-ambient。a &lt;div&gt; at the top of the page, outside header.nav, main, footer.closing and nav.actionbar (SR-6)
- **container-edges**：details.experience-detail:nth-of-type(1) &gt; summary &gt; div.experience-meta &gt; span "企业实习"。10 text blocks start on a left line at x 73, 33px from the container's left: text starts on the container's left, or on one split line (x 617, 732, 847) (also "2026.05 — 2026.10", "面向研发测试团队的车端资源异常诊断与处置，参与 vexusAIO", "我承担的工作") (SR-6)
- **row-lines**：div.device-surface &gt; div.laptop &gt; div.laptop-base &gt; div.laptop-keys。a row of 16 items: its first item starts at 108px, its column's left line at 67px; its last item ends at 878px, its column's right line at 919px (2px either way) (SR-7)
- **split-pair**：section#about &gt; div.personal-overview "乐观、爱体验，喜欢和人交流。我现在在华中科技大学读计算机技术硕士，本科是人工智能"。the two columns of the split start 32px apart at the top: a split's columns are top-aligned, 8px either way (SR-8)
- **split-pair**：section#contact &gt; div.wrap.contact-grid "很高兴认识你聊聊产品，也聊聊各自的新发现。我是王稼瑞，一个乐观、爱体验，也喜欢和"。the two columns of the split start 9px apart at the top (centred on each other): a split's columns are top-aligned, 8px either way (SR-8)
- **button-styles**：(one screen)。3 button styles on one screen: round, fill gradient, outline #2c68cf ("阅读案例 →"); round, fill #ffffff, outline #ffffff ("操作手机体验 ↗"); pill, fill #f6faff ("导航"); the odd one out: "导航"
- **button-styles**：(the page)。3 button styles on the page: round, fill gradient, outline #2c68cf x4 ("体验我的作品 ↓"); round, fill #ffffff, outline #ffffff x4 ("认识我 ↗"); pill, fill #f6faff x1 ("导航")
- **edge-left**：section.portfolio-intro.wrap p "华中科技大学计算机硕士在读。做过模型与 Agent 开发，也把想"。starts at x 861; the lines are 40 and the column starts
- **edge-left**：#work h3 "ONENTRAAI 工作平台"。starts at x 67; the lines are 40 and the column starts
- **edge-left**：#work h3 "Wanso万象外卖"。starts at x 997; the lines are 40 and the column starts
- **edge-left**：#cases h3 "Wanso 万象外卖"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#cases p "怎样让一个有预算、有忌口的人，在午休时决定吃什么、去哪点？让推荐"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#cases dl.card-facts "内测任务完成率75% → 93.8%内测首末轮 我的工作需求定义"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#cases h3 "ONENTRA 工作平台"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#cases p "运营人员如何把笔记、文件和数据库带进同一个任务，并得到可复核的交"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#cases dl.card-facts "交付验证资料 → 数据 → 文件已打通公开演示流程 我的工作业务"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#documents h3.research-heading "选餐推荐与费用确认"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#documents p.research-deck "推荐不能只“听起来合适”。把预算、禁忌与菜单依据变成规则，再检查"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#documents p.research-thesis "先让错误容易被发现和修正，再扩展推荐覆盖。"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#documents h3.research-heading "从任务上下文到文件交付"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#documents p.research-deck "把资料、执行过程和交付物放回同一项任务。系统完成一次调用之后，用"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#documents p.research-thesis "正文、数据与附件共同构成一次完整交付。"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#documents h3.research-heading "AI 推荐之后，用户为什么愿意选？"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#documents p.research-deck "把解释变成可修改的条件。结合 Google PAIR 与 NN/"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#documents p.research-thesis "调整餐费，看看同一个优惠为什么会改变选择。"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#documents h3.research-heading "文件生成了，任务就算完成了吗？"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#documents p.research-deck "从一次“表格正确、正文遗漏”的任务出发，区分工具成功与业务成功，"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#documents p.research-thesis "交付是否可用，与生成速度一样需要验收。"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#strengths h3 "把需求拆清楚，把标准定具体"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#strengths p "从用户场景和使用目标出发，分析问题、比较竞品、确定优先级。能把模"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#strengths h3 "懂实现逻辑，能讨论工程取舍"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#strengths p "具备人工智能与计算机技术基础，熟悉模型、Agent 和工具调用的"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#strengths h3 "乐观主动，愿意倾听不同的人"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#strengths p "喜欢与不同背景的人交流，也愿意耐心听完不一样的意见。遇到分歧时，"。starts at x 73; the lines are 40 and the column starts
- **edge-left**：#strengths h3 "对新领域好奇，对交付有耐心"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#strengths p "喜欢体验各个领域的产品，追问功能背后的场景和取舍。面对不熟悉的问"。starts at x 767; the lines are 40 and the column starts
- **edge-left**：#about h3 "教育与研究"。starts at x 769; the lines are 40 and the column starts
- **edge-left**：#about p "计算机技术 · 硕士在读"。starts at x 769; the lines are 40 and the column starts
- **edge-left**：#about p "人工智能 · 本科"。starts at x 769; the lines are 40 and the column starts
- **edge-left**：#about p "ICLR 2026（CCF-A）· 学生第一作者"。starts at x 769; the lines are 40 and the column starts
- **edge-left**：#about p "美国大学生数学建模竞赛 M 奖、全国大学生市场调查与分析大赛省级"。starts at x 127; the lines are 40 and the column starts
- **edge-left**：#contact div.contact-card "保持联系 · 王稼瑞13971032326@163.com打个招"。starts at x 778.1; the lines are 40 and the column starts
- **edge-left**：#contact p.copy-feedback "一封邮件就能找到我，很期待认识新的朋友。"。starts at x 813.1; the lines are 40 and the column starts
- **screen-short**：section.portfolio-intro.wrap section.portfolio-intro.wrap "对技术好奇，也对使用它的人好奇。 华中科技大学计算机硕士在读。做"。338px tall; one screen under the nav is 900px
- **neighbour**：section.portfolio-intro.wrap section.portfolio-intro.wrap "对技术好奇，也对使用它的人好奇。 华中科技大学计算机硕士在读。做"。framed, 64px of #work section.device-exhibition.wrap "两个作品，直接体验。 ONENTRAAI 工作平台阅读案例 ↗工" shows
- **screen-height**：#cases section.wrap.section "项目案例 页面背后的产品判断 2026.01 — 04 Wans"。996px, 1.11 screens; a section is exactly one or two (--h)
- **neighbour**：#documents section.wrap.section "产品思考与文档判断要有依据，设计要经得起追问。从需求规则到交付验"。framed, 36px of #strengths section.wrap.section "个人优势理解问题，也能把事情推进去 专业能力把需求拆清楚，把标准" shows
- **screen-height**：#about section.wrap.section "关于我从技术学习，到真实的产品实践一路走来，我喜欢钻研技术，也越"。1900px, 2.11 screens; a section is exactly one or two (--h)
- **neighbour**：#contact section.contact-section "很高兴认识你聊聊产品，也聊聊各自的新发现。我是王稼瑞，一个乐观、"。framed, 108px of the footer shows
- **hero-fold**：section.portfolio-intro.wrap section.portfolio-intro.wrap "对技术好奇，也对使用它的人好奇。 华中科技大学计算机硕士在读。做"。starts at y 89, not under the nav
- **hero-fold**：#work section.device-exhibition.wrap "两个作品，直接体验。 ONENTRAAI 工作平台阅读案例 ↗工"。shows on the first screen from y 427

</details>
