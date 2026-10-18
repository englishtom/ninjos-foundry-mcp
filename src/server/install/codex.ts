/** Codex configuration through its own CLI, so we never rewrite its TOML settings. */
import { isJsonObject, serverMatcher, type DesiredEntry } from './client-config.js';
import { SERVER_KEY } from './layout.js';
import type { CommandResult, CommandRunner } from './registry.js';

/** JSON string escaping also yields valid TOML basic strings for filesystem paths. */
export function codexConfig(entry: DesiredEntry): string {
  return `[mcp_servers.${SERVER_KEY}]\ncommand = ${JSON.stringify(entry.command)}\nargs = ${JSON.stringify(entry.args)}\n`;
}

function failure(result: CommandResult): string {
  // stdout from list/get can contain environment secrets; never include it in errors.
  return result.stderr.trim() || `exit ${result.status ?? 'unknown'}`;
}

function configuredServers(runner: CommandRunner): unknown[] {
  const result = runner.run('codex', ['mcp', 'list', '--json']);
  if (result.status !== 0) {
    throw new Error(
      `Could not read Codex MCP configuration (${failure(result)}). Ensure the Codex CLI is on PATH and its config is valid. ` +
        'Use print-config --client codex for manual setup.'
    );
  }
  const value: unknown = JSON.parse(result.stdout);
  if (!Array.isArray(value)) throw new Error('Codex returned an unexpected server list.');
  return value;
}

function matches(server: unknown, entry: DesiredEntry): boolean {
  if (!isJsonObject(server) || !isJsonObject(server['transport'])) return false;
  const transport = server['transport'];
  return (
    transport['type'] === 'stdio' &&
    transport['command'] === entry.command &&
    JSON.stringify(transport['args']) === JSON.stringify(entry.args)
  );
}

/** Register explicitly; leave existing settings, environment variables and aliases intact. */
export function configureCodex(runner: CommandRunner, entry: DesiredEntry): 'added' | 'unchanged' {
  const servers = configuredServers(runner);
  const matcher = serverMatcher({ wrappers: entry.args, claimKey: false });
  for (const server of servers) {
    if (!isJsonObject(server)) throw new Error('Codex returned an unexpected server entry.');
    if (matches(server, entry)) return 'unchanged';
    const name = typeof server['name'] === 'string' ? server['name'] : '';
    if (
      name === SERVER_KEY ||
      matcher.owns(name, server['transport']) ||
      matcher.resembles(name, server['transport'])
    ) {
      throw new Error(
        'Codex already has a Foundry entry with different launch settings. Left unchanged. ' +
          'Use print-config --client codex to update its command and args manually, keeping your other settings.'
      );
    }
  }
  const result = runner.run('codex', [
    'mcp',
    'add',
    SERVER_KEY,
    '--',
    entry.command,
    ...entry.args,
  ]);
  if (result.status !== 0)
    throw new Error(
      `Codex could not add the server (${failure(result)}). Use print-config --client codex for manual setup.`
    );
  if (!configuredServers(runner).some(server => matches(server, entry))) {
    throw new Error('Codex did not read back the expected server configuration.');
  }
  return 'added';
}

/** Only remove entries that launch this installation, including entries under a custom name. */
export function removeCodex(runner: CommandRunner, entry: DesiredEntry): string[] {
  const names = configuredServers(runner)
    .filter(server => matches(server, entry))
    .map(server => {
      if (!isJsonObject(server) || typeof server['name'] !== 'string') {
        throw new Error('Codex returned a server without a name.');
      }
      return server['name'];
    });
  for (const name of names) {
    const result = runner.run('codex', ['mcp', 'remove', name]);
    if (result.status !== 0)
      throw new Error(`Codex could not remove server ${name} (${failure(result)}).`);
  }
  if (names.length > 0 && configuredServers(runner).some(server => matches(server, entry))) {
    throw new Error('Codex still lists this installation after removal.');
  }
  return names;
}
