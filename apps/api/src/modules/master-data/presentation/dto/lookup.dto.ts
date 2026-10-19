import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class LookupOptionsQueryDto {
  @ApiProperty({ type: String, description: 'Lookup type: person_department, lead_source, lost_reason, task_type', example: 'task_type' })
  @IsString()
  @IsNotEmpty()
  type!: string;
}

export class LookupOptionDto {
  @ApiProperty({ type: Number, example: 1 })
  id!: number;

  @ApiProperty({ type: String, example: 'engineering' })
  code!: string;

  @ApiProperty({ type: String, example: 'Engineering' })
  label!: string;
}
