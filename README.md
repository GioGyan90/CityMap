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
