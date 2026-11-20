import { createECDH, randomBytes } from 'crypto';
import { PushService } from './push.service';
import { generateVapidKeys } from '../domain/web-push.crypto';

const b64u = (b: Buffer) => b.toString('base64url');

function browser() {
  const ecdh = createECDH('prime256v1');
  ecdh.generateKeys();
  return { p256dh: b64u(ecdh.getPublicKey()), auth: b64u(randomBytes(16)) };
}

function setup(rows: Array<{ subscription_id: number; emp_id: number; endpoint: string; p256dh: string; auth: string }>) {
  const deleted: number[][] = [];
  const prisma = {
    $queryRaw: jest.fn().mockResolvedValue(rows),
    $executeRaw: jest.fn().mockImplementation((_s: TemplateStringsArray, ...v: unknown[]) => {
      if (Array.isArray(v[0])) deleted.push(v[0] as number[]);
      return Promise.resolve(1);
    }),
  };
  const service = new PushService(prisma as never);
  const sent: Array<{ endpoint: string; headers: Record<string, string>; size: number }> = [];
  return { service, prisma, deleted, sent };
}

describe('PushService', () => {
  const OLD = { ...process.env };
  afterEach(() => {
    process.env = { ...OLD };
  });
  const enable = () => {
    const k = generateVapidKeys();
    process.env.VAPID_PUBLIC_KEY = k.publicKey;
    process.env.VAPID_PRIVATE_KEY = k.privateKey;
  };

  it('is off, and sends nothing, without VAPID keys', async () => {
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;
    const { service, prisma } = setup([]);
    expect(service.config()).toEqual({ enabled: false, public_key: null });
    await service.notify([1], { title: 'a', body: 'b', url: '/' });
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('sends an encrypted, signed request to every browser of the person', async () => {
    enable();
    const b = browser();
    const { service, sent } = setup([
      { subscription_id: 1, emp_id: 5, endpoint: 'https://fcm.googleapis.com/fcm/send/abc', ...b },
      { subscription_id: 2, emp_id: 5, endpoint: 'https://updates.push.services.mozilla.com/wpush/v2/xyz', ...b },
    ]);
    service.useTransport(async (endpoint, headers, body) => {
      sent.push({ endpoint, headers, size: body.length });
      return 201;
    });
    await service.notify([5], { title: 'New task', body: 'Fix login', url: '/my-tasks' });
    expect(sent).toHaveLength(2);
    expect(sent[0].headers.Authorization).toMatch(/^vapid /i);
    expect(sent[0].headers['Content-Encoding']).toBe('aes128gcm');
    expect(sent[0].size).toBeGreaterThan(86);
  });

  it('forgets browsers that were unsubscribed (404 / 410) but keeps ones with passing problems', async () => {
    enable();
    const b = browser();
    const { service, deleted } = setup([
      { subscription_id: 1, emp_id: 5, endpoint: 'https://fcm.googleapis.com/a', ...b },
      { subscription_id: 2, emp_id: 5, endpoint: 'https://fcm.googleapis.com/b', ...b },
      { subscription_id: 3, emp_id: 5, endpoint: 'https://fcm.googleapis.com/c', ...b },
    ]);
    const status: Record<string, number> = { '/a': 410, '/b': 404, '/c': 503 };
    service.useTransport(async (endpoint) => status[new URL(endpoint).pathname]);
    await service.notify([5], { title: 't', body: 'b', url: '/' });
    expect(deleted).toEqual([[1, 2]]);
  });

  it('never calls an address that is not a browser push service', async () => {
    enable();
    const b = browser();
    const { service, deleted } = setup([{ subscription_id: 9, emp_id: 5, endpoint: 'https://internal.example.com/hook', ...b }]);
    const transport = jest.fn();
    service.useTransport(transport);
    await service.notify([5], { title: 't', body: 'b', url: '/' });
    expect(transport).not.toHaveBeenCalled();
    expect(deleted).toEqual([[9]]);
  });

  it('never throws when the database or the network fails', async () => {
    enable();
    const { service, prisma } = setup([]);
    prisma.$queryRaw.mockRejectedValue(new Error('db down'));
    await expect(service.notify([5], { title: 't', body: 'b', url: '/' })).resolves.toBeUndefined();

    const b = browser();
    const s2 = setup([{ subscription_id: 1, emp_id: 5, endpoint: 'https://fcm.googleapis.com/a', ...b }]);
    s2.service.useTransport(async () => {
      throw new Error('timeout');
    });
    await expect(s2.service.notify([5], { title: 't', body: 'b', url: '/' })).resolves.toBeUndefined();
    expect(s2.deleted).toEqual([]);
  });
});
