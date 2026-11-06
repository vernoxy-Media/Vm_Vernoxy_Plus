import { Body, Controller, HttpCode, HttpStatus, Module, Patch, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiProperty, ApiTags } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Request } from 'express';
import { AuthModule } from '../auth/auth.module';
import { JwtAuthGuard } from '../auth/public-api';
import { PrismaService } from '../../core/prisma/prisma.service';

/** The themes the app offers. The first is the default and is stored as "empty". */
export const APP_THEMES = ['indigo', 'ocean', 'emerald', 'rose', 'amber', 'violet', 'teal', 'slate'] as const;

export class SetThemeDto {
  @ApiProperty({ nullable: true, example: 'ocean', description: `One of: ${APP_THEMES.join(', ')}. Empty goes back to the default.` })
  @IsOptional()
  @IsString()
  @MaxLength(30)
  theme?: string | null;
}

@ApiTags('Preferences')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('me')
export class PreferencesController {
  constructor(private readonly prisma: PrismaService) {}

  @Patch('theme')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Choose the colour theme of the app (only for yourself)' })
  async setTheme(@Req() req: Request, @Body() dto: SetThemeDto): Promise<void> {
    const wanted = dto.theme?.trim() || null;
    if (wanted && !(APP_THEMES as readonly string[]).includes(wanted)) throw new BadRequestException(`Choose one of: ${APP_THEMES.join(', ')}.`);
    // The default theme is kept as "empty", so a later change of the default reaches everyone who never chose
    const stored = wanted === APP_THEMES[0] ? null : wanted;
    await this.prisma.employees.update({ where: { emp_id: req.user!.emp_id }, data: { ui_theme: stored } });
  }
}

/** Personal preferences of the signed-in employee. */
@Module({ imports: [AuthModule], controllers: [PreferencesController] })
export class PreferencesModule {}
