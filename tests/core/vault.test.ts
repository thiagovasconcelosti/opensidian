import { describe, it, expect, beforeEach, vi } from 'vitest';
import { VaultManager } from '../../src/core/vault';
import fs from 'fs/promises';
import path from 'path';

describe('VaultManager', () => {
  let vaultManager: VaultManager;
  const testVaultPath = '/tmp/test-vault';

  beforeEach(() => {
    vaultManager = new VaultManager();
  });

  describe('listVaults', () => {
    it('should return empty array when no vaults are open', () => {
      const vaults = vaultManager.listVaults();
      expect(vaults).toEqual([]);
    });
  });

  describe('createVault', () => {
    it('should create a new vault', async () => {
      const vault = vaultManager.createVault('Test Vault', testVaultPath);
      
      expect(vault).toBeDefined();
      expect(vault.name).toBe('Test Vault');
      expect(vault.path).toBe(testVaultPath);
      expect(vault.created).toBeDefined();
      expect(vault.notes).toEqual([]);
    });

    it('should add vault to list after creation', async () => {
      vaultManager.createVault('Test Vault', testVaultPath);
      const vaults = vaultManager.listVaults();
      
      expect(vaults).toHaveLength(1);
      expect(vaults[0].name).toBe('Test Vault');
    });
  });

  describe('openVault', () => {
    it('should return null for non-existent path', () => {
      const vault = vaultManager.openVault('/non/existent/path');
      expect(vault).toBeNull();
    });

    it('should open existing vault directory', async () => {
      await fs.mkdir(testVaultPath, { recursive: true });
      const vault = vaultManager.openVault(testVaultPath);
      
      expect(vault).toBeDefined();
      expect(vault?.path).toBe(testVaultPath);
    });
  });

  describe('createNote', () => {
    it('should create a new note in vault', async () => {
      vaultManager.createVault('Test Vault', testVaultPath);
      const note = await vaultManager.createNote(testVaultPath, 'test-note', '# Test Note\n\nContent here.');
      
      expect(note).toBeDefined();
      expect(note.filename).toBe('test-note');
      expect(note.path).toBe('test-note.md');
      expect(note.content).toContain('# Test Note');
      expect(note.frontmatter).toBeDefined();
      expect(note.links).toEqual([]);
    });

    it('should extract links from note content', async () => {
      vaultManager.createVault('Test Vault', testVaultPath);
      const note = await vaultManager.createNote(
        testVaultPath,
        'linked-note',
        '# Linked Note\n\nSee [[Another Note]] for more.'
      );
      
      expect(note.links).toContain('Another Note');
    });

    it('should extract frontmatter from note content', async () => {
      vaultManager.createVault('Test Vault', testVaultPath);
      const note = await vaultManager.createNote(
        testVaultPath,
        'frontmatter-note',
        '---\ntitle: My Title\ntags: [test, sample]\n---\n\nContent here.'
      );
      
      expect(note.frontmatter).toHaveProperty('title', 'My Title');
      expect(note.frontmatter).toHaveProperty('tags', '[test, sample]');
    });
  });

  describe('readNote', () => {
    it('should return null for non-existent note', async () => {
      vaultManager.createVault('Test Vault', testVaultPath);
      const note = await vaultManager.readNote(testVaultPath, 'non-existent.md');
      expect(note).toBeNull();
    });

    it('should read existing note', async () => {
      vaultManager.createVault('Test Vault', testVaultPath);
      await vaultManager.createNote(testVaultPath, 'existing-note', '# Existing Note\n\nContent.');
      
      const note = await vaultManager.readNote(testVaultPath, 'existing-note.md');
      
      expect(note).toBeDefined();
      expect(note?.filename).toBe('existing-note');
      expect(note?.content).toContain('# Existing Note');
    });
  });

  describe('updateNote', () => {
    it('should update existing note', async () => {
      vaultManager.createVault('Test Vault', testVaultPath);
      await vaultManager.createNote(testVaultPath, 'update-note', '# Original\n\nOriginal content.');
      
      const updatedNote = await vaultManager.updateNote(
        testVaultPath,
        'update-note.md',
        '# Updated\n\nUpdated content.'
      );
      
      expect(updatedNote.filename).toBe('update-note');
      expect(updatedNote.content).toContain('# Updated');
      expect(updatedNote.content).toContain('Updated content.');
    });
  });

  describe('deleteNote', () => {
    it('should delete existing note', async () => {
      vaultManager.createVault('Test Vault', testVaultPath);
      await vaultManager.createNote(testVaultPath, 'delete-note', '# To Delete\n\nContent.');
      
      await vaultManager.deleteNote(testVaultPath, 'delete-note.md');
      
      const note = await vaultManager.readNote(testVaultPath, 'delete-note.md');
      expect(note).toBeNull();
    });
  });

  describe('searchNotes', () => {
    it('should find notes matching query', async () => {
      vaultManager.createVault('Test Vault', testVaultPath);
      await vaultManager.createNote(testVaultPath, 'note-one', '# First Note\n\nContains search term.');
      await vaultManager.createNote(testVaultPath, 'note-two', '# Second Note\n\nDifferent content.');
      
      const results = await vaultManager.searchNotes(testVaultPath, 'search term');
      
      expect(results).toHaveLength(1);
      expect(results[0].filename).toBe('note-one');
    });

    it('should be case insensitive', async () => {
      vaultManager.createVault('Test Vault', testVaultPath);
      await vaultManager.createNote(testVaultPath, 'search-test', '# Search Test\n\nUPPERCASE content.');
      
      const results = await vaultManager.searchNotes(testVaultPath, 'uppercase');
      
      expect(results).toHaveLength(1);
    });
  });
});
