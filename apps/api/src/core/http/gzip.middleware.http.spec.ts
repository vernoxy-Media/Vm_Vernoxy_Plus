import * as http from 'http';
import type { AddressInfo } from 'net';
import { gunzipSync } from 'zlib';
import express from 'express';
import { gzipResponses } from './gzip.middleware';

/** The same middleware on a real Express app, the way the API uses it, read as raw bytes off the wire. */
const rows = Array.from({ length: 300 }, (_, i) => ({ task_id: i, title: 'Add searchable dropdown', stage: 'in_progress', assignees: [{ name: 'Deep Gajre' }] }));

function app() {
  const a = express();
  a.use(gzipResponses());
  a.get('/rows', (_req, res) => {
    res.json(rows);
  });
  a.get('/small', (_req, res) => {
    res.json({ ok: true });
  });
  a.get('/file', (_req, res) => {
    res.setHeader('Content-Type', 'application/octet-stream');
    res.end(Buffer.alloc(5000, 7));
  });
  a.get('/stream', (_req, res) => {
    res.setHeader('Content-Type', 'text/plain');
    res.write('x'.repeat(3000));
    res.end('y'.repeat(3000));
  });
  return http.createServer(a);
}

interface Wire {
  headers: http.IncomingHttpHeaders;
  body: Buffer;
}

function get(path: string, acceptEncoding?: string): Promise<Wire> {
  const server = app();
  return new Promise<Wire>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address() as AddressInfo;
      const req = http.get({ host: '127.0.0.1', port, path, headers: acceptEncoding ? { 'Accept-Encoding': acceptEncoding } : {} }, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (c: Buffer) => chunks.push(c));
        res.on('end', () => resolve({ headers: res.headers, body: Buffer.concat(chunks) }));
      });
      req.on('error', reject);
    });
  }).finally(() => server.close());
}

describe('gzipResponses on a real Express app', () => {
  it('sends a big JSON list gzipped, and it decodes to the same list', async () => {
    const res = await get('/rows', 'gzip');
    expect(res.headers['content-encoding']).toBe('gzip');
    expect(String(res.headers['vary'])).toMatch(/Accept-Encoding/i);
    expect(res.body.length).toBeLessThan(JSON.stringify(rows).length / 4);
    expect(Number(res.headers['content-length'])).toBe(res.body.length);
    expect(JSON.parse(gunzipSync(res.body).toString('utf8'))).toEqual(rows);
  });

  it('sends the plain list when the browser does not ask for gzip', async () => {
    const res = await get('/rows');
    expect(res.headers['content-encoding']).toBeUndefined();
    expect(JSON.parse(res.body.toString('utf8'))).toEqual(rows);
  });

  it('leaves a small reply, a file and a streamed reply as they are', async () => {
    expect((await get('/small', 'gzip')).headers['content-encoding']).toBeUndefined();
    expect((await get('/file', 'gzip')).headers['content-encoding']).toBeUndefined();
    const streamed = await get('/stream', 'gzip');
    expect(streamed.headers['content-encoding']).toBeUndefined();
    expect(streamed.body.length).toBe(6000);
  });
});
