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

const req = https.request({
  hostname: 'api.indexnow.org',
  path: '/IndexNow',
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) }
}, res => {
  console.log(`IndexNow: HTTP ${res.statusCode} — ${urls.length} URLs submitted`);
});
req.on('error', e => console.error('IndexNow failed:', e.message));
req.write(body);
req.end();
