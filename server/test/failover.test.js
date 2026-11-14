/**
 * Multi-key NASA failover test.
 *
 * Runs the deterministic harness (server/__verify_failover.cjs) in a child
 * process. The harness makes the first key return HTTP 429 and asserts the
 * request is still served after automatically retrying with the next key.
 *
 * Run:  npm test        (inside the server/ directory)
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { spawn } = require('node:child_process');
const path = require('node:path');

const runHarness = async (env) => {
  const child = spawn(process.execPath, [path.join(__dirname, '..', '__verify_failover.cjs')], {
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
  child.stderr.on('data', () => {});

  await new Promise((resolve) => child.on('exit', resolve));

  const line = stdout.split(/\r?\n/).find((l) => l.includes('FAILOVER_RESULT'));
  assert.ok(line, `harness did not emit a result line. Output:\n${stdout}`);
  return JSON.parse(line.slice(line.indexOf('{')));
};

test('failover: a rate-limited first key is skipped and the next key is used', async () => {
  const result = await runHarness({ FAILOVER_PORT: '5097' });
  assert.strictEqual(result.status, 200, 'request should still succeed after failover');
  assert.strictEqual(result.rotated, true, 'expected rotation to a second key');
  assert.ok(result.distinctKeys >= 2, `expected >= 2 distinct keys, saw ${result.distinctKeys}`);
});

test('failover: the pool walks through all three keys when two are exhausted', async () => {
  const result = await runHarness({ FAILOVER_PORT: '5096', FAILOVER_FAIL_COUNT: '2' });
  assert.strictEqual(result.status, 200, 'request should still succeed after two rotations');
  assert.strictEqual(result.rotated, true, 'expected rotation through the key pool');
  assert.ok(result.distinctKeys >= 3, `expected >= 3 distinct keys, saw ${result.distinctKeys}`);
});
