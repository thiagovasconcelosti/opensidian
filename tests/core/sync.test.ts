import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SyncService } from '../../src/core/sync';

describe('SyncService', () => {
  let syncService: SyncService;
  const testPort = 19999;

  beforeEach(() => {
    syncService = new SyncService(testPort);
  });

  afterEach(() => {
    syncService.stop();
  });

  describe('constructor', () => {
    it('should create sync service with default port', () => {
      const service = new SyncService();
      expect(service).toBeDefined();
    });

    it('should create sync service with custom port', () => {
      const service = new SyncService(19998);
      expect(service).toBeDefined();
    });
  });

  describe('start/stop', () => {
    it('should start and stop without errors', () => {
      expect(() => syncService.start()).not.toThrow();
      expect(() => syncService.stop()).not.toThrow();
    });

    it('should not start twice', () => {
      syncService.start();
      expect(() => syncService.start()).not.toThrow();
    });
  });

  describe('broadcastChange', () => {
    it('should emit change event', () => {
      syncService.start();
      
      const handler = vi.fn();
      syncService.on('change', handler);

      syncService.broadcastChange({
        type: 'note_created',
        note: { path: 'test.md' },
      });

      expect(handler).toHaveBeenCalled();
    });
  });

  describe('getConnectedClients', () => {
    it('should return 0 when no clients connected', () => {
      syncService.start();
      expect(syncService.getConnectedClients()).toBe(0);
    });
  });
});
