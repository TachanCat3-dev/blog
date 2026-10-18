// 静态博客构建：读取 content/，生成首页、文章页、关于页、404 与 RSS。
// 没有任何第三方依赖，用 Node 自带的 fs / path 即可。

import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { escapeAttr, escapeHtml, renderMarkdown } from './markdown.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const POSTS_SOURCE_DIR = path.join(CONTENT_DIR, 'posts');
const POSTS_OUTPUT_DIR = path.join(ROOT, 'posts');
const ABOUT_OUTPUT_DIR = path.join(ROOT, 'about');
const SITE_FILE = path.join(ROOT, 'site.json');

const POST_FILE_PATTERN = /^\d{4}-\d{2}-\d{2}-[a-z0-9-]+\.md$/;
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

async function loadSite() {
  const raw = JSON.parse(await readFile(SITE_FILE, 'utf8'));
  const url = String(raw.url || 'https://example.com/');
  const baseUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  const base = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
  const pathname = new URL(base).pathname;
  return {
    title: raw.title || '技术美术笔记',
    description: raw.description || '',
    author: raw.author || '',
    base,
    basePath: pathname.endsWith('/') ? pathname : `${pathname}/`,
    startYear: Number(raw.startYear) || new Date().getFullYear(),
  };
}

function parseFrontMatter(source, filename) {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) throw new Error(`${filename}：缺少 front matter（文件开头的 --- 区块）`);

  const data = {};
  for (const line of match[1].split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;

    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (/^"(.*)"$/.test(value) || /^'(.*)'$/.test(value)) value = value.slice(1, -1);

    if (key === 'tags') {
      data.tags = value
        .replace(/^\[|\]$/g, '')
        .split(/[,，]/)
        .map((tag) => tag.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else if (key === 'draft') {
      data.draft = /^(true|yes|1)$/i.test(value);
    } else {
      data[key] = value;
    }
  }

  return { data, body: source.slice(match[0].length) };
}

function checkDate(value, filename) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value || '')) {
    throw new Error(`${filename}：date 需要写成 YYYY-MM-DD，例如 2026-10-18`);
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) {
    throw new Error(`${filename}：date ${value} 不是一个有效日期`);
  }
  return value;
}

function makeSummary(body) {
  const text = body
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#{1,6}\s+.*$/gm, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[`*_~>#|]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > 88 ? `${text.slice(0, 88)}…` : text;
}

async function readPosts() {
  const warnings = [];
  const entries = await readdir(POSTS_SOURCE_DIR, { withFileTypes: true }).catch(() => []);
  const posts = [];

  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
    if (!POST_FILE_PATTERN.test(entry.name)) {
      throw new Error(
        `${entry.name}：文件名需要是 2026-10-18-my-post.md 这样的格式（日期 + 英文 slug）`,
      );
    }

    const source = await readFile(path.join(POSTS_SOURCE_DIR, entry.name), 'utf8');
    const { data, body } = parseFrontMatter(source, entry.name);

    if (!data.title) throw new Error(`${entry.name}：front matter 里需要 title`);
    if (data.draft) continue;

    const date = checkDate(data.date, entry.name);
    const slug = entry.name.replace(/\.md$/i, '').replace(/^\d{4}-\d{2}-\d{2}-/, '');
    if (!SLUG_PATTERN.test(slug)) throw new Error(`${entry.name}：slug 只能使用小写字母、数字和连字符`);

    const tags = Array.isArray(data.tags) ? data.tags : [];
    const summary = data.summary || makeSummary(body);
    if (!summary) warnings.push(`${entry.name} 没有 summary，首页会只显示标题`);

    posts.push({
      slug,
      file: entry.name,
      title: data.title,
      date,
      tags,
      summary,
      body,
      html: renderMarkdown(body),
    });
  }

  posts.sort((a, b) => (a.date === b.date ? a.slug.localeCompare(b.slug) : b.date.localeCompare(a.date)));

  const seen = new Map();
  for (const post of posts) {
    if (seen.has(post.slug)) {
      throw new Error(`slug 冲突：${post.file} 与 ${seen.get(post.slug)} 都指向 ${post.slug}`);
    }
    seen.set(post.slug, post.file);
  }

  return { posts, warnings };
}

async function readAbout() {
  const file = path.join(CONTENT_DIR, 'about.md');
  let source;
  try {
    source = await readFile(file, 'utf8');
  } catch {
    return null;
  }

  let data = {};
  let body = source;
  try {
    const parsed = parseFrontMatter(source, 'content/about.md');
    data = parsed.data;
    body = parsed.body;
  } catch {
    // 关于页可以没有 front matter
  }

  return {
    title: data.title || '关于',
    summary: data.summary || makeSummary(body),
    html: renderMarkdown(body),
  };
}

function formatDateCN(date) {
  const [year, month, day] = date.split('-').map(Number);
  return `${year} 年 ${month} 月 ${day} 日`;
}

function formatMonthDay(date) {
  const [, month, day] = date.split('-');
  return `${month}.${day}`;
}

function relocateRootUrls(html, base) {
  // 文章里以 / 开头的地址，视为“站点根目录”，按输出位置改成相对路径或绝对地址。
  // 只处理标签内的属性，避免把代码示例里的普通文本也改掉。
  return html.replace(/<[^>]+>/g, (tag) =>
    tag.replace(/(\b(?:src|href))="\/(?!\/)([^"]*)"/g, (_, attr, rest) => `${attr}="${base}${rest}"`),
  );
}

function navLinks(site, prefix, active, hasAbout) {
  const home = prefix || './';
  const links = [
    `<a href="${home}"${active === 'home' ? ' aria-current="page"' : ''}>文章</a>`,
  ];
  if (hasAbout) {
    links.push(`<a href="${prefix}about/"${active === 'about' ? ' aria-current="page"' : ''}>关于</a>`);
  }
  links.push(`<a href="${prefix}feed.xml">RSS</a>`);
  return links.join('\n        ');
}

function renderPage(site, options) {
  const {
    prefix,
    title,
    description,
    canonical,
    active = '',
    home = false,
    isPost = false,
    published,
    hasAbout = true,
    body,
  } = options;

  const year = new Date().getFullYear();
  const footerYear =
    site.startYear && site.startYear < year ? `${site.startYear}–${year}` : String(year);
  const documentTitle = home ? site.title : `${title} — ${site.title}`;
  const descriptionText = description || site.description;
  const homeHref = prefix || './';
  const brand = home
    ? `<h1 class="brand"><a href="${homeHref}">${escapeHtml(site.title)}</a></h1>`
    : `<div class="brand"><a href="${homeHref}">${escapeHtml(site.title)}</a></div>`;

  return `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(documentTitle)}</title>
  <meta name="description" content="${escapeAttr(descriptionText)}">
${site.author ? `  <meta name="author" content="${escapeAttr(site.author)}">\n` : ''}  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#fbfaf7">
  <link rel="icon" href="${prefix}assets/favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="${prefix}assets/style.css?v=${site.assetVersion}">
  <link rel="alternate" type="application/rss+xml" title="${escapeAttr(site.title)}" href="${prefix}feed.xml">
  <link rel="canonical" href="${escapeAttr(canonical)}">
  <meta property="og:type" content="${isPost ? 'article' : 'website'}">
  <meta property="og:title" content="${escapeAttr(documentTitle)}">
  <meta property="og:description" content="${escapeAttr(descriptionText)}">
  <meta property="og:url" content="${escapeAttr(canonical)}">
  <meta property="og:site_name" content="${escapeAttr(site.title)}">
${isPost && published ? `  <meta property="article:published_time" content="${published}">\n` : ''}  <meta name="twitter:card" content="summary">
</head>
<body>
  <a class="skip-link" href="#main">跳到正文</a>
  <div class="wrap">
    <header class="site-header">
      ${brand}
      <nav class="site-nav" aria-label="导航">
        ${navLinks(site, prefix, active, hasAbout)}
      </nav>
    </header>
    <main id="main">
${body}
    </main>
    <footer class="site-footer">
      <span>© ${footerYear} ${escapeHtml(site.title)}</span>
      <span><a href="${prefix}feed.xml">RSS</a> · 静态生成</span>
    </footer>
  </div>
</body>
</html>
`;
}

function renderArchive(posts) {
  if (posts.length === 0) {
    return '      <p class="empty">还没有文章。在 <code>content/posts/</code> 里新建一篇吧。</p>';
  }

  const groups = new Map();
  for (const post of posts) {
    const year = post.date.slice(0, 4);
    if (!groups.has(year)) groups.set(year, []);
    groups.get(year).push(post);
  }

  return [...groups.entries()]
    .map(([year, yearPosts]) => {
      const items = yearPosts
        .map(
          (post) => `          <li>
            <time class="post-date" datetime="${post.date}">${formatMonthDay(post.date)}</time>
            <div class="post-item">
              <a class="post-title" href="posts/${post.slug}/">${escapeHtml(post.title)}</a>
              ${post.summary ? `<p class="post-summary">${escapeHtml(post.summary)}</p>` : ''}
            </div>
          </li>`,
        )
        .join('\n');
      return `      <section class="year-group">
        <h2 class="year-label">${year}</h2>
        <ol class="post-list">
${items}
        </ol>
      </section>`;
    })
    .join('\n');
}

function renderIndex(site, posts, hasAbout) {
  const body = `      <p class="intro">${escapeHtml(site.description)}</p>
${renderArchive(posts)}`;
  return renderPage(site, {
    prefix: '',
    title: site.title,
    description: site.description,
    canonical: site.base,
    active: 'home',
    home: true,
    hasAbout,
    body,
  });
}

function renderPostPage(site, posts, post, index, hasAbout) {
  const newer = index > 0 ? posts[index - 1] : null;
  const older = index < posts.length - 1 ? posts[index + 1] : null;
  const meta = `<time datetime="${post.date}">${formatDateCN(post.date)}</time>${
    post.tags.length ? ` · ${post.tags.map(escapeHtml).join(' · ')}` : ''
  }`;

  const olderLink = older
    ? `<a class="post-nav-link post-nav-older" href="../../posts/${older.slug}/"><span class="post-nav-label">上一篇</span>${escapeHtml(
        older.title,
      )}</a>`
    : '<span></span>';
  const newerLink = newer
    ? `<a class="post-nav-link post-nav-newer" href="../../posts/${newer.slug}/"><span class="post-nav-label">下一篇</span>${escapeHtml(
        newer.title,
      )}</a>`
    : '<span></span>';

  const body = `      <article class="post">
        <header class="post-header">
          <h1>${escapeHtml(post.title)}</h1>
          <p class="post-meta">${meta}</p>
        </header>
        <div class="prose">
${relocateRootUrls(post.html, '../../')}
        </div>
      </article>
      <nav class="post-nav" aria-label="文章导航">
        ${olderLink}
        ${newerLink}
      </nav>`;

  return renderPage(site, {
    prefix: '../../',
    title: post.title,
    description: post.summary,
    canonical: `${site.base}posts/${post.slug}/`,
    isPost: true,
    published: post.date,
    hasAbout,
    body,
  });
}

function renderAboutPage(site, about) {
  const body = `      <article class="page">
        <header class="page-header">
          <h1>${escapeHtml(about.title)}</h1>
        </header>
        <div class="prose">
${relocateRootUrls(about.html, '../')}
        </div>
      </article>`;
  return renderPage(site, {
    prefix: '../',
    title: about.title,
    description: about.summary,
    canonical: `${site.base}about/`,
    active: 'about',
    body,
  });
}

function renderNotFound(site, hasAbout) {
  const body = `      <div class="not-found">
        <p class="not-found-code">404</p>
        <h1>这一页不存在</h1>
        <p>地址可能写错了，或者文章已经被移动到别处。</p>
        <p><a href="${site.basePath}">回到首页</a></p>
      </div>`;
  return renderPage(site, {
    prefix: site.basePath,
    title: '页面不存在',
    description: '你访问的页面不存在。',
    canonical: `${site.base}404.html`,
    hasAbout,
    body,
  });
}

function rfc822(date) {
  return new Date(`${date}T00:00:00+08:00`).toUTCString();
}

function renderFeed(site, posts) {
  const items = posts
    .map((post) => {
      const url = `${site.base}posts/${post.slug}/`;
      const content = relocateRootUrls(post.html, site.base).replace(/]]>/g, ']]]]><![CDATA[>');
      const categories = post.tags.map((tag) => `      <category>${escapeHtml(tag)}</category>`).join('\n');
      return `    <item>
      <title>${escapeHtml(post.title)}</title>
      <link>${escapeHtml(url)}</link>
      <guid isPermaLink="true">${escapeHtml(url)}</guid>
      <pubDate>${rfc822(post.date)}</pubDate>
${categories ? `${categories}\n` : ''}      <description>${escapeHtml(post.summary)}</description>
      <content:encoded><![CDATA[${content}]]></content:encoded>
    </item>`;
    })
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/">
  <channel>
    <title>${escapeHtml(site.title)}</title>
    <link>${escapeHtml(site.base)}</link>
    <description>${escapeHtml(site.description)}</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="${escapeHtml(`${site.base}feed.xml`)}" rel="self" type="application/rss+xml"/>
${items}
  </channel>
</rss>
`;
}

async function writeOutput(relativePath, content) {
  const file = path.join(ROOT, relativePath);
  await mkdir(path.dirname(file), { recursive: true });
  await writeFile(file, content, 'utf8');
}

export async function build({ quiet = false } = {}) {
  const started = Date.now();
  const site = await loadSite();
  // 给样式表带一个内容哈希，避免浏览器或 GitHub Pages CDN 缓存旧样式。
  site.assetVersion = createHash('sha256')
    .update(await readFile(path.join(ROOT, 'assets/style.css'), 'utf8'))
    .digest('hex')
    .slice(0, 8);
  const { posts, warnings } = await readPosts();
  const about = await readAbout();
  const hasAbout = Boolean(about);

  // posts/ 完全由构建生成，先清掉，避免删除或改名后残留旧页面。
  await rm(POSTS_OUTPUT_DIR, { recursive: true, force: true });
  await mkdir(POSTS_OUTPUT_DIR, { recursive: true });
  await rm(ABOUT_OUTPUT_DIR, { recursive: true, force: true });

  await writeOutput('index.html', renderIndex(site, posts, hasAbout));
  for (let i = 0; i < posts.length; i += 1) {
    await writeOutput(
      `posts/${posts[i].slug}/index.html`,
      renderPostPage(site, posts, posts[i], i, hasAbout),
    );
  }
  if (about) await writeOutput('about/index.html', renderAboutPage(site, about));
  await writeOutput('404.html', renderNotFound(site, hasAbout));
  await writeOutput('feed.xml', renderFeed(site, posts));
  await writeFile(path.join(ROOT, '.nojekyll'), '', { flag: 'a' });

  for (const warning of warnings) console.warn(`  ! ${warning}`);
  if (!quiet) {
    const elapsed = Date.now() - started;
    console.log(`✓ 构建完成：${posts.length} 篇文章（${elapsed}ms）`);
  }
  return { posts, about };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  build().catch((error) => {
    console.error(`\n构建失败：${error.message}\n`);
    process.exitCode = 1;
  });
}
