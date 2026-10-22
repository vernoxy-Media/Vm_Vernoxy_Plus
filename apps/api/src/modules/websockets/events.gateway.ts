import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Inject, Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { EventsService } from './events.service';
import { AUTH_TOKENS } from '../auth/application/ports/tokens';
import { TokenService } from '../auth/application/ports/auth.ports';

@WebSocketGateway({
  cors: {
    origin: (_origin: string, callback: (err: Error | null, allow?: boolean) => void) => {
      callback(null, true);
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
})
export class EventsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(EventsGateway.name);

  constructor(
    private readonly eventsService: EventsService,
    @Inject(AUTH_TOKENS.TokenService)
    private readonly tokenService: TokenService,
  ) {}

  afterInit(server: Server) {
    this.eventsService.setServer(server);
    this.logger.log('WebSocket Gateway initialized');
  }

  async handleConnection(client: Socket) {
    try {
      const authHeader =
        (client.handshake.headers?.authorization as string) || '';
      const token =
        client.handshake.auth?.token ||
        (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null) ||
        (client.handshake.query?.token as string);

      if (token) {
        try {
          const payload = await this.tokenService.verifyAccessToken(token);
          const empId = Number(payload.sub);
          client.data.user = {
            emp_id: empId,
            sessionId: payload.sid,
          };
          client.join(`user:${empId}`);
          client.join('tasks:board');
          this.logger.log(
            `Authenticated socket connected: ${client.id} (emp_id: ${empId})`,
          );
          return;
        } catch (err) {
          this.logger.debug(
            `Token verification failed for socket ${client.id}: ${(err as Error).message}`,
          );
        }
      }

      // Allow public/anonymous socket or pending handshake, join general board
      client.join('tasks:board');
      this.logger.log(`Anonymous socket connected: ${client.id}`);
    } catch (e) {
      this.logger.error(`Error handling socket connection ${client.id}`, e);
    }
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage('join:project')
  handleJoinProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const rawId = typeof data === 'object' && data !== null ? data.projectId : data;
    const projectId = Number(rawId);
    if (projectId && !isNaN(projectId)) {
      const room = `project:${projectId}`;
      client.join(room);
      this.logger.log(`Socket ${client.id} joined room ${room}`);
      return { success: true, room };
    }
    return { success: false, message: 'Invalid projectId' };
  }

  @SubscribeMessage('leave:project')
  handleLeaveProject(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: any,
  ) {
    const rawId = typeof data === 'object' && data !== null ? data.projectId : data;
    const projectId = Number(rawId);
    if (projectId && !isNaN(projectId)) {
      const room = `project:${projectId}`;
      client.leave(room);
      this.logger.log(`Socket ${client.id} left room ${room}`);
      return { success: true, room };
    }
    return { success: false, message: 'Invalid projectId' };
  }
}
