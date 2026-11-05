import { Inject, Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import { FileStoragePort, STORAGE_TOKENS } from '../../../storage/public-api';
import { BirthdayItem, BirthdayRepository } from '../../domain/ports/birthday.repository.port';

@Injectable()
export class PrismaBirthdayRepository implements BirthdayRepository {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(STORAGE_TOKENS.FileStoragePort) private readonly storage: FileStoragePort,
  ) {}

  async findUpcoming(days: number): Promise<BirthdayItem[]> {
    // This year's occurrence of the birthday (29 Feb becomes 1 Mar in other years); if it has passed, next year's.
    const rows = await this.prisma.$queryRaw<
      Array<{ emp_id: number; name: string; profile_picture: string | null; occ: string; days_until: number }>
    >`
      WITH t AS (SELECT (now() AT TIME ZONE 'Asia/Kolkata')::date AS today),
      b AS (
        SELECT e.emp_id, e.name, e.profile_picture,
               (make_date(EXTRACT(YEAR FROM t.today)::int, 1, 1)
                 + ((EXTRACT(MONTH FROM e.birth_date)::int - 1) * interval '1 month')
                 + ((EXTRACT(DAY FROM e.birth_date)::int - 1) * interval '1 day'))::date AS this_year,
               t.today
        FROM employees e, t
        WHERE e.deleted_at IS NULL AND e.status = 'Active' AND e.birth_date IS NOT NULL
      ),
      o AS (
        SELECT emp_id, name, profile_picture, today,
               CASE WHEN this_year >= today THEN this_year ELSE (this_year + interval '1 year')::date END AS occ
        FROM b
      )
      SELECT emp_id, name, profile_picture, to_char(occ, 'YYYY-MM-DD') AS occ, (occ - today)::int AS days_until
      FROM o
      WHERE occ - today <= ${days}
      ORDER BY occ, name`;

    return rows.map((r) => ({
      emp_id: r.emp_id,
      name: r.name,
      photo_url: r.profile_picture ? this.storage.getSignedUrlIfExists(r.profile_picture) : null,
      date: r.occ,
      days_until: r.days_until,
    }));
  }
}
