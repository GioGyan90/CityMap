# 直升机与海岸列车窗户贴合

直升机原侧窗为平板、前窗为独立椭球，与椭球机身曲率不一致。新窗面按机身椭球相同经纬分段制作，紧随机身三角面，仅做极小外偏移避免闪烁；保留白、蓝、红配色及可拆分驾驶舱部件。

海岸列车原车壳沿长度的顶点不足：车端收窄变形只作用在少数端点，车壳在车窗位置的实际宽度与独立窗框不一致，造成明显悬空。车壳改为纵向分段，车窗、车门、窗台和车顶也按同一收窄函数连续变形；保留前端斜面、上下封面、轮架和合批。山麓列车复用同一工厂，因此也检查其窗户和车门。驾驶室前窗位置同步靠近斜面。

`vehicle-glazing-review/helicopter.jpg` 和 `train.jpg` 分别为飞机、海岸车头和车厢的六角度实际几何离屏图；`hospital.jpg` 是医院安装位置，`coast-scene.jpg` 是实际海岸列车与线路的五角度离屏检查。图中照明简化，非浏览器截图；不代表真实设备透明排序或帧率。回归检查针对两种列车各车窗、车门在中心及两侧位置测量与车壳的间距，直升机窗面以射线测量与曲面的接近程度，并保留既有轨道运行与安全检查。

复现需 moderngl、numpy、Pillow、@napi-rs/canvas；运行 `node scripts/review/helicopter.mjs`、`node scripts/review/train-glazing.mjs`，设置 `CITYMAP_CANVAS_MODULE` 运行 `scripts/review/helicopter-rooftop.mjs` 和 `scripts/review/coast-train-glazing.mjs`。
