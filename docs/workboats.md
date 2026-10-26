# 中型作业船（2026-10-26）

基于 main `9d9adedbe7e277661e64a4333bf95bcb7b0f7911`。新增港口拖轮、吊机工程船、近海渔船，替换六艘海上帆船及两艘市场停泊帆船。保留上一轮两艘运动快艇。

三类船均约长 12.19 米、宽 4.32 米；拖轮/渔船高 5.50 米（含吃水），工程船高 6.13 米。以水线为原点，+X 为船首。分组包含收底船壳与甲板、舷边扶栏及系泊件、驾驶楼及独立屋顶、救生及推进设备、专用作业设备。拖轮使用青绿船身、防撞轮胎与拖缆绞车；工程船使用金黄船身、双梁吊臂、绳索吊钩和载物；渔船使用蓝色船身、网架、卷网筒和鱼箱。资产查看器含三个组合和各自原件。

巡航船按 Z=-45、-5、35、75、115、155 分开，X 在 [-220,-155] 往返，速度沿用原慢速港湾交通。姿态水线基准 .12 米，起伏 ±.04 米，横摇 ±.045 弧度；以完整船体 6.1 米半长保守计算，最低甲板仍高于水面最大 .24 米位移。停泊渔船等比缩为 .65，沿栈桥转 90 度，保留原锚点。仍沿用原交通的端点转向，尚未增加平滑掉头或船只调度。

## 实际检查

- `workboat-review/boats.jpg`：三个源模型的前/侧/后/斜/低/底部视角（前视命名使用旧脚本的 +Z，相当于船侧）。
- `workboat-review/boats-batched.jpg`：按材质合批后同角度复查。
- `workboat-review/scene.jpg`：真实地图中三类海上船与市场停泊船的水线、比例和栈桥净空。
- `geometry*.json` 与 `placements.json`：实际几何尺寸、绘制数和落位记录。

以上使用项目真实几何和材质的 Mesa EGL 离屏渲染、简化固定光照与水面；本轮没有完成浏览器 WebGL、完整昼夜及手机帧率验收。

复现：`node scripts/review/workboats.mjs`；`FLEET_OPTIMIZED=1 node scripts/review/workboats.mjs docs/workboat-review/boats-batched.jpg docs/workboat-review/geometry-batched.json`；设置 `CITYMAP_CANVAS_MODULE` 为 @napi-rs/canvas 的绝对路径后执行 `node scripts/review/workboat-scene.mjs`。

回归检查替换旧帆船测试，覆盖八艘船替换、航向、完整尺寸、合批尺寸一致、甲板波浪余量及停泊朝向。发布使用现有 Actions → Pages。
