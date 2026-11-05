import { Injectable, Logger } from '@nestjs/common';
import { Server } from 'socket.io';

@Injectable()
export class EventsService {
  private readonly logger = new Logger(EventsService.name);
  private server: Server | null = null;

  /** Sockets per signed-in employee, used for online presence. */
  private readonly sockets = new Map<number, Set<string>>();
  /** Sockets whose page has been idle; a person is Away when every one of their sockets is. */
  private readonly idleSockets = new Map<number, Set<string>>();
  private readonly awayListeners: Array<(empId: number, away: boolean) => void> = [];
  private readonly presenceListeners: Array<(empId: number, online: boolean) => void> = [];

  onPresenceChange(listener: (empId: number, online: boolean) => void) {
    this.presenceListeners.push(listener);
  }

  onAwayChange(listener: (empId: number, away: boolean) => void) {
    this.awayListeners.push(listener);
  }

  isAway(empId: number): boolean {
    const all = this.sockets.get(empId)?.size ?? 0;
    return all > 0 && (this.idleSockets.get(empId)?.size ?? 0) >= all;
  }

  setIdle(empId: number, socketId: string, idle: boolean) {
    const before = this.isAway(empId);
    const set = this.idleSockets.get(empId) ?? new Set<string>();
    if (idle) set.add(socketId);
    else set.delete(socketId);
    if (set.size) this.idleSockets.set(empId, set);
    else this.idleSockets.delete(empId);
    const after = this.isAway(empId);
    if (before !== after) this.awayListeners.forEach((l) => l(empId, after));
  }

  userConnected(empId: number, socketId: string) {
    const set = this.sockets.get(empId) ?? new Set<string>();
    const first = set.size === 0;
    set.add(socketId);
    this.sockets.set(empId, set);
    if (first) this.presenceListeners.forEach((l) => l(empId, true));
  }

  userDisconnected(empId: number, socketId: string) {
    const set = this.sockets.get(empId);
    if (!set) return;
    set.delete(socketId);
    this.setIdle(empId, socketId, false);
    if (set.size === 0) {
      this.sockets.delete(empId);
      this.presenceListeners.forEach((l) => l(empId, false));
    }
  }

  isOnline(empId: number): boolean {
    return (this.sockets.get(empId)?.size ?? 0) > 0;
  }

  onlineIds(): number[] {
    return [...this.sockets.keys()];
  }

  emitToRoom(room: string, event: string, payload: any) {
    this.server?.to(room).emit(event, payload);
  }

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
