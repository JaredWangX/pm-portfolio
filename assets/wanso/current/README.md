# 当前网页产品画面

本目录的 WebP 由 `scripts/build_wanso_media.py` 从 `prototypes/wanso/` 的实际运行页面截取，尺寸统一为 804 × 1748。页面使用越南语，作品集的说明与视频字幕使用中文。

截图保持真实的导航、滚动容器、菜单内容和费用计算，没有覆盖生成的文字或拼接新的产品控件。为使营业状态和午餐探索场景可重复检查，采集时将页面时钟固定在越南时间 12:15。固定时钟是采集设置，不会写入线上产品。

- `home`、`explore`、`location`：首页、探索和地图选点。
- `recommend`、`candidates`、`followup`、`confirm`：当前查询的三轮推荐与五家候选。
- `store`、`price`、`compare`、`menu`、`reviews`：同一家店的详情、价差说明、分项比较、菜单、用餐建议。
- `saved`、`history`、`profile`：收藏与最近订单、会话记录、偏好与设置。

店铺、菜单、优惠与推荐来自网页项目已有的本地资料和规则，不代表实时平台报价。`reviews` 展示的是“Gợi ý thưởng thức”（口味与搭配建议），不是实际消费者评论。餐食照片来源与授权仍见 `../catalog/README.md` 及原图片素材说明。

原始 iOS 截图保留在 `../native/`，官网历史截图保留在 `../official/`，二者没有被新画面覆盖。
