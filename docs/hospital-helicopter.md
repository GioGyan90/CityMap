# 医院停机坪与急救直升机

沿用医院主楼原停机坪，修复其被屋顶饰面遮盖的问题：停机坪底部与主楼顶面相接，清晰的 H 和圆环以独立薄层位于坪面上方，原八盏边界标记保留。直升机按停机状态放在坪面中心，滑橇底部与坪面相接。医院整体非等比缩放，因此对直升机做相应反向比例校正；飞机仍随医院完整根节点移动，拾取范围随整体边界重新计算。

直升机分为机身、驾驶舱与舷窗、尾梁与尾翼、主旋翼与尾旋翼、起落架、急救标识六组，使用暖白、急救红和海蓝。资产查看器可查看组合、各部件和独立的 H 环形标记。旋翼为静止停机状态，没有飞行或旋转动画。

`helicopter-review/components.jpg` 为飞机实际几何正、侧、背、斜、低、底视角；`rooftop.jpg` 为医院原位正、侧、背、斜、低和顶视；`scene.jpg` 为邻近城区检查。EGL 离屏绘制使用简化光照，不是浏览器截图，不能证明实际夜间、透明排序和移动端表现。自动测试检查部件、标记、屋顶承托、起落架接触和坪面范围。

复现需 moderngl、numpy、Pillow 和 @napi-rs/canvas；运行 `node scripts/review/helicopter.mjs`，设置 `CITYMAP_CANVAS_MODULE` 与 `CITYMAP_FACADE_FOCUS=hospital` 后运行 `node scripts/review/helicopter-rooftop.mjs`。
