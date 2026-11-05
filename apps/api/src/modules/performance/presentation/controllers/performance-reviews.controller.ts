import { Body, Controller, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { PerformanceReviewsService } from '../../application/services/performance-reviews.service';
import {
  ReopenReviewDto,
  SubmitBulkProjectRatingsDto,
  SubmitReviewRatingsDto,
  SummaryQueryDto,
  TeamReviewsQueryDto,
} from '../dto/performance.dto';

/** Reviews are role-scoped inside the service (employee / Reporting Manager / Admin / Project Manager). */
@ApiTags('Performance - Reviews & Ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('performance')
export class PerformanceReviewsController {
  constructor(private readonly reviewsService: PerformanceReviewsService) {}

  @Get('reviews/my')
  @ApiOperation({ summary: 'Self Review for the open (or chosen) cycle — Screen 5' })
  getMyReview(@Query('cycle_id') cycleId: string, @Req() req: any) {
    return this.reviewsService.getMyReviewDetail(req.user, cycleId ? Number(cycleId) : undefined);
  }

  @Get('reviews/my-list')
  getMyReviewsList(@Req() req: any) {
    return this.reviewsService.getMyReviews(req.user);
  }

  @Get(['reviews/team', 'reviews'])
  @ApiOperation({ summary: 'Team Review — Reporting Manager (own team) or Admin (all employees) — Screen 6' })
  getTeamReviews(@Query() query: TeamReviewsQueryDto, @Req() req: any) {
    return this.reviewsService.getTeamReviews(req.user, query);
  }

  @Get('reviews/summary')
  @ApiOperation({ summary: 'Rating Summary (Admin) — Screen 7' })
  getSummary(@Query() query: SummaryQueryDto, @Req() req: any) {
    return this.reviewsService.getAdminReviewsSummary(req.user, query);
  }

  @Get('reviews/:id')
  getReviewById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reviewsService.getReviewById(id, req.user);
  }

  @Post(['reviews/:id/self', 'reviews/:id/self-review'])
  submitSelfReview(@Param('id', ParseIntPipe) id: number, @Body() dto: SubmitReviewRatingsDto, @Req() req: any) {
    return this.reviewsService.submitSelfReview(id, dto, req.user);
  }

  @Post(['reviews/:id/manager', 'reviews/:id/manager-review'])
  submitManagerReview(@Param('id', ParseIntPipe) id: number, @Body() dto: SubmitReviewRatingsDto, @Req() req: any) {
    return this.reviewsService.submitManagerReview(id, dto, req.user);
  }

  @Post(['reviews/:id/admin', 'reviews/:id/admin-review'])
  submitAdminReview(@Param('id', ParseIntPipe) id: number, @Body() dto: SubmitReviewRatingsDto, @Req() req: any) {
    return this.reviewsService.submitAdminReview(id, dto, req.user);
  }

  @Post('reviews/:id/reopen')
  @ApiOperation({ summary: 'Admin opens one review (Self, Manager or Admin) again for one person' })
  reopenReview(@Param('id', ParseIntPipe) id: number, @Body() dto: ReopenReviewDto, @Req() req: any) {
    return this.reviewsService.reopenReview(id, dto, req.user);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Projects led by the current Project Manager — Screen 8' })
  getMyProjects(@Req() req: any) {
    return this.reviewsService.getMyProjects(req.user);
  }

  @Get('projects/:projectId/members')
  getProjectMembers(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('cycle_id', ParseIntPipe) cycleId: number,
    @Req() req: any,
  ) {
    return this.reviewsService.getProjectMembersForRating(projectId, cycleId, req.user);
  }

  @Post('projects/ratings')
  @ApiOperation({ summary: 'Save Draft or Submit project ratings' })
  submitBulkProjectRatings(@Body() dto: SubmitBulkProjectRatingsDto, @Req() req: any) {
    return this.reviewsService.submitBulkProjectRatings(dto, req.user);
  }
}
