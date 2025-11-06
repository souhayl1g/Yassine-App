import type { VercelRequest, VercelResponse } from '@vercel/node';

// Backend base URL, e.g. https://<id>.ngrok-free.dev
const BACKEND = (process.env.BACKEND_BASE_URL || '').replace(/\/$/, '');

async function readRawBody(req: VercelRequest): Promise<Buffer | undefined> {
  if (req.method === 'GET' || req.method === 'HEAD') return undefined;
  return await new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (c) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!BACKEND) {
    res.status(500).json({ error: 'BACKEND_BASE_URL is not set' });
    return;
  }

  try {
    // Catch-all route segments after /api
    const parts = (req.query.path as string[] | undefined) ?? [];
    const search = req.url && req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
    const targetUrl = `${BACKEND}/api/${parts.join('/')}${search}`;

    console.log(`[API Proxy] ${req.method} ${targetUrl}`);

    // Clone headers, omit host so fetch sets it for backend
    const headers: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.headers)) {
      if (v === undefined) continue;
      headers[k] = Array.isArray(v) ? v.join(',') : String(v);
    }
    delete headers['host'];
    
    // Add ngrok-skip-browser-warning header to bypass ngrok warning page
    headers['ngrok-skip-browser-warning'] = 'true';

    const body = await readRawBody(req);

    const resp = await fetch(targetUrl, {
      method: req.method,
      headers,
      body: body ? new Uint8Array(body) : undefined,
      redirect: 'manual',
    });

    res.status(resp.status);
    resp.headers.forEach((value, key) => {
      if (key.toLowerCase() === 'transfer-encoding') return;
      res.setHeader(key, value as string);
    });

    const buf = Buffer.from(await resp.arrayBuffer());
    res.send(buf);
  } catch (error) {
    console.error('[API Proxy Error]', error);
    res.status(500).json({ 
      error: 'Failed to proxy request to backend',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
