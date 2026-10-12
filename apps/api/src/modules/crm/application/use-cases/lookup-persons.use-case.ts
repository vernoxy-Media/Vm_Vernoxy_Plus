import {
  PersonRepositoryPort,
  PersonLookupMatch,
} from '../ports/person.repository.port';

export class LookupPersonsUseCase {
  constructor(private readonly personRepo: PersonRepositoryPort) {}

  async execute(params: { email?: string; mobile?: string }): Promise<PersonLookupMatch[]> {
    return this.personRepo.lookupByEmailOrMobile(params.email, params.mobile);
  }
}
