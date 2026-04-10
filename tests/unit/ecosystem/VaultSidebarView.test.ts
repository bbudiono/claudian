/**
 * Tests for VaultSidebarView — ecosystem layer Phase 43.2
 * Uses the project's existing obsidian mock at tests/__mocks__/obsidian.ts
 */

import * as fs from 'fs';
import * as path from 'path';

import { VaultSidebarView, VIEW_TYPE_VAULT_SIDEBAR } from '../../../src/ecosystem/views/VaultSidebarView';

describe('VaultSidebarView', () => {
  const mockLeaf = {} as any;
  const mockPlugin = {} as any;

  test('VIEW_TYPE_VAULT_SIDEBAR is defined', () => {
    expect(VIEW_TYPE_VAULT_SIDEBAR).toBe('nexus-vault-sidebar');
  });

  test('view has correct display text', () => {
    const view = new VaultSidebarView(mockLeaf, mockPlugin);
    expect(view.getDisplayText()).toBe('Nexus Vault');
  });

  test('view has correct icon', () => {
    const view = new VaultSidebarView(mockLeaf, mockPlugin);
    expect(view.getIcon()).toBe('vault');
  });

  test('view returns correct type', () => {
    const view = new VaultSidebarView(mockLeaf, mockPlugin);
    expect(view.getViewType()).toBe(VIEW_TYPE_VAULT_SIDEBAR);
  });

  test('detectVaultPath finds ~/nexus-vault when .obsidian exists', () => {
    const vaultPath = path.join(process.env.HOME || '', 'nexus-vault');
    const exists = fs.existsSync(path.join(vaultPath, '.obsidian'));
    const view = new VaultSidebarView(mockLeaf, mockPlugin);
    const detected = (view as any).detectVaultPath();
    if (exists) {
      expect(detected).toBe(vaultPath);
    } else {
      expect(detected).toContain('nexus-vault');
    }
  });

  test('refresh handles missing hot cache gracefully', async () => {
    const view = new VaultSidebarView(mockLeaf, mockPlugin);
    (view as any).state.vaultPath = '/nonexistent/vault';
    await (view as any).refresh();
    expect((view as any).state.hotCacheContent).toContain('No ecosystem cache found');
  });

  test('refresh handles missing entity index gracefully', async () => {
    const view = new VaultSidebarView(mockLeaf, mockPlugin);
    (view as any).state.vaultPath = '/nonexistent/vault';
    await (view as any).refresh();
    expect((view as any).state.entities).toEqual([]);
  });
});
