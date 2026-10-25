import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import site from "../site.json" with { type: "json" };

const root = path.resolve("dist");
const siteUrl = new URL(site.url);
const failures = [];
async function files(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  return (
    await Promise.all(
      entries.map((entry) =>
        entry.isDirectory()
          ? files(path.join(directory, entry.name))
          : [path.join(directory, entry.name)],
      ),
    )
  ).flat();
}
async function exists(file) {
  try {
    return (await stat(file)).isFile();
  } catch {
    return false;
  }
}
const pages = (await files(root)).filter((file) => file.endsWith(".html"));
if (pages.length === 0) failures.push("No HTML pages generated");
for (const file of pages) {
  const html = await readFile(file, "utf8");
  const route = path.relative(root, file).replaceAll("\\", "/");
  const pageUrl = new URL(route, site.url);
  if ((html.match(/<h1(?:\s|>)/g) || []).length !== 1)
    failures.push(`${route}: expected one h1`);
  for (const match of html.matchAll(/\b(?:href|src)="([^"]+)"/g)) {
    const source = match[1].replaceAll("&amp;", "&");
    if (
      source.startsWith("#") ||
      /^(data:|mailto:|tel:|javascript:)/.test(source)
    )
      continue;
    const target = new URL(source, pageUrl);
    if (target.origin !== siteUrl.origin) continue;
    if (!target.pathname.startsWith(siteUrl.pathname)) {
      failures.push(`${route}: outside base ${source}`);
      continue;
    }
    const relative = decodeURIComponent(
      target.pathname.slice(siteUrl.pathname.length),
    );
    const destination = path.join(root, relative);
    if (
      !(await exists(destination)) &&
      !(await exists(path.join(destination, "index.html")))
    )
      failures.push(`${route}: missing ${source}`);
  }
}
const feed = await readFile(path.join(root, "feed.xml"), "utf8");
if (!feed.includes("<rss") || !feed.includes(site.url))
  failures.push("Invalid RSS output");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log(
  `Verified ${pages.length} HTML pages, internal links, assets and RSS.`,
);
