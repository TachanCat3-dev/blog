# 技术美术笔记

一个极简的静态博客，用来记录技术美术（Technical Art）方向的学习与实践。纯静态、零依赖、零 JavaScript，直接托管在 GitHub Pages 上。

- 首页：按年份分组的文章列表
- 文章页：Markdown 排版、代码块、表格、图片、上一篇 / 下一篇
- 关于页、RSS、404、固定浅色主题、移动端适配
- 所有页面在本地预先生成，部署时只需要把生成好的 HTML 推上去

## 环境要求

Node.js 18 或更新版本。项目**没有任何第三方依赖**，不需要 `npm install`。

```bash
# 常用命令
npm run dev     # 本地预览 http://127.0.0.1:3000，改内容自动重新构建
npm run build   # 生成 index.html、文章页、about/、feed.xml、404.html
npm run new -- "文章标题" english-slug   # 新建一篇文章
```

## 目录结构

```text
.
├── content/
│   ├── about.md                 # “关于”页面（可删）
│   └── posts/
│       └── 2026-10-18-start-here.md
├── assets/
│   ├── style.css                # 全部样式，颜色变量在文件顶部
│   ├── favicon.svg
│   └── images/                  # 文章图片放这里
├── scripts/
│   ├── build.mjs                # 构建：Markdown → HTML、RSS
│   ├── markdown.mjs             # 零依赖 Markdown 渲染器
│   ├── dev.mjs                  # 本地预览服务器
│   └── new-post.mjs             # 新建文章
├── site.json                    # 站点标题、作者、网址等
├── package.json
├── .nojekyll                    # 让 GitHub Pages 跳过 Jekyll
├── index.html                   # ↓ 以下均由 npm run build 生成
├── posts/
├── about/
├── 404.html
└── feed.xml
```

> `index.html`、`posts/`、`about/`、`404.html`、`feed.xml` 是构建产物，不要直接改；要改内容请改 `content/`，要改模板请改 `scripts/build.mjs`。

## 写文章

### 新建一篇

```bash
npm run new -- "线性空间与 sRGB" linear-space-srgb
```

会在 `content/posts/` 下生成 `2026-10-18-linear-space-srgb.md`（日期取当天）。填好 front matter 后运行 `npm run dev` 预览。

标题是中文时，请额外给一个英文 slug；文章最终的网址是 `/posts/linear-space-srgb/`。

### 手动新建

文件名必须是 `日期-英文slug.md`，例如 `content/posts/2026-10-18-linear-space.md`。文件开头需要有 front matter：

```markdown
---
title: 线性空间与 sRGB：为什么颜色总是偏暗
date: 2026-10-12
tags: 渲染, 色彩
summary: 从一张贴图说起，把 sRGB 编码、线性光照和最终输出这条链路理一遍。
---

正文从这里开始……
```

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `title` | 是 | 文章标题 |
| `date` | 是 | `YYYY-MM-DD`，同时用于排序和 RSS |
| `tags` | 否 | 逗号分隔，显示在文章标题下方 |
| `summary` | 否 | 首页和 RSS 的摘要；不写会自动截取正文开头 |
| `draft` | 否 | 写 `true` 时文章不会生成，方便未完成的内容先放着 |

### 正文语法

支持常用 Markdown：

- 标题（`##`、`###`）、段落、**粗体**、*斜体*、~~删除线~~
- 行内代码与围栏代码块（代码块会显示语言标签）：
  ````markdown
  ```hlsl
  float3 ToLinear(float3 c) { return pow(c, 2.2); }
  ```
  ````
- 有序 / 无序列表（可以嵌套）、引用、分隔线
- 链接、图片、表格
- 行尾两个空格可以强制换行

不支持的写法：

- 原始 HTML 会被转义（避免写错标签破坏整页布局）
- 没有数学公式、语法高亮等额外功能；需要时可以自行加 KaTeX / highlight.js

### 图片

图片统一放在 `assets/images/`，正文里用**以 `/` 开头**的站点根路径引用：

```markdown
![流程图](/assets/images/linear-workflow.svg)
```

构建时会自动把 `/assets/...` 转换成当前页面的相对路径，所以无论部署在 `https://name.github.io/` 还是 `https://name.github.io/repo/` 都能正常显示。RSS 里则会转成完整网址。

外部图片可以直接写 `https://...`。

### 草稿

在 front matter 加一行 `draft: true`，文章不会被生成，也不会出现在首页和 RSS。写完后删掉这行即可。

## 站点设置

编辑 `site.json`：

| 字段 | 说明 |
| --- | --- |
| `title` | 站点标题，显示在页头和浏览器标签上 |
| `description` | 一句话简介，显示在首页和搜索摘要里 |
| `author` | 作者名，写入页面 meta 与 RSS |
| `url` | **站点最终访问地址**，用于 RSS、canonical 和 404 页面。务必改成真实地址 |
| `startYear` | 页脚版权起始年份 |

`url` 的两种写法：

- 用户主页仓库 `<用户名>.github.io`：`https://<用户名>.github.io/`
- 普通项目仓库：`https://<用户名>.github.io/<仓库名>/`

改完 `site.json` 后记得重新 `npm run build` 再提交。

## 部署到 GitHub Pages

生成的 HTML 就在仓库根目录，所以只需要普通的「分支部署」，不需要 Actions。

1. 在 GitHub 新建一个仓库，例如 `blog`（如果想用 `<用户名>.github.io` 作为地址，仓库名就用 `<用户名>.github.io`）。
2. 在本目录初始化并推送：

   ```bash
   git init
   git add .
   git commit -m "init blog"
   git branch -M main
   git remote add origin https://github.com/<用户名>/<仓库名>.git
   git push -u origin main
   ```

3. 打开仓库的 **Settings → Pages**，Source 选择 **Deploy from a branch**，Branch 选择 `main`、目录选择 `/ (root)`，保存。
4. 等一两分钟，访问 `https://<用户名>.github.io/<仓库名>/`。
5. 把 `site.json` 里的 `url` 改成第 4 步的真实地址，重新构建并提交。

`.nojekyll` 文件会让 GitHub Pages 跳过 Jekyll 处理，保留原样即可。

以后写新文章：`npm run build` → `git add .` → `git commit -m "new post"` → `git push`。

## 自定义

- **颜色 / 字体 / 宽度**：都在 `assets/style.css` 顶部的 CSS 变量里。站点目前固定浅色主题，如果以后想恢复深色，可以在 CSS 里加一段 `@media (prefers-color-scheme: dark)` 覆盖这些变量。
- **页面结构**：在 `scripts/build.mjs` 的 `renderPage`、`renderIndex` 等函数里。
- **图标**：替换 `assets/favicon.svg`。
- **示例内容**：`content/posts/` 里有两篇演示文章，`content/about.md` 是“关于”页模板，都可以直接改或删掉。

## 一点取舍

这个站刻意保持简单：没有前端框架、没有客户端 JavaScript、没有构建服务，文章在本地生成后就是普通 HTML。代价是不支持一些富交互（比如站内搜索、评论），但换来的是加载快、样式可控、十年后也还能打开。
