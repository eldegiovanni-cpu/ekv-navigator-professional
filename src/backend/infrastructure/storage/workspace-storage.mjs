import {
  WORKSPACE_STORAGE_KEY,
  WORKSPACE_STORE_SCHEMA_VERSION,
  createWorkspaceStore,
  migrateWorkspaceStore
} from "../../domain/models/workspace-migrations.mjs";
import { upsertWorkspace, removeWorkspace } from "../../domain/models/workspace-model.mjs";

export function createWorkspaceStorageRepository(storage) {
  if (!storage || typeof storage.getItem !== "function" || typeof storage.setItem !== "function") {
    throw new TypeError("Workspace Repository benötigt einen Storage Adapter.");
  }

  function readStore() {
    const raw = storage.getItem(WORKSPACE_STORAGE_KEY);
    if (!raw) {
      return { schemaVersion: WORKSPACE_STORE_SCHEMA_VERSION, updatedAt: null, workspaces: {} };
    }
    const parsed = JSON.parse(raw);
    const result = migrateWorkspaceStore(parsed);
    if (result.migrated) {
      const migratedStore = createWorkspaceStore(result.store.workspaces);
      storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(migratedStore));
      return migratedStore;
    }
    return result.store;
  }

  function replaceWorkspaces(workspaces) {
    const store = createWorkspaceStore(workspaces || {});
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(store));
    return store;
  }

  function save(name, snapshot) {
    const next = upsertWorkspace(readStore(), name, snapshot);
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  function remove(name) {
    const next = removeWorkspace(readStore(), name);
    storage.setItem(WORKSPACE_STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  return Object.freeze({ readStore, replaceWorkspaces, save, remove });
}
