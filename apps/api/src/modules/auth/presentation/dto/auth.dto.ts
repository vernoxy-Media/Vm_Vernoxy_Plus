import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsUUID,
  Length,
  MinLength,
} from 'class-validator';

export class LoginDto {
  @ApiProperty({ type: String, example: 'admin@vernoxy.com', description: 'Employee email address' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ type: String, example: 'SecretP@ss123!', description: 'Account password' })
  @IsString()
  @IsNotEmpty()
  password!: string;
}

export class VerifyLoginDto {
  @ApiProperty({ type: String, example: '11111111-1111-1111-1111-111111111111', description: 'Challenge UUID from login endpoint' })
  @IsUUID('4', { message: 'challenge_id must be a valid UUID' })
  @IsNotEmpty()
  challenge_id!: string;

  @ApiProperty({ type: String, example: '123456', description: '6-digit OTP received via email' })
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code!: string;
}

export class ResendOtpDto {
  @ApiProperty({ type: String, example: '11111111-1111-1111-1111-111111111111', description: 'Challenge UUID from login endpoint' })
  @IsUUID('4', { message: 'challenge_id must be a valid UUID' })
  @IsNotEmpty()
  challenge_id!: string;
}

export class ChangePasswordDto {
  @ApiProperty({ type: String, example: 'OldPassword123!', description: 'Current password' })
  @IsString()
  @IsNotEmpty()
  current_password!: string;

  @ApiProperty({ type: String, example: 'NewComplexPassword123!', description: 'New password (min 10 characters)' })
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters long' })
  new_password!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ type: String, example: 'user@vernoxy.com', description: 'Employee email address' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ type: String, example: 'user@vernoxy.com', description: 'Employee email address' })
  @IsEmail({}, { message: 'Must be a valid email address' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ type: String, example: '123456', description: '6-digit OTP code received via email' })
  @IsString()
  @Length(6, 6, { message: 'Code must be exactly 6 digits' })
  code!: string;

  @ApiProperty({ type: String, example: 'NewComplexPassword123!', description: 'New password (min 10 characters)' })
  @IsString()
  @MinLength(10, { message: 'Password must be at least 10 characters long' })
  new_password!: string;
}

// Response DTOs
export class LoginResponseDto {
  @ApiProperty({ type: String, example: '11111111-1111-1111-1111-111111111111' })
  challenge_id!: string;

  @ApiProperty({ type: String, example: 'a***n@vernoxy.com' })
  masked_email!: string;

  @ApiProperty({ type: Number, example: 600 })
  expires_in_seconds!: number;

  @ApiProperty({ type: Number, example: 60 })
  resend_available_in_seconds!: number;

  @ApiPropertyOptional({ type: String, example: '123456' })
  otp_code?: string;
}

export class UserSummaryDto {
  @ApiProperty({ type: Number, example: 1 })
  emp_id!: number;

  @ApiProperty({ type: String, example: 'Vernoxy Admin' })
  name!: string;

  @ApiProperty({ type: String, example: 'admin@vernoxy.com' })
  email!: string;
}

export class VerifyLoginResponseDto {
  @ApiProperty({ type: String, example: 'eyJhbGciOiJSUzI1NiIs...' })
  access_token!: string;

  @ApiProperty({ type: String, example: 'Bearer' })
  token_type!: string;

  @ApiProperty({ type: Number, example: 900 })
  expires_in!: number;

  @ApiProperty({ type: Boolean, example: false })
  must_change_password!: boolean;

  @ApiProperty({ type: () => UserSummaryDto })
  user!: UserSummaryDto;
}

export class RefreshResponseDto {
  @ApiProperty({ type: String, example: 'eyJhbGciOiJSUzI1NiIs...' })
  access_token!: string;

  @ApiProperty({ type: Number, example: 900 })
  expires_in!: number;
}

export class DepartmentSummaryDto {
  @ApiProperty({ type: Number, example: 1 })
  dep_id!: number;

  @ApiProperty({ type: String, example: 'Management' })
  name!: string;
}

export class RoleSummaryDto {
  @ApiProperty({ type: Number, example: 1 })
  role_id!: number;

  @ApiProperty({ type: String, example: 'Admin' })
  role_name!: string;
}

export class AccessSummaryDto {
  @ApiProperty({ type: Boolean, example: true })
  can_manage_organization!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  can_manage_companies!: boolean;

  @ApiProperty({ type: Boolean, example: true })
  can_manage_tasks!: boolean;
}

export class MeResponseDto {
  @ApiProperty({ type: Number, example: 1 })
  emp_id!: number;

  @ApiProperty({ type: String, example: 'Vernoxy Admin' })
  name!: string;

  @ApiProperty({ type: String, example: 'admin@vernoxy.com' })
  email!: string;

  @ApiProperty({ type: String, example: '9876543210', nullable: true })
  mob!: string | null;

  @ApiProperty({
    type: String,
    example: '/api/v1/files/profile-photos/0123456789abcdef0123456789abcdef.webp?exp=1700000000&sig=abc123',
    nullable: true,
  })
  profile_picture_url!: string | null;

  @ApiProperty({ type: () => RoleSummaryDto })
  role!: RoleSummaryDto;

  @ApiProperty({ type: () => DepartmentSummaryDto })
  department!: DepartmentSummaryDto;

  @ApiProperty({ type: Boolean, example: false })
  must_change_password!: boolean;

  @ApiProperty({ type: () => AccessSummaryDto })
  access!: AccessSummaryDto;
}

export class ForgotPasswordResponseDto {
  @ApiProperty({ type: String, example: 'If the email is registered, a password reset code has been sent.' })
  message!: string;

  @ApiPropertyOptional({ type: String, example: '123456' })
  otp_code?: string;
}
