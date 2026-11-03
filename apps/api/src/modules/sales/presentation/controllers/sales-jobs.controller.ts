import { Controller, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import { CronSecretGuard } from '../guards/cron-secret.guard';
import { FollowUpJobs } from '../../application/use-cases/follow-up-jobs.use-case';

/** Called by a scheduler every minute or so. Safe to call often and from several servers at once. */
@ApiExcludeController()
@UseGuards(CronSecretGuard)
@Controller('sales/jobs')
export class SalesJobsController {
  constructor(private readonly jobs: FollowUpJobs) {}

  /** GET because Vercel Cron issues GET requests. */
  @Get('follow-ups')
  runGet() {
    return this.jobs.run();
  }

  @Post('follow-ups')
  @HttpCode(HttpStatus.OK)
  runPost() {
    return this.jobs.run();
  }
}
