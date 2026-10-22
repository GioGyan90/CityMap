# 路径与阵列资产生成

椰树是本项目第一个用“路径截面 + 沿线排列 + 径向排列”组合的资产。
所有随机变化在生成阶段用固定 seed 计算，不在动画帧内重新抽样。

## 原件和装配关系

- `palm-trunk`：连续渐缩树干，包含单独的 `palm-leaf-scars` 叶痕分组。
- `palm-frond`：以叶柄根部为原点，包含连续叶轴和 `paired-leaflets` 小叶分组。
- `palm-crown`：以树干路径终点为原点，朝向继承终点切线；包含三层叶片和果实。
- `palm-coconuts`：椰子位于冠心下方，跟随树冠移动。
- `palm-tree`：以上原件的整树装配；没有地图位置和道路依赖。

资产查看器可独立选择树干、单片椰叶、树冠、椰子、整树与另外两种变体。
普通阔叶树使用明确的资产名称登记，不再依赖场景中 InstancedMesh 的遍历顺序。

## 可复用函数

`src/proceduralGeometry.ts` 不引用场景：

| 函数 | 输入与用途 |
| --- | --- |
| `pathFrames` | 按路径弧长采样，输出位置、切线及截面坐标轴 |
| `sweepProfile` | 沿路径复制二维截面，按 radius(u) 缩放，连接侧面并封闭两端 |
| `circularProfile` | 生成低面圆截面；可换为自定义截面以形成扶手、管线等 |
| `leafRibbon` | 沿叶片路径生成两侧轮廓与中脊，叶宽沿路径变化；薄叶使用双面材质 |
| `radialPlacements` | 绕轴等角排列，再加入有界的角度和大小扰动 |
| `seededRandom` | 独立随机流，固定种子可复现相同形体 |

树干使用三次贝塞尔路径、16 个纵向分段、8 边截面；根部外扩、向上渐缩。
截面通过路径坐标框架定向，直接连接对应顶点，避免独立圆柱之间的接缝。
单片椰叶使用弯曲叶轴，两侧各排列 12 片小叶；小叶位置按弧长采样，左右略微错开。
叶片按嫩叶、展开叶、下垂叶分层，分别设置长度、弯曲和下垂，层内仅作轻微随机。

可以用 `createPalm({seed:41,height:7,bend:1,fronds:12})` 生成可编辑装配。
`fronds` 取整后限制在 6–24 片，`height`、`bend` 使用项目内的有效有限正高度参数。
路径修改后重新生成整树，冠心与果实会跟随；此版本不提供面板参数编辑。

## 地图和检查使用不同表示

查看器保留原件层级，便于检查连接、线框、法线和轮廓。
地图通过 `bakePalm` 将局部变换烘焙到顶点、材质颜色烘焙到顶点色，合并为一份几何。
三个固定种子分别生成一份几何，每种用一个 InstancedMesh 批量放置；沿用原来的种植位置和避让规则。
默认每种约 5,872 三角面，原件多网格不会逐棵带入地图。
双面薄叶适合当前地图和资产预览；如需封闭实体、碰撞或实体制造，需另行增加厚度。

## 验证与首轮修改

浏览器检查树干、单叶、树冠、果实及三个变体，查看正、侧、背、顶、斜视与线框。
首轮发现小叶偏宽、末端稀疏，调整为更窄的小叶，并从每侧 9 片增加至 12 片、延伸排列范围。
同时修正叶片表面绕序，检查双面材质和地图烘焙后的显示。
自动检查覆盖截面表面朝向、封闭边、固定种子复现、不同高度/弯曲/叶数下的装配关系、
烘焙前后精确顶点包围盒及有限数值。

## 方法参考

- [Blender：Curve to Mesh](https://docs.blender.org/manual/en/4.4/modeling/geometry_nodes/curve/operations/curve_to_mesh.html)
- [Blender：Instance on Points](https://docs.blender.org/manual/en/latest/modeling/geometry_nodes/instances/instance_on_points.html)
- [Blender：Random Value](https://docs.blender.org/manual/en/3.1/modeling/geometry_nodes/utilities/random_value.html)
- [Three.js：Curve](https://threejs.org/docs/pages/Curve.html)
- [Three.js：InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html)

文档是方法参考；项目实现使用现有 Three.js 0.160，不依赖 Blender 或在线服务。
