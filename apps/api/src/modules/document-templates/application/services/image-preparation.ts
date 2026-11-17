import { ImageOptimizerPort, TemplateImageKind } from '../ports/template-asset.port';

/** How each kind of template image is prepared before it is stored (one place for uploads and defaults). */
export function prepareImage(optimizer: ImageOptimizerPort, kind: TemplateImageKind, data: Buffer): Promise<{ data: Buffer; contentType: string }> {
  switch (kind) {
    case 'letterhead':
      return optimizer.optimizePageBackground(data);
    case 'signature':
      return optimizer.optimizeSignature(data);
    case 'logo':
      return optimizer.optimizeLogo(data);
    case 'photo':
      return optimizer.optimizePhoto(data);
  }
}

export const TEMPLATE_IMAGE_KINDS: ReadonlyArray<TemplateImageKind> = ['letterhead', 'signature', 'logo', 'photo'];
