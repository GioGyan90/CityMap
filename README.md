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

- 道路覆盖 8 × 11 个街区单元，住宅沿山脚继续延伸；生成多种程序化建筑。
- 十种楼型：平顶楼、坡顶楼、玻璃写字楼、退台塔楼、装饰艺术塔楼、圆形塔楼、拱廊商铺、阳台公寓、别墅和仓库。
- 高楼集中在后方金融区，滨海区域保持低层街景，东侧增加学院、运动场和花园广场。
- 新增“城市天际线”和“山麓住宅”视角。
- 摩天轮绕局部 Z 轴转动，吊舱反向补偿以保持直立；支架固定，旋转木马独立绕 Y 轴运动。
- 静态建筑按材质合并，保留车辆、游乐设施、船只的独立动画。新增或修改建筑后应在全部建造完毕时调用 `batchBuildings()`。

仓库仍使用“Deploy from a branch”时，GitHub 自带的分支发布可能晚于 Vite 发布并覆盖页面。工作流在最终部署前等待同一提交的分支发布结束，再发布编译产物，确保最终页面可运行。推荐在 Settings → Pages 中把 Source 改为 GitHub Actions，这样每次更新只需一次构建。

## 区域概念与地标聚焦

- 按区域概念加强蓝白海滨酒店、遮棚台球用品市场、蓝金商业楼、医院、海鲜餐厅、咖啡馆及邮轮，加入 1–5 号球馆标识。
- 鼠标悬停特殊建筑区域或地名，保持所选区域的彩色与高度；其余建筑平滑降到原高的 88%，使用不含贴图的灰模材质。移开后恢复原材质和高度。
- 点击地名可固定聚焦，再次点击取消；手机可轻点地标/地名。按 Esc、点击空地或开始拖动可清除固定选择。
- `specialBuildings.ts` 注册独立地标根节点和稳定拾取范围；`focus.ts` 管理拾取、过渡及材质还原；`conceptDetails.ts` 负责招牌、遮棚与区域细节；`cruiseShip.ts` 使用船体局部坐标构建邮轮。
- 特殊建筑保持独立分组，普通建筑继续按材质合批；新增地标用 `registerSpecial()` 包裹建造过程，确保描边和附属设施跟随同一聚焦状态。

## 昼夜、海面与温和聚焦

- 其他建筑只降低 12% 高度，灰模保持 80% 不透明度；选择轮廓为沿建筑几何边缘的金色描边。
- 右侧“夜间模式”切换冷蓝环境、暖色窗灯、路灯、游乐设施灯光与星月背景；本机会记住上次选择。
- `water.ts` 用动态波面法线、掠射角反光、日/月光高光和近岸泡沫替代重复浪花贴图；暂停动画同样暂停海面。
- 主干道与支路分级、部分外侧道路改为 T 形路口；中部使用较大的庭院公寓街块，滨海为低层商铺，山麓为稀疏住宅，海滨新增弯曲步道。
- `night.ts` 以实例化灯具和少量局部光源实现夜间氛围，未增加额外外部资源。
