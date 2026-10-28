# 彩漫试验第二轮：加粗描边

2026-10-28，按用户“区别不大，描边可以加粗一点”的反馈调整，基于 main `28a8a5c27bb4acfebefc2210efc7fb6f716b2f5e`。

- 深度描边采样半径由 1 增至 2 个渲染目标像素；颜色采样/平滑半径保持原值，避免以整体模糊代替加粗。
- 日间墨线混合强度 0.53→0.78；远景保留系数 0.18→0.38，改善俯瞰全城时轮廓过淡的问题。
- 二阶深度差阈值略提高，抑制连续斜面上的误描边。夜间基础墨线强度、只压暗约束、水下抑制、色板、明暗色阶和空气感不变；纹理采样次数及绘制通道数量不增加。
- 原版开关、M 快捷键、`?style=original`、资产查看绕过和 GPU 回退保持原逻辑。

`manga-bold-review/before-after.jpg` 为 **左：第一轮细描边，右：本轮粗描边**，依次全景、码头和住宅；`comparison.jpg` 为左原版、右本轮。使用实际城市几何和源码 shader 的 EGL 离屏近似，非浏览器截图。晨昏和夜间也已检查，但未复现完整天空/云/海水/阴影/灯光，不能当作实机夜景或帧率验收。

三机位原版图像与第一轮逐字节相同，复用 `manga-review/*-original.jpg`，不重复保存。与细描边相比，RGB 平均降低超过 8/255 的像素约为全景 5.03%、码头 6.09%、住宅 8.46%，证据 `ink-change.json`；这是图像变化量，不是性能指标。源码 shader EGL 编译和五组机位/时段绘制通过，见 `shader-check.json`。142 项既有回归、生产构建/启动检查和 diff 检查通过。

复现：设置 `MANGA_REVIEW_DIR=docs/manga-bold-review`、`CITYMAP_CANVAS_MODULE` 后运行 `node scripts/review/manga.mjs`，再运行 `python scripts/review/compare-ink.py docs/manga-review docs/manga-bold-review`。默认输出目录仍为第一轮目录，复查第二轮时务必设置上述目录。

撤回本轮加粗：revert 本次独立提交即可恢复第一轮细描边。完全撤回彩漫试验：依次 revert 本轮提交和首轮 `28a8a5c`，保留后续其他工作；原始备份 `backup/pre-manga-20261028` / `c17f7e1` 仍在。随时可用右上角开关、M 或原版链接直接恢复原渲染路径。
