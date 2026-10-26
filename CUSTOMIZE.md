# 自定义指南

改之前先跑起来：

```bash
npm run dev
```

浏览器打开终端给的地址（默认 `http://127.0.0.1:4321/blog/`），保存文件会自动刷新。改完用 `npm run build` 确认不报错。

---

## 1. 配色（最常改的）

所有颜色都在 [`src/styles/global.css`](src/styles/global.css) 顶部的 `:root` 里，**只改这几个变量就能换掉整个站的颜色**：

```css
:root {                    /* 浅色 */
  --bg: #ffffff;           /* 页面底色 */
  --surface: #ffffff;      /* 卡片/面板底色 */
  --soft: #f5f6f7;         /* 悬停、输入框、代码块底色 */
  --line: #e6e7e9;         /* 分隔线、边框 */
  --fg: #16181a;           /* 正文文字 */
  --muted: #6b7075;        /* 次要文字、说明 */
  --faint: #9aa0a6;        /* 日期、页脚等最弱的文字 */
  --accent: #2f7fe0;       /* 链接、滑块、焦点框 */
  --radius: 10px;          /* 圆角大小 */
}
```

深色在同一文件下面的 `:root[data-theme="dark"]` 里，**有一份一模一样的变量名**，改那边就是改暗色。再往下的 `@media (prefers-color-scheme: dark)` 是"用户系统是暗色且没手动切换过"时的兜底，三处保持一致即可。

现在的暗色是照着 QQ 那种深灰调的（不是纯黑，纯黑配白字看久了刺眼）：

| 变量 | 当前值 | 说明 |
| --- | --- | --- |
| `--bg` | `#1f1f1f` | 主背景 |
| `--surface` | `#262626` | 卡片比背景亮一点 |
| `--soft` | `#2c2c2c` | 悬停/输入框 |
| `--line` | `#333333` | 分隔线 |
| `--fg` | `#e6e6e6` | 文字不用纯白 |
| `--accent` | `#4d9bff` | 暗底上亮一点的蓝 |

想要更暗或更亮，直接调这三个数就行，比如 `--bg: #23272b`（偏蓝的深灰）、`#1a1a1a`（更沉）。**别用 `#000` 配 `#fff`**，对比过强。

> 注意：`src/layouts/Base.astro` 里还有两个 `theme-color` meta（浏览器地址栏颜色），暗色那个目前是 `#1f1f1f`，改了 `--bg` 记得同步。

---

## 2. 字体

在 `global.css` 的 `:root` 里：

```css
--sans: Inter, -apple-system, ... , "PingFang SC", "Microsoft YaHei", sans-serif;
--mono: ui-monospace, "Cascadia Code", Consolas, monospace;
```

- `--sans` 是正文和标题，`--mono` 只用在代码、日期这种地方。
- 想换正文字体：把 `Inter` 换成你想要的字体名（本机已安装的），或最前面加一个 `"LXGW WenKai"` 之类的。
- 字号是分散在各处的 `font-size`，最常改的是 `body { font-size: 16px }`（整体基准）和 `.prose { font-size: 16px }`（文章正文）。

---

## 3. 间距和宽度

- **页面最大宽度**：`.site-shell { max-width: 980px }`，想更宽改 1100px 之类。
- **文章正文宽度**：`.article { max-width: 720px }`，正文太窄/太宽都改这里。
- **上下留白**：`main { padding: 36px 0 64px }`，以及各区块的 `margin`。
- **圆角**：改 `--radius` 一个变量，卡片、代码块、图片全跟着变。

---

## 4. 文案

| 想改什么 | 改哪里 |
| --- | --- |
| 网站标题（页头、页脚、`<title>`） | `site.json` 的 `title` |
| 网站描述（SEO、社交分享） | `site.json` 的 `description` |
| 首页大标题和副标题 | `src/pages/index.astro` 里 `<section class="intro">` |
| 首页区块标题「学习笔记」 | `index.astro` 里 `.section-title` |
| 搜索框提示文字 | `index.astro` 里 `placeholder="搜索笔记"` |
| 页脚版权行 | `src/layouts/Base.astro` 里 `<footer>` |
| 关于页正文 | `content/about.md` |
| 404 文案 | `src/pages/404.astro` |
| 材质实验标题、按钮名 | `src/components/MaterialLab.astro` |

页头导航在 `Base.astro` 的 `<nav>` 里，加一项就加一行 `<a href={url('xxx/')}>文字</a>`。

---

## 5. 首页布局

`src/pages/index.astro` 从上到下就是三个部分，删掉哪段就少哪块：

1. `<section class="intro">` — 一句话介绍
2. `<section class="notes">` — 筛选 + 搜索 + 笔记列表
3. `<MaterialLab />` — 材质实验

笔记列表是**列表**（每篇一行，标题 + 摘要 + 日期），不是卡片网格。想改成两列卡片，把 `.note-list` 换成 `display: grid; grid-template-columns: 1fr 1fr`，再给 `.note-item` 加边框即可。

筛选标签是从文章 `tags` 自动生成的，不用手动维护；新加标签只要在文章的 frontmatter 里写就行。

---

## 6. 新增一篇笔记

```bash
npm run new -- "文章标题" english-slug
```

生成 `content/posts/YYYY-MM-DD-english-slug.md`，填 frontmatter：

```markdown
---
title: 线性空间与 sRGB
date: 2026-10-25
tags: 渲染, 色彩
summary: 一句话说清这篇讲了什么。
draft: false
---
```

- 文件名里的日期和 slug 决定网址：`/blog/posts/english-slug/`。
- `draft: true` 不会公开，也不会出现在列表和 RSS 里。
- `tags` 用中文逗号或英文逗号都行，写成列表 `[渲染, 色彩]` 也行。

---

## 7. 材质球

- **三种模式**（黏土/金属/线框）的文字和顺序：`MaterialLab.astro` 里的 `data-mode` 按钮。
- **材质效果本身**：`src/scripts/material.ts` 里的 `fragment` 着色器字符串，`clay` / `metal` / 线框分支都在里面。
- **背景色**：着色器里的 `bg` 一行，`vec3(.149)` 对应暗色背景（约 `#262626`），改了页面底色记得同步，不然球和背景会分层。
- 状态文字（实时渲染 / 静态预览）在 `material.ts` 里搜 `textContent`。

改完着色器不用重新构建，`npm run dev` 下保存即刷新。

---

## 8. 部署相关

- 正式网址、`base` 路径：`site.json` 的 `url`。换域名要改这里，`astro.config.mjs` 和 RSS 都从它读。
- 部署流程：`.github/workflows/deploy.yml`（推送到 `main` 自动构建发布）。
- GitHub Pages 的 Source 要选 **GitHub Actions**。

---

## 9. 改完自检

```bash
npm run check    # 类型检查
npm run build    # 构建
npm run verify   # 内部链接、RSS、资源校验
```

`verify` 会检查每页只有一个 `<h1>`、站内链接都能打开、RSS 正常。提交前跑一遍基本不会把线上搞坏。

---

## 常见坑

- **改了 CSS 没生效**：多半是改在了 `dist/`（构建产物）里，源文件在 `src/`。
- **暗色不生效**：浏览器里点过主题按钮会把选择存进 `localStorage`，清一下站点数据或换个隐身窗口看。
- **中文字体发虚**：Windows 上 `Microsoft YaHei` 在某些字号下确实偏细，可以把 `body` 的 `font-size` 提到 16px 以上，或换 `"PingFang SC"` 优先。
- **改了 `site.json` 的 url 后本地打不开**：`base` 会跟着变，本地地址也要带新的前缀。
