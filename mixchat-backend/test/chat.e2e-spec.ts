import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/infrastructure/database/prisma.service';
import { MediaKind, MediaStatus } from '@prisma/client';

interface AuthBody {
  user: { id: string };
  accessToken: string;
}

interface ConversationBody {
  id: string;
  type: 'DIRECT' | 'GROUP';
  unreadCount: number;
  lastMessage: MessageBody | null;
}

interface MessageBody {
  id: string;
  conversationId: string;
  clientMessageId: string;
  text: string | null;
  deletedAt: string | null;
  createdAt: string;
}

describe('Messaging Persistence & Conversations (e2e)', () => {
  let app: INestApplication<App>;
  const stamp = Date.now();
  const credentials = [0, 1, 2].map((index) => ({
    email: `chat_${stamp}_${index}@mixchat.app`,
    username: `chat_${stamp}_${index}`,
    password: 'Password123!',
  }));
  const tokens: string[] = [];
  const userIds: string[] = [];
  let directId: string;
  let firstMessageId: string;
  let raceReadTargetId: string;
  let prisma: PrismaService;

  beforeAll(async () => {
    const fixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = fixture.createNestApplication();
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
    await app.init();
    prisma = app.get(PrismaService);

    for (const body of credentials) {
      const response = await request(app.getHttpServer())
        .post('/api/v1/auth/register')
        .send(body)
        .expect(201);
      const auth = response.body as AuthBody;
      tokens.push(auth.accessToken);
      userIds.push(auth.user.id);
    }
  });

  afterAll(async () => app.close());

  it('creates one direct conversation under concurrent reversed requests', async () => {
    const [a, b] = await Promise.all([
      request(app.getHttpServer())
        .post('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({ type: 'DIRECT', targetUserId: userIds[1] }),
      request(app.getHttpServer())
        .post('/api/v1/chat/conversations')
        .set('Authorization', `Bearer ${tokens[1]}`)
        .send({ type: 'DIRECT', targetUserId: userIds[0] }),
    ]);
    expect(a.status).toBe(201);
    expect(b.status).toBe(201);
    const bodyA = a.body as ConversationBody;
    const bodyB = b.body as ConversationBody;
    expect(bodyA.id).toBe(bodyB.id);
    directId = bodyA.id;
  });

  it('enforces the Phase 2 direct-message privacy setting', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/users/me/privacy')
      .set('Authorization', `Bearer ${tokens[2]}`)
      .send({ allowDirectMessages: 'Nobody' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({ type: 'DIRECT', targetUserId: userIds[2] })
      .expect(403);
  });

  it('rejects non-member IDOR access to detail, history, send, and read', async () => {
    const auth = `Bearer ${tokens[2]}`;
    await request(app.getHttpServer())
      .get(`/api/v1/chat/conversations/${directId}`)
      .set('Authorization', auth)
      .expect(404);
    await request(app.getHttpServer())
      .get(`/api/v1/chat/conversations/${directId}/messages`)
      .set('Authorization', auth)
      .expect(404);
    await request(app.getHttpServer())
      .post(`/api/v1/chat/conversations/${directId}/messages`)
      .set('Authorization', auth)
      .send({
        type: 'TEXT',
        text: 'intrusion',
        clientMessageId: 'intrusion-0001',
      })
      .expect(404);
  });

  it('persists one message for repeated clientMessageId and increments unread once', async () => {
    const payload = {
      type: 'TEXT',
      text: 'persistent hello',
      clientMessageId: 'client-message-0001',
    };
    const first = await request(app.getHttpServer())
      .post(`/api/v1/chat/conversations/${directId}/messages`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send(payload)
      .expect(201);
    const retry = await request(app.getHttpServer())
      .post(`/api/v1/chat/conversations/${directId}/messages`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send(payload)
      .expect(201);
    const firstBody = first.body as MessageBody;
    const retryBody = retry.body as MessageBody;
    expect(retryBody.id).toBe(firstBody.id);
    firstMessageId = firstBody.id;

    const list = await request(app.getHttpServer())
      .get('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${tokens[1]}`)
      .expect(200);
    const conversation = (
      list.body as { items: ConversationBody[] }
    ).items.find((item) => item.id === directId);
    expect(conversation?.unreadCount).toBe(1);
    expect(conversation?.lastMessage?.id).toBe(firstMessageId);
  });

  it('advances read state and does not move backward', async () => {
    const read = await request(app.getHttpServer())
      .patch(`/api/v1/chat/conversations/${directId}/read`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({ lastReadMessageId: firstMessageId })
      .expect(200);
    expect((read.body as { unreadCount: number }).unreadCount).toBe(0);

    const second = await request(app.getHttpServer())
      .post(`/api/v1/chat/conversations/${directId}/messages`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({
        type: 'TEXT',
        text: 'new unread',
        clientMessageId: 'client-message-0002',
      })
      .expect(201);
    expect((second.body as MessageBody).id).toBeDefined();

    const stale = await request(app.getHttpServer())
      .patch(`/api/v1/chat/conversations/${directId}/read`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({ lastReadMessageId: firstMessageId })
      .expect(200);
    expect((stale.body as { unreadCount: number }).unreadCount).toBe(1);
  });

  it('validates replies, supports tombstone deletion, and paginates history', async () => {
    const reply = await request(app.getHttpServer())
      .post(`/api/v1/chat/conversations/${directId}/messages`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({
        type: 'TEXT',
        text: 'reply',
        clientMessageId: 'client-message-reply1',
        replyToMessageId: firstMessageId,
      })
      .expect(201);
    expect((reply.body as { replyTo: { id: string } }).replyTo.id).toBe(
      firstMessageId,
    );

    const deleted = await request(app.getHttpServer())
      .delete(`/api/v1/chat/messages/${firstMessageId}`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .expect(200);
    expect((deleted.body as MessageBody).deletedAt).toBeTruthy();
    expect((deleted.body as MessageBody).text).toBeNull();

    const history = await request(app.getHttpServer())
      .get(`/api/v1/chat/conversations/${directId}/messages?limit=2`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .expect(200);
    expect((history.body as { items: MessageBody[] }).items).toHaveLength(2);
    expect(
      (history.body as { pageInfo: { hasNextPage: boolean } }).pageInfo
        .hasNextPage,
    ).toBe(true);
  });

  it('accepts owned READY voice media and rejects spoofed attachment metadata', async () => {
    const nowKey = `${stamp}-${Date.now()}`;
    const owned = await prisma.mediaObject.create({
      data: {
        ownerId: userIds[0],
        objectKey: `tests/chat/${nowKey}-voice.webm`,
        originalFilename: 'voice.webm',
        mimeType: 'audio/webm;codecs=opus',
        sizeBytes: BigInt(16000),
        kind: MediaKind.AUDIO,
        status: MediaStatus.READY,
        durationMs: 4200,
        uploadedAt: new Date(),
      },
    });
    const foreign = await prisma.mediaObject.create({
      data: {
        ownerId: userIds[1],
        objectKey: `tests/chat/${nowKey}-foreign.webm`,
        originalFilename: 'foreign.webm',
        mimeType: 'audio/webm',
        sizeBytes: BigInt(16000),
        kind: MediaKind.AUDIO,
        status: MediaStatus.READY,
        durationMs: 4200,
        uploadedAt: new Date(),
      },
    });

    const sent = await request(app.getHttpServer())
      .post(`/api/v1/chat/conversations/${directId}/messages`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({
        type: 'VOICE',
        clientMessageId: 'voice-message-0001',
        mediaObjectIds: [owned.id],
        durationMs: 4200,
        waveform: [10, 40, 90, 20],
      })
      .expect(201);
    expect((sent.body as { attachments: unknown[] }).attachments).toHaveLength(
      1,
    );
    raceReadTargetId = (sent.body as MessageBody).id;

    await request(app.getHttpServer())
      .post(`/api/v1/chat/conversations/${directId}/messages`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({
        type: 'VOICE',
        clientMessageId: 'voice-message-foreign',
        mediaObjectIds: [foreign.id],
        durationMs: 4200,
      })
      .expect(400);

    await request(app.getHttpServer())
      .post(`/api/v1/chat/conversations/${directId}/messages`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({
        type: 'VOICE',
        clientMessageId: 'voice-message-mismatch',
        mediaObjectIds: [owned.id],
        durationMs: 10000,
      })
      .expect(400);
  });

  it('preserves a new unread message during a concurrent read/send race', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/chat/conversations/${directId}/read`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({ lastReadMessageId: raceReadTargetId })
      .expect(200);

    await Promise.all([
      request(app.getHttpServer())
        .post(`/api/v1/chat/conversations/${directId}/messages`)
        .set('Authorization', `Bearer ${tokens[0]}`)
        .send({
          type: 'TEXT',
          text: 'arrives during read',
          clientMessageId: 'read-send-race-0001',
        })
        .expect(201),
      request(app.getHttpServer())
        .patch(`/api/v1/chat/conversations/${directId}/read`)
        .set('Authorization', `Bearer ${tokens[1]}`)
        .send({ lastReadMessageId: raceReadTargetId })
        .expect(200),
    ]);

    const detail = await request(app.getHttpServer())
      .get(`/api/v1/chat/conversations/${directId}`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .expect(200);
    expect((detail.body as ConversationBody).unreadCount).toBe(1);
  });

  it('creates a group and enforces admin/member boundaries', async () => {
    const created = await request(app.getHttpServer())
      .post('/api/v1/chat/conversations')
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({ type: 'GROUP', title: 'Phase Eight', memberIds: [userIds[1]] })
      .expect(201);
    const group = created.body as ConversationBody;
    expect(group.type).toBe('GROUP');

    await request(app.getHttpServer())
      .post(`/api/v1/chat/conversations/${group.id}/members`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .send({ userId: userIds[2] })
      .expect(403);

    await request(app.getHttpServer())
      .post(`/api/v1/chat/conversations/${group.id}/members`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({ userId: userIds[2] })
      .expect(201);

    const concurrent = await Promise.all(
      Array.from({ length: 5 }, (_, index) =>
        request(app.getHttpServer())
          .post(`/api/v1/chat/conversations/${group.id}/messages`)
          .set('Authorization', `Bearer ${tokens[0]}`)
          .send({
            type: 'TEXT',
            text: `concurrent ${index}`,
            clientMessageId: `group-concurrent-${index}`,
          })
          .expect(201),
      ),
    );
    const sent = concurrent.map((response) => response.body as MessageBody);
    const actualNewest = [...sent].sort(
      (left, right) =>
        right.createdAt.localeCompare(left.createdAt) ||
        right.id.localeCompare(left.id),
    )[0];
    const memberConversation = await request(app.getHttpServer())
      .get(`/api/v1/chat/conversations/${group.id}`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .expect(200);
    const memberBody = memberConversation.body as ConversationBody;
    expect(memberBody.unreadCount).toBe(5);
    expect(memberBody.lastMessage?.id).toBe(actualNewest.id);
  });

  it('rechecks block boundaries before every direct send', async () => {
    await request(app.getHttpServer())
      .post(`/api/v1/social/block/${userIds[0]}`)
      .set('Authorization', `Bearer ${tokens[1]}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/v1/chat/conversations/${directId}/messages`)
      .set('Authorization', `Bearer ${tokens[0]}`)
      .send({
        type: 'TEXT',
        text: 'must not pass block boundary',
        clientMessageId: 'blocked-message-0001',
      })
      .expect(403);
  });
});
