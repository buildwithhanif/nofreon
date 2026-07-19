#!/usr/bin/env node
// Ping IndexNow (Bing, Naver, Seznam, Yandex — feeds ChatGPT/Copilot search)
// with every URL in sitemap.xml. Run after each deploy: node indexnow.js
const https = require('https');
const fs = require('fs');

const KEY = '33693e3425f1801136dd31f3d1f5ccc9';
const HOST = 'nofreon.id';

const sm = fs.readFileSync(__dirname + '/sitemap.xml', 'utf-8');
const urls = [...sm.matchAll(/<loc>([^<]*)<\/loc>/g)].map(m => m[1]);

const body = JSON.stringify({
  host: HOST,
  key: KEY,
  keyLocation: `https://${HOST}/${KEY}.txt`,
  urlList: urls
});

let gotResponse = false;
const req = https.request({
  hostname: 'api.indexnow.org',
  path: '/IndexNow',
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  gotResponse = true;
  const code = res.statusCode;
  const ok = code === 200 || code === 202;
  // Drain the body so the socket closes cleanly — the API server
  // resets the connection abruptly after responding.
  res.resume();
  res.on('error', () => {});
  res.on('end', () => console.log(`IndexNow: HTTP ${code} — ${urls.length} URLs submitted${ok ? ' ✓' : ' (unexpected status)'}`));
});
req.on('error', e => {
  // Socket noise after a successful response is harmless — only report
  // errors that happened before the server answered.
  if (!gotResponse) console.error('IndexNow failed:', e.message);
});
req.write(body);
req.end();
