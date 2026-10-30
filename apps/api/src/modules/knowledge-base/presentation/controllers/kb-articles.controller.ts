import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { KbArticlesService } from '../../application/services/kb-articles.service';
import {
  ArchiveKbArticleDto,
  CreateKbArticleDto,
  DirectPublishKbArticleDto,
  KbFeedbackDto,
  QueryKbArticlesDto,
  ReviewKbArticleDto,
  SubmitKbArticleDto,
  UpdateKbArticleDraftDto,
} from '../dto/kb-articles.dto';

@Controller('kb')
@UseGuards(JwtAuthGuard)
export class KbArticlesController {
  constructor(private readonly articlesService: KbArticlesService) {}

  @Get('kpis')
  async getKpis(@Req() req: any) {
    return this.articlesService.getKpiStats(req.user);
  }

  @Get('approvals')
  async getApprovals(@Req() req: any) {
    return this.articlesService.listPendingApprovals(req.user);
  }

  @Get('articles')
  async listArticles(@Query() query: QueryKbArticlesDto, @Req() req: any) {
    return this.articlesService.listArticles(query, req.user);
  }

  @Post('articles')
  async createArticle(@Body() dto: CreateKbArticleDto, @Req() req: any) {
    return this.articlesService.createArticle(dto, req.user);
  }

  @Get('articles/:identifier')
  async getArticle(@Param('identifier') identifier: string, @Req() req: any) {
    return this.articlesService.getArticleByIdOrCode(identifier, req.user);
  }

  @Put('articles/:id/draft')
  async updateDraft(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateKbArticleDraftDto,
    @Req() req: any,
  ) {
    return this.articlesService.updateArticleDraft(id, dto, req.user);
  }

  @Post('articles/:id/submit')
  async submitForApproval(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitKbArticleDto,
    @Req() req: any,
  ) {
    return this.articlesService.submitForApproval(id, dto, req.user);
  }

  @Post('articles/:id/withdraw')
  async withdrawSubmission(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.articlesService.withdrawSubmission(id, req.user);
  }

  @Post('articles/:id/versions/:versionId/review')
  async reviewVersion(
    @Param('id', ParseIntPipe) id: number,
    @Param('versionId', ParseIntPipe) versionId: number,
    @Body() dto: ReviewKbArticleDto,
    @Req() req: any,
  ) {
    return this.articlesService.reviewVersion(id, versionId, dto, req.user);
  }

  @Post('articles/:id/publish-direct')
  async directPublish(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: DirectPublishKbArticleDto,
    @Req() req: any,
  ) {
    return this.articlesService.directPublish(id, dto, req.user);
  }

  @Post('articles/:id/acknowledge')
  async acknowledgeArticle(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.articlesService.acknowledgeArticle(id, req.user);
  }

  @Post('articles/:id/feedback')
  async submitFeedback(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: KbFeedbackDto,
    @Req() req: any,
  ) {
    return this.articlesService.submitFeedback(id, dto, req.user);
  }

  @Post('articles/:id/archive')
  async archiveArticle(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ArchiveKbArticleDto,
    @Req() req: any,
  ) {
    return this.articlesService.archiveArticle(id, dto, req.user);
  }

  @Post('articles/:id/restore')
  async restoreArticle(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.articlesService.restoreArticle(id, req.user);
  }

  @Get('articles/:id/versions')
  async getVersions(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.getVersionHistory(id);
  }

  @Post('articles/:id/view')
  async recordView(@Param('id', ParseIntPipe) id: number) {
    return this.articlesService.incrementView(id);
  }
}
