import { MasterLookupRepositoryPort, MasterLookupItem } from '../ports/master-lookup.repository.port';
import { ValidationDomainError } from '../../domain/errors/master-data.errors';

export const ALLOWED_LOOKUP_TYPES = [
  'task_type',
  'break_type',
  'project_category',
  'project_status',
  'project_type',
  'lead_source',
  'lost_reason',
  'person_department',
  'request_type',
  'attendance_reason',
  'shift_type',
  'leave_type',
  'employment_type',
  'gender',
  'blood_group',
  'deactivation_reason',
];

export class ListLookupsUseCase {
  constructor(private readonly repo: MasterLookupRepositoryPort) {}

  async execute(lookupType: string): Promise<MasterLookupItem[]> {
    if (!ALLOWED_LOOKUP_TYPES.includes(lookupType)) {
      throw new ValidationDomainError(
        `Invalid lookup type "${lookupType}". Allowed: ${ALLOWED_LOOKUP_TYPES.join(', ')}`,
        'INVALID_LOOKUP_TYPE',
        'type',
      );
    }
    return this.repo.getAll(lookupType);
  }
}
