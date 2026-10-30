import {
  Controller,
  Get,
  Post,
  Patch,
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
import { UpdateCandidateStageUseCase } from '../../application/use-cases/update-candidate-stage.use-case';
import { MarkCandidateDecisionUseCase } from '../../application/use-cases/mark-candidate-decision.use-case';
import { GetNextEmployeeCodeUseCase } from '../../application/use-cases/get-next-employee-code.use-case';
import { ConvertCandidateToEmployeeUseCase } from '../../application/use-cases/convert-candidate-to-employee.use-case';
import {
  CreateCandidateDto,
  CheckDuplicateCandidateDto,
  CandidateListResponseDto,
  DuplicateMatchDto,
  UpdateCandidateStageDto,
  MarkCandidateDecisionDto,
  CandidateItemDto,
  ConvertCandidateToEmployeeDto,
  NextEmpCodeResponseDto,
  ConvertToEmployeeResponseDto,
} from '../dto/candidate.dto';

function toCandidateItemDto(c: any): CandidateItemDto {
  if (!c) return c;
  return {
    candidate_id: c.candidateId ?? c.candidate_id,
    candidate_code: c.candidateCode ?? c.candidate_code,
    name: c.name,
    phone: c.phone,
    email: c.email,
    gender_id: c.genderId ?? c.gender_id ?? null,
    current_location: c.currentLocation ?? c.current_location ?? null,
    resume_url: c.resumeUrl ?? c.resume_url ?? null,
    resume_filename: c.resumeFilename ?? c.resume_filename ?? null,
    role_id: c.roleId ?? c.role_id,
    role_name: c.roleName ?? c.role_name,
    dep_id: c.depId ?? c.dep_id,
    department_name: c.departmentName ?? c.department_name,
    experience_type: c.experienceType ?? c.experience_type,
    exp_years: c.expYears ?? c.exp_years ?? 0,
    exp_months: c.expMonths ?? c.exp_months ?? 0,
    current_company: c.currentCompany ?? c.current_company ?? null,
    current_designation: c.currentDesignation ?? c.current_designation ?? null,
    current_ctc:
      c.currentCtc !== undefined && c.currentCtc !== null
        ? Number(c.currentCtc)
        : c.current_ctc !== undefined && c.current_ctc !== null
        ? Number(c.current_ctc)
        : null,
    expected_ctc:
      c.expectedCtc !== undefined && c.expectedCtc !== null
        ? Number(c.expectedCtc)
        : c.expected_ctc !== undefined && c.expected_ctc !== null
        ? Number(c.expected_ctc)
        : null,
    notice_period: c.noticePeriod ?? c.notice_period ?? null,
    serving_notice_lwd: c.servingNoticeLwd
      ? c.servingNoticeLwd instanceof Date
        ? c.servingNoticeLwd.toISOString()
        : String(c.servingNoticeLwd)
      : c.serving_notice_lwd
      ? String(c.serving_notice_lwd)
      : null,
    key_skills: Array.isArray(c.keySkills) ? c.keySkills : Array.isArray(c.key_skills) ? c.key_skills : [],
    source: c.source,
    source_portal: c.sourcePortal ?? c.source_portal ?? null,
    referred_by_emp_id: c.referredByEmpId ?? c.referred_by_emp_id ?? null,
    referred_by_name: c.referredByName ?? c.referred_by_name ?? null,
    consultancy_name: c.consultancyName ?? c.consultancy_name ?? null,
    college_name: c.collegeName ?? c.college_name ?? null,
    source_details: c.sourceDetails ?? c.source_details ?? null,
    notes: c.notes ?? null,
    stage: c.stage,
    converted_to_emp_id: c.convertedToEmpId ?? c.converted_to_emp_id ?? null,
    converted_to_emp_code:
      c.convertedToEmpCode ??
      c.converted_to_emp_code ??
      (c.convertedToEmpId || c.converted_to_emp_id
        ? `EMP-${String(c.convertedToEmpId || c.converted_to_emp_id).padStart(4, '0')}`
        : null),
    rejection_reason: c.rejectionReason ?? c.rejection_reason ?? null,
    rejection_notes: c.rejectionNotes ?? c.rejection_notes ?? null,
    final_role_id: c.finalRoleId ?? c.final_role_id ?? null,
    final_role_name: c.finalRoleName ?? c.final_role_name ?? null,
    final_dep_id: c.finalDepId ?? c.final_dep_id ?? null,
    final_department_name: c.finalDepartmentName ?? c.final_department_name ?? null,
    offered_ctc:
      c.offeredCtc !== undefined && c.offeredCtc !== null
        ? Number(c.offeredCtc)
        : c.offered_ctc !== undefined && c.offered_ctc !== null
        ? Number(c.offered_ctc)
        : null,
    expected_joining_date: c.expectedJoiningDate
      ? c.expectedJoiningDate instanceof Date
        ? c.expectedJoiningDate.toISOString()
        : String(c.expectedJoiningDate)
      : c.expected_joining_date
      ? String(c.expected_joining_date)
      : null,
    reporting_manager_id: c.reportingManagerId ?? c.reporting_manager_id ?? null,
    reporting_manager_name: c.reportingManagerName ?? c.reporting_manager_name ?? null,
    employment_type: c.employmentType ?? c.employment_type ?? null,
    decision_notes: c.decisionNotes ?? c.decision_notes ?? null,
    on_hold_review_date: c.onHoldReviewDate
      ? c.onHoldReviewDate instanceof Date
        ? c.onHoldReviewDate.toISOString()
        : String(c.onHoldReviewDate)
      : c.on_hold_review_date
      ? String(c.on_hold_review_date)
      : null,
    on_hold_notes: c.onHoldNotes ?? c.on_hold_notes ?? null,
    send_regret_email: Boolean(c.sendRegretEmail ?? c.send_regret_email),
    decision_date: c.decisionDate
      ? c.decisionDate instanceof Date
        ? c.decisionDate.toISOString()
        : String(c.decisionDate)
      : c.decision_date
      ? String(c.decision_date)
      : null,
    decision_by: c.decisionBy ?? c.decision_by ?? null,
    decision_by_name: c.decisionByName ?? c.decision_by_name ?? null,
    created_at: c.createdAt
      ? c.createdAt instanceof Date
        ? c.createdAt.toISOString()
        : String(c.createdAt)
      : c.created_at
      ? String(c.created_at)
      : new Date().toISOString(),
  };
}

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
    private readonly updateCandidateStageUseCase: UpdateCandidateStageUseCase,
    private readonly markCandidateDecisionUseCase: MarkCandidateDecisionUseCase,
    private readonly getNextEmployeeCodeUseCase: GetNextEmployeeCodeUseCase,
    private readonly convertCandidateToEmployeeUseCase: ConvertCandidateToEmployeeUseCase,
  ) {}

  @Get('next-code')
  @ApiOperation({ summary: 'Get preview next candidate code (e.g. CAN-0001)' })
  async getNextCode(): Promise<{ candidate_code: string }> {
    return this.getNextCandidateCodeUseCase.execute();
  }

  @Get('next-emp-code')
  @ApiOperation({ summary: 'Get preview next employee code (e.g. EMP-0015)' })
  @ApiResponse({ status: 200, type: NextEmpCodeResponseDto })
  async getNextEmpCode(): Promise<NextEmpCodeResponseDto> {
    return this.getNextEmployeeCodeUseCase.execute();
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
  @ApiResponse({ status: 200, type: CandidateItemDto })
  async getCandidate(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<CandidateItemDto> {
    const candidate = await this.getCandidateDetailUseCase.execute(id);
    return toCandidateItemDto(candidate);
  }

  @Patch(':id/stage')
  @ApiOperation({ summary: 'Update candidate pipeline stage directly' })
  @ApiResponse({ status: 200, type: CandidateItemDto })
  async updateStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCandidateStageDto,
    @Req() req: any,
  ): Promise<CandidateItemDto> {
    const adminId = req.user?.emp_id || 1;
    const res = await this.updateCandidateStageUseCase.execute(id, dto.stage, adminId);
    return toCandidateItemDto(res);
  }

  @Post(':id/decision')
  @ApiOperation({ summary: 'Mark hiring decision (Selected, On Hold, Rejected)' })
  @ApiResponse({ status: 200, type: CandidateItemDto })
  async markDecision(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: MarkCandidateDecisionDto,
    @Req() req: any,
  ): Promise<CandidateItemDto> {
    const adminId = req.user?.emp_id || 1;
    const res = await this.markCandidateDecisionUseCase.execute(id, dto, adminId);
    return toCandidateItemDto(res);
  }

  @Post(':id/convert-to-employee')
  @ApiOperation({ summary: 'Convert candidate to employee in onboarding stage' })
  @ApiResponse({ status: 201, type: ConvertToEmployeeResponseDto })
  async convertToEmployee(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ConvertCandidateToEmployeeDto,
    @Req() req: any,
  ): Promise<any> {
    const adminId = req.user?.emp_id || 1;
    const res = await this.convertCandidateToEmployeeUseCase.execute(id, dto.office_email, adminId);
    return {
      employee: res.employee,
      candidate: toCandidateItemDto(res.candidate),
    };
  }
}


