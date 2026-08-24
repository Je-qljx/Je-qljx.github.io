---
title: 本机 ComfyUI 与 MiniMax Design 接管指南
description: ComfyUI 的完全接管路径(HTTP API 投递工作流)与 MiniMax Design 的架构解析:文件工作区直读、技能搬运,以及用本地 H3 权重打通两端的全免费链路。
pubDate: 2026-08-23
tags:
  - ComfyUI
  - MiniMax Design
  - AI 视频
draft: false
---

> 整理日期:2026-08-23。全部内容基于对本机的实测探查(只读操作),路径、端口、版本均为当时实际值。
> 适用环境:Windows 10/11 x64,Git Bash 终端,RTX 5070 Laptop(12GB 显存)。

---

## 0. 总览:两个应用是什么关系

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│   Comfy Desktop (Electron)│        │  MiniMax Design v43.1.0      │
│   壳程序 + 独立版环境       │        │  (内部代号 @hilo / hub)       │
│                         │        │                              │
│  ┌───────────┐          │        │  Electron 壳                  │
│  │ ComfyUI    │◄──HTTP──┼──你/AI──►│   ├─ opencode 运行时(agent 大脑)│
│  │ v0.33.3    │  API     │  agent  │   ├─ Gateway 网关 (8001/8002) │
│  │ :8188 无认证│          │        │   ├─ mcp-tools (hub_* 工具)   │
│  └───────────┘          │        │   ├─ bundled-plugins/comfyui  │
│                         │        │   └─ 云端网关(海螺/Kling/Veo…) │
└─────────────────────────┘        └──────────────────────────────┘
        ▲ 全开放可接管                        ▲ 文件层可接管,云端管线不可直驱
```

**核心结论:**

| 目标 | 可接管程度 | 方式 |
|---|---|---|
| ComfyUI | ✅ **完全接管** | HTTP API(`127.0.0.1:8188`,无认证),已实测连通 |
| MiniMax Design 工作区文件 | ✅ 完全接管 | 就是普通文件夹 `D:\MiniMax Design\`,直接读写 |
| MiniMax Design 技能/配置 | ✅ 只读搬运 | 内置 skills、agent-profiles 可复制复用 |
| MiniMax Design 云端生成 | ❌ 不可直驱 | 网关要求登录态(token 加密存储),无公开本地 API |
| MiniMax Design GUI | ⚠️ 备选 | 浏览器自动化(Electron),可行但脆弱 |

---

## 1. 接管 ComfyUI

### 1.1 安装与服务信息

| 项目 | 值 |
|---|---|
| 桌面端 | Comfy Desktop(Electron),数据目录 `%APPDATA%\Comfy Desktop\` |
| 服务地址 | `http://127.0.0.1:8188`(仅本机监听,**无任何认证**) |
| 运行环境 | 独立版环境 "Comful ui",位于 `C:\Users\Je\AppData\Local\Comfy-Desktop\ComfyUI-Installs\Comful ui\` |
| 版本 | ComfyUI **v0.33.3**,前端 1.49.6,Python 3.13.12,PyTorch 2.10.0+cu130 |
| 启动参数 | `--enable-manager --disable-pinned-memory --fast-disk --reserve-vram 0.5 --use-sage-attention` |
| GPU | RTX 5070 Laptop 12GB(cudaMallocAsync 后端) |
| 队列状态查询 | 已实测:`{"queue_running": [], "queue_pending": []}` |

### 1.2 目录与配置速查

| 路径 | 内容 |
|---|---|
| `D:\Comful UI\models\` | 全部模型(checkpoints/diffusion_models/text_encoders/vae/loras… 共 28 个子目录) |
| `D:\Comful UI\input\` | 工作流输入素材(图/视频/音频) |
| `D:\Comful UI\output\` | 生成结果输出目录 |
| `D:\Comful UI\workflow\` | 保存的工作流 JSON |
| `%APPDATA%\Comfy Desktop\settings.json` | 桌面端设置(目录映射、更新渠道、镜像源等) |
| `%APPDATA%\Comfy Desktop\installations.json` | 环境清单:版本、启动参数、torch 栈、回滚备份信息 |
| `%APPDATA%\Comfy Desktop\shared_model_paths.yaml` | 模型目录映射(base_path = `D:\Comful UI\models`) |
| `%APPDATA%\Comfy Desktop\instance-model-paths\inst-*.yaml` | 每实例生效的模型路径配置(启动时以 `--extra-model-paths-config` 注入) |
| `...\Comful ui\ComfyUI\custom_nodes\` | 自定义节点 |

**已装自定义节点:** `ComfyUI-MiniMax-H3-Turbo`(H3 加速)、`TE-Speed-MiniMaxH3`(TE 提速)、`SeedVarianceEnhancer`、`comfyUI-llama-TE`、`TE_MAN`、`ComfyUI-GGUF`、`rgthree-comfy`、`comfyui-kjnodes`、`seedvr2_videoupscaler`(视频超分)、`vosr_node`、`comfyui_memory_cleanup`。

**关键模型(diffusion_models):**
- `minimax_h3_fl2va_pruned_int4_convrot.safetensors` / `int8` —— H3 音视频生成(文生视频/首尾帧)
- `z_image_turbo_int8_convrot.safetensors`、`BEYOND REALITY SUPER Z IMAGE 3.0 淡妆浓抹 FP8.safetensors` —— 图像
- text_encoders 含 `qwen3vl_32b_minimax_h3_int4_convrot.safetensors`(H3 的 TE);vae 含 `minimax_h3_video_vae_fp16/audio_vae_fp32`

**已有工作流:** `video_minimax_h3_t2v.json`(H3 官方 T2V 模板)、`MiniMaxH3-加速视频流整合.json`、`FLUX.2-klein_Edit.json`、`z image turbo upscale.json`、`PPT.json`。共 1179 个可用节点类型(含内置 `MiniMaxH3ImageToVideo`、`EmptyMiniMaxH3LatentAV`、`MiniMaxH3ReferenceToVideo` 等)。

### 1.3 API 能力清单(接管的核心)

基础地址 `http://127.0.0.1:8188`:

| 端点 | 方法 | 用途 |
|---|---|---|
| `/system_stats` | GET | 版本、显存/内存、启动参数 |
| `/queue` | GET | 运行中/排队任务;POST 可清队 |
| `/prompt` | POST | **提交工作流执行**(API 格式 JSON) |
| `/history` | GET | 历史执行结果与输出文件名 |
| `/view?filename=…&subfolder=…&type=output` | GET | 取回生成的图片/视频 |
| `/upload/image` | POST multipart | 上传输入素材到 input 目录 |
| `/object_info` | GET | 全部节点类型及参数 schema(1179 个) |
| `/interrupt` | POST | 中断当前执行 |
| `/ws?clientId=…` | WebSocket | 实时进度事件 |
| Manager 系列(`/api/manager/...`) | GET/POST | 自定义节点列表/安装、重启服务(随 `--enable-manager` 启用) |

> ⚠️ Git Bash 里 `curl` 被 alias 到不存在的 `_c`,直接用 `/c/Windows/System32/curl.exe`(下称 `$CURL`)。

### 1.4 实操:提交并回收一次生成

**第 1 步 — 准备 API 格式工作流。** 界面保存的 JSON 是 UI 格式,**不能**直接投给 `/prompt`。两种转换方式:
- ComfyUI 界面开启开发者模式后"Export (API)";
- 或按 API 格式手写/脚本生成,结构为节点字典:

```json
{
  "6": { "class_type": "CLIPTextEncode", "inputs": { "text": "提示词", "clip": ["38", 0] } },
  "9": { "class_type": "SaveAnimatedWEBP", "inputs": { "images": ["12", 0], "filename_prefix": "h3" } }
}
```

**第 2 步 — 提交:**

```bash
CURL=/c/Windows/System32/curl.exe
$CURL -X POST http://127.0.0.1:8188/prompt \
  -H "Content-Type: application/json" \
  -d "{\"prompt\": $(cat workflow_api.json), \"client_id\": \"zcode-1\"}"
# 返回 {"prompt_id": "...", ...}
```

**第 3 步 — 轮询与取结果:**

```bash
$CURL http://127.0.0.1:8188/history/<prompt_id>          # 完成后 outputs 里给出文件名
$CURL "http://127.0.0.1:8188/view?filename=xxx.mp4&type=output&subfolder=" -o result.mp4
```

上传参考素材:`$CURL -F "image=@ref.jpg" -F "overwrite=true" http://127.0.0.1:8188/upload/image`,再把返回名填进对应节点的 input。

### 1.5 注意事项

- 改桌面端设置请编辑 `settings.json` 后重启应用;模型目录变更优先改 `shared_model_paths.yaml` 同源的界面设置。
- 显存紧张时靠 `--reserve-vram 0.5` + `comfyui_memory_cleanup` 节点;H3 int8/int4 社区验证 8GB 档可跑。
- 桌面端自动更新会升级 ComfyUI 版本(git 管理,有 backup 分支机制,见 installations.json 的 lastRollback)。
- 服务无认证且绑定 127.0.0.1——本机任何进程都能投队列,**不要**手动改成 0.0.0.0 暴露局域网。

---

## 2. 接管 MiniMax Design(@hilo)

### 2.1 架构解析

| 层 | 位置 | 说明 |
|---|---|---|
| 应用本体 | `C:\Users\Je\AppData\Local\com.minimax.hub\current\MiniMax Design.exe` | Electron,v43.1.0,内部名 @hilo/hub |
| Agent 运行时 | `...\resources\opencode\opencode.exe` + `agent-profiles\v2\config\base.json` | 就是标准 **opencode**,MCP 服务指向网关 `http://localhost:8001` |
| MCP 工具集 | `...\resources\mcp-tools\`(hub_* 系列) | 画布读写、媒体生成、ComfyUI 工作流管理等内部工具 |
| 多 Agent 配置 | `...\resources\agent-profiles\v2\config\agents\` | `router / planner / executor / media-agent / comfyui-agent` 五个角色定义 |
| 技能库 | `...\resources\agent-profiles\v2\config\skills\` | 9 个:h3-visual-design、cool-music-video、brand-ad 等(**可复制复用**) |
| ComfyUI 插件 | `...\resources\bundled-plugins\comfyui\` | 内嵌完整 ComfyUI 前端,画布上的 ComfyUI 节点由此渲染 |
| 用户数据 | `%APPDATA%\@hilo\desktop\` | `hub-config.json`(账号/项目/设置)、`ai-runtime\`(内嵌 opencode 的重定向 XDG 目录) |
| 工作区 | `D:\MiniMax Design\` | 数据目录:Projects、asset-center、output_files |

**本地端口(均仅监听 127.0.0.1):**

| 端口 | 进程 | 行为(实测) |
|---|---|---|
| 8001 | 网关 HTTP | Fastify 风格 JSON;根路径 404,无 openapi/health,接口需内部调用约定 |
| 8002 | 工作区运行时 | 返回 `428 WORKSPACE_IDENTITY_REQUIRED` |
| 10268 | 应用内部 | 返回 `401` |

**登录态:** `hub-config.json` 中 accessToken 以 `v2enc:` 前缀加密存储。**没有解密利用价值,也不要外传该文件。**

**云端能力清单**(`resources\conf\external_api_conf.yaml`):视频(海螺 v1/v3、可灵+唇同步+虚拟人+动作控制、Veo3、Wan、Seedance、即梦)、图像(nano_banana/OpenAI/kontext/qwen/seedream/kling/midjourney)、语音(TTS/批量/音色/克隆/design/人声隔离/音频续写)、音乐(生成/翻唱/歌词)、媒体分析、超分。

### 2.2 可接管层面 A:文件工作区(最实用)

工作区就是普通文件,可直接读写管理:

```
D:\MiniMax Design\
├── Projects\<项目名>\          # 创作页资产(图/视频/html/pdf 等)
│   └── .hilo\                 # 项目元数据(勿手工改):
│       ├── canvas.json        # 画布节点布局(node id/位置/派生边)
│       ├── index.sqlite(-wal/-shm)
│       ├── active-generations.json   # 进行中的生成任务记录
│       ├── .thumbnails\       # 自动缩略图
│       └── .video-streams\    # 视频预览流转码
├── asset-center\              # 素材中心(自动入库索引)
└── output_files\              # 导出输出
```

接管姿势:**新增资产直接放项目文件夹**(应用会重新扫描);批量整理、改名、归档由 AI/脚本完成;`.hilo\` 元数据不要手改,以免索引错乱。

### 2.3 可接管层面 B:搬运它的技能与规范

```bash
# 例:把内置的 H3 视觉设计技能复制为 ZCode 用户技能
cp -r "$LOCALAPPDATA/com.minimax.hub/current/resources/agent-profiles/v2/config/skills/h3-visual-design" \
      "/c/Users/Je/.agents/skills/"
```

同目录下还有 `contracts\`(anti-loop、canvas-discipline 等行为约束)、`knowledge\`(image-recipes、vendors、失败案例库)——都是现成的提示词工程资产,可读可借鉴。官方开源的编码 agent 技能已安装:`~\.agents\skills\h3-prompt-writing\`(H3 提示词规范,T2VA/I2VA/FL2VA/L2VA/Ref2VA 五种模式)。

### 2.4 可接管层面 C:GUI 自动化(备选)

Electron 窗口可用 CDP/浏览器自动化驱动(agent-browser 技能)。适合偶尔需要点它云端的场景(Kling/Veo/Midjourney 生成)。缺点:慢、易受版本更新影响。**非必要不用。**

### 2.5 不可接管的部分与替代路线

| 不可直驱项 | 替代路线 |
|---|---|
| 云端生成 API(需 workspace 身份) | 用本地 ComfyUI 跑同类模型;或走 MiniMax 开放平台 API(自己申请 key) |
| 对话 LLM 自选(仅官方下发列表,`remoteConfig.agent_mode`) | 大脑交给外部 agent(ZCode 或本地 Qwen3-8B via LM Studio `:1234`) |
| 它的内嵌 opencode 配置 | XDG 被重定向到 `%APPDATA%\@hilo\desktop\ai-runtime\config-home\opencode\`;理论上放 `opencode.json` 可注入本地 provider,属未文档化 hack,升级可能失效。注意 `~/.config/opencode/opencode.json`(里面配了 localhost:1234)是独立 opencode 的,**Design 读不到** |

---

## 3. 桥梁:H3 本地化(两边打通的关键)

MiniMax Design 主打的 H3 音视频生成,权重是开源的,本机已部署齐全:

- 权重:`diffusion_models\minimax_h3_fl2va_pruned_int4/int8_convrot.safetensors` + `text_encoders\qwen3vl_32b_..._int4` + 双 VAE(video fp16 / audio fp32)
- 节点:`MiniMaxH3ImageToVideo`、`EmptyMiniMaxH3LatentAV`、`MiniMaxH3ReferenceToVideo`、`MiniMaxH3SigmaShift` + 加速插件(H3-Turbo / TE-Speed)
- 模板:`D:\Comful UI\workflow\video_minimax_h3_t2v.json`
- 显存:int4/int8 剪枝版社区实测 8GB 档可跑,本机 12GB 富余
- 提示词:遵循 `~/.agents/skills/h3-prompt-writing/references/` 规范(时长对齐 4–15s、`<Picture n>`/`<Audio n>` 标签一致、镜头级描述)

**等效链路:** 外部 agent 写 H3 格式提示词 → 改模板工作流 → POST `/prompt` → `/view` 收片。与 Design 内部 comfyui-agent 的 `hub_run_comfyui_workflow` 干的是同一件事,但全本地免费。

本地替代不了:云端 Context-IR 提示精修、Regenerate-2K(768p→2K)、Kling/Veo/Midjourney 等他家模型、共创项目协作。超分可用 SEEDVR2 近似 2K。

---

## 4. 快速命令卡

```bash
CURL=/c/Windows/System32/curl.exe   # 注意:裸 curl 在本机 Git Bash 中失效(alias _c 不存在)

# ComfyUI 状态
$CURL http://127.0.0.1:8188/system_stats
$CURL http://127.0.0.1:8188/queue

# MiniMax Design 工作区
ls "/d/MiniMax Design/Projects/"
cat "/d/MiniMax Design/Projects/H3 PlayGround/.hilo/active-generations.json"

# 进程/端口核对
tasklist //FO CSV | grep -iE "comfy|minimax"
netstat -ano | grep LISTENING | grep -E ":8188|:8001|:8002|:10268"

# 技能搬运(示例)
ls "$LOCALAPPDATA/com.minimax.hub/current/resources/agent-profiles/v2/config/skills/"
```

## 5. 安全与维护提醒

1. `%APPDATA%\@hilo\desktop\hub-config.json` 含加密登录凭据——勿分享、勿提交仓库。
2. MiniMax Design 升级会整体替换 `com.minimax.hub\current\`,自改其资源(含搬运出的 skills 副本不受影响,但原目录会被覆盖)。
3. `.hilo\` 元数据(sqlite/canvas.json)由应用维护,人工只读不改。
4. ComfyUI 端口无认证,保持 127.0.0.1 绑定;对外分享生成物时注意 output 目录里的个人素材。
5. 大改动前备份:`settings.json`、`shared_model_paths.yaml`、项目文件夹整体拷贝即可。
