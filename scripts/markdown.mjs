// 极简 Markdown 渲染器（零依赖，只在构建期运行）
//
// 支持：标题、段落、行内代码、围栏代码块、粗体 / 斜体 / 删除线、
//       链接、图片、引用、有序 / 无序列表（可嵌套）、表格、分隔线、硬换行。
// 说明：原始 HTML 会被转义，避免写错标签时整页布局被破坏。

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };

export function escapeHtml(value) {
  return String(value).replace(/[&<>]/g, (ch) => ESCAPES[ch]);
}

export function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

const CJK = /[\u2e80-\u9fff\uf900-\ufaff\uff00-\uffef]/;
const PLACEHOLDER = /\u0000(\d+)\u0000/g;

export function slugify(text) {
  const base = String(text)
    .toLowerCase()
    .replace(/<[^>]*>/g, '')
    .replace(/[`*_~\[\]()#!]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\p{L}\p{N}_-]/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return base || 'section';
}

function uniqueSlug(text, ctx) {
  const base = slugify(text);
  const count = ctx.slugs.get(base) || 0;
  ctx.slugs.set(base, count + 1);
  return count === 0 ? base : `${base}-${count}`;
}

function attrText(escaped) {
  // 文本在前面的步骤里已经转义过，这里只需要处理会截断属性的引号。
  return String(escaped).replace(/"/g, '&quot;');
}

function renderInline(text) {
  const store = [];
  const put = (html) => `\u0000${store.push(html) - 1}\u0000`;

  // 1. 反斜杠转义（先处理，避免符号被当成语法）
  let out = String(text).replace(
    /\\([\\`*_{}[\]()#+\-.!~>|])/g,
    (_, ch) => put(escapeHtml(ch)),
  );

  // 2. 统一转义，之后所有语法都在“纯文本”上工作
  out = escapeHtml(out);

  // 3. 行内代码
  out = out.replace(/(`+)([^`\n]+?)\1/g, (_, __, code) => put(`<code>${code}</code>`));

  // 4. 图片
  out = out.replace(
    /!\[([^\]]*)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g,
    (_, alt, src, title) => {
      const attrs = [`src="${src.replace(/"/g, '%22')}"`, `alt="${attrText(alt)}"`];
      if (title) attrs.push(`title="${attrText(title)}"`);
      attrs.push('loading="lazy"', 'decoding="async"');
      return put(`<img ${attrs.join(' ')}>`);
    },
  );

  // 5. 链接
  out = out.replace(
    /\[([^\]]+)\]\(\s*([^)\s]+)(?:\s+"([^"]*)")?\s*\)/g,
    (_, label, href, title) => {
      const external = /^https?:\/\//i.test(href);
      const attrs = [`href="${href.replace(/"/g, '%22')}"`];
      if (title) attrs.push(`title="${attrText(title)}"`);
      if (external) attrs.push('target="_blank"', 'rel="noopener noreferrer"');
      return put(`<a ${attrs.join(' ')}>${label}</a>`);
    },
  );

  // 6. 自动链接 <https://...>
  out = out.replace(
    /&lt;((?:https?:\/\/|mailto:)[^\s&]+)&gt;/g,
    (_, url) => put(`<a href="${url}" target="_blank" rel="noopener noreferrer">${url}</a>`),
  );

  // 7. 强调
  out = out.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  out = out.replace(/~~([^~\n]+)~~/g, '<del>$1</del>');
  out = out.replace(/(^|[^*\w])\*([^*\n]+?)\*(?!\*)/g, '$1<em>$2</em>');
  out = out.replace(/(^|[^\w_])_([^_\n]+?)_(?![\w_])/g, '$1<em>$2</em>');

  return out.replace(PLACEHOLDER, (_, index) => store[Number(index)]);
}

function renderParagraph(lines) {
  const parts = lines.map((line) => {
    const hardBreak = /(?: {2,}|\\)$/.test(line);
    let clean = line.replace(/\s+$/, '');
    if (hardBreak && clean.endsWith('\\')) clean = clean.slice(0, -1);
    return { clean, hardBreak };
  });

  let html = '';
  for (let i = 0; i < parts.length; i += 1) {
    html += renderInline(parts[i].clean);
    if (i === parts.length - 1) break;
    if (parts[i].hardBreak) {
      html += '<br>';
      continue;
    }
    // 中文断行不插空格，西文断行保留一个空格
    const last = parts[i].clean.slice(-1);
    const next = parts[i + 1].clean.charAt(0);
    html += CJK.test(last) && CJK.test(next) ? '' : '\n';
  }
  return `<p>${html}</p>`;
}

function isTableStart(lines, index) {
  if (index + 1 >= lines.length) return false;
  if (!lines[index].includes('|')) return false;
  return /^\s*\|?\s*:?-+:?\s*(?:\|\s*:?-+:?\s*)+\|?\s*$/.test(lines[index + 1]);
}

function splitRow(row) {
  let text = row.trim();
  if (text.startsWith('|')) text = text.slice(1);
  if (text.endsWith('|')) text = text.slice(0, -1);
  return text.split(/(?<!\\)\|/).map((cell) => cell.trim().replace(/\\\|/g, '|'));
}

function alignmentOf(cell) {
  const text = cell.trim();
  const left = text.startsWith(':');
  const right = text.endsWith(':');
  if (left && right) return 'center';
  if (right) return 'right';
  if (left) return 'left';
  return '';
}

function alignStyle(align) {
  return align ? ` style="text-align:${align}"` : '';
}

function isBlockStart(lines, index) {
  const line = lines[index];
  if (/^\s*$/.test(line)) return true;
  if (/^\s{0,3}(`{3,}|~{3,})/.test(line)) return true;
  if (/^\s{0,3}#{1,6}\s+/.test(line)) return true;
  if (/^\s{0,3}>/.test(line)) return true;
  if (/^\s{0,3}(?:[-*+]|\d{1,9}[.)])\s+/.test(line)) return true;
  if (/^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line)) return true;
  if (isTableStart(lines, index)) return true;
  return false;
}

function parseList(lines, start, ctx) {
  const first = lines[start].match(/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/);
  const baseIndent = first[1].length;
  const ordered = /\d/.test(first[2]);
  const startNumber = ordered ? Number.parseInt(first[2], 10) : 1;
  const items = [];
  let hasBlankLine = false;
  let i = start;

  while (i < lines.length) {
    const match = lines[i].match(/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/);
    if (!match) break;

    const indent = match[1].length;
    if (indent !== baseIndent) break;
    if (/\d/.test(match[2]) !== ordered) break;

    const contentIndent = indent + match[2].length + 1;
    const itemLines = [match[3]];
    let j = i + 1;

    while (j < lines.length) {
      const line = lines[j];
      const sibling = line.match(/^(\s*)([-*+]|\d{1,9}[.)])\s+(.*)$/);

      if (line.trim() === '') {
        let k = j + 1;
        while (k < lines.length && lines[k].trim() === '') k += 1;
        if (k >= lines.length) {
          j = k;
          break;
        }
        const nextLine = lines[k];
        const nextMatch = nextLine.match(/^(\s*)([-*+]|\d{1,9}[.)])\s+/);
        const nextIndent = nextLine.match(/^\s*/)[0].length;
        if ((nextMatch && nextIndent <= baseIndent) || nextIndent > baseIndent) {
          hasBlankLine = true;
          itemLines.push('');
          j += 1;
          continue;
        }
        break;
      }

      const lineIndent = line.match(/^\s*/)[0].length;
      if (sibling && lineIndent <= baseIndent) break;
      if (lineIndent > baseIndent) {
        itemLines.push(line.slice(Math.min(contentIndent, lineIndent)));
        j += 1;
        continue;
      }
      break;
    }

    items.push(itemLines);
    i = j;
  }

  const tag = ordered ? 'ol' : 'ul';
  const startAttr = ordered && startNumber !== 1 ? ` start="${startNumber}"` : '';
  const body = items
    .map((itemLines) => {
      while (itemLines.length && itemLines[itemLines.length - 1].trim() === '') itemLines.pop();
      // 列表里只要出现过空行，整张列表按“松散”处理，段落保留 <p>
      const inner = parseBlocks(itemLines, ctx, { tightParagraphs: !hasBlankLine }).trim();
      return `<li>${inner}</li>`;
    })
    .join('\n');

  return {
    html: `<${tag}${startAttr}>\n${body}\n</${tag}>`,
    next: i,
  };
}

function parseTable(lines, start, ctx) {
  const header = splitRow(lines[start]);
  const alignments = splitRow(lines[start + 1]).map(alignmentOf);
  let i = start + 2;
  const rows = [];

  while (i < lines.length && lines[i].trim() !== '' && lines[i].includes('|')) {
    rows.push(splitRow(lines[i]));
    i += 1;
  }

  const head = header
    .map((cell, index) => `<th${alignStyle(alignments[index])}>${renderInline(cell)}</th>`)
    .join('');
  const body = rows
    .map(
      (cells) =>
        `<tr>${cells
          .map((cell, index) => `<td${alignStyle(alignments[index])}>${renderInline(cell)}</td>`)
          .join('')}</tr>`,
    )
    .join('\n');

  const table = `<table><thead><tr>${head}</tr></thead>${body ? `<tbody>\n${body}\n</tbody>` : ''}</table>`;
  return { html: `<div class="table-wrap">${table}</div>`, next: i };
}

function parseBlocks(lines, ctx, options = {}) {
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*$/.test(line)) {
      i += 1;
      continue;
    }

    // 围栏代码块
    const fence = line.match(/^\s{0,3}(`{3,}|~{3,})\s*([^\s`]*)(?:\s+.*)?$/);
    if (fence) {
      const marker = fence[1][0];
      const length = fence[1].length;
      const rawLang = fence[2] || '';
      const closing = new RegExp(`^\\s{0,3}${marker === '`' ? '`' : '~'}{${length},}\\s*$`);
      const buffer = [];
      i += 1;
      while (i < lines.length && !closing.test(lines[i])) {
        buffer.push(lines[i]);
        i += 1;
      }
      i += 1;
      const lang = /^[a-z0-9#+_-]+$/i.test(rawLang) ? rawLang : '';
      const dataLang = rawLang ? ` data-lang="${escapeAttr(rawLang)}"` : '';
      const codeClass = lang ? ` class="language-${escapeAttr(lang)}"` : '';
      out.push(
        `<div class="code-block"${dataLang}><pre><code${codeClass}>${escapeHtml(
          buffer.join('\n'),
        )}</code></pre></div>`,
      );
      continue;
    }

    // 标题
    const heading = line.match(/^\s{0,3}(#{1,6})\s+(.*?)(?:\s+#+)?\s*$/);
    if (heading) {
      const level = heading[1].length;
      const raw = heading[2];
      const id = uniqueSlug(raw, ctx);
      out.push(
        `<h${level} id="${escapeAttr(id)}">${renderInline(raw)}<a class="head-anchor" href="#${escapeAttr(
          id,
        )}" tabindex="-1" aria-hidden="true">#</a></h${level}>`,
      );
      i += 1;
      continue;
    }

    // 分隔线
    if (/^\s{0,3}(?:(?:\*\s*){3,}|(?:-\s*){3,}|(?:_\s*){3,})$/.test(line)) {
      out.push('<hr>');
      i += 1;
      continue;
    }

    // 引用
    if (/^\s{0,3}>/.test(line)) {
      const buffer = [];
      while (i < lines.length) {
        if (/^\s{0,3}>/.test(lines[i])) {
          buffer.push(lines[i].replace(/^\s{0,3}>\s?/, ''));
          i += 1;
          continue;
        }
        if (lines[i].trim() === '') {
          let k = i + 1;
          while (k < lines.length && lines[k].trim() === '') k += 1;
          if (k < lines.length && /^\s{0,3}>/.test(lines[k])) {
            buffer.push('');
            i += 1;
            continue;
          }
        }
        break;
      }
      out.push(`<blockquote>${parseBlocks(buffer, ctx)}</blockquote>`);
      continue;
    }

    // 表格
    if (isTableStart(lines, i)) {
      const table = parseTable(lines, i, ctx);
      out.push(table.html);
      i = table.next;
      continue;
    }

    // 列表
    if (/^\s{0,3}(?:[-*+]|\d{1,9}[.)])\s+/.test(line)) {
      const list = parseList(lines, i, ctx);
      out.push(list.html);
      i = list.next;
      continue;
    }

    // 普通段落
    const paragraph = [];
    while (i < lines.length && !isBlockStart(lines, i)) {
      paragraph.push(lines[i]);
      i += 1;
    }
    const rendered = renderParagraph(paragraph);
    out.push(options.tightParagraphs ? rendered.slice(3, -4) : rendered);
  }

  return out.join('\n');
}

export function renderMarkdown(markdown) {
  const lines = String(markdown).replace(/\r\n?/g, '\n').split('\n');
  return parseBlocks(lines, { slugs: new Map() });
}
