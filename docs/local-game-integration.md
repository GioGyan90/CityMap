# CityMap → 本地游戏接入交接

更新：2026-10-28（北京时间）。面向接手 Lucky Break／本地游戏集成的开发者。

## 1. 本次交付与固定版本

已撤回两轮漫画效果及加粗描边，恢复试验前的原版渲染、C 色板、光照和材质。保留默认沉浸模式、重构后的集装箱码头、全部既有查看器功能，以及可操作灰模首屏和渐进恢复。漫画开关、快捷键和后处理模块已移除。浏览器中旧的漫画偏好键不再读取；不要为此清空所有 localStorage，以免误删游戏存档。

- 仓库：<https://github.com/GioGyan90/CityMap>
- 在线地图：<https://giogyan90.github.io/CityMap/>
- 本次交付快照分支：`handoff/local-game-original-20261028`。此分支用于复现本次交付，不随之后的 main 更新。
- 原版功能基线：`c17f7e10bdcfb0815ed718bcb6d91221420a476e`，tree `287cd0e1e5417458ae9337965c389ffca448e86b`。
- 本次从 main `24e167145fb9e1c48e37b3c9d419e42d6664efab` 正向提交撤销，不改写历史。加入本文前，撤销后的完整代码树与上述原版 tree 完全一致。

**实际交付范围：地图已恢复，本文提供接入路线；尚未修改本地游戏。** 未获得游戏源码、目录、引擎版本或运行方式。下文以 Web／Three.js 游戏或可嵌入 WebView 的桌面游戏为前提；原生 Unity／Unreal 项目需要另做桥接，不能直接导入这些 TypeScript 模块当原生场景。

## 2. 拉取代码与启动（Windows PowerShell）

安装 Node.js 22 LTS，至少 22.12，及 Git。以下命令在准备放源码的父目录执行，会创建独立目录，不覆盖游戏项目：

```powershell
git clone --depth 1 --single-branch --branch handoff/local-game-original-20261028 https://github.com/GioGyan90/CityMap.git CityMap-original
Set-Location .\CityMap-original
git rev-parse HEAD
node --version
npm --version
npm ci
npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
```

打开 <http://127.0.0.1:5173/>。终端保持运行，Ctrl+C 停止。页面默认沉浸，可用退出按钮或 H／Esc 恢复界面。正常启动不需要 GitHub Pages、CDN 或在线 Three.js。

如需跟踪后续 main，而非固定交付快照，在另一个目录使用：

```powershell
git clone https://github.com/GioGyan90/CityMap.git CityMap-main
Set-Location .\CityMap-main
git pull --ff-only origin main
npm ci
```

已有仓库先 `git status`，保存自己的改动后再 `git fetch origin`、切到 main 并 `git pull --ff-only origin main`。不要用强制重置覆盖游戏侧工作。快照的单分支浅克隆不会自动跟踪 main；如需完整历史，另行执行 `git fetch --unshallow` 并配置需要的分支。

验证生产包：

```powershell
npm test
npm run build
npm run preview -- --host 127.0.0.1 --port 4173 --strictPort
```

打开 <http://127.0.0.1:4173/>。不要双击 `dist/index.html` 使用 `file://`。构建会先烘焙住宅数据，再执行类型检查、Vite 打包及生产启动／轻量预览依赖检查。

当前核心依赖为 Three.js 0.160.0、SunCalc 2.1.1、polygon-clipping 0.15.7；版本以 `package-lock.json` 和 `npm ci` 为准。构建目标 ES2022，使用顶层 await，需要现代浏览器及可用 WebGL。

## 3. 建议第一阶段：以独立地图页接入

**优先使用 iframe／独立 WebView。** 这样可保留现有查看器、渐进启动、CSS、DOM 与工具，不必立刻重写场景生命周期。它目前是地图查看器，不是游戏 SDK，也不是 GLB／FBX 资源包。

将构建出的 **整个 `dist` 内容** 放进游戏的独立静态目录。下面仅是“游戏同样使用 Vite，静态目录为 public”的示例，路径必须换成真实游戏目录：

```powershell
# 当前仍位于 CityMap-original 源码根目录
$gameMapDir = 'D:\Projects\LuckyBreak\public\maps\citymap-original-20261028'
New-Item -ItemType Directory -Force -Path $gameMapDir | Out-Null
Copy-Item -Path .\dist\* -Destination $gameMapDir -Recurse -Force
```

此版本目录应专供地图使用。更新时使用新的版本目录，避免遗留旧资源混入。务必包含 `assets/`、`cache/cloud-density-v1.bin` 和 `third-party-notices.txt`，不能只复制 HTML 或一个 JS 文件。Vite 的 `base: './'` 支持这个嵌套路径；云缓存相对于文档地址解析。云缓存读取失败可回退生成，但会增加计算。

在游戏 UI 的全屏容器中挂载：

```html
<iframe
  title="城市地图"
  src="/maps/citymap-original-20261028/index.html"
  style="position:absolute;inset:0;width:100%;height:100%;border:0"
></iframe>
```

由游戏提供独立的关闭地图按钮，建议放左上角，避开地图右上角退出沉浸按钮。地图的“退出沉浸”只恢复地图界面，**不会返回游戏**。打开前由游戏暂停自身渲染／模拟；关闭时移除 iframe 并恢复游戏，避免两个 WebGL 场景持续争抢资源。只设 `display:none` 不保证停止地图动画。重新打开会重新启动地图，若需保留相机，须先实现状态桥接。

同源部署最容易管理。开发时两个不同端口属于跨源，不能直接读取 iframe 内部 scene。iframe 的 `load` 事件也不代表正式城市已构建完成；它后面还有异步启动和渐进生成。

## 4. 游戏通信与地标进入：需要另外实现

目前没有 `createCityMap()`、`dispose()`、`pause()` 或 `postMessage` 协议；也没有角色控制、碰撞、寻路、建筑内部和任务状态。不能把下列设计写成已存在的接口。

建议后续新增明确的桥接协议，所有消息使用统一 `channel: 'citymap'`、`version: 1`，分别定义地图 ready／error／请求进入地标／请求关闭，以及游戏设置选中地标和时间的消息。两侧都验证 `event.origin`、`event.source`、消息结构及地标白名单；发送时使用明确的目标 origin。

- ready：在 `src/main.ts` 的 animation 阶段启动、灰模交接完成之后发出，而非在 HTML load 时发出。
- error：接启动失败分支，让游戏显示重试／返回入口。
- 进入地标：增加明确的点击确认或“进入”按钮。现有悬停、标签聚焦和镜头飞行不能当作进入事件。
- 游戏负责建筑 ID → 游戏场景／任务的映射和存档，地图只发送稳定 ID。不要保存 Mesh UUID 或 Three.js 对象。

**默认沉浸会关闭现有地标拾取与聚焦。** `src/focus.ts` 会检查 `body.dataset.immersive` 后提前返回。接入时若要求保持无界面且可点建筑，应把“隐藏 UI”和“允许游戏交互”拆开；当前没有可直接启用的 `?mode=game`、`?embed` 或地标跳转 URL 参数。

地标注册入口在 `src/specialBuildings.ts`，包含 `specialBuildings`、`pickTargets`、`registerSpecial()`、`registerGroup()`；条目含 `id/name/description/group/pick/radius`。常用现有 ID 包括 `hall1`—`hall5`、`cargo`、`passenger`、`fishmarket`、`civic`、`hospital`、`hotel`、`police`、`campus`、`cafe`、`restaurant`、`promenade`、`villa`、`lighthouse`、`park`、`commercial`、`cruise`、`market`、`coaststation`。以运行时注册表为准，别把布局区 `port` 与独立地标 ID 混用。

当前 focus 会将其他地标缩至 88% 并灰化。游戏碰撞不能绑定这种视觉缩放，应停用该展示效果或使用独立碰撞代理。普通住宅经过合批，不等于每栋都是可进入的独立游戏实体。

## 5. 第二阶段：需要共用游戏场景时再做适配器

不要直接将 `src/main.ts` 或 `src/city.ts` 静态 import 到游戏。当前模块在顶层创建场景、生成城市、读取 DOM 和注册监听，animation 导入后自行启动 requestAnimationFrame；重复挂载还受 ESM 模块缓存影响，`world.clear()` 不会重新执行构建。

正式适配器需要实现以下职责，然后才谈同一个 renderer：

1. 显式创建与异步初始化，接收 container、scene／world、camera、renderer 和输入策略；避免全局 `innerWidth/innerHeight` 假设。
2. 把动画改为游戏主循环调用的 `update(dt)`，仅保留一个正式循环。游戏暂停、太阳时钟、普通动画及资产查看暂停语义分别处理。
3. 支持 resize、选择／地标事件、时间／相机状态；保留 CSS2D 标签、OrbitControls 和必要 DOM，或替换为游戏自己的 UI。
4. 实现取消未完成生成和 dispose：停止循环、移除监听／计时器／标签、释放自有几何材质纹理和渲染目标，处理共享缓存归属，防止关闭后异步任务继续挂载对象。
5. 核对游戏 Three.js 版本与实例。当前为 0.160.0；不能默认与另一版本的 renderer、材质、着色器扩展兼容。

保持初始化依赖：`scene → loadingPreview → environment → city → night → focus → labels → camera → animation`。预览需要先获得绘制机会；正式循环接手后释放灰模。云预载并行、几何构建延后，保存布局要在正式动画启动前恢复。历史上将这些副作用模块静态合并，曾让 camera 提前读取尚未生成的车站，导致启动失败。

现有调度约 6 ms 是让出主线程的软预算，不能抢占单个同步任务。保留分片和住宅视野优先，禁止在灰模显示后重新加上“一次同步构建全城”。灰模可操作不等于真实设备首帧、低端帧率已经验收。

## 6. 坐标、地形和角色落点

世界为 Y 向上，X 向东，Z 向南；1 单位按约 1 米理解，是风格化城市而非地理测绘坐标。网格入口在 `src/mapCoordinates.ts`：原点 X=-260、Z=-220，格长 20，30 列×23 行。`src/layout.ts` 的 ZONES 是布局锚点，不能直接当玩家安全落点或建筑门口。

海水基础面约 Y=-0.26，普通地面参考约 1.06，货运码头平台约 1.56，但地形并非等高。人物脚底应查真实表面，再加角色半高／脚底偏移。`terrainHeight()` 是基础地形函数；`surfaceHeight(x,z)` 才是包含整平及道路影响的地表查询，仍不是多层碰撞系统。

隧道与洞顶山体在相同 X/Z 处有不同高度。现有车辆会结合 `src/tunnelTraffic.ts` 的 `tunnelDrivingHeight()`、高架路线与 `surfaceHeight()`，不能统一查询山顶高度。游戏应区分地表、道路、高架、隧道、水面与室内层。

地图没有玩家碰撞体或 navmesh。优先生成简单道路／地面／建筑阻挡代理，避免每帧射线扫描全城装饰网格。落点需验证处于可达路面且不在海中、墙内或车辆路线上。要移动／缩放整个地图，必须同时转换高度查询、道路、拾取和动画的坐标；最稳妥是保留地图坐标，移动游戏角色与相机。实际边界以几何包围盒及可行走区域为准，码头、船只会伸出大陆轮廓。

## 7. 源码定位和需要保留的功能

| 需求 | 入口 |
| --- | --- |
| 启动顺序、失败与灰模交接 | `src/main.ts` |
| renderer、world、相机、controls | `src/scene.ts` |
| 城市生成、布局和地表 | `src/city.ts`、`src/layout.ts`、`src/terrainSurface.ts` |
| 灰模与分片调度 | `src/loadingPreview.ts`、`src/loadingScheduler.ts`、`src/generated/` |
| 道路、交通与隧道 | `src/roadNetwork.ts`、`src/traffic.ts`、`src/trafficSimulation.ts`、`src/tunnelTraffic.ts` |
| 轨道与运输 | `src/transport.ts`、`src/railNetworkPlan.ts` |
| 地标、拾取、标签、镜头 | `src/specialBuildings.ts`、`src/focus.ts`、`src/labels.ts`、`src/camera.ts` |
| 动画、太阳、夜景 | `src/animation.ts`、`src/solarCycle.ts`、`src/night.ts` |
| 海水、云与缓存 | `src/water.ts`、`src/clouds.ts`、`src/cloudCache.ts` |
| 集装箱码头及拆解原件 | `src/cargoPlan.ts`、`src/cargoAssets.ts`、`docs/cargo-terminal.md` |
| 资产查看与布局草稿 | `src/assetTools.ts` |

现有 URL 支持 `?time=15.5&speed=60&play=1` 等太阳时间参数，速度档位为 1／60／360／1440；资产模式使用 `?view=assets&asset=cargo-kit-crane`。仅带 asset 会提前加载工具，但不等于完整资产隔离模式。相机视角由 `camera.ts` 的 VIEWS 和 UI 按钮控制；不存在通用 `?view=cargo` 跳转。撤销后的 `?style=...` 不再控制渲染。

保留默认沉浸及退出、相机旋转缩放平移、地标标签／聚焦、视角切换、昼夜与时间控制、全局暂停、交通／轨道／船／喷泉／游乐动画、云海阴影、资产拆解及保存布局。iframe 方案原样保留；同场景改造必须逐项回归。

地图使用的布局、位置笔记和太阳偏好键包括 `citymap-layout-draft-v1`、`citymap-position-notes-v1`、`citymap-solar-v1`，另有旧 `citymap-night` 兼容逻辑。它们不是玩家任务存档；游戏存档另设命名空间。独立页面自身 CSS 和 index.html 中的 DOM ID 也有运行时依赖，同窗口集成时不能只拷贝 canvas。

## 8. 验证、验收与下一步

本次恢复后的 `npm test` 139 项通过；`npm run build` 通过，包括生产启动阶段及灰模依赖检查。代码树精确回到原版基线后再加入交接资料，没有另做造型或调色。

**验证边界：当前云浏览器环境无法创建 WebGL，未完成真实浏览器画面／输入延迟／设备帧率验收；本地游戏源码未提供，也未声称完成游戏内联调。** 构建成功及 HTTP 资源检查不能代替这些验证。

游戏侧验收至少包括：首次打开可操作灰模、恢复正式地图后镜头不跳、默认沉浸及退出正常；嵌套路径全部资源可读；地图关闭后不再占用循环和 WebGL 上下文；反复开关不增长资源；父游戏暂停和恢复正确；明确点击进入地标；保存与重载不破坏游戏存档；昼夜／动画／资产工具仍可用；低端设备冷启动和失败重试可返回游戏。

第三方依赖声明随包保留在 `public/third-party-notices.txt`。仓库未单独提供原创内容的根 LICENSE；不要把依赖的 MIT／BSD 声明当作整份地图内容对外再授权。

继续工作时先读 `AGENTS.md`、`docs/HANDOFF.md`、本文、`docs/progressive-loading-handoff.md`、`docs/progressive-loading.md`、`docs/cargo-terminal.md`，再根据引用阅读加载性能、预烘焙、合批及色板文档。核对最新远程 main，不能用旧工作区覆盖。

可直接交给下一位开发者的任务：

> 从 handoff/local-game-original-20261028 拉取原版 CityMap，先按交接文档独立启动。拿到本地游戏的实际路径、启动命令和引擎版本后，先做独立 iframe／WebView 地图入口、关闭及游戏暂停恢复，再实现经过校验的地标进入通信。若必须共用 Three.js 场景，先提出生命周期适配改造，保留灰模分片启动、现有色板与全部查看器功能。真实浏览器与实际游戏逐项验收；不要把当前不存在的 SDK、碰撞或消息协议当作已有能力。
