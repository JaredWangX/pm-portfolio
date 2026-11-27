# Wanso 位置选择：原生实现与网页对应

## 原生代码核对

本次核对的项目是 `WansoIOS/WansoIOS` 与 `WansoV2/app`。在两份当前源码中，首页入口是「当前位置、胡志明市、河内」选择面板，没有找到 Google Maps 地图、Google Places 地址搜索或地图点选界面。Android 使用 Google Play Services 的融合定位服务，不能把这等同于已接入 Google Maps。

| 项目与文件 | 已存在的行为 |
| --- | --- |
| iOS `Features/Home/CityPickerSheet.swift` | 首页打开位置面板；当前位置触发单次 GPS；拒绝权限、定位失败、超出覆盖范围分别反馈。 |
| iOS `Core/Location/GPSLocator.swift` | 通过 CoreLocation 请求位置，期望百米级精度。 |
| iOS `Core/Storage/LocationStore.swift` | 保存选择城市和 GPS 坐标；定义两个城市的宽松覆盖边界与中心坐标。 |
| Android `src/main/java/com/wanso/app/v2/data/GpsLocator.kt` | `LocationServices.getFusedLocationProviderClient`；优先等待最新位置，8 秒超时；后备缓存需在两分钟内且精度不低于约一公里。 |
| Android `src/main/java/com/wanso/app/v2/data/LocationStore.kt` | DataStore 保存城市选择和经纬度。 |
| Android `src/main/java/com/wanso/app/v2/data/CityCoverage.kt` | 与 iOS 相同的覆盖范围及中心点。 |
| Android `src/main/java/com/wanso/app/v2/ui/screens/home/HomeScreen.kt` | 点击位置栏打开 `LocationPickerSheet`；城市改变重新获取首页餐厅池。 |
| 两端 `Features/Search/SearchPreload.swift` / `ui/screens/search/SearchPreload.kt` | 将所在城市和经纬度传给聊天请求；没有有效 GPS 时回退到所选城市中心。 |

原生接口定义中，`GET /api/restaurants` 和 `GET /api/restaurant/{rid}` 支持经纬度，`POST /api/chat` 的请求包含城市及经纬度。接口名称并不代表后端当前可用，也不代表它提供了地址搜索服务。

## 保留的覆盖范围

原生边界是宽松矩形，不是行政区边界，也不是配送服务保证。

| 城市 | 纬度范围 | 经度范围 | 无定位时的中心 |
| --- | --- | --- | --- |
| 河内 | 20.5–21.4 | 105.25–106.1 | 21.0285, 105.8542 |
| 胡志明市 | 10.3–11.2 | 106.2–107.1 | 10.7769, 106.7009 |

网页目录使用 `hcm`，原生接口使用 `hcmc`；若以后对接原生 API，应在边界处转换。

## 网页位置选择

网页在上述城市选择上增加实际地图交互：打开面板、选择城市或地标、在地图上调整点位、核对后确认。只有确认才更新当前选择，取消保留原选择。定位失败或超范围时允许继续手动选择。

搜索框准确标为「搜索城市或地标」。`prototypes/wanso/location-places.js` 只包含两城各六个公开地标，城市中心由地图组件提供。这是本地索引，不承诺检索任意街道、门牌或全球地点。地图点选与拖动保留精确经纬度；没有逆地理编码结果时不编造街道地址。地标坐标是用于找到该地点的参考点，不能视作外卖交付入口。

## 地标资料

名称和主要地点参照越南旅游局的[河内景点资料](https://vietnam.travel/things-to-do/11-must-see-attractions-ha-noi/)、[胡志明市景点资料](https://vietnam.travel/things-to-do/7-must-see-attractions-hcmc/)、[中央邮局资料](https://vietnamtourism.gov.vn/en/post/18661)，以及[滨城市场网站](https://benthanhmarket.com.vn/)。坐标参考公开 Wikidata / Wikipedia 地理坐标记录，每条数据保留 `coordinateSource`；它们用于地图定位，未做门口测绘。同春市场坐标与名称参考其公开百科记录。

## 地图服务边界

网页使用 Leaflet 展示 OpenStreetMap 底图，不复用移动应用密钥。遵守 [OSM 瓦片使用政策](https://operations.osmfoundation.org/policies/tiles/)：显示地图署名；保留 HTTP Referer；使用正常浏览器缓存；不预下载地图、不做离线抓取。地图加载是按需的，不应用自动化脚本大量平移缩放下载瓦片。

未接入公共 Nominatim。其[使用政策](https://operations.osmfoundation.org/policies/nominatim/)要求限制整个应用的总流量、明确开发者责任，并禁止客户端自动补全。当前静态站没有必要为少量城市及地标引入这类外部搜索依赖。若将来需要任意地址检索，应配置适合该用途的地理编码供应商或自托管服务，再补齐限流、缓存、隐私说明和错误恢复。
