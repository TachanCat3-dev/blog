// 本地预览：构建一次，启动静态服务器，并监听 content / assets / site.json 的变化。
// 用法：npm run dev

import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from './build.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CONTENT_DIR = path.join(ROOT, 'content');
const ASSETS_DIR = path.join(ROOT, 'assets');
const HOST = '127.0.0.1';

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.avif': 'image/avif',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.md': 'text/plain; charset=utf-8',
  '.mp4': 'video/mp4',
};

let building = false;
let pending = false;
let timer = null;

const stamp = () => new Date().toLocaleTimeString('zh-CN', { hour12: false });

async function rebuild(reason) {
  if (building) {
    pending = true;
    return;
  }
  building = true;
  try {
    await build({ quiet: true });
    console.log(`[${stamp()}] 已重新构建（${reason}）`);
  } catch (error) {
    console.error(`[${stamp()}] 构建失败：${error.message}`);
  } finally {
    building = false;
    if (pending) {
      pending = false;
      schedule('排队中的改动');
    }
  }
}

function schedule(reason) {
  clearTimeout(timer);
  timer = setTimeout(() => void rebuild(reason), 120);
}

function handleRequest(req, res) {
  void (async () => {
    try {
      const url = new URL(req.url || '/', `http://${HOST}`);
      let pathname = decodeURIComponent(url.pathname);
      if (pathname.endsWith('/')) pathname += 'index.html';

      let file = path.join(ROOT, pathname);
      if (file !== ROOT && !file.startsWith(ROOT + path.sep)) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403');
        return;
      }

      let info = null;
      try {
        info = await stat(file);
      } catch {
        info = null;
      }

      if (info && info.isDirectory()) {
        res.writeHead(301, { Location: `${url.pathname}/${url.search}` });
        res.end();
        return;
      }

      if (!info) {
        try {
          const indexFile = path.join(file, 'index.html');
          const indexInfo = await stat(indexFile);
          if (indexInfo.isFile()) {
            file = indexFile;
            info = indexInfo;
          }
        } catch {
          // 继续走 404
        }
      }

      if (!info || !info.isFile()) {
        const notFound = await readFile(path.join(ROOT, '404.html'), 'utf8').catch(
          () => '404 Not Found',
        );
        res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(notFound);
        return;
      }

      const data = await readFile(file);
      res.writeHead(200, {
        'Content-Type': MIME_TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream',
        'Cache-Control': 'no-store',
      });
      res.end(data);
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end(`500 ${error.message}`);
    }
  })();
}

function startServer(port) {
  const server = createServer(handleRequest);

  server.on('error', (error) => {
    if (error.code === 'EADDRINUSE' && port < 3010) {
      startServer(port + 1);
      return;
    }
    console.error(`无法启动本地服务：${error.message}`);
    process.exitCode = 1;
  });

  server.listen(port, HOST, () => {
    console.log('');
    console.log('  技术美术笔记 · 本地预览');
    console.log(`  http://${HOST}:${port}`);
    console.log('');
    console.log('  修改 content/、assets/、site.json 会自动重新构建。');
    console.log('  页面需要手动刷新；按 Ctrl+C 退出。');
    console.log('');

    watch(CONTENT_DIR, { recursive: true }, (_event, filename) =>
      schedule(filename ? `content/${filename}` : 'content'),
    );
    watch(ASSETS_DIR, { recursive: true }, (_event, filename) =>
      schedule(filename ? `assets/${filename}` : 'assets'),
    );
    watch(path.join(ROOT, 'site.json'), () => schedule('site.json'));
  });
}

await build();
startServer(Number(process.env.PORT) || 3000);
