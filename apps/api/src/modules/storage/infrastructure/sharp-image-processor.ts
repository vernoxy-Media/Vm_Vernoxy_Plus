import { Injectable } from '@nestjs/common';
import sharp from 'sharp';
import {
  ImageProcessorPort,
  ProcessedImage,
} from '../application/ports/image-processor.port';

@Injectable()
export class SharpImageProcessor implements ImageProcessorPort {
  private static readonly MAX_PIXELS = 40_000_000; // 40 megapixels protection against decompression bombs

  async processProfilePhoto(inputBuffer: Buffer): Promise<ProcessedImage> {
    try {
      const image = sharp(inputBuffer, {
        limitInputPixels: SharpImageProcessor.MAX_PIXELS,
        failOn: 'error',
      });

      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        throw new Error('Unable to read image dimensions');
      }

      // Re-encode pipeline:
      // 1. auto-rotate by EXIF
      // 2. resize center-crop square to 512x512
      // 3. strip ALL metadata (default sharp behavior when withMetadata() is not called)
      // 4. convert to WebP at quality 85
      const processedBuffer = await image
        .rotate()
        .resize(512, 512, {
          fit: 'cover',
          position: 'center',
        })
        .webp({ quality: 85 })
        .toBuffer();

      return {
        buffer: processedBuffer,
        contentType: 'image/webp',
        width: 512,
        height: 512,
      };
    } catch (err: any) {
      throw new Error(`Image processing failed: ${err.message}`);
    }
  }
}
