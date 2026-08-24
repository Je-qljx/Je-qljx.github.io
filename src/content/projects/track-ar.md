---
title: Track-AR 田径赛道实时 AR 叠加系统
description: Real-time AR overlay system for track & field video broadcasting | 田径赛道实时 AR 增强现实叠加系统
pubDate: 2026-07-15
tags:
  - Python
  - AR
  - 视频处理
featured: true
githubUrl: https://github.com/Je-qljx/Track-AR
order: 2
---

## 概述

TrackAR 是一套实时计算机视觉系统,为田径赛事视频叠加屏幕图形 — 道次标签、距离标记、速度读数与实时排行榜 — 尽管镜头不断运动,所有图形始终锚定在真实的跑道之上。

系统支持 **100 米直道** 与 **IAAF 标准 400 米环道**(阶梯起跑、各道次实际完成距离),可应对**摇摄、俯仰、变焦、移动、摇臂**等机位运动,并通过标定目标模式同时兼容标准全景镜头与长焦特写。

核心思路:只需标定一次,系统即可通过跑道表面的 KLT 光流跟踪相机运动,让 AR 叠加层逐帧保持精确对齐、不产生漂移。

## 功能特性

- **双跑道几何** — 100 米直道与 IAAF 400 米环道(半径 36.5 米、道宽 1.22 米、直道 84.39 米),含各道次阶梯偏移与完成距离
- **PnP 标定** — 标准四点标定(跑道线交点)或标定目标模式(任意已知尺寸物体置于跑道任意位置);在 400 米弯道上按切平面内矩形计算,保证 PnP 正确
- **无漂移相机跟踪** — KLT 光流(640×360,400 特征点)+ USAC_MAGSAC 单应矩阵,迭代重解 PnP;长镜头摇摄也不漂移
- **YOLOv8 检测** — RTX 5070 上约 115 fps 的管线;置信度与输入尺寸可配置;可优雅回退到 dummy 检测器
- **道次分配** — NumPy 向量化最近邻,2 帧待确认机制,卡尔曼预测引导匹配,NMS(IoU ≥ 0.65),跑道区域过滤(100 米项目剔除观众),失败后重新捕获
- **卡尔曼滤波** — 3 状态(位置/速度/加速度)匀加速模型,自适应噪声;速度限幅 ±15 m/s;位置强制贴合量测值
- **遮挡安全的 AR 标签** — 图形默认放置在运动员前方 2.0 米,备选后方(1.0 米)与侧向(0.4 米);包围盒碰撞检测确保与运动员零重叠
- **实时排行榜** — 按视频时间戳记录各道次完成时间;≥2 名运动员过 0.5 米即开赛;排名/时间叠加面板
- **跨帧标定** — 起点与终点无法同框时(长焦机位),用 ORB 特征匹配跨帧换算点击位置
- **合成演示模式** — 生成 8 名运动员的完整合成比赛,无需相机即可测试

## 系统架构

### 处理管线

```
Frame in → Preprocessor → Camera Tracker (KLT) → PnP Pose Update
                               ↓
                         YOLO Detection → Lane Assignment → Position Estimation
                                                                ↓
         Race Timer ⬄ Ranking ← Position Smoothing ← Edge Detection
                                                                ↓
       Occlusion Guard → Decal Render → Standings Panel → Debug Overlay
                                                               ↓
                                                          Frame out
```

相机跟踪与运动员跟踪是**相互独立的管线**。KLT 跟踪器只跟踪**跑道表面特征** — 运动员会作为 USAC_MAGSAC 外点被剔除。所得单应矩阵将标定参考点重投影到当前外参,再重新求解 PnP,得到无漂移的 6 自由度位姿更新。

> **注意:** 标定只需进行一次。此后相机可自由摇摄、俯仰、变焦、移动或升降,画面始终对齐 — 因为 KLT 跟踪的是道次线与跑道表面,而不是运动员。

### 模块划分

| 模块 | 职责 |
|--------|---------------|
| `calibration/` | 跑道几何(100m/400m)、PnP 标定、3D↔2D 投影、KLT 与 ORB 跟踪 |
| `detection/` | YOLOv8 行人检测;测试用 `DummyDetector` |
| `tracking/` | 道次分配、卡尔曼滤波、位置估计 |
| `pipeline/` | `TrackARPipeline` 总编排、比赛计时、排名、动态相机、预处理、平滑、边界情况处理 |
| `rendering/` | AR 贴图渲染、排行榜面板、遮挡安全放置、调试叠加层 |
| `ui/` | OpenCV 滑杆控制面板(演示用) |
| `media_io/` | 多线程视频采集与输出 |
| `tests/` | 合成场景生成器 + 32 项测试套件 |

## 快速开始

### 环境要求

- Python 3.12+
- 支持 CUDA 12.8 的 NVIDIA GPU(已在 RTX 5070 上验证 — 12 GB 显存,sm_120)
- 完整依赖列表见 `requirements.txt`

### 安装

```bash
git clone <repo-url> track_ar
cd track_ar
pip install -r requirements.txt
```

仓库已内置 YOLOv8 权重(默认 `yolov8s.pt`,另有 `yolov8n.pt` 与 `yolov8m.pt`),也可从 Ultralytics 下载。

---

## 使用方式

### GUI 应用(推荐)

```bash
python trackar_gui.py
```

提供完整的中文界面,包含:

- 视频文件浏览
- 跑道类型选择(100 米 / 400 米)
- 焦距滑杆(24–800mm 全画幅等效)
- 标准四点标定或**标定目标模式**
- 点击式标定,支持跨帧 ORB 校正
- YOLO 置信度 / 输入尺寸调节
- 处理进度条与输出预览

> **提示:** **标定目标模式**专为起点与终点无法同框的长焦机位设计。在跑道上已知位置放置一个已知尺寸的物体(如 A4 纸),点击其四个角点后移除即可。在 400 米弯道上,目标矩形会在局部切平面内计算,保证 PnP 正确。

### 合成演示

```bash
# 100 米直道
python demo.py --track 100m

# 400 米环道
python demo.py --track 400m
```

键盘控制:

| 按键 | 功能 |
| ------- | ------------------------------- |
| `Space` | 暂停 / 继续 |
| `B` | 显示/隐藏包围盒 |
| `O` | 显示/隐藏 AR 叠加 |
| `F` | 切换跟随模式相机 |
| `R` | 重置比赛 |
| `Q` | 退出 |

### 真实视频处理

```bash
python run_real_video.py race_video.mp4 --track-type 100m
python run_real_video.py race_video.mp4 --track-type 400m --focal-mm 200
```

参数:

| 参数 | 说明 |
|------|-------------|
| `--fx` | 像素焦距 |
| `--focal-mm` | 35mm 等效焦距(用于换算 fx) |
| `--track-type` | `100m` 或 `400m` |
| `--no-yolo` | 使用 dummy 检测器替代 YOLO |
| `--model` | YOLO 模型路径(默认:`models/yolov8s.pt`) |
| `--detect-conf` | 检测置信度阈值(默认:0.25) |
| `--yolo-imgsz` | YOLO 输入尺寸(默认:1280) |
| `--output` | 输出视频路径 |
| `--max-frames` | 限制处理的帧数 |

## 运行测试

```bash
python tests/self_test.py
```

测试套件:**32/32 全部通过**

| 类别 | 数量 | 说明 |
|----------|-------|-------------|
| 快速标定 | 13 | 100m/400m 两种跑道在不同位置与尺寸下的标准/目标标定 |
| 全程静态 | 4 | 静态相机完整比赛(标准 + 目标,100m + 400m) |
| 全程摇摄 | 4 | 摇摄相机(标准 + 目标,100m + 400m,0.2 秒内) |
| 全程变焦/变焦摇摄 | 3 | 变焦及变焦摇摄组合(0.2 秒内) |
| 全程抖动/误检/丢帧/噪声 | 4 | 压力条件:随机抖动、每帧 30 个噪声检测、50% 丢失、3px 标定噪声(0.5–1.0 秒内) |
| Dummy 检测器 | 1 | YOLO 回退路径 |
| 压力测试 | 3 | 遮挡、丢失、突然出现 |

覆盖范围:100m 的静态、摇摄、变焦、变焦摇摄、中度摇摄;400m 的静态、摇摄、变焦摇摄。

## 项目结构

```
track_ar/
├── demo.py                      # 交互式合成演示
├── run_real_video.py            # 真实视频处理入口
├── trackar_gui.py               # Tkinter GUI(中文界面,全功能控制)
├── requirements.txt
│
├── calibration/                 # 相机标定与跑道几何
│   ├── coords.py                # 坐标数据类 + TrackGeometry(100m/400m)
│   ├── track_model.py           # IAAF 标准 400 米环道模型
│   ├── calibrator.py            # solvePnP / solvePnPRansac 标定
│   ├── projector.py             # 3D↔2D 投影 + 实时单应位姿更新
│   ├── frame_tracker.py         # ORB 特征匹配(跨帧标定)
│   └── lane_tracker.py          # KLT 光流(逐帧管线)
│
├── detection/
│   └── detector.py              # YOLODetector、DummyDetector、Detection 数据类
│
├── tracking/
│   ├── lane_assigner.py         # 道次-运动员分配 + 轨迹管理
│   ├── kalman.py                # 3 状态(位置/速度/加速度)卡尔曼滤波
│   └── position_estimator.py    # d_m 与速度估计
│
├── pipeline/
│   ├── main_pipeline.py         # TrackARPipeline 总编排
│   ├── timing.py                # 基于视频时间戳的比赛计时
│   ├── ranking.py               # 逐帧排名计算
│   ├── dynamic_camera.py        # 跟随模式相机注视点
│   ├── preprocessor.py          # 帧预处理(方形缩放)
│   ├── smoother.py              # EMA 位置平滑
│   └── edge_cases.py            # 摔倒检测、速度异常
│
├── rendering/
│   ├── standings.py             # 屏上排行榜
│   ├── decal_renderer.py        # alpha 混合 AR 叠加
│   ├── graphic_factory.py       # 名次/时间纹理生成
│   ├── occlusion_guard.py       # 安全锚点放置(前/后/侧)
│   └── debug_overlay.py         # 包围盒与锚点可视化
│
├── ui/
│   └── control_panel.py         # OpenCV 滑杆面板(演示用)
│
├── media_io/
│   └── video_io.py              # 多线程采集与输出
│
├── utils/
│   └── logger.py                # CSV 指标记录
│
├── tests/
│   ├── self_test.py             # 32 项综合测试
│   ├── synthetic_scene.py       # 8 名运动员 + Perlin 噪声的合成跑道
│   ├── synth_video.py           # 合成视频生成器
│   └── stress_test.py           # 边界情况压力测试
│
├── scripts/                     # 集成验证脚本
│
└── models/                      # YOLOv8 模型权重
    ├── yolov8s.pt               # (默认,约 115 fps)
    ├── yolov8n.pt
    └── yolov8m.pt
```

---

## 技术细节

| 组件 | 细节 |
|-----------|--------|
| **GPU** | RTX 5070 Laptop(12 GB,sm_120)、PyTorch 2.12 nightly、CUDA 12.8 |
| **YOLO 管线** | yolov8s 约 115 fps;imgsz(默认 1280)、conf(默认 0.25)、iou(0.5)可配置;可优雅回退到 DummyDetector |
| **相机跟踪** | KLT 640×360、400 特征点(goodFeaturesToTrack),quality=0.005、min_distance=3、每 60 帧重检测;USAC_MAGSAC(reproj 3.0)单应矩阵 + PnP 重求解 |
| **PnP** | solvePnPRansac(ITERATIVE);400m 约 330 个跟踪点,100m 约 176 点;不使用外参初值以避免局部极小 |
| **400 米跑道模型** | IAAF 标准:内缘半径 36.5 米、道宽 1.22 米、直道 84.39 米;各道弯道弧线、阶梯偏移与完成距离 |
| **标定目标** | 切平面内矩形,保证 400 米弯道 PnP 正确;支持任意道次/任意 d_m 位置 |
| **比赛计时** | 基于视频时间戳(非墙钟);≥2 名运动员过 0.5 米即开始;8 条道全部完成后停止 |
| **道次分配** | NumPy 向量化最近邻;2 帧待确认;IoU NMS ≥ 0.65;跑道区域过滤(100m 剔除观众);失败后重新捕获 |
| **卡尔曼滤波** | 3 状态匀加速模型;速度限幅 ±15 m/s;位置强制贴合量测;按跟踪置信度自适应噪声 |
| **遮挡保护** | 锚点默认前方 2.0 米、后方 1.0 米、侧向 0.4 米;包围盒碰撞检查确保与运动员零重叠 |

---

## 设计文档

有关机位布置、遮挡规则、3D 渲染管线与边界情况的详细设计文档,参见 [`track-ar-system-design.md`](https://github.com/Je-qljx/Track-AR/blob/main/track-ar-system-design.md)。
