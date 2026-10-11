import { Category, Subcategory, ClothingItem, WardrobeBackup } from '../types';

const DB_NAME = 'DigitalWardrobeDB';
const DB_VERSION = 1;

export const DEFAULT_CATEGORIES_DATA: { name: string; subcategories: string[] }[] = [
  { name: '短裤', subcategories: ['运动短裤', '紧身短裤', '日常短裤'] },
  { name: '短袖', subcategories: ['运动短袖', '紧身短袖', '日常短袖'] },
  { name: '长袖', subcategories: ['运动长袖', '紧身长袖', '日常长袖'] },
  { name: '长裤', subcategories: ['运动长裤', '紧身长裤', '日常长裤'] },
  { name: '外套', subcategories: ['飞行夹克', '日常夹克'] },
  { name: '羽绒服', subcategories: [] },
];

let dbPromise: Promise<IDBDatabase> | null = null;

export function getDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains('categories')) {
        const catStore = db.createObjectStore('categories', { keyPath: 'id' });
        catStore.createIndex('sortOrder', 'sortOrder', { unique: false });
      }

      if (!db.objectStoreNames.contains('subcategories')) {
        const subStore = db.createObjectStore('subcategories', { keyPath: 'id' });
        subStore.createIndex('categoryId', 'categoryId', { unique: false });
        subStore.createIndex('sortOrder', 'sortOrder', { unique: false });
      }

      if (!db.objectStoreNames.contains('clothingItems')) {
        const itemStore = db.createObjectStore('clothingItems', { keyPath: 'id' });
        itemStore.createIndex('categoryId', 'categoryId', { unique: false });
        itemStore.createIndex('subcategoryId', 'subcategoryId', { unique: false });
        itemStore.createIndex('createdAt', 'createdAt', { unique: false });
      }

      if (!db.objectStoreNames.contains('preferences')) {
        db.createObjectStore('preferences', { keyPath: 'key' });
      }
    };

    request.onsuccess = async (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      try {
        await initDefaultCategoriesIfEmpty(db);
        resolve(db);
      } catch (err) {
        reject(err);
      }
    };

    request.onerror = (event) => {
      dbPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

// Ensure default categories exist if database is fresh
async function initDefaultCategoriesIfEmpty(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['categories', 'subcategories'], 'readwrite');
    const catStore = tx.objectStore('categories');
    const countReq = catStore.count();

    countReq.onsuccess = () => {
      if (countReq.result > 0) {
        resolve();
        return;
      }

      const subStore = tx.objectStore('subcategories');
      const now = Date.now();

      DEFAULT_CATEGORIES_DATA.forEach((item, catIdx) => {
        const catId = `cat_${catIdx + 1}_${Math.random().toString(36).slice(2, 7)}`;
        const category: Category = {
          id: catId,
          name: item.name,
          sortOrder: catIdx,
          createdAt: now,
        };
        catStore.put(category);

        item.subcategories.forEach((subName, subIdx) => {
          const subId = `sub_${catIdx + 1}_${subIdx + 1}_${Math.random().toString(36).slice(2, 7)}`;
          const subcategory: Subcategory = {
            id: subId,
            categoryId: catId,
            name: subName,
            sortOrder: subIdx,
            createdAt: now,
          };
          subStore.put(subcategory);
        });
      });
    };

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ----------------- Categories CRUD -----------------

export async function getAllCategories(): Promise<Category[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories', 'readonly');
    const store = tx.objectStore('categories');
    const request = store.getAll();

    request.onsuccess = () => {
      const list: Category[] = request.result || [];
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function addCategory(name: string): Promise<Category> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('分类名称不能为空');

  const existing = await getAllCategories();
  if (existing.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error(`已存在同名一级分类 "${trimmed}"`);
  }

  const db = await getDB();
  const maxOrder = existing.reduce((max, c) => Math.max(max, c.sortOrder), -1);
  const newCategory: Category = {
    id: `cat_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    name: trimmed,
    sortOrder: maxOrder + 1,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');
    const req = store.add(newCategory);
    req.onsuccess = () => resolve(newCategory);
    req.onerror = () => reject(req.error);
  });
}

export async function updateCategory(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('分类名称不能为空');

  const existing = await getAllCategories();
  if (existing.some((c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error(`已存在同名一级分类 "${trimmed}"`);
  }

  const target = existing.find((c) => c.id === id);
  if (!target) throw new Error('未找到该分类');

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');
    target.name = trimmed;
    const req = store.put(target);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

export async function reorderCategories(orderedIds: string[]): Promise<void> {
  const db = await getDB();
  const categories = await getAllCategories();
  const catMap = new Map(categories.map((c) => [c.id, c]));

  return new Promise((resolve, reject) => {
    const tx = db.transaction('categories', 'readwrite');
    const store = tx.objectStore('categories');

    orderedIds.forEach((id, index) => {
      const cat = catMap.get(id);
      if (cat) {
        cat.sortOrder = index;
        store.put(cat);
      }
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteCategory(id: string, migrateToCategoryId?: string): Promise<void> {
  const db = await getDB();
  const items = await getAllClothingItems();
  const affectedItems = items.filter((i) => i.categoryId === id);

  if (affectedItems.length > 0 && !migrateToCategoryId) {
    throw new Error(`该分类下尚有 ${affectedItems.length} 件衣物，请选择迁移至其他分类后再删除，防止照片丢失。`);
  }

  if (migrateToCategoryId && migrateToCategoryId === id) {
    throw new Error('不能迁移到自身分类');
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['categories', 'subcategories', 'clothingItems'], 'readwrite');
    const catStore = tx.objectStore('categories');
    const subStore = tx.objectStore('subcategories');
    const itemStore = tx.objectStore('clothingItems');

    // 1. If migration is specified, migrate affected clothing items
    if (migrateToCategoryId) {
      affectedItems.forEach((item) => {
        item.categoryId = migrateToCategoryId;
        item.subcategoryId = null; // reset subcategory as target category subcategories may differ
        item.updatedAt = Date.now();
        itemStore.put(item);
      });
    }

    // 2. Delete all subcategories belonging to this category
    const subIdx = subStore.index('categoryId');
    const subReq = subIdx.getAll(id);
    subReq.onsuccess = () => {
      const subs: Subcategory[] = subReq.result || [];
      subs.forEach((s) => subStore.delete(s.id));
    };

    // 3. Delete category itself
    catStore.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ----------------- Subcategories CRUD -----------------

export async function getAllSubcategories(categoryId?: string): Promise<Subcategory[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('subcategories', 'readonly');
    const store = tx.objectStore('subcategories');
    const request = categoryId ? store.index('categoryId').getAll(categoryId) : store.getAll();

    request.onsuccess = () => {
      const list: Subcategory[] = request.result || [];
      list.sort((a, b) => a.sortOrder - b.sortOrder);
      resolve(list);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function addSubcategory(categoryId: string, name: string): Promise<Subcategory> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('二级分类名称不能为空');

  const existingInCat = await getAllSubcategories(categoryId);
  if (existingInCat.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error(`该一级分类下已存在同名二级分类 "${trimmed}"`);
  }

  const db = await getDB();
  const maxOrder = existingInCat.reduce((max, s) => Math.max(max, s.sortOrder), -1);
  const newSubcategory: Subcategory = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    categoryId,
    name: trimmed,
    sortOrder: maxOrder + 1,
    createdAt: Date.now(),
  };

  return new Promise((resolve, reject) => {
    const tx = db.transaction('subcategories', 'readwrite');
    const store = tx.objectStore('subcategories');
    const req = store.add(newSubcategory);
    req.onsuccess = () => resolve(newSubcategory);
    req.onerror = () => reject(req.error);
  });
}

export async function updateSubcategory(id: string, name: string): Promise<void> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error('二级分类名称不能为空');

  const db = await getDB();
  const tx = db.transaction('subcategories', 'readonly');
  const store = tx.objectStore('subcategories');
  const req = store.get(id);

  return new Promise((resolve, reject) => {
    req.onsuccess = async () => {
      const target: Subcategory | undefined = req.result;
      if (!target) {
        reject(new Error('未找到该二级分类'));
        return;
      }

      // Check duplicates in the same category
      const siblings = await getAllSubcategories(target.categoryId);
      if (siblings.some((s) => s.id !== id && s.name.toLowerCase() === trimmed.toLowerCase())) {
        reject(new Error(`该分类下已存在同名二级分类 "${trimmed}"`));
        return;
      }

      const writeTx = db.transaction('subcategories', 'readwrite');
      const writeStore = writeTx.objectStore('subcategories');
      target.name = trimmed;
      const putReq = writeStore.put(target);
      putReq.onsuccess = () => resolve();
      putReq.onerror = () => reject(putReq.error);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function reorderSubcategories(categoryId: string, orderedIds: string[]): Promise<void> {
  const db = await getDB();
  const subcategories = await getAllSubcategories(categoryId);
  const subMap = new Map(subcategories.map((s) => [s.id, s]));

  return new Promise((resolve, reject) => {
    const tx = db.transaction('subcategories', 'readwrite');
    const store = tx.objectStore('subcategories');

    orderedIds.forEach((id, index) => {
      const sub = subMap.get(id);
      if (sub) {
        sub.sortOrder = index;
        store.put(sub);
      }
    });

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteSubcategory(
  id: string,
  migrateToSubcategoryId?: string | null
): Promise<void> {
  const db = await getDB();
  const items = await getAllClothingItems();
  const affectedItems = items.filter((i) => i.subcategoryId === id);

  if (affectedItems.length > 0 && migrateToSubcategoryId === undefined) {
    throw new Error(`该二级分类下尚有 ${affectedItems.length} 件衣物，请选择迁移至其他二级分类或转为无二级分类后再删除。`);
  }

  if (migrateToSubcategoryId && migrateToSubcategoryId === id) {
    throw new Error('不能迁移到自身二级分类');
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction(['subcategories', 'clothingItems'], 'readwrite');
    const subStore = tx.objectStore('subcategories');
    const itemStore = tx.objectStore('clothingItems');

    // Update affected items
    affectedItems.forEach((item) => {
      item.subcategoryId = migrateToSubcategoryId || null;
      item.updatedAt = Date.now();
      itemStore.put(item);
    });

    // Delete subcategory
    subStore.delete(id);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ----------------- Clothing Items CRUD -----------------

export async function getAllClothingItems(): Promise<ClothingItem[]> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clothingItems', 'readonly');
    const store = tx.objectStore('clothingItems');
    const req = store.getAll();

    req.onsuccess = () => {
      const items: ClothingItem[] = req.result || [];
      // Default order: newest first
      items.sort((a, b) => b.createdAt - a.createdAt);
      resolve(items);
    };
    req.onerror = () => reject(req.error);
  });
}

export async function getClothingItemById(id: string): Promise<ClothingItem | undefined> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clothingItems', 'readonly');
    const store = tx.objectStore('clothingItems');
    const req = store.get(id);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function addClothingItem(
  item: Omit<ClothingItem, 'id' | 'createdAt' | 'updatedAt'>
): Promise<ClothingItem> {
  if (!item.imageData) throw new Error('衣物照片不能为空');
  if (!item.categoryId) throw new Error('请选择衣物分类');

  const now = Date.now();
  const newItem: ClothingItem = {
    ...item,
    id: `cloth_${now}_${Math.random().toString(36).slice(2, 7)}`,
    createdAt: now,
    updatedAt: now,
  };

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clothingItems', 'readwrite');
    const store = tx.objectStore('clothingItems');
    const req = store.add(newItem);
    req.onsuccess = () => resolve(newItem);
    req.onerror = () => reject(req.error);
  });
}

export async function updateClothingItem(
  id: string,
  updates: Partial<Omit<ClothingItem, 'id' | 'createdAt'>>
): Promise<ClothingItem> {
  const existing = await getClothingItemById(id);
  if (!existing) throw new Error('未找到该衣物记录');

  const updatedItem: ClothingItem = {
    ...existing,
    ...updates,
    updatedAt: Date.now(),
  };

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clothingItems', 'readwrite');
    const store = tx.objectStore('clothingItems');
    const req = store.put(updatedItem);
    req.onsuccess = () => resolve(updatedItem);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteClothingItem(id: string): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction('clothingItems', 'readwrite');
    const store = tx.objectStore('clothingItems');
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

// ----------------- User Preferences & UI State -----------------

export async function getPreference<T>(key: string, defaultValue: T): Promise<T> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction('preferences', 'readonly');
      const store = tx.objectStore('preferences');
      const req = store.get(key);
      req.onsuccess = () => {
        if (req.result && req.result.value !== undefined) {
          resolve(req.result.value as T);
        } else {
          resolve(defaultValue);
        }
      };
      req.onerror = () => resolve(defaultValue);
    });
  } catch {
    return defaultValue;
  }
}

export async function setPreference<T>(key: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('preferences', 'readwrite');
      const store = tx.objectStore('preferences');
      const req = store.put({ key, value });
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch {
    // Ignore preferences error
  }
}

// ----------------- Backup / Export / Import -----------------

export async function exportAllData(): Promise<WardrobeBackup> {
  const categories = await getAllCategories();
  const subcategories = await getAllSubcategories();
  const clothingItems = await getAllClothingItems();

  return {
    version: '1.0.0',
    exportedAt: Date.now(),
    categories,
    subcategories,
    clothingItems,
  };
}

export async function importAllData(backup: WardrobeBackup): Promise<void> {
  if (!backup || !Array.isArray(backup.categories) || !Array.isArray(backup.clothingItems)) {
    throw new Error('导入失败：无效的备份文件数据结构');
  }

  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['categories', 'subcategories', 'clothingItems'], 'readwrite');
    const catStore = tx.objectStore('categories');
    const subStore = tx.objectStore('subcategories');
    const itemStore = tx.objectStore('clothingItems');

    // 1. Clear existing
    catStore.clear();
    subStore.clear();
    itemStore.clear();

    // 2. Insert categories
    backup.categories.forEach((cat) => catStore.put(cat));

    // 3. Insert subcategories
    if (Array.isArray(backup.subcategories)) {
      backup.subcategories.forEach((sub) => subStore.put(sub));
    }

    // 4. Insert clothing items
    backup.clothingItems.forEach((item) => itemStore.put(item));

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function clearAllData(): Promise<void> {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(['categories', 'subcategories', 'clothingItems'], 'readwrite');
    tx.objectStore('categories').clear();
    tx.objectStore('subcategories').clear();
    tx.objectStore('clothingItems').clear();
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function resetToDefaultData(): Promise<void> {
  await clearAllData();
  const db = await getDB();
  await initDefaultCategoriesIfEmpty(db);
}
