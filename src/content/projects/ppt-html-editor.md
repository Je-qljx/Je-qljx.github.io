---
title: PPT HTML 编辑器
description: 生成与图形化编辑 HTML 以替代传统 PPT
pubDate: 2026-07-29
tags:
  - JavaScript
  - PPT
  - 编辑器
featured: true
githubUrl: https://github.com/Je-qljx/PPT_HTML_editor
order: 1
---

> 基于浏览器的 Reveal.js 所见即所得幻灯片编辑器。导入 HTML,可视化编辑,导出为自包含的演示文稿。

## 功能特性

- **拖拽与缩放** — 在 960×540 画布上自由移动元素(interact.js),带对齐吸附参考线,8 向手柄缩放并支持锁定宽高比。
- **样式面板** — 完整排版控制(字体、字号、颜色、对齐、行高、字间距)、尺寸与位置、边框、阴影、不透明度与文字特效。切换元素时面板状态保持。
- **文本编辑** — 点击选中,再次点击进入行内编辑,光标定位在点击处。基于 ContentEditable,粘贴为纯文本。
- **幻灯片管理** — 新增、删除、调整幻灯片顺序;可为每张幻灯片编辑背景颜色、渐变与图片。
- **导入** — 导入外部 HTML 文件:`<section>` 元素转换为幻灯片,内容块转换为可拖拽元素;列表(`<ul>/<li>`)会被拆解为可独立编辑的条目。
- **导出** — 导出为内嵌 Reveal.js、带导航箭头与全屏按钮的自包含 HTML;也可将单张幻灯片导出为 1920×1080 的 PNG 图片。两种格式均提供页面选择对话框。
- **多选** — Ctrl+点击 多选元素;支持水平/垂直等距分布,以及左/中/右/上/中/下对齐。
- **网格、标尺与参考线** — 像素标尺与可拖拽参考线,可开关的网格覆盖层,画布缩放(25%–300%)。
- **撤销/重做** — 基于完整 DOM 快照的历史记录,深度 50 步。
- **字体检测** — 通过 canvas 测量自动检测系统字体,下拉列表仅显示已安装的字体。

## 快速开始

```bash
npm install
npm run dev       # 开发服务器(HMR),http://localhost:5173
npm run build     # 构建到 dist/index.html(单个可移植文件)
```

用任意浏览器打开 `dist/index.html` 即可 — 无需服务器、零依赖。

## 使用方式

### 编辑操作

| 操作 | 方式 |
|---|---|
| 选中元素 | 单击 |
| 多选 | Ctrl + 单击 |
| 移动元素 | 拖拽 |
| 缩放元素 | 拖拽缩放手柄(按住 Shift 锁定宽高比) |
| 编辑文本 | 点击已选中的文本元素 → 光标定位到点击处 |
| 删除元素 | Delete 键 |
| 复制元素 | Alt + 拖拽 |
| 上下文菜单 | 右键点击元素 |

### 键盘快捷键

| 快捷键 | 功能 |
|---|---|
| `Alt` + `Enter` | 切换编辑 / 预览模式 |
| `Escape` | 从预览进入编辑模式 |
| `Ctrl` + `Z` / `Ctrl` + `Shift` + `Z` | 撤销 / 重做 |
| `Delete` | 删除选中元素 |
| `Ctrl` + `C` / `Ctrl` + `V` | 复制 / 粘贴元素 |
| `←` / `→` | 上一张 / 下一张幻灯片 |
| `Ctrl` + `F` | 打开导出对话框 |
| `Ctrl` + `Shift` + `H` / `V` | 水平 / 垂直等距分布选中元素 |
| `Ctrl` + `'` | 切换网格覆盖层 |
| `Ctrl` + `Shift` + `L` | 切换图层面板 |
| `Ctrl` + 滚轮 | 缩放画布 |

### 导入

点击工具栏的 **↑ 导入** 并选择 HTML 文件,文件需包含:

```html
<div class="reveal">
  <div class="slides">
    <section data-transition="slide" data-background-color="#1a1a2e">
      <h1>标题</h1>
      <p>内容</p>
      <!-- <section> 的每个直接子元素都会变成可拖拽元素 -->
    </section>
  </div>
</div>
```

若要借助 AI 按此格式生成内容,可使用 `html-ppt-generator` 技能(见下方"技能"一节)。

> **注意:** 导入时会过滤针对 `.reveal`、`.slides` 或 `section` 的 CSS 选择器,请改用元素级选择器(`h1`、`p`、`.card-*`)与内联样式。

### 导出

点击工具栏的 **↓ 导出** 或按 `Ctrl+F`,可选择:

- **HTML** — 内嵌 Reveal.js、导航按钮与全屏切换的自包含文件
- **PNG** — 每张幻灯片导出为 1920×1080 图片(仅文本渲染)

通过复选框列表选择要包含的页面。

## 架构

```
src/
├── main.js                  # 入口,键盘快捷键与全局事件
├── editor/                  # 核心编辑引擎
│   ├── EditorController.js  # 主控制器(模式、Reveal 初始化、导入导出)
│   ├── DragManager.js       # 元素拖拽(interact.js)
│   ├── ResizeManager.js     # 8 向手柄缩放,支持锁定宽高比
│   ├── TextEditor.js        # 行内 contentEditable 文本编辑
│   ├── SnapEngine.js        # 6 轴对齐吸附
│   ├── SelectionManager.js  # 点击选中与 Ctrl 多选
│   ├── UndoManager.js       # 基于快照的撤销/重做(50 步)
│   ├── ExportEngine.js      # HTML + PNG 导出与页面选择
│   ├── ImageManager.js      # 图片导入(拖放、粘贴、URL、文件)
│   ├── RulerGuides.js       # 标尺与可拖拽参考线
│   └── CanvasZoom.js        # Ctrl+滚轮缩放与指示器
├── ui/                      # UI 组件
│   ├── Toolbar.js           # 顶部工具栏
│   ├── StylePanel.js        # 右侧属性面板
│   ├── ContextMenu.js       # 右键上下文菜单
│   ├── LayerPanel.js        # 元素图层侧栏(懒加载)
│   ├── ColorPicker.js       # 调色板
│   └── FontPicker.js        # 字体选择器
├── slides/                  # 幻灯片与背景管理
│   ├── SlideManager.js      # 新增、删除、排序幻灯片
│   └── BackgroundEditor.js  # 颜色、渐变与图片背景
├── styles/                  # 样式(main、toolbar、panel、overlay)
└── utils/                   # DOM 工具、常量、节流、分布
```

编辑器作为 **Reveal.js 之上的覆盖层**运行,可在两种模式间切换:

- **预览模式** — 标准 Reveal.js 演示,带切换动画与键盘导航
- **编辑模式** — 所见即所得编辑,提供拖拽手柄、工具、面板、标尺与参考线

## 技术栈

| 技术 | 用途 |
|---|---|
| [Reveal.js](https://revealjs.com) 5.x | 幻灯片演示引擎 |
| [interact.js](https://interactjs.io) | 拖拽、缩放与手势交互 |
| [Vite](https://vitejs.dev) 6.x | 开发服务器与构建工具 |
| [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile) | 将全部资源内联进单个 HTML |
| [WebFontLoader](https://github.com/typekit/webfontloader) | 动态加载 Google 字体 |

构建产物是单个可移植的 HTML 文件,无任何外部依赖 — 可在任意现代浏览器中离线使用。

## 技能

### `html-ppt-generator`

用于 AI 辅助创建幻灯片的配套技能。给定一个主题,它会:

1. 在线调研该主题
2. 提出逐页大纲
3. 生成格式正确的 HTML 文件
4. 支持对特定幻灯片的局部修改

从 `skills/html-ppt-generator/` 安装或加载 `html-ppt-generator.skill`。生成的 HTML 遵循全部导入规则,可直接配合本编辑器使用。
