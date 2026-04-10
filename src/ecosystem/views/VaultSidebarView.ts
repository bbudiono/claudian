/**
 * Vault Sidebar View — displays hot cache + entity graph in the Obsidian sidebar.
 *
 * Three-panel layout:
 * 1. Hot Cache panel: shows the most recent project cache entries from
 *    ~/nexus-vault/meta/hot-cache/ecosystem.md
 * 2. Entity Graph panel: lists entities from ~/nexus-vault/meta/entity-index.json
 *    with mention counts and links to wiki pages
 * 3. Quick Actions: vault status, vault query, vault ingest shortcuts
 *
 * Data is read from the vault filesystem — no API calls, fully offline-first.
 */

import { ItemView, type Plugin, type WorkspaceLeaf } from 'obsidian';
import * as fs from 'fs';
import * as path from 'path';

export const VIEW_TYPE_VAULT_SIDEBAR = 'nexus-vault-sidebar';

interface EntityEntry {
  name: string;
  type: string;
  mentions: number;
  last_seen: string;
  wiki_path?: string;
}

interface VaultState {
  hotCacheContent: string;
  entities: EntityEntry[];
  vaultPath: string;
  lastRefresh: string;
}

export class VaultSidebarView extends ItemView {
  private plugin: Plugin;
  private state: VaultState = {
    hotCacheContent: '',
    entities: [],
    vaultPath: '',
    lastRefresh: '',
  };
  private refreshInterval: ReturnType<typeof setInterval> | null = null;

  constructor(leaf: WorkspaceLeaf, plugin: Plugin) {
    super(leaf);
    this.plugin = plugin;
  }

  getViewType(): string {
    return VIEW_TYPE_VAULT_SIDEBAR;
  }

  getDisplayText(): string {
    return 'Nexus Vault';
  }

  getIcon(): string {
    return 'vault';
  }

  async onOpen(): Promise<void> {
    this.state.vaultPath = this.detectVaultPath();
    await this.refresh();
    this.render();

    // Auto-refresh every 60 seconds
    this.refreshInterval = setInterval(async () => {
      await this.refresh();
      this.render();
    }, 60_000);
  }

  async onClose(): Promise<void> {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
      this.refreshInterval = null;
    }
  }

  private detectVaultPath(): string {
    // Check standard vault locations
    const candidates = [
      path.join(process.env.HOME || '', 'nexus-vault'),
      path.join(process.env.HOME || '', 'Library', 'CloudStorage', 'Dropbox', 'nexus-vault'),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, '.obsidian'))) {
        return candidate;
      }
    }
    return candidates[0]; // Fallback to default
  }

  private async refresh(): Promise<void> {
    this.state.lastRefresh = new Date().toISOString();

    // Load hot cache
    const ecosystemCachePath = path.join(this.state.vaultPath, 'meta', 'hot-cache', 'ecosystem.md');
    try {
      this.state.hotCacheContent = fs.readFileSync(ecosystemCachePath, 'utf-8');
    } catch {
      this.state.hotCacheContent = '*No ecosystem cache found. Run `/vault` to initialize.*';
    }

    // Load entity index
    const entityIndexPath = path.join(this.state.vaultPath, 'meta', 'entity-index.json');
    try {
      const raw = fs.readFileSync(entityIndexPath, 'utf-8');
      const index = JSON.parse(raw);
      this.state.entities = Object.entries(index)
        .map(([name, data]: [string, any]) => ({
          name,
          type: data.type || 'unknown',
          mentions: data.mentions || 0,
          last_seen: data.last_seen || '',
          wiki_path: data.wiki_path,
        }))
        .sort((a, b) => b.mentions - a.mentions)
        .slice(0, 50); // Top 50
    } catch {
      this.state.entities = [];
    }
  }

  private render(): void {
    const container = this.containerEl.children[1];
    container.empty();

    // Header
    const header = container.createEl('div', { cls: 'vault-sidebar-header' });
    header.createEl('h4', { text: 'Nexus Vault' });
    header.createEl('small', {
      text: `Last refresh: ${new Date(this.state.lastRefresh).toLocaleTimeString()}`,
      cls: 'vault-sidebar-timestamp',
    });

    // Hot Cache Panel
    const cacheSection = container.createEl('div', { cls: 'vault-sidebar-section' });
    cacheSection.createEl('h5', { text: 'Hot Cache' });
    const cacheContent = cacheSection.createEl('div', { cls: 'vault-cache-content' });

    const cacheLines = this.state.hotCacheContent.split('\n').slice(0, 20);
    for (const line of cacheLines) {
      if (line.trim()) {
        cacheContent.createEl('div', { text: line, cls: 'vault-cache-line' });
      }
    }

    // Entity Graph Panel
    const entitySection = container.createEl('div', { cls: 'vault-sidebar-section' });
    entitySection.createEl('h5', { text: `Entities (${this.state.entities.length})` });

    if (this.state.entities.length === 0) {
      entitySection.createEl('div', {
        text: 'No entities tracked yet. Mention entities 3+ times to auto-create.',
        cls: 'vault-entity-empty',
      });
    } else {
      const entityList = entitySection.createEl('div', { cls: 'vault-entity-list' });
      for (const entity of this.state.entities) {
        const row = entityList.createEl('div', { cls: 'vault-entity-row' });
        const nameEl = row.createEl('span', { text: entity.name, cls: 'vault-entity-name' });
        row.createEl('span', { text: `${entity.type}`, cls: 'vault-entity-type' });
        row.createEl('span', { text: `${entity.mentions}`, cls: 'vault-entity-mentions' });

        // Click to open entity wiki page
        if (entity.wiki_path) {
          nameEl.classList.add('vault-entity-link');
          nameEl.addEventListener('click', () => {
            const filePath = path.join(this.state.vaultPath, entity.wiki_path!);
            if (fs.existsSync(filePath)) {
              this.app.workspace.openLinkText(entity.wiki_path!, '', false);
            }
          });
        }
      }
    }

    // Quick Actions
    const actionsSection = container.createEl('div', { cls: 'vault-sidebar-section' });
    actionsSection.createEl('h5', { text: 'Quick Actions' });

    const actions = [
      { label: 'Refresh', icon: 'refresh-cw', action: () => { this.refresh(); this.render(); } },
      { label: 'Vault Status', icon: 'info', action: () => { /* TODO: open vault status modal */ } },
    ];

    for (const act of actions) {
      const btn = actionsSection.createEl('button', { text: act.label, cls: 'vault-action-btn' });
      btn.addEventListener('click', act.action);
    }
  }
}
