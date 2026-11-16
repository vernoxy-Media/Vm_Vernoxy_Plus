import { gzipSync } from 'zlib';
import type { NextFunction, Request, Response } from 'express';

/** Smaller than this is not worth the work; larger than this is left alone so one huge reply cannot hog the CPU. */
const MIN_BYTES = 1024;
const MAX_BYTES = 8 * 1024 * 1024;
/** JSON, text and the like. Images, Excel and PDF files are already compressed. */
const COMPRESSIBLE = /^(application\/(json|problem\+json|javascript|xml)|text\/(?!event-stream))/i;

/**
 * Sends the replies of the API gzipped when the browser accepts it. A list of tasks, projects or conversations is a
 * lot of repeating JSON, so it shrinks to a fraction of its size and reaches the screen sooner on a normal connection.
 *
 * Only a reply that is finished in one go (res.json / res.send) is compressed; a stream (a download, live events)
 * is passed through untouched.
 */
export function gzipResponses() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (req.method === 'HEAD' || !/\bgzip\b/i.test(String(req.headers['accept-encoding'] ?? ''))) return next();

    const originalWrite = res.write.bind(res) as (...args: unknown[]) => boolean;
    const originalEnd = res.end.bind(res) as (...args: unknown[]) => Response;
    let streamed = false;

    res.write = ((...args: unknown[]) => {
      streamed = true;
      return originalWrite(...args);
    }) as typeof res.write;

    res.end = ((chunk?: unknown, encoding?: unknown, cb?: unknown) => {
      const callback = [chunk, encoding, cb].find((x) => typeof x === 'function');
      const hasBody = (typeof chunk === 'string' || Buffer.isBuffer(chunk)) && chunk.length > 0;
      const type = String(res.getHeader('Content-Type') ?? '');

      if (
        !streamed &&
        hasBody &&
        !res.headersSent &&
        res.statusCode !== 204 &&
        res.statusCode !== 304 &&
        !res.getHeader('Content-Encoding') &&
        COMPRESSIBLE.test(type)
      ) {
        const body = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk as string, typeof encoding === 'string' ? (encoding as BufferEncoding) : 'utf8');
        if (body.length >= MIN_BYTES && body.length <= MAX_BYTES) {
          const packed = gzipSync(body, { level: 5 });
          if (packed.length < body.length) {
            res.setHeader('Content-Encoding', 'gzip');
            res.setHeader('Content-Length', packed.length);
            res.vary('Accept-Encoding');
            return originalEnd(packed, callback);
          }
        }
      }
      return originalEnd(...([chunk, encoding, cb].filter((x) => x !== undefined) as unknown[]));
    }) as typeof res.end;

    next();
  };
}
