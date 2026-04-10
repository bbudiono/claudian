/**
 * Tests for vault commands — ecosystem layer Phase 43.2
 * Uses the project's existing obsidian mock at tests/__mocks__/obsidian.ts
 */

import { registerVaultCommands } from '../../../src/ecosystem/commands/vaultCommands';

describe('registerVaultCommands', () => {
  test('registers 5 commands', () => {
    const commands: any[] = [];
    const mockPlugin = {
      addCommand: jest.fn((cmd: any) => commands.push(cmd)),
    } as any;

    registerVaultCommands(mockPlugin);

    expect(mockPlugin.addCommand).toHaveBeenCalledTimes(5);
    const ids = commands.map(c => c.id);
    expect(ids).toContain('vault-status');
    expect(ids).toContain('vault-refresh-cache');
    expect(ids).toContain('vault-open-daily');
    expect(ids).toContain('vault-entity-list');
    expect(ids).toContain('vault-ingest-current');
  });

  test('vault-status command has a callback', () => {
    const commands: any[] = [];
    const mockPlugin = {
      addCommand: jest.fn((cmd: any) => commands.push(cmd)),
    } as any;

    registerVaultCommands(mockPlugin);

    const statusCmd = commands.find(c => c.id === 'vault-status');
    expect(statusCmd).toBeDefined();
    expect(typeof statusCmd.callback).toBe('function');
  });

  test('vault-ingest-current uses editorCallback', () => {
    const commands: any[] = [];
    const mockPlugin = {
      addCommand: jest.fn((cmd: any) => commands.push(cmd)),
    } as any;

    registerVaultCommands(mockPlugin);

    const ingestCmd = commands.find(c => c.id === 'vault-ingest-current');
    expect(ingestCmd).toBeDefined();
    expect(typeof ingestCmd.editorCallback).toBe('function');
  });
});
