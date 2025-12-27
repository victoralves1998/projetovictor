import path from "path";
import { pathsForInstance } from "../config";
import { ensureDir, safeReadJson, safeWriteJson } from "../utils/fs.utils";

type BotState = {
  instanceId: string;
  connected: boolean;
  lastConnectionUpdate?: string;
  lastQrAt?: string;
};

type StoreShape = {
  bots: Record<string, BotState>;
};

const defaultStore: StoreShape = { bots: {} };

class StoreService {
  private storePath(instanceId: string) {
    const { dataDir, safeId } = pathsForInstance(instanceId);
    ensureDir(dataDir);
    return path.join(dataDir, `store_${safeId}.json`);
  }

  read(instanceId: string): StoreShape {
    return safeReadJson(this.storePath(instanceId), defaultStore);
  }

  write(instanceId: string, data: StoreShape) {
    safeWriteJson(this.storePath(instanceId), data);
  }

  getBotState(instanceId: string): BotState {
    const safeId = pathsForInstance(instanceId).safeId;
    const store = this.read(safeId);
    return store.bots[safeId] || { instanceId: safeId, connected: false };
  }

  setBotState(instanceId: string, patch: Partial<BotState>) {
    const safeId = pathsForInstance(instanceId).safeId;
    const store = this.read(safeId);
    const current = store.bots[safeId] || { instanceId: safeId, connected: false };
    store.bots[safeId] = { ...current, ...patch, instanceId: safeId };
    this.write(safeId, store);
    return store.bots[safeId];
  }
}

export const storeService = new StoreService();
