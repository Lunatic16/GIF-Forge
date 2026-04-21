#!/usr/bin/env node
/**
 * GIF Forge — local dev server
 * 
 * FFmpeg WASM requires SharedArrayBuffer, which needs these headers:
 *   Cross-Origin-Opener-Policy: same-origin
 *   Cross-Origin-Embedder-Policy: require-corp
 * 
 * Usage:
 *   node server.mjs
 *   node server.mjs 3000   (custom port)
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = parseInt(process.argv[2]) || 8080;

const MIME = {
  '.html': 'text/html',
  '.js':   'application/javascript',
  '.mjs':  'application/javascript',
  '.wasm': 'application/wasm',
  '.png':  'image/png',
  '.gif':  'image/gif',
  '.css':  'text/css',
  '.json': 'application/json',
  '.mp4':  'video/mp4',
  '.webm': 'video/webm',
};

const server = http.createServer((req, res) => {
  // Decode URL and strip query string
  const urlPath = decodeURIComponent(req.url.split('?')[0]);
  const filePath = path.join(__dirname, urlPath === '/' ? 'index.html' : urlPath);
  const ext = path.extname(filePath).toLowerCase();

  // Security: prevent directory traversal
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  // Required headers for SharedArrayBuffer (needed by ffmpeg.wasm)
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Embedder-Policy', 'require-corp');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

  fs.stat(filePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end(`Not found: ${urlPath}`);
      return;
    }

    const contentType = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': contentType,
      'Content-Length': stat.size,
      'Cache-Control': ext === '.wasm' ? 'public, max-age=86400' : 'no-cache',
    });

    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('  ┌─────────────────────────────────────────┐');
  console.log('  │  GIF Forge                              │');
  console.log(`  │  http://localhost:${PORT}                  │`);
  console.log('  │                                         │');
  console.log('  │  COOP/COEP headers active ✓             │');
  console.log('  │  SharedArrayBuffer enabled ✓            │');
  console.log('  └─────────────────────────────────────────┘');
  console.log('');
  console.log('  Note: First load fetches ~31MB WASM binary.');
  console.log('  Press Ctrl+C to stop.');
  console.log('');
});
