import { Injectable } from '@nestjs/common';
import { ImportHandler } from '../ports/import-handler.port';
import { ExportSource } from '../ports/export-source.port';

@Injectable()
export class DataTransferRegistry {
  private readonly importHandlers = new Map<string, ImportHandler>();
  private readonly exportSources = new Map<string, ExportSource>();

  registerImportHandler(handler: ImportHandler): void {
    this.importHandlers.set(handler.entityType, handler);
  }

  getImportHandler(entityType: string): ImportHandler {
    const handler = this.importHandlers.get(entityType);
    if (!handler) {
      throw new Error(`No ImportHandler registered for entityType '${entityType}'`);
    }
    return handler;
  }

  registerExportSource(source: ExportSource): void {
    this.exportSources.set(source.entityType, source);
  }

  getExportSource(entityType: string): ExportSource {
    const source = this.exportSources.get(entityType);
    if (!source) {
      throw new Error(`No ExportSource registered for entityType '${entityType}'`);
    }
    return source;
  }
}
