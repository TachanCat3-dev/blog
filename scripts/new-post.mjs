import { mkdir, readdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const directory = path.join(root, "content", "posts");
const [title, rawSlug = ""] = process.argv.slice(2);
const slug = rawSlug.trim().toLowerCase();
if (!title || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
  console.error('用法：npm run new -- "文章标题" english-slug');
  process.exit(1);
}
await mkdir(directory, { recursive: true });
const existing = await readdir(directory);
if (
  existing.some(
    (name) => name.replace(/^\d{4}-\d{2}-\d{2}-/, "") === `${slug}.md`,
  )
) {
  console.error(`网址 ${slug} 已有文章，请使用另一个 slug。`);
  process.exit(1);
}
const date = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Shanghai",
}).format(new Date());
const filename = `${date}-${slug}.md`;
await writeFile(
  path.join(directory, filename),
  `---
title: ${JSON.stringify(title)}
date: ${date}
tags: []
summary: "在这里写一句摘要。"
---

## 实验目标

从这里开始写作。

## 实现过程

## 观察与总结
`,
  { encoding: "utf8", flag: "wx" },
);
console.log(
  `已创建 content/posts/${filename}\n运行 npm run dev 预览，提交并推送后会自动发布。`,
);
