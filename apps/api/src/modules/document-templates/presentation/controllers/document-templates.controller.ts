import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/public-api';
import { TemplateEditorUseCases } from '../../application/use-cases/template-editor.use-cases';
import { PreviewDocumentUseCase } from '../../application/use-cases/preview-document.use-case';
import { TemplateAdminGuard } from '../guards/template-admin.guard';
import { PreviewTemplateDto, SaveTemplateDraftDto } from '../dto/document-template.dto';

const actor = (req: any) => Number(req.user?.emp_id);

/** Template Management (Admin): edit the layout of a document kind, test it, approve it. */
@ApiTags('Document Templates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, TemplateAdminGuard)
@Controller('document-templates')
export class DocumentTemplatesController {
  constructor(
    private readonly editor: TemplateEditorUseCases,
    private readonly preview: PreviewDocumentUseCase,
  ) {}

  @Get(':kind')
  @ApiOperation({ summary: 'Editor state: catalog, current layout, draft and approved versions' })
  state(@Param('kind') kind: string) {
    return this.editor.state(kind);
  }

  @Put(':kind/draft')
  @ApiOperation({ summary: 'Save the draft (creates the next version when the last one is approved)' })
  saveDraft(@Req() req: any, @Param('kind') kind: string, @Body() dto: SaveTemplateDraftDto) {
    return this.editor.saveDraft(kind, dto.layout, actor(req));
  }

  @Delete(':kind/draft')
  @ApiOperation({ summary: 'Throw the draft away' })
  discardDraft(@Param('kind') kind: string) {
    return this.editor.discardDraft(kind);
  }

  @Post(':kind/approve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Approve the draft: real documents use it from now on' })
  approve(@Req() req: any, @Param('kind') kind: string) {
    return this.editor.approve(kind, actor(req));
  }

  @Post(':kind/preview')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Test document (nothing is saved, numbered or sent)' })
  previewDocument(@Param('kind') kind: string, @Body() dto: PreviewTemplateDto) {
    return this.preview.execute(kind, { layout: dto.layout, subject: dto.subject ?? null });
  }
}
