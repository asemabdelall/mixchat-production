import pg from 'pg';

const { Pool } = pg;
const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://mixchat:mixchat_dev_secret@localhost:5433/mixchat_db?schema=public';

if (process.env.NODE_ENV === 'production') {
  throw new Error('The Phase 16 benchmark dataset is forbidden in production.');
}

const pool = new Pool({
  connectionString,
  max: 2,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 120_000,
  application_name: 'mixchat-phase16-seed',
});

const cleanupStatements = [
  `UPDATE conversations
   SET last_message_id = NULL, last_message_at = NULL
   WHERE id LIKE 'a6000000-%'`,
  `DELETE FROM conversations WHERE id LIKE 'a6000000-%'`,
  `DELETE FROM stories WHERE id LIKE '96000000-%'`,
  `DELETE FROM reels WHERE id LIKE '86000000-%'`,
  `DELETE FROM posts WHERE id LIKE '26000000-%'`,
  `DELETE FROM media_objects WHERE id LIKE '36000000-%'`,
  `DELETE FROM users WHERE id LIKE '16000000-%'`,
  `DELETE FROM system_metadata WHERE key = 'phase16_benchmark_dataset'`,
];

async function cleanup(client) {
  await client.query('BEGIN');
  try {
    for (const statement of cleanupStatements) {
      await client.query(statement);
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

const seedSteps = [
  {
    name: '10,000 users',
    sql: `INSERT INTO users (
      id, email, username, display_name, bio, password_hash, role, status,
      followers_count, following_count, posts_count, created_at, updated_at
    )
    SELECT
      ('16000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      'phase16_' || lpad(i::text, 5, '0') || '@benchmark.invalid',
      'phase16_user_' || lpad(i::text, 5, '0'),
      'Phase 16 User ' || i,
      'Deterministic performance benchmark account ' || i,
      '$argon2id$v=19$m=19456,t=2,p=1$cGhhc2UxNg$cGhhc2UxNmJlbmNobWFyaw',
      'USER'::"UserRole", 'ACTIVE'::"UserStatus", 20, 20, 10,
      timestamp '2026-01-01 00:00:00' + (i || ' seconds')::interval,
      timestamp '2026-01-01 00:00:00' + (i || ' seconds')::interval
    FROM generate_series(1, 10000) AS i`,
  },
  {
    name: '200,000 follows',
    sql: `INSERT INTO follows (id, follower_id, following_id, created_at)
    SELECT
      ('56000000-0000-4000-8000-' || lpad(to_hex((u - 1) * 20 + edge), 12, '0'))::uuid::text,
      ('16000000-0000-4000-8000-' || lpad(to_hex(u), 12, '0'))::uuid::text,
      ('16000000-0000-4000-8000-' || lpad(to_hex(((u + edge - 1) % 10000) + 1), 12, '0'))::uuid::text,
      timestamp '2026-02-01 00:00:00' + (((u - 1) * 20 + edge) || ' seconds')::interval
    FROM generate_series(1, 10000) AS u
    CROSS JOIN generate_series(1, 20) AS edge`,
  },
  {
    name: '10,000 media objects',
    sql: `INSERT INTO media_objects (
      id, owner_id, object_key, original_filename, mime_type, size_bytes,
      kind, status, width, height, duration_ms, uploaded_at, created_at, updated_at
    )
    SELECT
      ('36000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      ('16000000-0000-4000-8000-' || lpad(to_hex(((i - 1) % 10000) + 1), 12, '0'))::uuid::text,
      'bench/phase16/' || i || CASE WHEN i % 5 = 0 THEN '.mp4' ELSE '.webp' END,
      'phase16-' || i || CASE WHEN i % 5 = 0 THEN '.mp4' ELSE '.webp' END,
      CASE WHEN i % 5 = 0 THEN 'video/mp4' ELSE 'image/webp' END,
      CASE WHEN i % 5 = 0 THEN 4000000 ELSE 180000 END,
      CASE WHEN i % 5 = 0 THEN 'VIDEO'::"MediaKind" ELSE 'IMAGE'::"MediaKind" END,
      'READY'::"MediaStatus", 1080, CASE WHEN i % 5 = 0 THEN 1920 ELSE 1080 END,
      CASE WHEN i % 5 = 0 THEN 15000 ELSE NULL END,
      timestamp '2026-03-01 00:00:00', timestamp '2026-03-01 00:00:00', timestamp '2026-03-01 00:00:00'
    FROM generate_series(1, 10000) AS i`,
  },
  {
    name: '100,000 posts',
    sql: `INSERT INTO posts (
      id, author_id, content, visibility, status, location_tag,
      likes_count, comments_count, bookmarks_count, reposts_count,
      created_at, updated_at
    )
    SELECT
      ('26000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      ('16000000-0000-4000-8000-' || lpad(to_hex(((i - 1) % 10000) + 1), 12, '0'))::uuid::text,
      'Phase 16 benchmark post ' || i || ' #mixchat #performance topic' || (i % 250),
      CASE WHEN i % 20 = 0 THEN 'FOLLOWERS'::"PostVisibility" ELSE 'PUBLIC'::"PostVisibility" END,
      'PUBLISHED'::"PostStatus", CASE WHEN i % 9 = 0 THEN 'Kuwait City' ELSE NULL END,
      3, CASE WHEN i <= 50000 THEN 1 ELSE 0 END, i % 7, i % 4,
      timestamp '2026-04-01 00:00:00' + (i || ' seconds')::interval,
      timestamp '2026-04-01 00:00:00' + (i || ' seconds')::interval
    FROM generate_series(1, 100000) AS i`,
  },
  {
    name: '10,000 post media relations',
    sql: `INSERT INTO post_media (id, post_id, media_object_id, position, created_at)
    SELECT
      ('46000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      ('26000000-0000-4000-8000-' || lpad(to_hex(i * 10), 12, '0'))::uuid::text,
      ('36000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      0, timestamp '2026-04-01 00:00:00' + ((i * 10) || ' seconds')::interval
    FROM generate_series(1, 10000) AS i`,
  },
  {
    name: '300,000 post likes',
    sql: `INSERT INTO post_likes (id, user_id, post_id, created_at)
    SELECT
      ('d6000000-0000-4000-8000-' || lpad(to_hex((p - 1) * 3 + edge), 12, '0'))::uuid::text,
      ('16000000-0000-4000-8000-' || lpad(to_hex(((p + edge * 97 - 1) % 10000) + 1), 12, '0'))::uuid::text,
      ('26000000-0000-4000-8000-' || lpad(to_hex(p), 12, '0'))::uuid::text,
      timestamp '2026-04-02 00:00:00' + (((p - 1) * 3 + edge) || ' seconds')::interval
    FROM generate_series(1, 100000) AS p
    CROSS JOIN generate_series(1, 3) AS edge`,
  },
  {
    name: '50,000 comments',
    sql: `INSERT INTO comments (
      id, post_id, author_id, content, status, replies_count, likes_count, created_at, updated_at
    )
    SELECT
      ('66000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      ('26000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      ('16000000-0000-4000-8000-' || lpad(to_hex(((i + 313) % 10000) + 1), 12, '0'))::uuid::text,
      'Phase 16 benchmark comment ' || i, 'PUBLISHED'::"CommentStatus", 0, i % 5,
      timestamp '2026-05-01 00:00:00' + (i || ' seconds')::interval,
      timestamp '2026-05-01 00:00:00' + (i || ' seconds')::interval
    FROM generate_series(1, 50000) AS i`,
  },
  {
    name: '100,000 notifications',
    sql: `INSERT INTO notifications (
      id, recipient_id, actor_id, type, entity_id, entity_type, read_at, metadata, created_at
    )
    SELECT
      ('76000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      ('16000000-0000-4000-8000-' || lpad(to_hex(((i - 1) % 10000) + 1), 12, '0'))::uuid::text,
      ('16000000-0000-4000-8000-' || lpad(to_hex(((i + 17) % 10000) + 1), 12, '0'))::uuid::text,
      'LIKE_POST'::"NotificationType",
      ('26000000-0000-4000-8000-' || lpad(to_hex(((i - 1) % 100000) + 1), 12, '0'))::uuid::text,
      'POST', CASE WHEN i % 4 = 0 THEN timestamp '2026-06-02 00:00:00' ELSE NULL END,
      jsonb_build_object('benchmark', true),
      timestamp '2026-06-01 00:00:00' + (i || ' seconds')::interval
    FROM generate_series(1, 100000) AS i`,
  },
  {
    name: '1,000 Stories',
    sql: `INSERT INTO stories (
      id, author_id, media_object_id, caption, audience, status,
      views_count, expires_at, created_at, updated_at
    )
    SELECT
      ('96000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      ('16000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      ('36000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      'Phase 16 Story ' || i, 'PUBLIC'::"StoryAudience", 'ACTIVE'::"StoryStatus", i % 500,
      CASE WHEN i % 2 = 0 THEN now() + interval '12 hours' ELSE now() - interval '12 hours' END,
      now() - ((i % 86400) || ' seconds')::interval,
      now() - ((i % 86400) || ' seconds')::interval
    FROM generate_series(1, 1000) AS i`,
  },
  {
    name: '1,000 Reels',
    sql: `INSERT INTO reels (
      id, author_id, media_object_id, caption, audio_title, visibility, status,
      likes_count, comments_count, bookmarks_count, views_count, shares_count,
      duration_ms, created_at, updated_at
    )
    SELECT
      ('86000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      ('16000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      ('36000000-0000-4000-8000-' || lpad(to_hex(i * 5), 12, '0'))::uuid::text,
      'Phase 16 Reel ' || i || ' #performance', 'Benchmark audio ' || (i % 20),
      'PUBLIC'::"PostVisibility", 'PUBLISHED'::"PostStatus",
      i % 1000, i % 100, i % 70, i * 13, i % 30, 15000,
      timestamp '2026-07-01 00:00:00' + (i || ' seconds')::interval,
      timestamp '2026-07-01 00:00:00' + (i || ' seconds')::interval
    FROM generate_series(1, 1000) AS i`,
  },
  {
    name: '1,000 direct conversations',
    sql: `INSERT INTO conversations (
      id, type, direct_key, creator_id, last_message_at, created_at, updated_at
    )
    SELECT
      ('a6000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      'DIRECT'::"ConversationType",
      ('16000000-0000-4000-8000-' || lpad(to_hex(1), 12, '0'))::uuid::text || ':' ||
        ('16000000-0000-4000-8000-' || lpad(to_hex(i + 1), 12, '0'))::uuid::text,
      ('16000000-0000-4000-8000-' || lpad(to_hex(1), 12, '0'))::uuid::text,
      timestamp '2026-08-01 00:00:00' + (i || ' seconds')::interval,
      timestamp '2026-08-01 00:00:00' + (i || ' seconds')::interval,
      timestamp '2026-08-01 00:00:00' + (i || ' seconds')::interval
    FROM generate_series(1, 1000) AS i`,
  },
  {
    name: '2,000 conversation participants',
    sql: `INSERT INTO conversation_participants (
      id, conversation_id, user_id, role, unread_count, joined_at
    )
    SELECT
      ('c6000000-0000-4000-8000-' || lpad(to_hex((i - 1) * 2 + side), 12, '0'))::uuid::text,
      ('a6000000-0000-4000-8000-' || lpad(to_hex(i), 12, '0'))::uuid::text,
      CASE WHEN side = 1
        THEN ('16000000-0000-4000-8000-' || lpad(to_hex(1), 12, '0'))::uuid::text
        ELSE ('16000000-0000-4000-8000-' || lpad(to_hex(i + 1), 12, '0'))::uuid::text
      END,
      'MEMBER'::"ConversationParticipantRole", CASE WHEN side = 1 THEN i % 20 ELSE 0 END,
      timestamp '2026-08-01 00:00:00' + (i || ' seconds')::interval
    FROM generate_series(1, 1000) AS i
    CROSS JOIN generate_series(1, 2) AS side`,
  },
  {
    name: '50,000 messages',
    sql: `INSERT INTO messages (
      id, conversation_id, sender_id, type, text, client_message_id, created_at
    )
    SELECT
      ('b6000000-0000-4000-8000-' || lpad(to_hex((c - 1) * 50 + m), 12, '0'))::uuid::text,
      ('a6000000-0000-4000-8000-' || lpad(to_hex(c), 12, '0'))::uuid::text,
      CASE WHEN m % 2 = 0
        THEN ('16000000-0000-4000-8000-' || lpad(to_hex(1), 12, '0'))::uuid::text
        ELSE ('16000000-0000-4000-8000-' || lpad(to_hex(c + 1), 12, '0'))::uuid::text
      END,
      'TEXT'::"MessageType", 'Phase 16 benchmark message ' || m,
      'phase16-' || c || '-' || m,
      timestamp '2026-08-01 00:00:00' + (((c - 1) * 50 + m) || ' seconds')::interval
    FROM generate_series(1, 1000) AS c
    CROSS JOIN generate_series(1, 50) AS m`,
  },
  {
    name: 'conversation latest-message pointers',
    sql: `UPDATE conversations AS c
    SET last_message_id = ('b6000000-0000-4000-8000-' || lpad(to_hex((x.n - 1) * 50 + 50), 12, '0'))::uuid::text,
        last_message_at = timestamp '2026-08-01 00:00:00' + (((x.n - 1) * 50 + 50) || ' seconds')::interval
    FROM generate_series(1, 1000) AS x(n)
    WHERE c.id = ('a6000000-0000-4000-8000-' || lpad(to_hex(x.n), 12, '0'))::uuid::text`,
  },
];

async function main() {
  const client = await pool.connect();
  try {
    console.log('Removing any previous Phase 16 benchmark rows...');
    await cleanup(client);
    if (process.argv.includes('--cleanup')) {
      console.log('Phase 16 benchmark dataset removed.');
      return;
    }

    for (const step of seedSteps) {
      const startedAt = performance.now();
      await client.query(step.sql);
      console.log(
        `${step.name}: ${Math.round(performance.now() - startedAt)} ms`,
      );
    }
    await client.query(
      `INSERT INTO system_metadata (id, key, value, created_at, updated_at)
       VALUES ('f6000000-0000-4000-8000-000000000001', 'phase16_benchmark_dataset',
         'users=10000;posts=100000;follows=200000;likes=300000;comments=50000;notifications=100000;conversations=1000;messages=50000',
         now(), now())`,
    );
    await client.query('ANALYZE');
    console.log('Phase 16 deterministic benchmark dataset is ready.');
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : String(error));
  await pool.end().catch(() => undefined);
  process.exitCode = 1;
});
