# 王稼瑞 · AI 产品经理作品集

公开地址：https://jaredwangx.github.io/pm-portfolio/

Wanso 与 ONENTRA 两个产品案例。每个案例按照背景、职责、产品判断、架构、用户流程、原型、验证与路线图展开；首页的需求文档可以直接打开阅读。使用原生 HTML、CSS、JavaScript，通过 GitHub Pages 从 main 分支根目录发布。

## 可以体验什么

- **Wanso**：`demos/wanso/` 是可操作的网页版，沿用原移动应用的蓝色界面、首页、探索、收藏与偏好。输入预算和忌口后，由现有 A100 上的 `qwen3.8-27b` 真实生成回复，支持连续追问、查看菜单、确认餐费和打开外卖平台。界面可切换越南语和中文。
- **ONENTRA**：桌面画面取自现有公开 AI 工作平台；可以在弹窗或独立网页进入工作台，配置资源、发起对话并查看交付文件。
- **产品文档**：两份需求节选包含目标用户、本期范围、规则、异常与验收用例；与案例页的流程和验证证据对应。
- **背景动画**：暖金色程序渲染背景，支持暂停和系统减少动态效果设置；WebGL 不可用时显示静态图。

## Wanso 模型与数据

网页调用现有 HTTPS 网关的 `POST /api/wanso`。服务器模块位于 `server/wanso.mjs`；它从受限的采集菜单生成提示，调用服务器本机模型接口，再按菜单 ID 回填名称与价格。API Key 只从服务器环境指定的文件读取，不进入网页或 Git 仓库。接口限制消息长度、同时执行数和每分钟请求数，失败返回可重试状态。

菜单采集于 2026-11-19，当前包含 McDonald’s 和 Bamysu 两家、27 条条目，见 `demos/wanso/catalog.json`。这些是演示数据，不能代表实时价格、营业状态、优惠、运费或过敏安全。平台链接进入平台首页，不会代替用户创建订单。没有同款图片的餐品用商家文字标识，避免拿其他菜品的图片误导用户。

Wanso 原生应用原先使用的 API 域名当前不可用。本仓库接入的是作品集网页版；没有更换原生应用的登录、订单或生产数据库。

## 本地预览与验证

运行 `python3 -m http.server 8080` 后打开 http://127.0.0.1:8080/ 。静态内容可预览；公网模型的 CORS 只允许配置的公开站点来源。部署后请从 GitHub Pages 的实际 URL 测试模型。

基础校验：`node server/wanso.test.mjs`。桌面与移动端的截图、模型连续追问和失败恢复记录见本次开发的本地验收目录；截图不作为网站源码依赖。

## 服务端部署

将本仓库 `server/wanso.mjs` 与 `demos/wanso/catalog.json` 放在同一相对目录结构。现有 Node 网关在 `/api/wanso` 和 `/api/wanso/status` 路径调用导出的 `wansoRoute(request, env)`；其余 API 仍交给原工作台处理。

服务环境需要：

- `WANSO_MODEL_ORIGIN`：服务器可访问的 OpenAI 兼容模型来源，默认 `http://127.0.0.1:8000`。
- `WANSO_MODEL_KEY_FILE`：仅服务器可读的现有模型密钥文件路径。
- 模型服务名：`qwen3.8-27b`。

`GET /api/wanso/status` 会实际检查模型列表。更新模块后需要重载 Node 网关；无需重启模型或其他服务。

参考研究与本次验收范围见 [docs/reference-study.md](docs/reference-study.md)。
