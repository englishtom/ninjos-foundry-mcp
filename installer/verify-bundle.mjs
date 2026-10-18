#!/usr/bin/env node
/** Verify a native macOS ZIP without touching an installed server or client config. */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

assert.equal(process.platform, 'darwin', 'Run this check on macOS');
const project = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(project, 'package.json'), 'utf8'));
const name = `ninjos-foundry-mcp-server-${version}-darwin-${process.arch}`;
const zip = join(project, 'installer', 'out', `${name}.zip`);
const digest = createHash('sha256').update(readFileSync(zip)).digest('hex');
assert.equal(readFileSync(`${zip}.sha256`, 'utf8'), `${digest}  ${name}.zip\n`);
const temporary = mkdtempSync(join(tmpdir(), 'foundry bundle '));
try {
  const unpacked = spawnSync('ditto', ['-x', '-k', zip, temporary], { encoding: 'utf8' });
  assert.equal(unpacked.status, 0, unpacked.stderr);
  const bundle = join(temporary, name);
  for (const file of ['node', 'setup.command', 'uninstall.command']) {
    assert.ok(statSync(join(bundle, file)).mode & 0o111, `${file} must be executable`);
  }
  for (const file of ['LICENSE.txt', 'NODE-LICENSE.txt', 'THIRD-PARTY-NOTICES.txt']) {
    assert.ok(readFileSync(join(bundle, file), 'utf8').length > 0);
  }
  const runtime = spawnSync(join(bundle, 'node'), ['-p', 'process.platform + "-" + process.arch'], {
    encoding: 'utf8',
  });
  assert.equal(runtime.status, 0, runtime.stderr);
  assert.equal(runtime.stdout.trim(), `darwin-${process.arch}`);
  // print-config loads the real packaged CLI and imports, but never writes user files.
  const cli = spawnSync(
    join(bundle, 'node'),
    [join(bundle, 'app/build/server/install/cli.js'), 'print-config'],
    {
      encoding: 'utf8',
    }
  );
  assert.equal(cli.status, 0, cli.stderr);
  assert.ok(cli.stdout.includes('foundry-mcp'));
  console.log(`Verified ${name}: checksum, extraction, permissions, runtime and CLI`);
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
