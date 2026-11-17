import { Injectable } from '@nestjs/common';
import Mustache from 'mustache';
import { TemplateEnginePort } from '../../application/ports/template-engine.port';

/**
 * Mustache: logic-less templates with implementations in most languages, so the template sources
 * can be reused if the backend changes. {{value}} is HTML-escaped; sections show/hide and repeat.
 */
@Injectable()
export class MustacheTemplateEngine implements TemplateEnginePort {
  render(source: string, view: object): string {
    return Mustache.render(source, view);
  }
}
