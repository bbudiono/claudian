/**
 * Nexus Vault Ecosystem Layer
 *
 * Registers vault-specific views, commands, and panels into the Claudian plugin.
 * This module is the ONLY entry point from the ecosystem layer into the core plugin.
 * It does NOT modify upstream files — all extensions are additive via the plugin API.
 *
 * Repo: bbudiono/nexus-vault (canonical at ~/nexus-vault)
 * Plan: glowing-nesting-vault Phase 43.2
 */

import type { Plugin } from 'obsidian';
import { VaultSidebarView, VIEW_TYPE_VAULT_SIDEBAR } from './views/VaultSidebarView';
import { registerVaultCommands } from './commands/vaultCommands';

export const ECOSYSTEM_VERSION = '1.0.0';

/**
 * Register all ecosystem extensions into the Claudian plugin instance.
 * Called once during plugin.onload().
 */
export function registerEcosystemExtensions(plugin: Plugin): void {
  // Register the vault sidebar view
  plugin.registerView(
    VIEW_TYPE_VAULT_SIDEBAR,
    (leaf) => new VaultSidebarView(leaf, plugin)
  );

  // Add ribbon icon for vault sidebar
  plugin.addRibbonIcon('vault', 'Nexus Vault', () => {
    activateVaultSidebar(plugin);
  });

  // Register vault commands
  registerVaultCommands(plugin);
}

/**
 * Open or focus the Vault sidebar in the right leaf.
 */
async function activateVaultSidebar(plugin: Plugin): Promise<void> {
  const { workspace } = plugin.app;

  // Check if view is already open
  const existing = workspace.getLeavesOfType(VIEW_TYPE_VAULT_SIDEBAR);
  if (existing.length > 0) {
    workspace.revealLeaf(existing[0]);
    return;
  }

  // Open in right sidebar
  const leaf = workspace.getRightLeaf(false);
  if (leaf) {
    await leaf.setViewState({
      type: VIEW_TYPE_VAULT_SIDEBAR,
      active: true,
    });
    workspace.revealLeaf(leaf);
  }
}
