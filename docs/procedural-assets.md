# 路径与阵列资产生成

椰树是本项目第一个用“路径截面 + 沿线排列 + 径向排列”组合的资产。
所有随机变化在生成阶段用固定 seed 计算，不在动画帧内重新抽样。

## 原件和装配关系

- `palm-trunk`：九个独立 `palm-trunk-barrel` 桶节，沿同一弯曲路径装配；每节记录 from/to/radius。
- `palm-frond`：以叶柄根部为原点，包含连续叶轴与 `notched-leaf-blade` 宽叶片，叶片由实际二维布尔相减获得。
- `palm-crown`：以树干路径终点为原点，朝向继承终点切线；包含三层叶片和果实。
- `palm-coconuts`：椰子位于冠心下方，跟随树冠移动。
- `palm-tree`：以上原件的整树装配；没有地图位置和道路依赖。

资产查看器可独立选择单个桶节、树干、单片椰叶、树冠、椰子、整树与另外两种变体。
普通阔叶树使用明确的资产名称登记，不再依赖场景中 InstancedMesh 的遍历顺序。

## 可复用函数

`src/proceduralGeometry.ts` 不引用场景：

| 函数 | 输入与用途 |
| --- | --- |
| `pathFrames` | 按路径弧长采样，输出位置、切线及截面坐标轴 |
| `sweepProfile` | 沿路径复制二维截面，按 radius(u) 缩放，连接侧面并封闭两端 |
| `circularProfile` | 生成低面圆截面；可换为自定义截面以形成扶手、管线等 |
| `leafRibbon` | 沿叶片路径生成两侧轮廓与中脊，叶宽沿路径变化；薄叶使用双面材质 |
| `radialPlacements` | 基础的等角复制工具；新版树冠另用非均匀角间距 |
| `cutLeafGeometry` | 宽叶轮廓减去多个不等大的切口，再加厚、纵向细分并沿曲线弯曲 |
| `seededRandom` | 独立随机流，固定种子可复现相同形体 |

树干路径使用三次贝塞尔曲线。九个桶节的长度按随机权重分配，每节用 8 边截面和多层半径形成外翻底缘、鼓腹与收口；粗细有局部回升，不作平均递减。相邻桶节略微交叠以避免透缝，整体弯曲和冠心连接仍由路径控制。

叶片先建立完整宽叶轮廓，用 `polygon-clipping` 的 difference 减去左右各 3–5 个位置、宽度与深度不同的切口；保留中轴连接。布尔结果加厚后按纵向分带细分，随后沿弯曲叶轴变形，避免大三角面跨过曲线成为直弦。叶面焊接顶点后重算法线，减轻零碎三角面明暗。

树冠仍分嫩叶、展开叶、下垂叶，但方位角间距来自不同的随机权重，叶长比例为 0.72–1.30，弯曲和下垂幅度也分别变化；为果实留出一个不规则开口。椰子采用前侧成簇布局，避免被垂叶完全遮住。

可以用 `createPalm({seed:41,height:6.4,bend:1.35,fronds:9})` 生成可编辑装配。
`fronds` 取整后限制在 6–24 片，`height`、`bend` 使用项目内的有效有限正高度参数。
路径修改后重新生成整树，冠心与果实会跟随；此版本不提供面板参数编辑。

## 地图和检查使用不同表示

查看器保留原件层级，便于检查连接、线框、法线和轮廓。
地图通过 `bakePalm` 将局部变换烘焙到顶点、材质颜色烘焙到顶点色，合并为一份几何。
三个固定种子分别生成一份几何，每种用一个 InstancedMesh 批量放置；沿用原来的种植位置和避让规则。
默认每种约 8,100–8,300 三角面，原件多网格不会逐棵带入地图。
叶片有实际厚度和切口侧壁；渲染保留双面材质，当前不生成独立叶片碰撞体。

## 验证与首轮修改

浏览器检查树干、单叶、树冠、果实及三个变体，查看正、侧、背、顶、斜视与线框。
参考图修订后，检查桶节轮廓、宽叶缺口、树冠不均匀分布；修正叶面碎片明暗和果实遮挡。自动检查覆盖截面朝向和封闭边、桶节高度与半径变化、真实相减面积、叶片相减后保持连通、叶长与角间距差异、固定种子复现、不同高度/弯曲/叶数下的装配关系、烘焙前后精确包围盒及有限数值。

## 方法参考

- [Blender：Curve to Mesh](https://docs.blender.org/manual/en/4.4/modeling/geometry_nodes/curve/operations/curve_to_mesh.html)
- [Blender：Instance on Points](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/instances/instance_on_points.html)
- [Blender：Random Value](https://docs.blender.org/manual/en/3.1/modeling/geometry_nodes/utilities/random_value.html)
- [Three.js：Curve](https://threejs.org/docs/pages/Curve.html)
- [Three.js：InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)

文档是方法参考；项目实现使用 Three.js 0.160 和 polygon-clipping，不依赖 Blender 或在线服务。第三方许可随 public/third-party-notices.txt 发布。
