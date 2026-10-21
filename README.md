# Lucky Break · 海岸城三维地图

基于提供的 `city map.htm` 重构，保留程序化城市的造型、配色、地标和动画。使用 Three.js 0.160、TypeScript、Vite；Three.js 随应用打包，线上无需依赖 unpkg。

在线地址：https://GioGyan90.github.io/CityMap/

## 使用

- 鼠标左键拖拽旋转、滚轮缩放、右键拖拽平移。
- 手机单指旋转、双指缩放和平移。
- 右侧切换全景、俯视及各地标视角，开关地名或暂停场景动画。

## 本地开发

需要 Node.js 22.12+。

```sh
npm ci
npm run dev
npm run build
npm run preview
```

`npm run build` 先运行 TypeScript 检查，再生成 `dist/`。

## 代码位置

| 模块 | 用途 |
| --- | --- |
| `src/main.ts` | 启动与加载失败提示 |
| `src/scene.ts` | 渲染器、相机、控制器、灯光、天空 |
| `src/config.ts`, `random.ts`, `materials.ts` | 地图常量、确定性随机、卡通材质 |
| `src/environment.ts`, `mountains.ts`, `clouds.ts` | 岛屿、海面、山脉、云 |
| `src/buildings.ts`, `districts.ts`, `roads.ts` | 通用楼体、住宅街区、道路 |
| `src/amusement.ts`, `landmarks.ts`, `port.ts` | 游乐园、公共建筑、港口 |
| `src/vegetation.ts`, `traffic.ts` | 实例化植被与车辆 |
| `src/city.ts` | 城市布局与组装顺序 |
| `src/labels.ts`, `camera.ts`, `animation.ts` | 地名、视角与动画 |
| `src/styles.css` | 桌面与移动端界面 |

后续添加细节时，在对应地标模块添加造型，在 `city.ts` 调整位置，在 `labels.ts` 添加标注，在 `camera.ts` 添加观察视角。世界 Y 轴向上、XZ 为地面；地面高度见 `GROUND_Y`。几何体与贴图均由代码生成，没有外部模型资源。

## GitHub Pages

推送 main 自动通过 `.github/workflows/deploy.yml` 安装锁定依赖、检查并构建，然后部署 GitHub Pages。若首次自动启用被 GitHub 权限限制，在仓库 Settings → Pages → Build and deployment 将 Source 设置为 **GitHub Actions**，再重新运行工作流。

## 当前范围

本版本是地图查看器，尚未接入角色移动、任务、场景入口或地图编辑器。运行需要支持 WebGL 的浏览器。

## 城市扩展版

- 道路覆盖 8 × 11 个街区单元，住宅沿山脚继续延伸；生成 274 栋程序化建筑。
- 十种楼型：平顶楼、坡顶楼、玻璃写字楼、退台塔楼、装饰艺术塔楼、圆形塔楼、拱廊商铺、阳台公寓、别墅和仓库。
- 高楼集中在后方金融区，滨海区域保持低层街景，东侧增加学院、运动场和花园广场。
- 新增“城市天际线”和“山麓住宅”视角。
- 摩天轮绕局部 Z 轴转动，吊舱反向补偿以保持直立；支架固定，旋转木马独立绕 Y 轴运动。
- 静态建筑按材质合并，保留车辆、游乐设施、船只的独立动画。新增或修改建筑后应在全部建造完毕时调用 `batchBuildings()`。

仓库仍使用“Deploy from a branch”时，GitHub 自带的分支发布可能晚于 Vite 发布并覆盖页面。工作流在最终部署前等待同一提交的分支发布结束，再发布编译产物，确保最终页面可运行。推荐在 Settings → Pages 中把 Source 改为 GitHub Actions，这样每次更新只需一次构建。
