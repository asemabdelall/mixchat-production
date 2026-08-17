import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { io as Client, Socket as ClientSocket } from 'socket.io-client';
import { AddressInfo } from 'node:net';
import { AppModule } from '../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { RealtimeEvents } from '../src/modules/chat/realtime/realtime-events';
import { RedisIoAdapter } from '../src/infrastructure/adapters/redis-io.adapter';
import { ConfigService } from '@nestjs/config';

interface AuthResponse {
  user: {
    id: string;
    email: string;
    username: string;
    displayName: string;
  };
  accessToken: string;
}

interface ConversationResponse {
  id: string;
  type: string;
  participants: Array<{ id: string; username: string }>;
}

interface MessageAck {
  ok: boolean;
  data?: {
    id: string;
    clientMessageId?: string;
    conversationId: string;
    text: string;
    sender: { id: string };
  };
  error?: string;
}

interface MessageEventPayload {
  id: string;
  conversationId: string;
  text: string;
  clientMessageId?: string;
  sender: { id: string };
}

interface TypingEventPayload {
  conversationId: string;
  userId: string;
  username: string;
  displayName: string;
  isTyping: boolean;
}

interface ReadReceiptPayload {
  conversationId: string;
  userId: string;
  lastReadMessageId: string;
  lastReadAt: string;
  unreadCount: number;
}

describe('Phase 9 — Realtime Messaging, Presence & Typing (e2e)', () => {
  let app: INestApplication<App>;
  let appInstance2: INestApplication<App>;
  let serverPort: number;
  let serverPort2: number;
  let redisIoAdapter: RedisIoAdapter;
  let redisIoAdapter2: RedisIoAdapter;

  const timestamp = Date.now();
  const userAData = {
    email: `realtime_a_${timestamp}@mixchat.app`,
    username: `user_a_${timestamp}`,
    password: 'Password123!',
  };
  const userBData = {
    email: `realtime_b_${timestamp}@mixchat.app`,
    username: `user_b_${timestamp}`,
    password: 'Password123!',
  };
  const userCData = {
    email: `realtime_c_${timestamp}@mixchat.app`,
    username: `user_c_${timestamp}`,
    password: 'Password123!',
  };

  let tokenA: string;
  let userAId: string;
  let tokenB: string;
  let userBId: string;
  let tokenC: string;
  let userCId: string;
  let directConversationId: string;

  let socketA: ClientSocket;
  let socketB: ClientSocket;
  let socketC: ClientSocket;
  let multiSocketA: ClientSocket;
  let multiSocketB: ClientSocket;

  beforeAll(async () => {
    // Instance 1
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.use(cookieParser());
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    const configService = app.get(ConfigService);
    redisIoAdapter = new RedisIoAdapter(app, configService);
    await redisIoAdapter.connectToRedis();
    app.useWebSocketAdapter(redisIoAdapter);

    await app.init();
    await app.listen(0);
    const httpServer1 = app.getHttpServer() as {
      address: () => AddressInfo | string | null;
    };
    const address1 = httpServer1.address();
    serverPort =
      typeof address1 === 'object' && address1 !== null ? address1.port : 0;

    // Instance 2 for multi-instance scaling verification
    const moduleFixture2: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    appInstance2 = moduleFixture2.createNestApplication();
    appInstance2.use(cookieParser());
    appInstance2.setGlobalPrefix('api');
    appInstance2.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    appInstance2.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    appInstance2.useGlobalFilters(new HttpExceptionFilter());

    const configService2 = appInstance2.get(ConfigService);
    redisIoAdapter2 = new RedisIoAdapter(appInstance2, configService2);
    await redisIoAdapter2.connectToRedis();
    appInstance2.useWebSocketAdapter(redisIoAdapter2);

    await appInstance2.init();
    await appInstance2.listen(0);
    const httpServer2 = appInstance2.getHttpServer() as {
      address: () => AddressInfo | string | null;
    };
    const address2 = httpServer2.address();
    serverPort2 =
      typeof address2 === 'object' && address2 !== null ? address2.port : 0;

    // Register User A
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userAData)
      .expect(201);
    tokenA = (resA.body as AuthResponse).accessToken;
    userAId = (resA.body as AuthResponse).user.id;

    // Register User B
    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userBData)
      .expect(201);
    tokenB = (resB.body as AuthResponse).accessToken;
    userBId = (resB.body as AuthResponse).user.id;

    // Register User C (Third party for authorization checks)
    const resC = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userCData)
      .expect(201);
    tokenC = (resC.body as AuthResponse).accessToken;
    userCId = (resC.body as AuthResponse).user.id;

    // Create Direct Conversation between A and B
    const convoRes = await request(app.getHttpServer())
      .post('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ type: 'DIRECT', targetUserId: userBId })
      .expect(201);
    directConversationId = (convoRes.body as ConversationResponse).id;
  });

  afterAll(async () => {
    const clients: Array<ClientSocket | undefined> = [
      socketA,
      socketB,
      socketC,
      multiSocketA,
      multiSocketB,
    ];
    for (const s of clients) {
      if (s?.connected) {
        s.removeAllListeners();
        s.disconnect();
      }
    }
    await new Promise((r) => setTimeout(r, 100));

    await app.close();
    await appInstance2.close();
    await redisIoAdapter.close();
    await redisIoAdapter2.close();
  });

  describe('1. Socket Authentication & Presence', () => {
    it('should reject connection without token', (done) => {
      const socket = Client(`http://localhost:${serverPort}/chat`, {
        transports: ['websocket'],
      });
      socket.on('disconnect', () => {
        socket.close();
        done();
      });
      socket.on('connect_error', () => {
        socket.close();
        done();
      });
    });

    it('should reject connection with invalid token', (done) => {
      const socket = Client(`http://localhost:${serverPort}/chat`, {
        auth: { token: 'invalid_jwt_garbage_token' },
        transports: ['websocket'],
      });
      socket.on('disconnect', () => {
        socket.close();
        done();
      });
      socket.on('connect_error', () => {
        socket.close();
        done();
      });
    });

    it('should authenticate and connect User A and User B successfully', (done) => {
      let connectedCount = 0;

      socketA = Client(`http://localhost:${serverPort}/chat`, {
        auth: { token: tokenA },
        transports: ['websocket'],
      });

      socketB = Client(`http://localhost:${serverPort}/chat`, {
        auth: { token: tokenB },
        transports: ['websocket'],
      });

      const check = () => {
        connectedCount++;
        if (connectedCount === 2) {
          expect(socketA.connected).toBe(true);
          expect(socketB.connected).toBe(true);
          setTimeout(() => done(), 150);
        }
      };

      socketA.on('connect', check);
      socketB.on('connect', check);
    });

    it('should query batch presence for online users', (done) => {
      socketA.emit(
        RealtimeEvents.PRESENCE_GET,
        { userIds: [userAId, userBId, userCId] },
        (res: {
          ok: boolean;
          presence: Record<string, { status: string }>;
        }) => {
          expect(res.ok).toBe(true);
          expect(res.presence[userAId].status).toBe('ONLINE');
          expect(res.presence[userBId].status).toBe('ONLINE');
          done();
        },
      );
    });
  });

  describe('2. Authorized Room Membership & IDOR Protection', () => {
    it('User A and User B should successfully join their direct conversation room', async () => {
      const joinA = await new Promise<{ ok: boolean }>((resolve) => {
        socketA.emit(
          RealtimeEvents.CHAT_JOIN,
          { conversationId: directConversationId },
          (res: { ok: boolean }) => resolve(res),
        );
      });
      expect(joinA.ok).toBe(true);

      const joinB = await new Promise<{ ok: boolean }>((resolve) => {
        socketB.emit(
          RealtimeEvents.CHAT_JOIN,
          { conversationId: directConversationId },
          (res: { ok: boolean }) => resolve(res),
        );
      });
      expect(joinB.ok).toBe(true);
    });

    it('User C (non-member) should be rejected from joining A-B direct conversation room', (done) => {
      socketC = Client(`http://localhost:${serverPort}/chat`, {
        auth: { token: tokenC },
        transports: ['websocket'],
      });

      socketC.on('connect', () => {
        socketC.emit(
          RealtimeEvents.CHAT_JOIN,
          { conversationId: directConversationId },
          (res: { ok: boolean; error?: string }) => {
            expect(res.ok).toBe(false);
            done();
          },
        );
      });
    });
  });

  describe('3. Realtime Messaging, Idempotency & Delivery', () => {
    it('User A sends a message over socket: persisted to PostgreSQL and received by User B realtime', (done) => {
      const clientMessageId = `cmid_${Date.now()}_1`;
      const messageText = 'Hello User B in realtime!';

      socketB.once(
        RealtimeEvents.MESSAGE_NEW,
        (message: MessageEventPayload) => {
          expect(message.conversationId).toBe(directConversationId);
          expect(message.text).toBe(messageText);
          expect(message.clientMessageId).toBe(clientMessageId);
          expect(message.sender.id).toBe(userAId);
          done();
        },
      );

      socketA.emit(
        RealtimeEvents.MESSAGE_SEND,
        {
          conversationId: directConversationId,
          type: 'TEXT',
          text: messageText,
          clientMessageId,
        },
        (ack: MessageAck) => {
          expect(ack.ok).toBe(true);
          expect(ack.data?.id).toBeDefined();
          expect(ack.data?.clientMessageId).toBe(clientMessageId);
        },
      );
    });

    it('Sending same clientMessageId again is idempotent and returns existing message', (done) => {
      const clientMessageId = `cmid_${Date.now()}_idempotent`;

      socketA.emit(
        RealtimeEvents.MESSAGE_SEND,
        {
          conversationId: directConversationId,
          type: 'TEXT',
          text: 'Idempotent test message',
          clientMessageId,
        },
        (firstAck: MessageAck) => {
          expect(firstAck.ok).toBe(true);
          const firstId = firstAck.data?.id;

          // Re-send with same clientMessageId
          socketA.emit(
            RealtimeEvents.MESSAGE_SEND,
            {
              conversationId: directConversationId,
              type: 'TEXT',
              text: 'Idempotent test message',
              clientMessageId,
            },
            (secondAck: MessageAck) => {
              expect(secondAck.ok).toBe(true);
              expect(secondAck.data?.id).toBe(firstId);
              done();
            },
          );
        },
      );
    });
  });

  describe('4. Realtime Typing Indicators', () => {
    it('User A emits typing:start -> User B receives typing:update (isTyping: true)', (done) => {
      socketB.once(
        RealtimeEvents.TYPING_UPDATE,
        (payload: TypingEventPayload) => {
          expect(payload.conversationId).toBe(directConversationId);
          expect(payload.userId).toBe(userAId);
          expect(payload.isTyping).toBe(true);
          done();
        },
      );

      socketA.emit(RealtimeEvents.TYPING_START, {
        conversationId: directConversationId,
      });
    });

    it('User A emits typing:stop -> User B receives typing:update (isTyping: false)', (done) => {
      socketB.once(
        RealtimeEvents.TYPING_UPDATE,
        (payload: TypingEventPayload) => {
          expect(payload.conversationId).toBe(directConversationId);
          expect(payload.userId).toBe(userAId);
          expect(payload.isTyping).toBe(false);
          done();
        },
      );

      socketA.emit(RealtimeEvents.TYPING_STOP, {
        conversationId: directConversationId,
      });
    });
  });

  describe('5. Realtime Read Receipts', () => {
    it('User B marks message as read -> User A receives message:read receipt event', async () => {
      // First send a message from A
      const clientMessageId = `cmid_read_${Date.now()}`;
      const sendRes = await new Promise<MessageAck>((resolve) => {
        socketA.emit(
          RealtimeEvents.MESSAGE_SEND,
          {
            conversationId: directConversationId,
            type: 'TEXT',
            text: 'Read receipt message',
            clientMessageId,
          },
          (ack: MessageAck) => resolve(ack),
        );
      });

      const messageId = sendRes.data?.id as string;

      // User B emits message:read
      const readReceiptPromise = new Promise<ReadReceiptPayload>((resolve) => {
        socketA.once(
          RealtimeEvents.MESSAGE_READ_RECEIPT,
          (receipt: ReadReceiptPayload) => {
            resolve(receipt);
          },
        );
      });

      socketB.emit(RealtimeEvents.MESSAGE_READ, {
        conversationId: directConversationId,
        lastReadMessageId: messageId,
      });

      const receipt = await readReceiptPromise;
      expect(receipt.conversationId).toBe(directConversationId);
      expect(receipt.userId).toBe(userBId);
      expect(receipt.lastReadMessageId).toBe(messageId);
    });
  });

  describe('6. Multi-Instance Scaling over Redis Adapter', () => {
    it('cross-instance message fanout: socket connected to Instance 1 receives message sent to Instance 2', async () => {
      // Connect multiSocketA to Instance 1 (serverPort)
      await new Promise<void>((resolve) => {
        multiSocketA = Client(`http://localhost:${serverPort}/chat`, {
          auth: { token: tokenA },
          transports: ['websocket'],
        });
        multiSocketA.on('connect', () => resolve());
      });

      // Connect multiSocketB to Instance 2 (serverPort2)
      await new Promise<void>((resolve) => {
        multiSocketB = Client(`http://localhost:${serverPort2}/chat`, {
          auth: { token: tokenB },
          transports: ['websocket'],
        });
        multiSocketB.on('connect', () => resolve());
      });

      // Give server 150ms to complete async handleConnection and set client.data
      await new Promise((r) => setTimeout(r, 150));

      // Both join direct conversation
      await new Promise<void>((resolve) => {
        multiSocketA.emit(
          RealtimeEvents.CHAT_JOIN,
          { conversationId: directConversationId },
          () => resolve(),
        );
      });
      await new Promise<void>((resolve) => {
        multiSocketB.emit(
          RealtimeEvents.CHAT_JOIN,
          { conversationId: directConversationId },
          () => resolve(),
        );
      });

      const crossInstanceMessage = `Cross-instance message at ${Date.now()}`;
      const crossClientMessageId = `cmid_cross_${Date.now()}`;

      const receivePromise = new Promise<MessageEventPayload>((resolve) => {
        multiSocketB.once(
          RealtimeEvents.MESSAGE_NEW,
          (msg: MessageEventPayload) => {
            resolve(msg);
          },
        );
      });

      // Send from MultiSocketA on Instance 1
      const ackPromise = new Promise<MessageAck>((resolve) => {
        multiSocketA.emit(
          RealtimeEvents.MESSAGE_SEND,
          {
            conversationId: directConversationId,
            type: 'TEXT',
            text: crossInstanceMessage,
            clientMessageId: crossClientMessageId,
          },
          (ack: MessageAck) => resolve(ack),
        );
      });

      const ack = await ackPromise;
      expect(ack.ok).toBe(true);

      const received = await receivePromise;
      expect(received.text).toBe(crossInstanceMessage);
      expect(received.conversationId).toBe(directConversationId);
    }, 10000);
  });
});
