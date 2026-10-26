# 蓝序跨街商业区 · 第二轮规划

2026-10-26，基于 main `5a1f2e2eda9ea32cbf8f0a94878904c616dc241f`。本轮响应三张实际浏览器截图：塔冠穿模、穹顶楼放在背阴低处、内部短路并非真实跨街。

## 三个问题如何修正

| 截图问题 | 最终改动 | 验证 |
| --- | --- | --- |
| 上部两个盒体相交，产生重叠立面 | 移除相互覆盖的双盒体及斜插装饰，改成连续主塔、两级逐层承托塔冠 | 两级塔冠没有体积交集；`detail/crown-close.jpg` |
| 铜色穹顶楼被高楼及高架遮挡 | 取消周围随机生成的穹顶楼，把三段退台小楼放到南侧较低酒店屋顶 | 真实场景射线检查：9/12/15点穹顶顶部至太阳均无遮挡；`detail/dome-rooftop.jpg` |
| 地块内短路只接一端，没有真实跨街 | 整体迁到现有 hospital-ring 公路上方，两侧独立裙房、二层平台和跨街桥 | 188个道路采样，两条真实行车道完整保留；最小路面至桥底净高7.831米；`detail/actual-road-through.jpg` |
| 台球厅原来独立放在地面 | 原厅整体缩到62%，放在北侧二层平台，保留招牌、室外球台和出入口 | 台球厅局部基点Y=9与平台顶一致；`detail/upper-hall.jpg` |

**道路沿本地X轴穿过**；本轮没有创建装饰路面、假车道或独立假交通。既有车辆按原环路行驶，公路两端继续通向城市。商业区规划预留实际车道、路缘及人行侧带，柱子、地面门店、楼梯都在两侧。交通设施规划使用真实地面占用，而不是将整个商业区矩形当作实心建筑；必要时将信号灯向上游退让。

## 五分区及装配

- `01-street-and-mobility`：两侧独立基础、临街零售、候车雨棚、灯具、座位。
- `02-dining-and-blue-hall-plaza`：南侧二层餐饮凉棚、花园；完整预览包括北侧台球厅。
- `03-hotel-and-retail`：南侧酒店、阳台、屋顶穹顶小楼。
- `04-technology-office`：北侧办公主塔和非重叠退台塔冠。
- `05-sky-garden-links`：两侧二层平台、跨越真实道路的14米宽上层连接、扶手、支撑、楼梯与花园。

`src/commercialPlan.ts` 为共用定位源。`createCommercialDistrict(false,true)` 是包含缩小台球厅的完整可编辑样件；第二个参数省略时，地图里的台球厅由独立可选根节点提供，避免重复生成。资产查看器提供完整组合和五个分区。

地图里的台球厅仍可独立选取，但商业区移动会同步迁移台球厅、拾取框、标签与地面连接。选取聚焦时不再压缩商业平台或台球厅的高度，避免悬空和挤压。台球厅标签和拾取框按较小尺寸更新。

## 落位

| 元素 | 世界定位 / 尺寸 |
| --- | --- |
| 商业区根 | `(77,4.93,-102)`，Q06网格；绕Y轴 -0.12弧度 |
| 完整本地边界 | X -28.5..28.5，Z -25..25；规划旋转包络64×58米 |
| 二层平台顶 | 本地Y=9，世界Y=13.93 |
| 蓝序台球厅 | `(66.1286,13.93,-120.4340)`，Q05；缩放(.62,.62,.62) |
| 酒店屋顶穹顶 | 本地X=15/Z=18，酒店屋面Y=36.3；顶部世界Y约52.87 |
| 主塔总高 | 局部约59.74米，世界顶部约64.67 |

台球厅是高架上的资产，明确从地形整平中排除，不能把它的13.93米平台高度写成地面山包。门口通路走上层平台与两侧真实楼梯；移除旧的地面台球厅通路及上一版假道路接路片。

## 检查和复现

- `npm test`：112项通过，包括既有交通信号、五分钟车辆运行及新增真实道路净空、台球厅贴合、塔冠不相交检查。
- `npm run build`：住宅预烘焙、TypeScript、Vite生产构建和启动依赖检查通过。
- `git diff --check` 通过。
- `docs/commercial-review/district.jpg`、`batched.jpg`：含台球厅的真实组合，正/侧/背/斜/低/底六视角；可编辑与分组合批边界及三角形数量一致。
- `docs/commercial-review/scene.jpg`：实际合批地图及邻近建筑、道路车辆、植被的十个检查视角。
- `docs/commercial-review/detail/`：四张960×640近景，分别覆盖用户指出的问题。
- `docs/commercial-review/audit.json`：实际城市道路188个采样、最小净高、横向偏移、台球厅落位、太阳射线结果。
- 复现：`node scripts/review/commercial.mjs`；`FLEET_OPTIMIZED=1 node scripts/review/commercial.mjs docs/commercial-review/batched.jpg docs/commercial-review/batched-geometry.json`；`node scripts/review/commercial-audit.mjs`。
- 场景截图：为 `scripts/review/commercial-scene.mjs` 指定 `CITYMAP_CANVAS_MODULE`（@napi-rs/canvas/index.js）；可用 `CITYMAP_REVIEW_FRAMES` 和 `CITYMAP_REVIEW_NAMES` 保存选定的全分辨率截图。离屏环境需要 moderngl、numpy、Pillow和EGL。

验证边界：截图使用实际几何、颜色、纹理、实例植物与简化EGL光照，不能等同浏览器最终阴影。太阳检查只验证指定季节三时点穹顶顶部的直射方向；不声称整座楼每个立面全天没有阴影。浏览器WebGL及设备帧率未完成验收。
