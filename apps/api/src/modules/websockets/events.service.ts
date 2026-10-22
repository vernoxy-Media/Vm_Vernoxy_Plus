import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private server: Server | null = null;

  setServer(server: Server) {
    this.server = server;
  }

  getServer(): Server | null {
    return this.server;
  }

  emitToUser(empId: number, event: string, payload: any) {
    if (!this.server) {
      this.logger.debug(`Server not ready, cannot emit ${event} to user ${empId}`);
      return;
    }
    this.server.to(`user:${empId}`).emit(event, payload);
    this.logger.debug(`Emitted ${event} to user:${empId}`);
  }

  emitToUsers(empIds: number[], event: string, payload: any) {
    if (!this.server) return;
    empIds.forEach((id) => this.emitToUser(id, event, payload));
  }

  emitToProject(projectId: number | string, event: string, payload: any) {
    if (!this.server) {
      this.logger.warn(`Server not ready, cannot emit ${event} to project ${projectId}`);
      return;
    }
    const room = `project:${Number(projectId)}`;
    this.server.to(room).emit(event, payload);
    this.logger.log(`Emitted ${event} to room ${room}`);
  }

  emitToBoard(event: string, payload: any) {
    if (!this.server) return;
    this.server.to('tasks:board').emit(event, payload);
    this.logger.debug(`Emitted ${event} to tasks:board`);
  }

  broadcast(event: string, payload: any) {
    if (!this.server) return;
    this.server.emit(event, payload);
    this.logger.debug(`Broadcast ${event}`);
  }
}
