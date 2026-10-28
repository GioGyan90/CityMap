# CityMap 交接：灰模首屏与渐进加载

更新：2026-10-28（北京时间）

## 仓库、授权与当前基线

- 仓库：https://github.com/GioGyan90/CityMap
- 线上：https://giogyan90.github.io/CityMap/
- 本文编写前远程 main：`c26897dc4c1c824135c78a2ccc09d5e2f50e5c8f`，tree：`ed35d308d98bdde5fee876e61138e757126a3062`。本文会产生新提交；新窗口必须重新查远程。
- 最新功能为游乐园重构与摩天轮比例修正；132 项测试、生产构建、Pages build/deploy 成功，线上入口曾核对为 `assets/index-C2MQfg4O.js`，此哈希仅作历史记录。
- 用户已授权本项目常规修改、提交、公开仓库检查图和发布，无需重复询问。授权边界见 AGENTS.md。
- 本轮只整理下一任务的交接，**尚未实现灰模首屏或渐进加载**。

## 最新需求与已讨论方案

用户认为目前必须等待完整地图加载后才能进入，希望快速显示“压缩到极低质量的灰模场景”，随后随加载恢复原貌。

已提出但未实施的方向：
1. 预先生成并压缩轻量灰模，包含简化地形、海面、道路和建筑轮廓，坐标与最终地图一致。
2. 灰模首帧即可旋转、缩放、平移，保持用户相机状态。
3. 优先生成当前视野或邻近区域，再逐区替换灰模，恢复 C 方案色板和结构。
4. 窗户、植物、交通、游乐设施、真实阴影与体积云逐步补齐。
5. 地标完成后才开放其拾取和功能，显示轻量加载进度；失败时保留可用画面并提供恢复入口。

**关键：主要瓶颈包含浏览器现场生成几何的 CPU 工作，不只是文件下载。** 单纯先渲染灰模、再一次性同步构建整个 city，仍然会卡住相机和画面。真正可交互需要给主线程让出绘制与输入机会，或将可迁移的计算拆至 Worker。不能把“出现过一帧灰模”当成完成渐进加载。

## 先读资料和代码

先读 AGENTS.md、docs/HANDOFF.md，然后：
- docs/loading-performance.md：历史性能分析，尤其末尾启动故障修复。
- docs/loading-prebake.md、docs/loading-geometry-batching.md：预烘焙、运行时回退与合批优化。
- docs/loading-prebake.md、docs/loading3-review/ 等证据若存在，应以当前代码为准。
- docs/immersive-palette.md、docs/palette-c.md：沉浸观察、C 色板及离屏验证边界。
- src/main.ts、src/scene.ts、src/city.ts、src/animation.ts。
- scripts/check-boot.mjs、scripts/review/loading.mjs、scripts/review/startup.mjs，结合 package.json 查看当前命令。
- 根据实际拆分再读 environment、roadNetwork、terrainSurface、parcels、residential、transport、specialBuildings、focus、labels、camera、night、cloudCache 等模块。

历史文档可能记录已经撤销的尝试，不能直接照搬旧方案或旧性能数字。

## 当前启动结构与不能重犯的问题

src/main.ts 当前按独立的 awaited dynamic import 启动：
scene → environment → city → night → focus → labels → camera → animation。
此外初始化沉浸模式，资产工具按需加载；若指定资产视图或有保存布局，工具会提前初始化。云密度预加载与主体并行，场景通过 deferClouds 延后云的创建。

生产构建包含 scripts/check-boot.mjs，检查真实 dist：
- 上述核心阶段独立并有顺序。
- city 静态依赖不能提前执行 camera、labels、focus、night 的初始化副作用。

历史上合并为统一 runtime 入口，曾导致打包把 camera 副作用提前到城市构建之前，读取未生成的车站而加载失败；该改动已撤销。不能为了并行下载又把这些模块直接静态合并。若新架构必须改变启动阶段，应同时改造模块初始化职责和相应检查，保留对真实失败的覆盖，不能只删测试。

其他集成风险：
- 多个模块在顶层直接创建 world 对象或计算依赖数据。await import 只能在模块之间让出控制，无法中断模块内部一次性同步构建。
- roadNetwork/terrainSurface/预约区和地块生成有明确前后关系；按“城区”拆分前先列依赖，不可先建建筑再临时重算道路。
- focus、labels、night 等会收集现有对象或材质。晚加入的区域需要增量注册或显式刷新，不能只显示几何而没有拾取、照明和标签。
- animation 当前导入后自行启动循环。早期预览若另建循环，交接时必须保证始终只有一个正式渲染循环，避免双倍动画、监听器和资源泄漏。
- 保存布局、?time、?view=assets、?asset、昼夜暂停、全局动画暂停、沉浸模式和资产查看器需要保持现有语义。
- 最终应释放灰模几何和材质，避免预览与正式场景长期双份驻留或共面闪烁。
- 保留现有预烘焙输入校验、启动依赖检查和实时回退。

## 建议执行步骤

1. 核对远程最新 main，建立干净工作分支，读取规则，记录加载基线。不能用旧窗口全部差异覆盖远程或强推。
2. 测量下载、JS 解析、CPU 生成、首次渲染和 GPU 编译等阶段，定位最长同步任务。先确认环境能否真实 WebGL 渲染。
3. 设计预览数据的来源与版本：优先从真实地图构建输出生成简化轮廓，保证同一坐标系；避免手画一张与最终城市对不上的假地图。
4. 明确预览和正式场景的渲染、相机、交互、错误恢复及资源所有权，再实现灰模首屏。
5. 先挑一处可隔离区域验证“灰模 → 正式模型”替换与增量注册，然后扩展生成队列。按帧预算让出主线程，必要时重新组织顶层副作用为显式构建函数。
6. 增加进度/状态与失败回退；重任务在用户操作期间适当减速。视野优先级不能破坏基础数据依赖。
7. 检查慢网络、慢 CPU、拖动相机时加载、区域替换、暂停恢复、资产工具及最终全城一致性。
8. 完成对应测试、构建、diff 检查和视觉复查，提交发布，核对对应 Actions 的 build/deploy 和线上资源。

不应承诺某个设备一定“一秒加载”；先定义并测量“首个可见帧”“首次可操作”“完整场景就绪”三个指标。预览显示早并不代表总加载时间更短；应同时报告响应性和总耗时/内存代价。

## 本窗口已完成的近期功能

这些都已发布，下一任务应保留：
- 六班民航飞机、三条三角形航线，低于旧 145 米高度；docs/airliner.md、docs/flight-routes.md。
- 商业区办公塔细窗与入口，通用玻璃楼高低 L 形包裹、独立亮窗遮罩；docs/office-facade.md、docs/glass-tower-facades.md。
- 医院环形 H 停机坪和六组急救直升机原件；docs/hospital-helicopter.md。
- 直升机曲面窗及海岸列车窗门与收窄车壳贴合；docs/vehicle-glazing-fix.md。
- 游乐园三项设施分区、不规则外围跑道与绿化、元素资产入口、运动净空及摩天轮圆形校正；docs/amusement-redesign.md。
- C 色板、沉浸观察、昼夜与各类交通/道路功能。

## 方法论与验证边界

沿用“整体规划 → 独立原件 → 组合 → 实际场景多角度检查 → 修正 → 复查”。加载架构任务同样先做最小可检验阶段，再逐步接入全城；不能只凭构建通过判断交互可用。

此前云浏览器无法建立 WebGL，后续本地 Vite 在 127.0.0.1 可以启动，但远程浏览器访问该 localhost 会连接拒绝，属于不同运行环境，不能假称浏览器验收成功。新窗口应重新检查能力。项目已有多种真实几何/材质的 EGL 离屏脚本，但它们的简化渲染不能验证浏览器主线程卡顿、真实渐进首帧、透明排序或手机帧率。加载性能必须区分 Node CPU 基准、离屏检查和真实浏览器结果。

检查命令：npm test、npm run build、git diff --check。仅本交接文档变更无需重复跑全套模型测试。

## 工具与旧工作区线索

旧工作区：/workspace/scratch/f0a29f91b82c/CityMap。shell git 拉取可用，但直接 push 曾因缺少 HTTPS 凭据失败；已通过 GitHub 连接器基于最新远程 tree 创建 blob/tree/commit，并用 expected_sha、force:false 更新 main。本地与远程可能文件树相同而提交历史不同，不可直接强推。

此前临时 EGL、canvas 和 /tmp 脚本可能失效，先检查依赖，勿假设跨窗口仍存在。代码与检查证据随本仓库保存，不需要复制完整仓库到其他存储。
