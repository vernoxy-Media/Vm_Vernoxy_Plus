import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AttachmentsController } from './attachments.controller';
import { AttachmentFileStore } from '../../application/services/attachment-file-store';
import { AttachmentsService } from '../../application/services/attachments.service';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';

describe('AttachmentsController routes', () => {
  let app: INestApplication;
  let dir: string;
  const service = {
    getAttachmentById: jest.fn(),
    getAttachments: jest.fn().mockResolvedValue([]),
  };

  beforeAll(async () => {
    dir = fs.mkdtempSync(path.join(os.tmpdir(), 'storage-'));
    process.env.STORAGE_ROOT = dir;
    fs.mkdirSync(path.join(dir, 'attachments', 'PROJECT_DISCUSSION', '10'), { recursive: true });
    fs.writeFileSync(path.join(dir, 'attachments', 'PROJECT_DISCUSSION', '10', '1_image.png'), Buffer.from('PNGDATA'));

    const mod = await Test.createTestingModule({
      controllers: [AttachmentsController],
      providers: [{ provide: AttachmentsService, useValue: service }, AttachmentFileStore],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: () => true })
      .compile();
    app = mod.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
    delete process.env.STORAGE_ROOT;
    fs.rmSync(dir, { recursive: true, force: true });
  });

  it('serves /attachments/:id/download as the file, not as an "entity type / entity id" lookup', async () => {
    service.getAttachmentById.mockResolvedValue({
      file_url: '/files/attachments/PROJECT_DISCUSSION/10/1_image.png',
      mime_type: 'image/png',
      file_name: 'image.png',
    });
    const res = await request(app.getHttpServer()).get('/attachments/2/download');
    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('image/png');
    expect(res.body.toString()).toBe('PNGDATA');
    expect(service.getAttachments).not.toHaveBeenCalled();
  });

  it('answers 404 when the file is no longer on disk', async () => {
    service.getAttachmentById.mockResolvedValue({
      file_url: '/files/attachments/PROJECT_DISCUSSION/10/gone.png',
      mime_type: 'image/png',
      file_name: 'gone.png',
    });
    const res = await request(app.getHttpServer()).get('/attachments/3/download');
    expect(res.status).toBe(404);
  });

  it('never reads outside the storage folder', async () => {
    service.getAttachmentById.mockResolvedValue({
      file_url: '/files/attachments/../../../etc/passwd',
      mime_type: 'text/plain',
      file_name: 'passwd',
    });
    const res = await request(app.getHttpServer()).get('/attachments/4/download');
    expect(res.status).toBe(404);
  });

  it('still lists the attachments of an entity at /attachments/:type/:id', async () => {
    const res = await request(app.getHttpServer()).get('/attachments/PROJECT_DISCUSSION/10');
    expect(res.status).toBe(200);
    expect(service.getAttachments).toHaveBeenCalledWith('PROJECT_DISCUSSION', 10);
  });
});
