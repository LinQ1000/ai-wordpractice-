import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { speakingHandler, json } from './speaking.js';
const root = resolve('dist');
const mime: Record<string,string> = { '.html':'text/html; charset=utf-8', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.svg':'image/svg+xml', '.png':'image/png', '.jpg':'image/jpeg', '.ico':'image/x-icon', '.mp3':'audio/mpeg', '.wav':'audio/wav', '.pdf':'application/pdf', '.md':'text/plain; charset=utf-8' };
createServer(async (req,res) => {
  const path = new URL(req.url || '/', 'http://localhost').pathname;
  if (path === '/api/speaking') { await speakingHandler(req,res); return; }
  if (!['GET','HEAD'].includes(req.method || '')) { json(res,405,{error:'Method not allowed'}); return; }
  try {
    const file = resolve(root, '.' + decodeURIComponent(path === '/' ? '/index.html' : path));
    if (!file.startsWith(root+sep)) { json(res,403,{error:'Forbidden'}); return; }
    const info = await stat(file); if (!info.isFile()) throw new Error();
    res.writeHead(200,{'Content-Type':mime[extname(file)] || 'application/octet-stream'});
    res.end(req.method === 'HEAD' ? undefined : await readFile(file));
  } catch { json(res,404,{error:'Not found'}); }
}).listen(Number(process.env.PORT || 3000), process.env.HOST || '127.0.0.1', () => console.log('App server ready (default http://127.0.0.1:3000)'));
