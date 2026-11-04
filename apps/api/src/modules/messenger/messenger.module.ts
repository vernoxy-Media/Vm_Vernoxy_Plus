import { Inject, Module, OnModuleInit } from '@nestjs/common';
import { PrismaModule } from '../../core/prisma/prisma.module';
import { AuthModule } from '../auth/auth.module';
import { StorageModule } from '../storage/public-api';
import { MessengerService } from './application/messenger.service';
import { MESSENGER_EVENTS, MessengerEventsPort } from './domain/ports/messenger-events.port';
import { MESSENGER_FILE_STORE } from './domain/ports/messenger-file-store.port';
import { CONVERSATION_ID_CODEC, ConversationIdCodecPort } from './domain/ports/conversation-id-codec.port';
import { HmacConversationIdCodec } from './infrastructure/hmac-conversation-id-codec';
import { MESSENGER_REPOSITORY, MessengerRepositoryPort } from './domain/ports/messenger.repository.port';
import { LocalMessengerFileStore } from './infrastructure/local-messenger-file-store';
import { PrismaMessengerRepository } from './infrastructure/prisma-messenger.repository';
import { SocketMessengerEventsAdapter } from './infrastructure/socket-messenger-events.adapter';
import { MessengerController } from './presentation/messenger.controller';

@Module({
  imports: [PrismaModule, AuthModule, StorageModule],
  controllers: [MessengerController],
  providers: [
    { provide: MESSENGER_REPOSITORY, useClass: PrismaMessengerRepository },
    { provide: MESSENGER_EVENTS, useClass: SocketMessengerEventsAdapter },
    { provide: MESSENGER_FILE_STORE, useClass: LocalMessengerFileStore },
    { provide: CONVERSATION_ID_CODEC, useClass: HmacConversationIdCodec },
    {
      provide: MessengerService,
      useFactory: (repo: MessengerRepositoryPort, events: MessengerEventsPort, ids: ConversationIdCodecPort) => new MessengerService(repo, events, ids),
      inject: [MESSENGER_REPOSITORY, MESSENGER_EVENTS, CONVERSATION_ID_CODEC],
    },
  ],
})
export class MessengerModule implements OnModuleInit {
  constructor(@Inject(MessengerService) private readonly service: MessengerService) {}

  onModuleInit() {
    this.service.start();
  }
}
