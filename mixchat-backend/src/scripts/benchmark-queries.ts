import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { PrismaService } from '../infrastructure/database/prisma.service';
import { PostsService } from '../modules/posts/posts.service';
import { UsersService } from '../modules/users/users.service';
import { CommentsService } from '../modules/comments/comments.service';
import { StoriesService } from '../modules/stories/stories.service';
import { ReelsService } from '../modules/reels/reels.service';
import { NotificationsService } from '../modules/notifications/notifications.service';
import { ChatService } from '../modules/chat/chat.service';
import { SearchService } from '../modules/search/search.service';
import { SearchType } from '../modules/search/dto/search-query.dto';
import { MapService } from '../modules/map/map.service';

const BENCHMARK_USER_ID = '16000000-0000-4000-8000-000000000001';
const BENCHMARK_POST_ID = '26000000-0000-4000-8000-000000000001';
const BENCHMARK_CONVERSATION_ID = 'a6000000-0000-4000-8000-000000000001';

async function main() {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Query benchmarks are forbidden in production.');
  }

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: false,
  });
  const prisma = app.get(PrismaService);
  const posts = app.get(PostsService);
  const users = app.get(UsersService);
  const comments = app.get(CommentsService);
  const stories = app.get(StoriesService);
  const reels = app.get(ReelsService);
  const notifications = app.get(NotificationsService);
  const chat = app.get(ChatService);
  const search = app.get(SearchService);
  const map = app.get(MapService);

  const scenarios: Array<{
    name: string;
    maxQueries: number;
    operation: () => Promise<unknown>;
  }> = [
    {
      name: 'feed.limit20',
      maxQueries: 12,
      operation: () =>
        posts.getFeed(BENCHMARK_USER_ID, { tab: 'for_you', limit: 20 }),
    },
    {
      name: 'feed.limit50',
      maxQueries: 12,
      operation: () =>
        posts.getFeed(BENCHMARK_USER_ID, { tab: 'for_you', limit: 50 }),
    },
    {
      name: 'userSearch.limit20',
      maxQueries: 7,
      operation: () =>
        users.searchUsers(BENCHMARK_USER_ID, 'phase16_user_', 20),
    },
    {
      name: 'userSearch.limit50',
      maxQueries: 7,
      operation: () =>
        users.searchUsers(BENCHMARK_USER_ID, 'phase16_user_', 50),
    },
    {
      name: 'comments.limit50',
      maxQueries: 6,
      operation: () =>
        comments.getPostComments(BENCHMARK_USER_ID, BENCHMARK_POST_ID, {
          limit: 50,
        }),
    },
    {
      name: 'stories.active',
      maxQueries: 10,
      operation: () => stories.getActiveStories(BENCHMARK_USER_ID),
    },
    {
      name: 'reels.following',
      maxQueries: 10,
      operation: () =>
        reels.getReelsFeed(BENCHMARK_USER_ID, {
          feed: 'following',
          limit: 30,
        }),
    },
    {
      name: 'notifications.limit50',
      maxQueries: 4,
      operation: () =>
        notifications.listNotifications(BENCHMARK_USER_ID, { limit: 50 }),
    },
    {
      name: 'conversations.limit30',
      maxQueries: 11,
      operation: () =>
        chat.listConversations(BENCHMARK_USER_ID, {
          limit: 30,
          archived: false,
        }),
    },
    {
      name: 'messages.limit30',
      maxQueries: 9,
      operation: () =>
        chat.listMessages(BENCHMARK_USER_ID, BENCHMARK_CONVERSATION_ID, {
          limit: 30,
          archived: false,
        }),
    },
    {
      name: 'search.universal',
      maxQueries: 24,
      operation: () =>
        search.universalSearch(
          { q: 'topic42', type: SearchType.ALL, limit: 20 },
          BENCHMARK_USER_ID,
        ),
    },
    {
      name: 'map.friends',
      maxQueries: 5,
      operation: () => map.getFriendsLocations(BENCHMARK_USER_ID),
    },
  ];

  try {
    for (const scenario of scenarios) {
      const startedAt = performance.now();
      const { measurement } = await prisma.measureQueries(scenario.operation);
      console.log(
        JSON.stringify({
          scenario: scenario.name,
          maxQueries: scenario.maxQueries,
          wallTimeMs: Number((performance.now() - startedAt).toFixed(3)),
          ...measurement,
        }),
      );
      if (measurement.count > scenario.maxQueries) {
        throw new Error(
          `${scenario.name} exceeded its query budget: ${measurement.count} > ${scenario.maxQueries}`,
        );
      }
    }
  } finally {
    await app.close();
  }
}

void main();
