import { Module } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { TEMPLATE_TOKENS } from './application/ports/tokens';
import { DocumentComposer } from './application/services/document-composer';
import { DocumentDataRegistry } from './application/services/document-data.registry';
import { BundledImages } from './application/services/bundled-images';
import { FileBundledAssets } from './infrastructure/bundled-assets';
import { PreviewDocumentUseCase } from './application/use-cases/preview-document.use-case';
import { RenderDocumentUseCase } from './application/use-cases/render-document.use-case';
import { TemplateAssetUseCases } from './application/use-cases/template-assets.use-cases';
import { TemplateEditorUseCases } from './application/use-cases/template-editor.use-cases';
import { MustacheTemplateEngine } from './infrastructure/engines/mustache.engine';
import { SharpImageOptimizer } from './infrastructure/images/sharp-image.optimizer';
import { PrismaTemplateAssetStore } from './infrastructure/persistence/prisma-template-asset.store';
import { PrismaTemplateRepository } from './infrastructure/persistence/prisma-template.repository';
import { PublicAssetUrl } from './infrastructure/public-asset-url';
import { CodeTemplateSources } from './infrastructure/sources/template-sources';
import { DocumentTemplatesController } from './presentation/controllers/document-templates.controller';
import { TemplateAssetsController } from './presentation/controllers/template-assets.controller';
import { TemplateAdminGuard } from './presentation/guards/template-admin.guard';

/**
 * Template Management: editable document layouts (Salary Slip first), test documents, approval,
 * and rendering for the modules that own the data. Other modules use only ./public-api.
 */
@Module({
  imports: [PrismaModule, AuthModule],
  controllers: [DocumentTemplatesController, TemplateAssetsController],
  providers: [
    { provide: TEMPLATE_TOKENS.Repository, useClass: PrismaTemplateRepository },
    { provide: TEMPLATE_TOKENS.Engine, useClass: MustacheTemplateEngine },
    { provide: TEMPLATE_TOKENS.Sources, useClass: CodeTemplateSources },
    { provide: TEMPLATE_TOKENS.Assets, useClass: PrismaTemplateAssetStore },
    { provide: TEMPLATE_TOKENS.ImageOptimizer, useClass: SharpImageOptimizer },
    { provide: TEMPLATE_TOKENS.AssetUrls, useClass: PublicAssetUrl },
    { provide: TEMPLATE_TOKENS.BundledAssets, useClass: FileBundledAssets },
    BundledImages,
    DocumentComposer,
    DocumentDataRegistry,
    TemplateEditorUseCases,
    PreviewDocumentUseCase,
    RenderDocumentUseCase,
    TemplateAssetUseCases,
    TemplateAdminGuard,
  ],
  exports: [RenderDocumentUseCase, DocumentDataRegistry],
})
export class DocumentTemplatesModule {}
