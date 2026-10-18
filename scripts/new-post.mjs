// 新建一篇文章：npm run new -- "标题" "english-slug"

import { mkdir, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const POSTS_DIR = path.join(ROOT, 'content', 'posts');
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const args = process.argv.slice(2).filter((value) => value.trim() !== '');
const [title, slugArg] = args;

if (!title) {
  console.log(`
用法：npm run new -- "文章标题" [english-slug]

例子：
  npm run new -- "线性空间与 sRGB" linear-space-srgb
  npm run new -- "Houdini 小工具" houdini-tools
`);
  process.exit(1);
}

const slug = (slugArg || '').trim().toLowerCase();
if (!SLUG_PATTERN.test(slug)) {
  console.error('请再给一个英文 slug（小写字母、数字和连字符），它决定文章的网址。');
  console.error(`例如：npm run new -- "${title}" my-post`);
  process.exit(1);
}

const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
const filename = `${date}-${slug}.md`;
const file = path.join(POSTS_DIR, filename);

await mkdir(POSTS_DIR, { recursive: true });
const existing = await readdir(POSTS_DIR).catch(() => []);
if (existing.includes(filename)) {
  console.error(`文件已存在：content/posts/${filename}`);
  process.exit(1);
}

const content = `---
title: ${title}
date: ${date}
tags: 
summary: 
---

在这里开始写作。

## 一个小节

正文……
`;

await writeFile(file, content, 'utf8');
console.log(`✓ 已创建 content/posts/${filename}`);
console.log('  补好 tags 和 summary 后，运行 npm run dev 预览。');
