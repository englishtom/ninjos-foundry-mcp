import { describe, expect, it } from 'vitest';
import { codexConfig, configureCodex, removeCodex } from './codex.js';
import type { DesiredEntry } from './client-config.js';
import type { CommandRunner } from './registry.js';

const entry: DesiredEntry = {
  command: '/Users/gm/Library/Application Support/FoundryMCPServer/node',
  args: ['/Users/gm/Library/Application Support/FoundryMCPServer/app/build/server/wrapper.js'],
};
const server = (name = 'foundry-mcp', extra = {}) => ({
  name,
  transport: { type: 'stdio', ...entry, ...extra },
  enabled: true,
  tool_timeout_sec: 180,
});

function fakeCodex(initial: unknown[]) {
  let servers = structuredClone(initial);
  const calls: string[][] = [];
  const runner: CommandRunner = {
    run(command, args) {
      expect(command).toBe('codex');
      calls.push(args);
      if (args[1] === 'list') return { status: 0, stdout: JSON.stringify(servers), stderr: '' };
      if (args[1] === 'add') servers.push(server());
      if (args[1] === 'remove') {
        servers = servers.filter(value => (value as { name: string }).name !== args[2]);
      }
      return { status: 0, stdout: '', stderr: '' };
    },
  };
  return { runner, calls, servers: () => servers };
}

describe('Codex configuration', () => {
  it('prints TOML with escaped Windows paths and spaced arguments', () => {
    expect(
      codexConfig({ command: 'C:\\Users\\Game Master\\node.exe', args: ['C:\\app\\wrapper.js'] })
    ).toBe(
      '[mcp_servers.foundry-mcp]\ncommand = "C:\\\\Users\\\\Game Master\\\\node.exe"\nargs = ["C:\\\\app\\\\wrapper.js"]\n'
    );
  });

  it('adds through the official CLI with each path in a single argument and reads it back', () => {
    const fake = fakeCodex([
      { name: 'other', transport: { type: 'http', url: 'https://example.com' } },
    ]);
    expect(configureCodex(fake.runner, entry)).toBe('added');
    expect(fake.calls).toEqual([
      ['mcp', 'list', '--json'],
      ['mcp', 'add', 'foundry-mcp', '--', entry.command, ...entry.args],
      ['mcp', 'list', '--json'],
    ]);
    expect(fake.servers()).toHaveLength(2);
  });

  it('is idempotent and preserves environment, timeouts, disabled state and aliases', () => {
    const existing = {
      ...server('my-foundry', { env: { GEMINI_API_KEY: 'private' } }),
      enabled: false,
    };
    const fake = fakeCodex([existing]);
    expect(configureCodex(fake.runner, entry)).toBe('unchanged');
    expect(fake.calls).toHaveLength(1);
    expect(fake.servers()).toEqual([existing]);
  });

  it.each([
    { name: 'foundry-mcp', transport: { type: 'http', url: 'https://example.com' } },
    server('old-foundry', {
      command: '/old/FoundryMCPServer/node',
      args: ['/old/FoundryMCPServer/app/build/server/wrapper.js'],
    }),
    {
      name: 'ninjos-foundry-mcp',
      transport: { type: 'stdio', command: 'node', args: ['custom.js'] },
    },
  ])('leaves conflicting or old entries unchanged', existing => {
    const fake = fakeCodex([existing]);
    expect(() => configureCodex(fake.runner, entry)).toThrow('Left unchanged');
    expect(fake.calls).toHaveLength(1);
    expect(fake.servers()).toEqual([existing]);
  });

  it('only removes this installation, including aliases, and reads the result back', () => {
    const other = {
      name: 'foundry-mcp',
      transport: { type: 'stdio', command: 'node', args: ['custom.js'] },
    };
    const fake = fakeCodex([other, server('my-foundry')]);
    expect(removeCodex(fake.runner, entry)).toEqual(['my-foundry']);
    expect(fake.servers()).toEqual([other]);
    expect(fake.calls.at(-1)).toEqual(['mcp', 'list', '--json']);
  });

  it('does nothing when uninstalling without a matching entry', () => {
    const fake = fakeCodex([]);
    expect(removeCodex(fake.runner, entry)).toEqual([]);
    expect(fake.calls).toHaveLength(1);
  });

  it('does not write when Codex is unavailable or configuration cannot be read', () => {
    const runner: CommandRunner = { run: () => ({ status: null, stdout: '', stderr: 'ENOENT' }) };
    expect(() => configureCodex(runner, entry)).toThrow('ENOENT');
    expect(() => removeCodex(runner, entry)).toThrow('Could not read Codex');
  });

  it('does not report success when Codex fails to add or returns the wrong result', () => {
    const runner: CommandRunner = {
      run: (_, args) => ({ status: args[1] === 'add' ? 1 : 0, stdout: '[]', stderr: '' }),
    };
    expect(() => configureCodex(runner, entry)).toThrow('exit 1');
    const noWrite: CommandRunner = { run: () => ({ status: 0, stdout: '[]', stderr: '' }) };
    expect(() => configureCodex(noWrite, entry)).toThrow('did not read back');
  });
});
