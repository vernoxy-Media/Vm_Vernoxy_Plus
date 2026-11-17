import { Injectable } from '@nestjs/common';
import { DocumentDataSource } from '../ports/document-data.port';

/**
 * Data sources by document kind. Owners register theirs at startup (Payroll registers the Salary
 * Slip source), so test documents can use real data without this module importing Payroll.
 */
@Injectable()
export class DocumentDataRegistry {
  private readonly sources = new Map<string, DocumentDataSource>();

  register(source: DocumentDataSource): void {
    this.sources.set(source.kind, source);
  }

  get(kind: string): DocumentDataSource | undefined {
    return this.sources.get(kind);
  }
}
