import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../auth/presentation/guards/jwt-auth.guard';
import { PerformanceReviewsService } from '../../application/services/performance-reviews.service';
import {
  ReopenReviewDto,
  SubmitBulkProjectRatingsDto,
  SubmitProjectRatingDto,
  SubmitReviewRatingsDto,
} from '../dto/performance.dto';

@ApiTags('Performance - Reviews & Ratings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('performance')
export class PerformanceReviewsController {
  constructor(private readonly reviewsService: PerformanceReviewsService) {}

  @Get('reviews/my')
  @ApiOperation({ summary: 'Get current employee self-review for active or specified cycle' })
  async getMyReviews(@Query('cycle_id') cycleId: string, @Req() req: any) {
    return this.reviewsService.getMyReviewDetail(req.user, cycleId ? Number(cycleId) : undefined);
  }

  @Get('reviews/my-list')
  @ApiOperation({ summary: 'Get all self-reviews across cycles' })
  async getMyReviewsList(@Req() req: any) {
    return this.reviewsService.getMyReviews(req.user);
  }

  @Get(['reviews', 'reviews/team'])
  @ApiOperation({ summary: 'Get team members reviews for Reporting Manager / Admin' })
  async getTeamReviews(@Query('cycle_id') cycleId: string, @Req() req: any) {
    return this.reviewsService.getTeamReviews(
      req.user,
      cycleId ? Number(cycleId) : undefined,
    );
  }

  @Get('reviews/summary')
  @ApiOperation({ summary: 'Get Rating Summary for Admin (Screen 7)' })
  async getAdminReviewsSummary(
    @Query('cycle_id') cycleId: string,
    @Query('department_id') departmentId: string,
    @Req() req: any,
  ) {
    return this.reviewsService.getAdminReviewsSummary(
      req.user,
      cycleId ? Number(cycleId) : undefined,
      departmentId ? Number(departmentId) : undefined,
    );
  }

  @Get('reviews/init/:cycleId/:empId')
  @ApiOperation({ summary: 'Get or initialize review record for employee in cycle' })
  async getOrCreateReview(
    @Param('cycleId', ParseIntPipe) cycleId: number,
    @Param('empId', ParseIntPipe) empId: number,
  ) {
    return this.reviewsService.getOrCreateReview(cycleId, empId);
  }

  @Get('reviews/:id')
  @ApiOperation({ summary: 'Get single review detail' })
  async getReviewById(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    return this.reviewsService.getReviewById(id, req.user);
  }

  @Post(['reviews/:id/self', 'reviews/:id/self-review'])
  @ApiOperation({ summary: 'Submit Self Review ratings and comment' })
  async submitSelfReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitReviewRatingsDto,
    @Req() req: any,
  ) {
    return this.reviewsService.submitSelfReview(id, dto, req.user);
  }

  @Post(['reviews/:id/manager', 'reviews/:id/manager-review'])
  @ApiOperation({ summary: 'Submit Reporting Manager review ratings' })
  async submitManagerReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitReviewRatingsDto,
    @Req() req: any,
  ) {
    return this.reviewsService.submitManagerReview(id, dto, req.user);
  }

  @Post(['reviews/:id/admin', 'reviews/:id/admin-rating'])
  @ApiOperation({ summary: 'Submit Admin review ratings' })
  async submitAdminReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitReviewRatingsDto,
    @Req() req: any,
  ) {
    return this.reviewsService.submitAdminReview(id, dto, req.user);
  }

  @Post('reviews/:id/reopen')
  @ApiOperation({ summary: 'Admin unlocks/reopens review for employee' })
  async reopenReview(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReopenReviewDto,
    @Req() req: any,
  ) {
    return this.reviewsService.reopenReview(id, dto, req.user);
  }

  @Get('project-ratings')
  @ApiOperation({ summary: 'List project member ratings (Screen 8)' })
  async listProjectRatings(
    @Query('cycle_id') cycleId: string,
    @Query('project_id') projectId: string,
    @Req() req: any,
  ) {
    return this.reviewsService.listProjectRatings(
      Number(cycleId) || 0,
      projectId ? Number(projectId) : undefined,
      req.user,
    );
  }

  @Post('project-ratings')
  @ApiOperation({ summary: 'Project Manager submits member rating (1-5 stars)' })
  async submitProjectRating(
    @Body() dto: SubmitProjectRatingDto,
    @Req() req: any,
  ) {
    return this.reviewsService.submitProjectRating(dto, req.user);
  }

  @Get('projects')
  @ApiOperation({ summary: 'Get projects for Project Rating (Screen 8)' })
  async getMyProjects(@Req() req: any) {
    return this.reviewsService.getMyProjects(req.user);
  }

  @Get('projects/:projectId/members')
  @ApiOperation({ summary: 'Get project members for Project Rating (Screen 8)' })
  async getProjectMembers(
    @Param('projectId', ParseIntPipe) projectId: number,
    @Query('cycle_id', ParseIntPipe) cycleId: number,
    @Req() req: any,
  ) {
    return this.reviewsService.getProjectMembersForRating(projectId, cycleId, req.user);
  }

  @Post('projects/ratings')
  @ApiOperation({ summary: 'Submit bulk project member ratings (Screen 8)' })
  async submitBulkProjectRatings(
    @Body() dto: SubmitBulkProjectRatingsDto,
    @Req() req: any,
  ) {
    return this.reviewsService.submitBulkProjectRatings(dto, req.user);
  }
}

