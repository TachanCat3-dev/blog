# 技术美术笔记 / TA Field Notes

线上地址：<https://tachancat3-dev.github.io/blog/>

基于 [Astro 官方 blog 示例](https://github.com/withastro/astro/tree/main/examples/blog) 的内容集合、静态路由和 RSS 结构，定制为技术美术学习博客。纯白 / 纯黑主题、实时 WebGL 材质球、主题筛选、笔记搜索、文章目录、Shiki 代码高亮和 RSS。

## 写笔记并发布

文章依旧放在 `content/posts/`，旧文章地址保持 `/blog/posts/<slug>/`。

```bash
npm ci
npm run new -- "法线贴图学习笔记" normal-map
npm run dev
```

本地打开终端提示的地址（通常是 `http://127.0.0.1:4321/blog/`）。修改 Markdown 后可实时预览。

```markdown
---
title: 法线贴图学习笔记
date: 2026-10-25
tags: 渲染, 材质
summary: 整理切线空间法线的原理和使用时遇到的问题。
---

## 实验目标

在这里写正文。
```

文件名格式为 `YYYY-MM-DD-english-slug.md`。网址中的 slug 取自文件名中去掉日期和后缀的部分。`draft: true` 的文章不会公开。

写完后提交、推送即可：

```bash
git add -A
git commit -m "新增法线贴图笔记"
git push
```

也可以用 GitHub Desktop 的 Commit / Push，或直接在 GitHub 网页上编辑、新建 Markdown。**不需要手动提交 HTML**：GitHub Actions 会执行类型检查、构建、内部链接验证并发布 `dist/`。进度见仓库 Actions 页面。

## 图片和代码

图片放到 `public/assets/images/`，在 Markdown 中这样写：

```markdown
![效果截图](/assets/images/my-render.png)
```

构建会自动添加 `/blog` 路径。支持 Markdown 表格、列表、引用、图片和原始 HTML；代码块自带语法高亮，HLSL 可用 `hlsl` 语言标识。

## 修改站点

| 内容 | 位置 |
| --- | --- |
| 网站标题、简介、正式 URL | `site.json` |
| 首页文案和笔记列表 | `src/pages/index.astro` |
| 关于页面正文 | `content/about.md` |
| 全站布局、导航、主题按钮 | `src/layouts/Base.astro` |
| 配色变量、排版、响应式样式 | `src/styles/global.css` |
| 材质实验 UI | `src/components/MaterialLab.astro` |
| WebGL 着色器和交互 | `src/scripts/material.ts` |
| 文章阅读页 | `src/pages/posts/[...slug].astro` |
| 自动部署 | `.github/workflows/deploy.yml` |

材质实验包含「黏土 / 金属 / 线框」三种模式；可拖动旋转、调节粗糙度。WebGL 不可用时显示静态预览，文章和导航仍然可以使用。默认跟随系统深浅色，也可点页头按钮手动切换，选择保存在本机浏览器。

**改配色、字体、间距、文案的完整说明见 [CUSTOMIZE.md](CUSTOMIZE.md)。**

## 开发和验证

使用 Node.js **22.23.4+ 或 24 LTS**（部署使用 Node 24）。

```bash
npm ci
npm run dev
npm run check
npm run build
npm run verify
npm run preview
```

生产输出在 `dist/`，不加入 Git。不要编辑生成的 HTML。GitHub Pages 的 Source 选择 **GitHub Actions**。

## 迁移说明

原有两篇 Markdown、RSS `/feed.xml`、文章链接和插图均保留。原先根目录下的 HTML、手写 Markdown 解析器和本地静态服务器由 Astro 替代。旧站版本可在 Git 历史的 `0926a21` 找到。旧 `GithubShowcase` 里筛出来的学习笔记收在 `archive/`，不参与构建。

官方示例来源版本：`withastro/astro@e5a3a1bdec268933f01a0da3fbeb4e38bdf455c9`。交互材质球、灰阶配色和笔记筛选为本项目定制，不依赖第三方图形 CDN。
