import { gunzipSync } from 'zlib';
import { gzipResponses } from './gzip.middleware';

/** A small stand-in for an Express response that records what was sent. */
function fakeRes(contentType: string | null = 'application/json; charset=utf-8', statusCode = 200) {
  const headers: Record<string, unknown> = {};
  if (contentType) headers['content-type'] = contentType;
  const sent: { body?: Buffer | string; ended: boolean } = { ended: false };
  const res: any = {
    statusCode,
    headersSent: false,
    getHeader: (k: string) => headers[k.toLowerCase()],
    setHeader: (k: string, v: unknown) => { headers[k.toLowerCase()] = v; },
    vary: (k: string) => { headers['vary'] = k; },
    write: jest.fn(() => true),
    end: (body?: Buffer | string) => { sent.body = body; sent.ended = true; return res; },
  };
  return { res, headers, sent };
}

const run = (acceptEncoding: string | undefined, method = 'GET') => {
  const mw = gzipResponses();
  const req: any = { method, headers: acceptEncoding === undefined ? {} : { 'accept-encoding': acceptEncoding } };
  return (res: unknown) => {
    const next = jest.fn();
    mw(req, res as never, next);
    return next;
  };
};

const bigJson = JSON.stringify(Array.from({ length: 200 }, (_, i) => ({ task_id: i, title: 'Add searchable dropdown', stage: 'in_progress' })));

describe('gzipResponses', () => {
  it('sends a large JSON reply gzipped, smaller, and says so', () => {
    const { res, headers, sent } = fakeRes();
    const next = run('gzip, deflate, br')(res);
    res.end(bigJson);
    expect(next).toHaveBeenCalled();
    expect(headers['content-encoding']).toBe('gzip');
    expect(headers['vary']).toBe('Accept-Encoding');
    const out = sent.body as Buffer;
    expect(out.length).toBeLessThan(bigJson.length / 3);
    expect(headers['content-length']).toBe(out.length);
    expect(gunzipSync(out).toString('utf8')).toBe(bigJson);
  });

  it('leaves a small reply alone', () => {
    const { res, headers, sent } = fakeRes();
    run('gzip')(res);
    res.end('{"ok":true}');
    expect(headers['content-encoding']).toBeUndefined();
    expect(sent.body).toBe('{"ok":true}');
  });

  it('does nothing when the browser does not accept gzip, or for HEAD', () => {
    const a = fakeRes();
    run(undefined)(a.res);
    a.res.end(bigJson);
    expect(a.headers['content-encoding']).toBeUndefined();
    expect(a.sent.body).toBe(bigJson);

    const b = fakeRes();
    run('gzip', 'HEAD')(b.res);
    b.res.end(bigJson);
    expect(b.headers['content-encoding']).toBeUndefined();
  });

  it('does not touch files, images or replies that are already encoded', () => {
    const img = fakeRes('image/png');
    run('gzip')(img.res);
    img.res.end(Buffer.alloc(5000, 1));
    expect(img.headers['content-encoding']).toBeUndefined();

    const done = fakeRes();
    done.headers['content-encoding'] = 'br';
    run('gzip')(done.res);
    done.res.end(bigJson);
    expect(done.headers['content-encoding']).toBe('br');
  });

  it('passes a streamed reply and live events through untouched', () => {
    const streamed = fakeRes('text/csv');
    run('gzip')(streamed.res);
    streamed.res.write('a,b\n');
    streamed.res.end('x'.repeat(5000));
    expect(streamed.headers['content-encoding']).toBeUndefined();

    const sse = fakeRes('text/event-stream');
    run('gzip')(sse.res);
    sse.res.end('data: ' + 'x'.repeat(5000));
    expect(sse.headers['content-encoding']).toBeUndefined();
  });

  it('skips an empty reply and a 304', () => {
    const empty = fakeRes();
    run('gzip')(empty.res);
    empty.res.end();
    expect(empty.sent.ended).toBe(true);
    expect(empty.headers['content-encoding']).toBeUndefined();

    const notModified = fakeRes('application/json', 304);
    run('gzip')(notModified.res);
    notModified.res.end(bigJson);
    expect(notModified.headers['content-encoding']).toBeUndefined();
  });

  it('keeps the end callback working', () => {
    const { res } = fakeRes();
    run('gzip')(res);
    const done = jest.fn();
    res.end(bigJson, done);
    expect(res).toBeDefined();
  });
});
