import pg from 'pg';

const { Pool } = pg;
const connectionString =
  process.env.DATABASE_URL ??
  'postgresql://mixchat:mixchat_dev_secret@localhost:5433/mixchat_db?schema=public';

if (process.env.NODE_ENV === 'production') {
  throw new Error('EXPLAIN benchmarks are forbidden in production.');
}

const pool = new Pool({
  connectionString,
  max: 1,
  connectionTimeoutMillis: 5_000,
  statement_timeout: 30_000,
  application_name: 'mixchat-phase16-explain',
});

const scenarios = [
  {
    name: 'user_substring_search',
    sql: `SELECT id, username, display_name, followers_count
      FROM users
      WHERE username ILIKE '%phase16_user_%'
         OR display_name ILIKE '%phase16_user_%'
         OR bio ILIKE '%phase16_user_%'
      ORDER BY followers_count DESC
      LIMIT 60`,
  },
  {
    name: 'post_content_search',
    sql: `SELECT id, author_id, created_at
      FROM posts
      WHERE status = 'PUBLISHED'
        AND (content ILIKE '%topic42%' OR location_tag ILIKE '%topic42%')
      ORDER BY created_at DESC, id DESC
      LIMIT 21`,
  },
  {
    name: 'home_feed',
    sql: `SELECT id, author_id, created_at
      FROM posts
      WHERE status = 'PUBLISHED'
      ORDER BY created_at DESC, id DESC
      LIMIT 51`,
  },
  {
    name: 'followers_page',
    sql: `SELECT id, follower_id, created_at
      FROM follows
      WHERE following_id = '16000000-0000-4000-8000-000000000001'
      ORDER BY created_at DESC, id DESC
      LIMIT 51`,
  },
  {
    name: 'trending_feed',
    sql: `SELECT id, author_id, likes_count, created_at
      FROM posts
      WHERE status = 'PUBLISHED'
      ORDER BY likes_count DESC, created_at DESC, id DESC
      LIMIT 51`,
  },
];

function summarizePlan(node) {
  return {
    nodeType: node['Node Type'],
    relation: node['Relation Name'],
    index: node['Index Name'],
    actualRows: node['Actual Rows'],
    loops: node['Actual Loops'],
    rowsRemovedByFilter: node['Rows Removed by Filter'],
    sharedHitBlocks: node['Shared Hit Blocks'],
    sharedReadBlocks: node['Shared Read Blocks'],
    children: node.Plans?.map(summarizePlan),
  };
}

const client = await pool.connect();
try {
  for (const scenario of scenarios) {
    const result = await client.query(
      `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${scenario.sql}`,
    );
    const report = result.rows[0]['QUERY PLAN'][0];
    console.log(
      JSON.stringify({
        scenario: scenario.name,
        planningTimeMs: report['Planning Time'],
        executionTimeMs: report['Execution Time'],
        plan: summarizePlan(report.Plan),
      }),
    );
  }
} finally {
  client.release();
  await pool.end();
}
