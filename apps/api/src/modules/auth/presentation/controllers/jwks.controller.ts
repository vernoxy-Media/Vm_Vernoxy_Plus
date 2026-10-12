import { Controller, Get, Inject } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AUTH_TOKENS } from '../../application/ports/tokens';
import { TokenService } from '../../application/ports/auth.ports';

@ApiTags('JWKS')
@Controller('.well-known')
export class JwksController {
  constructor(
    @Inject(AUTH_TOKENS.TokenService)
    private readonly tokenService: TokenService,
  ) {}

  @Get('jwks.json')
  @ApiOperation({ summary: 'JSON Web Key Set (public keys for verifying pulse tokens)' })
  @ApiResponse({ status: 200, description: 'JWKS with RSA public keys' })
  async getJwks(): Promise<Record<string, unknown>> {
    return this.tokenService.getJwks();
  }
}
