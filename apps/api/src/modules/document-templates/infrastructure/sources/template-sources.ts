import { Injectable } from '@nestjs/common';
import { TemplateSourcePort } from '../../application/ports/template-source.port';
import { SALARY_SLIP_KIND } from '../../domain/kinds/salary-slip/salary-slip.catalog';
import { SALARY_SLIP_SOURCE } from './salary-slip.source';
import { QUOTATION_KIND } from '../../domain/kinds/quotation/quotation.catalog';
import { QUOTATION_SOURCE } from './quotation.source';

const SOURCES: Record<string, string> = {
  [SALARY_SLIP_KIND]: SALARY_SLIP_SOURCE,
  [QUOTATION_KIND]: QUOTATION_SOURCE,
};

/** The current template source of each document kind, shipped with this version of Pulse. */
@Injectable()
export class CodeTemplateSources implements TemplateSourcePort {
  sourceFor(kind: string): string | null {
    return SOURCES[kind] ?? null;
  }
}
