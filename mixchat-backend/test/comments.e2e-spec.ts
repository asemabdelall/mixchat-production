import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import cookieParser from 'cookie-parser';
import { AppModule } from './../src/app.module';
import { HttpExceptionFilter } from '../src/common/filters/http-exception.filter';

interface AuthResponseBody {
  user: {
    id: string;
    email: string;
    username: string;
  };
  accessToken: string;
}

interface CommentResponseBody {
  id: string;
  postId: string;
  parentId?: string | null;
  rootId?: string | null;
  author?: {
    id: string;
    username: string;
    displayName: string;
  } | null;
  content?: string | null;
  isDeleted: boolean;
  mentions: Array<{
    userId: string;
    username: string;
  }>;
  stats: {
    repliesCount: number;
    likesCount: number;
  };
  viewer: {
    hasLiked: boolean;
    canEdit: boolean;
    canDelete: boolean;
  };
  editedAt?: string | null;
  createdAt: string;
}

interface PaginatedCommentsBody {
  items: CommentResponseBody[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

describe('Comments, Threaded Replies & Social Depth (e2e)', () => {
  let app: INestApplication<App>;

  const timestamp = Date.now();
  const userA = {
    email: `comm_author_${timestamp}@mixchat.app`,
    username: `commauthor_${timestamp}`,
    password: 'Password123!',
  };
  const userB = {
    email: `comm_reply_${timestamp}@mixchat.app`,
    username: `commreply_${timestamp}`,
    password: 'Password123!',
  };

  let tokenA: string;
  let tokenB: string;
  let userIdB: string;
  let testPostId: string;
  let commentId1: string;
  let replyId1: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api');
    app.enableVersioning({
      type: VersioningType.URI,
      defaultVersion: '1',
    });
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    app.useGlobalFilters(new HttpExceptionFilter());

    await app.init();

    // Register User A
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userA)
      .expect(201);
    tokenA = (resA.body as AuthResponseBody).accessToken;

    // Register User B
    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userB)
      .expect(201);
    tokenB = (resB.body as AuthResponseBody).accessToken;
    userIdB = (resB.body as AuthResponseBody).user.id;

    // Create a Post by User A
    const postRes = await request(app.getHttpServer())
      .post('/api/v1/posts')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        content: 'Main post discussion test',
        visibility: 'PUBLIC',
      })
      .expect(201);

    testPostId = (postRes.body as { id: string }).id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /api/posts/:postId/comments -> creates top-level comment with mentions', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/posts/${testPostId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        content: `First comment here! Hello @${userB.username}`,
      })
      .expect(201);

    const body = res.body as CommentResponseBody;
    expect(body.id).toBeDefined();
    expect(body.postId).toBe(testPostId);
    expect(body.parentId).toBeNull();
    expect(body.content).toBe(`First comment here! Hello @${userB.username}`);
    expect(body.author?.username).toBe(userA.username);
    expect(body.mentions).toHaveLength(1);
    expect(body.mentions[0].username).toBe(userB.username);
    expect(body.mentions[0].userId).toBe(userIdB);
    expect(body.viewer.canEdit).toBe(true);
    expect(body.viewer.canDelete).toBe(true);

    commentId1 = body.id;

    // Verify post commentsCount updated
    const postRes = await request(app.getHttpServer())
      .get(`/api/v1/posts/${testPostId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(
      (postRes.body as { stats: { commentsCount: number } }).stats
        .commentsCount,
    ).toBe(1);
  });

  it('GET /api/posts/:postId/comments -> retrieves paginated comments', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/posts/${testPostId}/comments`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    const body = res.body as PaginatedCommentsBody;
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe(commentId1);
    expect(body.items[0].viewer.canEdit).toBe(false); // User B cannot edit User A's comment
    expect(body.pageInfo).toBeDefined();
  });

  it('POST /api/comments/:commentId/replies -> creates threaded reply', async () => {
    const res = await request(app.getHttpServer())
      .post(`/api/v1/comments/${commentId1}/replies`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        content: `Replying to your comment @${userA.username}!`,
      })
      .expect(201);

    const body = res.body as CommentResponseBody;
    expect(body.id).toBeDefined();
    expect(body.postId).toBe(testPostId);
    expect(body.parentId).toBe(commentId1);
    expect(body.rootId).toBe(commentId1);
    expect(body.author?.username).toBe(userB.username);
    expect(body.mentions).toHaveLength(1);
    expect(body.mentions[0].username).toBe(userA.username);

    replyId1 = body.id;

    // Verify root comment repliesCount updated
    const parentCheck = await request(app.getHttpServer())
      .get(`/api/v1/posts/${testPostId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const parentComment = (parentCheck.body as PaginatedCommentsBody).items[0];
    expect(parentComment.stats.repliesCount).toBe(1);

    // Verify post total comments count is 2 (1 top + 1 reply)
    const postRes = await request(app.getHttpServer())
      .get(`/api/v1/posts/${testPostId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(
      (postRes.body as { stats: { commentsCount: number } }).stats
        .commentsCount,
    ).toBe(2);
  });

  it('GET /api/comments/:commentId/replies -> retrieves thread replies', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/comments/${commentId1}/replies`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const body = res.body as PaginatedCommentsBody;
    expect(body.items).toHaveLength(1);
    expect(body.items[0].id).toBe(replyId1);
    expect(body.items[0].content).toContain(`Replying to your comment`);
  });

  it('PATCH /api/comments/:id -> author edits comment', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/comments/${replyId1}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .send({
        content: 'Edited reply message content',
      })
      .expect(200);

    const body = res.body as CommentResponseBody;
    expect(body.content).toBe('Edited reply message content');
    expect(body.editedAt).toBeDefined();
  });

  it('PATCH /api/comments/:id -> forbidden for non-author', async () => {
    await request(app.getHttpServer())
      .patch(`/api/v1/comments/${replyId1}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({
        content: 'Hacked content',
      })
      .expect(403);
  });

  it('PUT & DELETE /api/comments/:id/like -> manages comment likes', async () => {
    const likeRes = await request(app.getHttpServer())
      .put(`/api/v1/comments/${commentId1}/like`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(
      (likeRes.body as { hasLiked: boolean; likesCount: number }).hasLiked,
    ).toBe(true);
    expect(
      (likeRes.body as { hasLiked: boolean; likesCount: number }).likesCount,
    ).toBe(1);

    const unlikeRes = await request(app.getHttpServer())
      .delete(`/api/v1/comments/${commentId1}/like`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    expect(
      (unlikeRes.body as { hasLiked: boolean; likesCount: number }).hasLiked,
    ).toBe(false);
    expect(
      (unlikeRes.body as { hasLiked: boolean; likesCount: number }).likesCount,
    ).toBe(0);
  });

  it('DELETE /api/comments/:id -> deletes leaf reply and decrements parent repliesCount', async () => {
    await request(app.getHttpServer())
      .delete(`/api/v1/comments/${replyId1}`)
      .set('Authorization', `Bearer ${tokenB}`)
      .expect(200);

    // Verify parent comment repliesCount decremented to 0
    const parentCheck = await request(app.getHttpServer())
      .get(`/api/v1/posts/${testPostId}/comments`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    const parentComment = (parentCheck.body as PaginatedCommentsBody).items[0];
    expect(parentComment.stats.repliesCount).toBe(0);

    // Verify post commentsCount is now 1
    const postRes = await request(app.getHttpServer())
      .get(`/api/v1/posts/${testPostId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .expect(200);

    expect(
      (postRes.body as { stats: { commentsCount: number } }).stats
        .commentsCount,
    ).toBe(1);
  });
});
