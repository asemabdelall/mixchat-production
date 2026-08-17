import pg from 'pg';

const { Pool } = pg;
const baseUrl = (
  process.env.LOAD_TEST_BASE_URL || 'http://127.0.0.1:4000/api/v1'
).replace(/\/$/, '');
const durationMs = Number(process.env.LOAD_TEST_DURATION_MS || 5_000);
const concurrency = Number(process.env.LOAD_TEST_CONCURRENCY || 10);

if (process.env.NODE_ENV === 'production') {
  throw new Error('The local load harness is forbidden in production.');
}
if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 100) {
  throw new Error('LOAD_TEST_CONCURRENCY must be an integer from 1 to 100.');
}
if (!Number.isFinite(durationMs) || durationMs < 1_000 || durationMs > 60_000) {
  throw new Error('LOAD_TEST_DURATION_MS must be between 1000 and 60000.');
}

const stamp = Date.now();
const credentials = {
  email: `phase16_load_${stamp}@benchmark.invalid`,
  username: `phase16_load_${stamp}`,
  password: 'BenchmarkPassword123!',
};

function percentile(sorted, fraction) {
  if (sorted.length === 0) return 0;
  return sorted[
    Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)
  ];
}

async function requestJson(path, init = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    signal: AbortSignal.timeout(10_000),
    headers: {
      'content-type': 'application/json',
      ...init.headers,
    },
  });
  if (!response.ok) {
    throw new Error(
      `${init.method || 'GET'} ${path} returned ${response.status}`,
    );
  }
  return response.json();
}

async function exerciseScenario(name, path, token) {
  const latencies = [];
  const statuses = new Map();
  const deadline = performance.now() + durationMs;

  async function worker() {
    while (performance.now() < deadline) {
      const startedAt = performance.now();
      try {
        const response = await fetch(`${baseUrl}${path}`, {
          headers: { authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(10_000),
        });
        statuses.set(response.status, (statuses.get(response.status) || 0) + 1);
        await response.arrayBuffer();
      } catch {
        statuses.set(0, (statuses.get(0) || 0) + 1);
      } finally {
        latencies.push(performance.now() - startedAt);
      }
    }
  }

  const startedAt = performance.now();
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  const elapsedMs = performance.now() - startedAt;
  latencies.sort((a, b) => a - b);
  const errors = [...statuses.entries()]
    .filter(([status]) => status < 200 || status >= 400)
    .reduce((total, [, count]) => total + count, 0);

  console.log(
    JSON.stringify({
      scenario: name,
      requests: latencies.length,
      requestsPerSecond: Number(
        (latencies.length / (elapsedMs / 1000)).toFixed(1),
      ),
      concurrency,
      durationMs: Math.round(elapsedMs),
      latencyMs: {
        p50: Number(percentile(latencies, 0.5).toFixed(2)),
        p95: Number(percentile(latencies, 0.95).toFixed(2)),
        p99: Number(percentile(latencies, 0.99).toFixed(2)),
        max: Number((latencies.at(-1) || 0).toFixed(2)),
      },
      statuses: Object.fromEntries(statuses),
      errors,
    }),
  );
}

let createdUserId;
try {
  const registration = await requestJson('/auth/register', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
  createdUserId = registration.user.id;
  const token = registration.accessToken;

  const scenarios = [
    ['feed', '/posts/feed?tab=for_you&limit=20'],
    ['universal_search', '/search/universal?q=topic42&type=all&limit=20'],
    ['notifications', '/notifications?limit=20'],
    ['conversations', '/chat/conversations?limit=20'],
  ];
  for (const [name, path] of scenarios) {
    await exerciseScenario(name, path, token);
  }
} finally {
  if (createdUserId) {
    const pool = new Pool({
      connectionString:
        process.env.DATABASE_URL ??
        'postgresql://mixchat:mixchat_dev_secret@localhost:5433/mixchat_db?schema=public',
      max: 1,
      application_name: 'mixchat-phase16-load-cleanup',
    });
    await pool.query('DELETE FROM users WHERE id = $1', [createdUserId]);
    await pool.end();
  }
}
