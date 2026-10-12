/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: 'domain-imports-nothing',
      comment: 'Domain layer must not import from any outer layer or external framework (NestJS, Prisma, HTTP)',
      severity: 'error',
      from: {
        path: '^apps/api/src/modules/[^/]+/domain',
      },
      to: {
        path: [
          '^apps/api/src/modules/[^/]+/(application|infrastructure|presentation)',
          '^apps/api/src/core',
          '@nestjs',
          '@prisma/client'
        ],
      },
    },
    {
      name: 'application-imports-only-domain',
      comment: 'Application layer may only import from its own domain layer (or shared domain primitives)',
      severity: 'error',
      from: {
        path: '^apps/api/src/modules/[^/]+/application',
      },
      to: {
        path: [
          '^apps/api/src/modules/[^/]+/(infrastructure|presentation)',
          '@nestjs',
          '@prisma/client'
        ],
      },
    },
    {
      name: 'infrastructure-imports-domain-and-application',
      comment: 'Infrastructure layer may import domain and application, but never presentation',
      severity: 'error',
      from: {
        path: '^apps/api/src/modules/[^/]+/infrastructure',
      },
      to: {
        path: '^apps/api/src/modules/[^/]+/presentation',
      },
    },
    {
      name: 'presentation-imports-application-only',
      comment: 'Presentation layer should import application (or domain), never infrastructure or database directly',
      severity: 'error',
      from: {
        path: '^apps/api/src/modules/[^/]+/presentation',
      },
      to: {
        path: '^apps/api/src/modules/[^/]+/infrastructure',
      },
    },
    {
      name: 'modules-must-not-import-internals',
      comment: 'Modules must not reach into another module internals',
      severity: 'error',
      from: {
        path: '^apps/api/src/modules/([^/]+)/',
      },
      to: {
        path: '^apps/api/src/modules/(?!\\1)[^/]+/(domain|application|infrastructure|presentation)',
      },
    },
  ],
  options: {
    doNotFollow: {
      path: 'node_modules',
    },
    tsPreCompilationDeps: true,
    tsConfig: {
      fileName: 'tsconfig.json',
    },
  },
};
