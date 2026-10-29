import {
  Controller,
  Get,
  Param,
  Query,
  Res,
  HttpException,
  HttpStatus,
  Inject,
  StreamableFile,
} from '@nestjs/common';
import { ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { STORAGE_TOKENS } from '../../application/ports/tokens';
import { FileStoragePort } from '../../application/ports/file-storage.port';
import { StorageValidator } from '../../domain/storage.validator';

@ApiTags('Files')
@Controller(['files', 'api/v1/files'])
export class FilesController {
  constructor(
    @Inject(STORAGE_TOKENS.FileStoragePort)
    private readonly storage: FileStoragePort,
  ) {}

  @Get('profile-photos/:key')
  @ApiOperation({ summary: 'Public signed profile photo retrieval' })
  @ApiParam({ name: 'key', description: 'Photo storage key (hex32.webp)' })
  @ApiQuery({ name: 'exp', description: 'Unix expiration timestamp' })
  @ApiQuery({ name: 'sig', description: 'HMAC-SHA256 signature' })
  @ApiResponse({ status: 200, description: 'Image stream (image/webp)' })
  @ApiResponse({ status: 403, description: 'Forbidden (invalid, tampered, expired or unknown key)' })
  async getProfilePhoto(
    @Param('key') key: string,
    @Query('exp') expStr: string,
    @Query('sig') sig: string,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    const forbiddenException = new HttpException(
      {
        type: 'about:blank',
        title: 'Forbidden',
        status: HttpStatus.FORBIDDEN,
        detail: 'Access denied',
      },
      HttpStatus.FORBIDDEN,
    );

    if (!StorageValidator.isValidStorageKey(key)) {
      throw forbiddenException;
    }

    const exp = parseInt(expStr, 10);
    if (isNaN(exp)) {
      throw forbiddenException;
    }

    const isValid = this.storage.verifySignedUrl(key, exp, sig);
    if (!isValid) {
      throw forbiddenException;
    }

    const exists = await this.storage.exists(key);
    if (!exists) {
      throw forbiddenException;
    }

    res.set({
      'Content-Type': 'image/webp',
      'X-Content-Type-Options': 'nosniff',
      'Content-Disposition': 'inline',
      'Content-Security-Policy': "default-src 'none'",
      'Cache-Control': 'private, max-age=300',
      'Cross-Origin-Resource-Policy': 'same-site',
    });

    const stream = await this.storage.openReadStream(key);
    return new StreamableFile(stream as any);
  }
}
