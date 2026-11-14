import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../core/prisma/prisma.service';
import {
  PunchCoordinates,
  PunchKind,
  PunchLocationRepository,
} from '../../domain/ports/punch-location.repository.port';

@Injectable()
export class PrismaPunchLocationRepository implements PunchLocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(empId: number, kind: PunchKind, c: PunchCoordinates): Promise<void> {
    await this.prisma.$executeRaw`
      INSERT INTO attendance_punch_locations (emp_id, work_date, kind, latitude, longitude, accuracy_m)
      VALUES (${empId}, (now() AT TIME ZONE 'Asia/Kolkata')::date, ${kind}, ${c.latitude}, ${c.longitude}, ${c.accuracyM ?? null})
      ON CONFLICT (emp_id, work_date, kind)
      DO UPDATE SET latitude = EXCLUDED.latitude, longitude = EXCLUDED.longitude,
                    accuracy_m = EXCLUDED.accuracy_m, captured_at = clock_timestamp()`;
  }

  async findRange(empId: number, from: string, to: string) {
    const rows = await this.prisma.$queryRaw<
      Array<{ work_date: string; kind: PunchKind; latitude: number; longitude: number }>
    >`
      SELECT to_char(work_date, 'YYYY-MM-DD') AS work_date, kind, latitude, longitude
      FROM attendance_punch_locations
      WHERE emp_id = ${empId} AND work_date BETWEEN ${from}::date AND ${to}::date`;
    const out = new Map<string, Partial<Record<PunchKind, { latitude: number; longitude: number }>>>();
    for (const r of rows) {
      const day = out.get(r.work_date) ?? {};
      day[r.kind] = { latitude: r.latitude, longitude: r.longitude };
      out.set(r.work_date, day);
    }
    return out;
  }
}
