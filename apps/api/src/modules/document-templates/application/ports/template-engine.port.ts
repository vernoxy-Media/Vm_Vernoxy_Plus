/**
 * Fills a logic-less template with a view (plain values). The adapter decides the syntax (Mustache
 * today); the sources are plain HTML with {{placeholders}}, so they can move to any language.
 */
export interface TemplateEnginePort {
  render(source: string, view: object): string;
}
