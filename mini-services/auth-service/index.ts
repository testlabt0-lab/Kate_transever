import http from 'http';
import bcrypt from 'bcrypt';

const PORT = 3005;
const HOST = '0.0.0.0'; // Listen on all interfaces
const SERVICE_ID = 'AUTH-' + Date.now();

const ADMIN_HASH = '$2b$10$CNVKLtW.A7VEWi18b1nTIumNP7xtebhrBQvz/8hcu.EIzBAHfb44O';

console.log('Starting auth service...', SERVICE_ID);

const server = http.createServer(async (req, res) => {
  console.log('Request:', req.method, req.url);

  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end('{}');
    return;
  }

  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200);
    res.end(JSON.stringify({ ok: true, serviceId: SERVICE_ID }));
    return;
  }

  if (req.method === 'POST' && req.url === '/login') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const { username, password } = JSON.parse(body || '{}');
        const u = (username || '').trim();
        const p = (password || '').trim();

        console.log('Login:', u);

        if (!u || !p) {
          res.writeHead(400);
          res.end(JSON.stringify({ success: false, error: 'بيانات مطلوبة', serviceId: SERVICE_ID }));
          return;
        }

        if (u === 'admin') {
          const valid = await bcrypt.compare(p, ADMIN_HASH);
          if (valid) {
            const token = Buffer.from(`admin:${Date.now()}`).toString('base64');
            res.writeHead(200);
            res.end(JSON.stringify({
              success: true,
              token,
              user: { id: '1', username: 'admin', role: 'ADMIN' },
              serviceId: SERVICE_ID
            }));
            return;
          }
        }

        res.writeHead(401);
        res.end(JSON.stringify({ success: false, error: 'بيانات غير صحيحة', serviceId: SERVICE_ID }));
      } catch (e) {
        console.error('Error:', e);
        res.writeHead(500);
        res.end(JSON.stringify({ success: false, error: 'خطأ', serviceId: SERVICE_ID }));
      }
    });
    return;
  }

  res.writeHead(404);
  res.end('{"error":"not found"}');
});

server.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`);
});
