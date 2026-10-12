import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  MasterLookupRepositoryPort,
  LookupOption,
} from '../../application/ports/master-lookup.repository.port';

@Injectable()
export class PrismaMasterLookupRepository implements MasterLookupRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async getOptions(lookupType: string): Promise<LookupOption[]> {
    const rows = await this.prisma.master_lookup.findMany({
      where: {
        lookup_type: lookupType,
        is_active: true,
        deleted_at: null,
      },
      orderBy: [
        { sort_order: 'asc' },
        { label: 'asc' },
      ],
      select: {
        lookup_id: true,
        code: true,
        label: true,
      },
    });

    return rows.map((r) => ({
      id: r.lookup_id,
      code: r.code,
      label: r.label,
    }));
  }
}
