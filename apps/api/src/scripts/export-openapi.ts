import * as dotenv from 'dotenv';
import * as path from 'path';
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
import { Test } from '@nestjs/testing';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as fs from 'fs';
import { AppModule } from '../app.module';
import { PrismaService } from '../core/prisma/prisma.service';

function getOpenApiOutputDir(): string {
  const cwdCandidates = [
    path.resolve(process.cwd(), 'contracts/openapi'),
    path.resolve(process.cwd(), '../../contracts/openapi'),
    path.resolve(__dirname, '../../../../contracts/openapi'),
    path.resolve(__dirname, '../../../contracts/openapi'),
  ];

  for (const candidate of cwdCandidates) {
    const parent = path.dirname(candidate);
    if (fs.existsSync(parent)) {
      return candidate;
    }
  }
  return cwdCandidates[0]!;
}

async function exportOpenApi() {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(PrismaService)
    .useValue({
      checkHealth: async () => true,
      onModuleInit: async () => {},
      onModuleDestroy: async () => {},
    })
    .compile();

  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix('api/v1', {
    exclude: ['\\.well-known/(.*)'],
  });

  const config = new DocumentBuilder()
    .setTitle('Vernoxy Pulse API')
    .setDescription('Sales CRM + HRMS REST API contracts')
    .setVersion('1.0.0')
    .addBearerAuth()
    .addTag('Auth', 'Authentication, 2FA OTP, and session management')
    .addTag('JWKS', 'JSON Web Key Set public keys')
    .addTag('Health', 'System and database health check')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  (document as { openapi?: string }).openapi = '3.1.0';

  const outDir = getOpenApiOutputDir();
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outPath = path.join(outDir, 'openapi.json');
  fs.writeFileSync(outPath, JSON.stringify(document, null, 2), 'utf-8');

  console.log(`Successfully exported OpenAPI 3.1 specification to: ${outPath}`);
  await app.close();
}

exportOpenApi().catch((err) => {
  console.error('Failed to export OpenAPI document:', err);
  process.exit(1);
});
