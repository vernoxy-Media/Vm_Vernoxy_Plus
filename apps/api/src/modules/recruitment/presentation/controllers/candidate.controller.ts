import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  Req,
  Res,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import * as crypto from 'crypto';
import { JwtAuthGuard } from '../../../auth/public-api';
import { CreateCandidateUseCase } from '../../application/use-cases/create-candidate.use-case';
import { ListCandidatesUseCase } from '../../application/use-cases/list-candidates.use-case';
import { GetCandidateDetailUseCase } from '../../application/use-cases/get-candidate-detail.use-case';
import { CheckDuplicateCandidateUseCase } from '../../application/use-cases/check-duplicate-candidate.use-case';
import { GetNextCandidateCodeUseCase } from '../../application/use-cases/get-next-candidate-code.use-case';
import {
  CreateCandidateDto,
  CheckDuplicateCandidateDto,
  CandidateListResponseDto,
  DuplicateMatchDto,
} from '../dto/candidate.dto';

@ApiTags('Recruitment Candidates')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('candidates')
export class CandidateController {
  constructor(
    private readonly createCandidateUseCase: CreateCandidateUseCase,
    private readonly listCandidatesUseCase: ListCandidatesUseCase,
    private readonly getCandidateDetailUseCase: GetCandidateDetailUseCase,
    private readonly checkDuplicateUseCase: CheckDuplicateCandidateUseCase,
    private readonly getNextCandidateCodeUseCase: GetNextCandidateCodeUseCase,
  ) {}

  @Get('next-code')
  @ApiOperation({ summary: 'Get preview next candidate code (e.g. CAN-0001)' })
  async getNextCode(): Promise<{ candidate_code: string }> {
    return this.getNextCandidateCodeUseCase.execute();
  }

  @Post('check-duplicate')
  @ApiOperation({ summary: 'Check if phone or email matches existing candidate or employee' })
  @ApiResponse({ status: 200, type: [DuplicateMatchDto] })
  async checkDuplicate(
    @Body() dto: CheckDuplicateCandidateDto,
  ): Promise<DuplicateMatchDto[]> {
    return this.checkDuplicateUseCase.execute(dto.phone, dto.email);
  }

  @Post('upload-resume')
  @ApiOperation({ summary: 'Upload single candidate resume (PDF, DOC, DOCX up to 5 MB)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
      required: ['file'],
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
    }),
  )
  async uploadResume(@UploadedFile() file: Express.Multer.File): Promise<{
    resume_url: string;
    resume_filename: string;
    resume_size: number;
    resume_mime: string;
  }> {
    if (!file) {
      throw new BadRequestException('File is required for upload.');
    }

    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/octet-stream',
    ];
    const allowedExts = ['pdf', 'doc', 'docx'];
    const ext = file.originalname.includes('.')
      ? file.originalname.split('.').pop()!.toLowerCase().replace(/[^a-z0-9]/g, '')
      : '';

    if (!allowedExts.includes(ext) && !allowedMimes.includes(file.mimetype)) {
      throw new BadRequestException('Only PDF, DOC, and DOCX files are allowed.');
    }

    const storageDir = this.getStorageDir();
    if (!fs.existsSync(storageDir)) {
      await fs.promises.mkdir(storageDir, { recursive: true });
    }

    const diskFileName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}.${ext || 'pdf'}`;
    const absPath = path.resolve(storageDir, diskFileName);
    await fs.promises.writeFile(absPath, file.buffer);

    return {
      resume_url: `/api/v1/candidates/resumes/${diskFileName}`,
      resume_filename: file.originalname,
      resume_size: file.size,
      resume_mime: file.mimetype,
    };
  }

  @Get('resumes/:filename')
  @ApiOperation({ summary: 'Download or view candidate resume' })
  async downloadResume(
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    const cleanFilename = path.basename(filename);
    const storageDir = this.getStorageDir();
    const filePath = path.resolve(storageDir, cleanFilename);

    if (!fs.existsSync(filePath)) {
      res.status(HttpStatus.NOT_FOUND).json({ message: 'Resume file not found' });
      return;
    }

    res.sendFile(filePath);
  }

  private getStorageDir(): string {
    const candidates = [
      path.resolve(process.cwd(), 'storage', 'candidate-resumes'),
      path.resolve(process.cwd(), '..', '..', 'storage', 'candidate-resumes'),
      path.resolve(__dirname, '../../../../../../..', 'storage', 'candidate-resumes'),
    ];
    for (const c of candidates) {
      if (fs.existsSync(path.dirname(c))) {
        return c;
      }
    }
    return candidates[0];
  }

  @Get()
  @ApiOperation({ summary: 'List candidates with KPI stats and filters' })
  @ApiResponse({ status: 200, type: CandidateListResponseDto })
  async listCandidates(
    @Query('q') q?: string,
    @Query('roleId') roleId?: string,
    @Query('depId') depId?: string,
    @Query('source') source?: string,
    @Query('stage') stage?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<CandidateListResponseDto> {
    return this.listCandidatesUseCase.execute({
      q,
      roleId: roleId ? parseInt(roleId, 10) : undefined,
      depId: depId ? parseInt(depId, 10) : undefined,
      source,
      stage,
      limit: limit ? parseInt(limit, 10) : 10,
      offset: offset ? parseInt(offset, 10) : 0,
    });
  }

  @Post()
  @ApiOperation({ summary: 'Add a new candidate' })
  async createCandidate(
    @Body() dto: CreateCandidateDto,
    @Req() req: any,
  ): Promise<any> {
    const adminId = req.user?.emp_id || 1;
    return this.createCandidateUseCase.execute(dto, adminId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get candidate details by ID' })
  async getCandidate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<any> {
    return this.getCandidateDetailUseCase.execute(id);
  }
}
