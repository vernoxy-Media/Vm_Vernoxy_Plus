import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class OpenDirectDto {
  @Type(() => Number) @IsInt() peer_id!: number;
}

export class CreateGroupDto {
  @IsString() @MaxLength(100) name!: string;
  @IsOptional() @IsString() @MaxLength(600) description?: string;
  @IsArray() @ArrayMaxSize(500) @Type(() => Number) @IsInt({ each: true }) member_ids!: number[];
}

export class UpdateGroupDto {
  @IsOptional() @IsString() @MaxLength(100) name?: string;
  @IsOptional() @IsString() @MaxLength(600) description?: string;
  @IsOptional() @IsBoolean() only_admins_post?: boolean;
}

export class AddMembersDto {
  @IsArray() @ArrayMaxSize(500) @Type(() => Number) @IsInt({ each: true }) member_ids!: number[];
}

export class SetAdminDto {
  @IsBoolean() is_admin!: boolean;
}

export class PrefsDto {
  @IsOptional() @IsBoolean() pinned?: boolean;
  @IsOptional() @IsIn(['8h', '1w', 'always', null]) mute?: '8h' | '1w' | 'always' | null;
  @IsOptional() @IsBoolean() archived?: boolean;
  @IsOptional() @IsBoolean() marked_unread?: boolean;
}

export class SendMessageDto {
  @IsString() @MaxLength(10000) body!: string;
  @IsOptional() @Type(() => Number) @IsInt() reply_to_id?: number;
}

export class EditMessageDto {
  @IsString() @MaxLength(10000) body!: string;
}

export class DeleteMessageDto {
  @IsIn(['me', 'everyone']) mode!: 'me' | 'everyone';
}

export class ReactDto {
  @IsString() @MaxLength(16) emoji!: string;
}

export class ForwardDto {
  @IsArray() @ArrayMaxSize(50) @Type(() => Number) @IsInt({ each: true }) message_ids!: number[];
  @IsArray() @ArrayMaxSize(50) @Type(() => Number) @IsInt({ each: true }) conversation_ids!: number[];
  @IsOptional() @IsString() @MaxLength(10000) comment?: string;
}

export class StatusDto {
  @IsIn(['auto', 'available', 'busy', 'dnd']) status!: 'auto' | 'available' | 'busy' | 'dnd';
  @IsOptional() @IsString() @MaxLength(200) status_text?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(60 * 24 * 14) minutes?: number;
}
