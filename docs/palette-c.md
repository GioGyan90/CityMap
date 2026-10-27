# CityMap 配色 C

2026-10-27：根据 C 方案调整实际场景，以宝蓝深海、海沫青浅海、鲜绿地形和暖奶油建筑为主体。杏橙、珊瑚、薰衣草紫和洋红集中用于住宅屋顶、遮棚和游乐设施，保留各地标的既有识别色与建筑结构。色值为场景材质输入，实际显示受光照、色调映射和时间影响。

公共点缀色定义在 `src/visualStyle.ts` 的 `RESORT_ACCENTS`；地形、水域和建筑各自使用对应材质，昼夜光照规则保持不变。

- `palette-c-review/before-after.jpg`：调整前后同机位全城离屏对照。
- `palette-c-review/times.jpg`：白天、傍晚、夜间全城离屏近似预览。
- `palette-c-review/water-before-after.jpg`：实际海水着色器及船只阴影前后对照。
- `palette-c-review/park.jpg`、`market.jpg`：局部多角度检查。

全城及局部图由项目真实几何和材质通过 EGL 近似渲染，并非浏览器截图；不完整模拟实际天空、阴影和照明。海水图使用实际海水着色器和阴影贴图，但其他场景光照仍是离屏近似。云浏览器无法创建 WebGL，因此真实浏览器和设备表现仍需现场确认。运行 `scripts/review/palette-overview.mjs`、`palette-c-scene.mjs` 和 `palette-c-water.mjs` 可复查。
