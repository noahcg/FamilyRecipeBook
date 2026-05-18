"use client";

import type { RecipeWithRelations } from "@/lib/types";

const DB_NAME = "home-cooked-offline";
const DB_VERSION = 1;
const STORE_NAME = "recipes";
const CURRENT_USER_KEY = "home-cooked-offline-user";
export const OFFLINE_RECIPES_CHANGED_EVENT = "home-cooked-offline-recipes-changed";

export type OfflineRecipeRecord = {
  key: string;
  userId: string;
  bookId: string;
  recipeId: string;
  recipe: RecipeWithRelations;
  savedAt: string;
  updatedAt: string | null;
  photoBlob?: Blob;
  photoType?: string;
  photoCachedAt?: string;
};

function offlineRecipeKey(userId: string, recipeId: string) {
  return `${userId}:${recipeId}`;
}

function openOfflineDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;
      const store = db.objectStoreNames.contains(STORE_NAME)
        ? request.transaction?.objectStore(STORE_NAME)
        : db.createObjectStore(STORE_NAME, { keyPath: "key" });

      if (store && !store.indexNames.contains("byUser")) {
        store.createIndex("byUser", "userId", { unique: false });
      }
      if (store && !store.indexNames.contains("byUserBook")) {
        store.createIndex("byUserBook", ["userId", "bookId"], { unique: false });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open offline recipe storage."));
  });
}

function runStore<T>(
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T> {
  return openOfflineDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, mode);
        const request = callback(transaction.objectStore(STORE_NAME));

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error ?? new Error("Offline recipe storage failed."));
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(transaction.error ?? new Error("Offline recipe storage failed."));
        };
      })
  );
}

function getAllFromIndex<T>(index: IDBIndex, query: IDBValidKey | IDBKeyRange): Promise<T[]> {
  return new Promise((resolve, reject) => {
    const request = index.getAll(query);
    request.onsuccess = () => resolve(request.result as T[]);
    request.onerror = () => reject(request.error ?? new Error("Could not read offline recipes."));
  });
}

async function cacheRecipePhoto(photoUrl: string | null) {
  if (!photoUrl) return {};

  try {
    const response = await fetch(photoUrl, { mode: "cors", credentials: "omit" });
    if (!response.ok) return {};

    const blob = await response.blob();
    return {
      photoBlob: blob,
      photoType: blob.type,
      photoCachedAt: new Date().toISOString(),
    };
  } catch {
    return {};
  }
}

export async function saveRecipeOffline(recipe: RecipeWithRelations, bookId: string, userId: string) {
  window.localStorage.setItem(CURRENT_USER_KEY, userId);
  const now = new Date().toISOString();
  const photoCache = await cacheRecipePhoto(recipe.photo_url);
  const record: OfflineRecipeRecord = {
    key: offlineRecipeKey(userId, recipe.id),
    userId,
    bookId,
    recipeId: recipe.id,
    recipe,
    savedAt: now,
    updatedAt: recipe.updated_at ?? null,
    ...photoCache,
  };

  await runStore("readwrite", (store) => store.put(record));
  window.dispatchEvent(new CustomEvent(OFFLINE_RECIPES_CHANGED_EVENT));
  return record;
}

export async function removeRecipeOffline(recipeId: string, userId: string) {
  await runStore("readwrite", (store) => store.delete(offlineRecipeKey(userId, recipeId)));
  window.dispatchEvent(new CustomEvent(OFFLINE_RECIPES_CHANGED_EVENT));
}

export async function getOfflineRecipe(recipeId: string, userId: string) {
  return runStore<OfflineRecipeRecord | undefined>("readonly", (store) =>
    store.get(offlineRecipeKey(userId, recipeId))
  );
}

export async function isRecipeSavedOffline(recipeId: string, userId: string) {
  const record = await getOfflineRecipe(recipeId, userId);
  return Boolean(record);
}

export async function listOfflineRecipes(userId: string, bookId?: string) {
  window.localStorage.setItem(CURRENT_USER_KEY, userId);
  const db = await openOfflineDb();

  try {
    const transaction = db.transaction(STORE_NAME, "readonly");
    const store = transaction.objectStore(STORE_NAME);
    const records = bookId
      ? await getAllFromIndex<OfflineRecipeRecord>(store.index("byUserBook"), IDBKeyRange.only([userId, bookId]))
      : await getAllFromIndex<OfflineRecipeRecord>(store.index("byUser"), userId);

    return records.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  } finally {
    db.close();
  }
}

export function createOfflinePhotoUrl(record: OfflineRecipeRecord) {
  if (!record.photoBlob) return null;
  return URL.createObjectURL(record.photoBlob);
}
