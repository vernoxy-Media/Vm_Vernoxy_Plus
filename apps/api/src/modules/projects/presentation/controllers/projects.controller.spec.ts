import { ProjectsController } from './projects.controller';
import { ROUTE_ARGS_METADATA } from '@nestjs/common/constants';

describe('ProjectsController', () => {
  it('should declare both id and sprintId parameters on updateSprint for OpenAPI and routing', () => {
    const metadata = Reflect.getMetadata(ROUTE_ARGS_METADATA, ProjectsController, 'updateSprint');
    expect(metadata).toBeDefined();
    const paramEntries = Object.values(metadata) as Array<{ data?: string }>;
    const paramNames = paramEntries.map((p) => p.data);
    expect(paramNames).toContain('id');
    expect(paramNames).toContain('sprintId');
  });
});
