export interface ProcessedImage {
  buffer: Buffer;
  contentType: 'image/webp';
  width: number;
  height: number;
}

export interface ImageProcessorPort {
  processProfilePhoto(buffer: Buffer): Promise<ProcessedImage>;
}
