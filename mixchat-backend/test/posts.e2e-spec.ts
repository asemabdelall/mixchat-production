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

interface PostResponseBody {
  id: string;
  content: string;
  visibility: string;
  stats: {
    likesCount: number;
    commentsCount: number;
    repostsCount?: number;
  };
  viewer: {
    hasLiked: boolean;
    hasBookmarked: boolean;
    hasReposted: boolean;
  };
  editedAt?: string | null;
  createdAt: string;
}

interface FeedResponseBody {
  items: PostResponseBody[];
  pageInfo: {
    nextCursor: string | null;
    hasNextPage: boolean;
  };
}

interface LikeResponseBody {
  hasLiked: boolean;
  likesCount: number;
}

interface BookmarkResponseBody {
  hasBookmarked: boolean;
}

interface RepostResponseBody {
  hasReposted: boolean;
  repostsCount: number;
}

describe('Posts, Feed & Core Interactions (e2e)', () => {
  let app: INestApplication<App>;

  const timestamp = Date.now();
  const userA = {
    email: `post_author_${timestamp}@mixchat.app`,
    username: `author_${timestamp}`,
    password: 'Password123!',
  };
  const userB = {
    email: `post_viewer_${timestamp}@mixchat.app`,
    username: `viewer_${timestamp}`,
    password: 'Password123!',
  };

  let tokenA: string;
  let tokenB: string;
  let createdPostId: string;

  beforeAll(async () => {
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

    await app.init();

    // Register User A
    const resA = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userA)
      .expect(201);

    const bodyA = resA.body as AuthResponseBody;
    tokenA = bodyA.accessToken;

    // Register User B
    const resB = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send(userB)
      .expect(201);

    const bodyB = resB.body as AuthResponseBody;
    tokenB = bodyB.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('1. Post Creation (POST /api/posts)', () => {
    it('should reject empty post', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: '   ' })
        .expect(400);
    });

    it('should create a valid text post', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/posts')
        .set('Authorization', `Bearer ${tokenA}`)
        .send({
          content: 'Hello World from E2E Post Test! #mixchat',
          locationTag: 'San Francisco, CA',
        })
        .expect(201);

      const body = res.body as PostResponseBody;
      expect(body.id).toBeDefined();
      expect(body.content).toContain('Hello World from E2E');
      expect(body.stats.likesCount).toBe(0);
      createdPostId = body.id;
    });
  });

  describe('2. Feed & Post Details (GET /api/posts/feed, GET /api/posts/:id)', () => {
    it('should retrieve created post in feed for viewer User B', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/posts/feed?tab=for_you&limit=10')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const feed = res.body as FeedResponseBody;
      expect(feed.items).toBeDefined();
      const found = feed.items.find((p) => p.id === createdPostId);
      expect(found).toBeDefined();
      expect(found?.viewer.hasLiked).toBe(false);
      expect(found?.viewer.hasBookmarked).toBe(false);
      expect(found?.viewer.hasReposted).toBe(false);
    });

    it('should retrieve single post details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const body = res.body as PostResponseBody;
      expect(body.id).toBe(createdPostId);
      expect(body.content).toContain('Hello World from E2E');
    });

    it('should return 404 for non-existent post', async () => {
      await request(app.getHttpServer())
        .get('/api/v1/posts/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });

  describe('3. Likes (PUT & DELETE /api/posts/:id/like)', () => {
    it('should like post and increment counter to 1', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/posts/${createdPostId}/like`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const body = res.body as LikeResponseBody;
      expect(body.hasLiked).toBe(true);
      expect(body.likesCount).toBe(1);
    });

    it('should handle duplicate like idempotently', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/posts/${createdPostId}/like`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const body = res.body as LikeResponseBody;
      expect(body.hasLiked).toBe(true);
      expect(body.likesCount).toBe(1);
    });

    it('should reflect liked state in single post and feed queries', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const body = res.body as PostResponseBody;
      expect(body.viewer.hasLiked).toBe(true);
      expect(body.stats.likesCount).toBe(1);
    });

    it('should unlike post and decrement counter to 0', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/posts/${createdPostId}/like`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const body = res.body as LikeResponseBody;
      expect(body.hasLiked).toBe(false);
      expect(body.likesCount).toBe(0);
    });
  });

  describe('4. Bookmarks (PUT & DELETE /api/posts/:id/bookmark)', () => {
    it('should bookmark post successfully', async () => {
      const res = await request(app.getHttpServer())
        .put(`/api/v1/posts/${createdPostId}/bookmark`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const body = res.body as BookmarkResponseBody;
      expect(body.hasBookmarked).toBe(true);
    });

    it('should list post in user saved posts (/api/posts/bookmarks)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/posts/bookmarks')
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const body = res.body as FeedResponseBody;
      expect(body.items.some((p) => p.id === createdPostId)).toBe(true);
    });

    it('should unbookmark post successfully', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/api/v1/posts/${createdPostId}/bookmark`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const body = res.body as BookmarkResponseBody;
      expect(body.hasBookmarked).toBe(false);
    });
  });

  describe('5. Reposts (PUT & DELETE /api/posts/:id/repost)', () => {
    it('should repost once and keep duplicate requests idempotent', async () => {
      const first = await request(app.getHttpServer())
        .put(`/api/v1/posts/${createdPostId}/repost`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const firstBody = first.body as RepostResponseBody;
      expect(firstBody).toEqual({ hasReposted: true, repostsCount: 1 });

      const duplicate = await request(app.getHttpServer())
        .put(`/api/v1/posts/${createdPostId}/repost`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const duplicateBody = duplicate.body as RepostResponseBody;
      expect(duplicateBody).toEqual({ hasReposted: true, repostsCount: 1 });
    });

    it('should expose viewer repost state in post details', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const body = res.body as PostResponseBody;
      expect(body.viewer.hasReposted).toBe(true);
      expect(body.stats.repostsCount).toBe(1);
    });

    it('should undo repost once and keep duplicate requests idempotent', async () => {
      const first = await request(app.getHttpServer())
        .delete(`/api/v1/posts/${createdPostId}/repost`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const firstBody = first.body as RepostResponseBody;
      expect(firstBody).toEqual({ hasReposted: false, repostsCount: 0 });

      const duplicate = await request(app.getHttpServer())
        .delete(`/api/v1/posts/${createdPostId}/repost`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(200);

      const duplicateBody = duplicate.body as RepostResponseBody;
      expect(duplicateBody).toEqual({ hasReposted: false, repostsCount: 0 });
    });
  });

  describe('6. Post Updates & Deletions (PATCH & DELETE /api/posts/:id)', () => {
    it('should reject editing post by non-author User B', async () => {
      await request(app.getHttpServer())
        .patch(`/api/v1/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .send({ content: 'Malicious edit attempt' })
        .expect(403);
    });

    it('should update post content by author User A', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/api/v1/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .send({ content: 'Updated post content by author!' })
        .expect(200);

      const body = res.body as PostResponseBody;
      expect(body.content).toBe('Updated post content by author!');
      expect(body.editedAt).toBeDefined();
    });

    it('should reject deleting post by non-author User B', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(403);
    });

    it('should delete post by author User A and remove from feed', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${tokenA}`)
        .expect(200);

      // Verify post is now 404
      await request(app.getHttpServer())
        .get(`/api/v1/posts/${createdPostId}`)
        .set('Authorization', `Bearer ${tokenB}`)
        .expect(404);
    });
  });
});
