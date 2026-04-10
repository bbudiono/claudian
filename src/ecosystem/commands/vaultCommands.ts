/**
 * Vault Commands — registers Obsidian commands for vault operations.
 *
 * These commands are available in the command palette (Cmd+P) and can be
 * bound to hotkeys. They invoke the /vault skill's sub-commands.
 */

import type { Plugin } from 'obsidian';
import { Notice } from 'obsidian';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const VAULT_PATH = path.join(os.homedir(), 'nexus-vault');

export function registerVaultCommands(plugin: Plugin): void {
  plugin.addCommand({
    id: 'vault-status',
    name: 'Vault: Show status',
    callback: () => showVaultStatus(),
  });

  plugin.addCommand({
    id: 'vault-refresh-cache',
    name: 'Vault: Refresh hot cache',
    callback: () => refreshHotCache(),
  });

  plugin.addCommand({
    id: 'vault-open-daily',
    name: 'Vault: Open today\'s daily note',
    callback: () => openDailyNote(plugin),
  });

  plugin.addCommand({
    id: 'vault-entity-list',
    name: 'Vault: List top entities',
    callback: () => listEntities(),
  });

  plugin.addCommand({
    id: 'vault-ingest-current',
    name: 'Vault: Ingest current file to raw/',
    editorCallback: (editor, ctx) => {
      const file = plugin.app.workspace.getActiveFile();
      if (file) {
        ingestFile(file.path);
      } else {
        new Notice('No active file to ingest.');
      }
    },
  });
}

function showVaultStatus(): void {
  const configPath = path.join(VAULT_PATH, 'meta', '.vault-config.json');
  const entityIndexPath = path.join(VAULT_PATH, 'meta', 'entity-index.json');

  let status = 'Nexus Vault Status\n';

  if (!fs.existsSync(VAULT_PATH)) {
    new Notice('Vault not found at ~/nexus-vault');
    return;
  }

  // File counts
  const countFiles = (dir: string): number => {
    try {
      return fs.readdirSync(path.join(VAULT_PATH, dir), { recursive: true })
        .filter((f: any) => String(f).endsWith('.md')).length;
    } catch {
      return 0;
    }
  };

  status += `Daily notes: ${countFiles('daily')}\n`;
  status += `Raw files: ${countFiles('raw')}\n`;
  status += `Wiki articles: ${countFiles('wiki')}\n`;

  // Entity count
  try {
    const entityIndex = JSON.parse(fs.readFileSync(entityIndexPath, 'utf-8'));
    status += `Entities tracked: ${Object.keys(entityIndex).length}\n`;
  } catch {
    status += 'Entities tracked: 0\n';
  }

  // Hot cache freshness
  const cachePath = path.join(VAULT_PATH, 'meta', 'hot-cache', 'ecosystem.md');
  try {
    const stat = fs.statSync(cachePath);
    const age = Math.round((Date.now() - stat.mtimeMs) / 60_000);
    status += `Cache age: ${age} min\n`;
  } catch {
    status += 'Cache: not found\n';
  }

  new Notice(status, 10_000);
}

function refreshHotCache(): void {
  new Notice('Hot cache refresh triggered. Check vault sidebar.', 3_000);
  // The actual refresh happens via the session hook or cron — this is a UI trigger
}

function openDailyNote(plugin: Plugin): void {
  const today = new Date().toISOString().split('T')[0];
  const dailyPath = `daily/${today}.md`;
  const fullPath = path.join(VAULT_PATH, dailyPath);

  if (fs.existsSync(fullPath)) {
    plugin.app.workspace.openLinkText(dailyPath, '', false);
  } else {
    new Notice(`No daily note for ${today}. Start a Claude session to generate one.`);
  }
}

function listEntities(): void {
  const entityIndexPath = path.join(VAULT_PATH, 'meta', 'entity-index.json');
  try {
    const index = JSON.parse(fs.readFileSync(entityIndexPath, 'utf-8'));
    const sorted = Object.entries(index)
      .map(([name, data]: [string, any]) => ({ name, mentions: data.mentions || 0 }))
      .sort((a, b) => b.mentions - a.mentions)
      .slice(0, 10);

    const text = 'Top 10 Entities:\n' + sorted.map(
      (e, i) => `${i + 1}. ${e.name} (${e.mentions} mentions)`
    ).join('\n');

    new Notice(text, 10_000);
  } catch {
    new Notice('No entity index found. Use the vault to track entities.');
  }
}

function ingestFile(filePath: string): void {
  const destDir = path.join(VAULT_PATH, 'raw', 'imports');
  const today = new Date().toISOString().split('T')[0];
  const baseName = path.basename(filePath);
  const destPath = path.join(destDir, `${today}-${baseName}`);

  // SEC-1: Sanitize path to prevent traversal (e.g., ../../etc/passwd)
  const resolvedSource = path.resolve(VAULT_PATH, filePath);
  if (!resolvedSource.startsWith(VAULT_PATH)) {
    new Notice(`Ingest blocked: path escapes vault boundary.`);
    return;
  }

  try {
    fs.mkdirSync(destDir, { recursive: true });
    if (fs.existsSync(resolvedSource)) {
      fs.copyFileSync(resolvedSource, destPath);
      new Notice(`Ingested ${baseName} to raw/imports/`);
    } else {
      new Notice(`File not found: ${filePath}`);
    }
  } catch (err) {
    new Notice(`Ingest failed: ${err}`);
  }
}
