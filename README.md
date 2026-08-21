# Je-qljx.github.io

个人主页（Personal homepage）— 基于 Astro v7 构建的静态站点，包含项目展示与博客。

## 🚀 开发命令

所有命令在项目根目录运行：

| 命令              | 说明                                        |
| :---------------- | :------------------------------------------ |
| `npm install`     | 安装依赖                                    |
| `npm run dev`     | 启动本地开发服务器（`localhost:4321`）      |
| `npm run build`   | 构建生产站点到 `./dist/`                    |
| `npm run preview` | 本地预览构建产物                            |
| `npm run check`   | 运行 `astro check` 类型检查                 |

## 📁 项目结构

```text
/
├── public/
├── src/
│   ├── content.config.ts   # 内容集合（projects / blog）schema
│   ├── config.ts           # 站点元数据（SiteConfig）
│   └── pages/
│       └── index.astro
├── astro.config.mjs
└── package.json
```

## 🧞 更多

- 文档：https://docs.astro.build
