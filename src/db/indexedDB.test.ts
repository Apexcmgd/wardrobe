import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  getAllCategories,
  getAllSubcategories,
  getAllClothingItems,
  addCategory,
  updateCategory,
  deleteCategory,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
  addClothingItem,
  updateClothingItem,
  deleteClothingItem,
  exportAllData,
  importAllData,
  resetToDefaultData,
} from './indexedDB';

describe('Digital Wardrobe IndexedDB & Business Logic Tests', () => {
  beforeEach(async () => {
    await resetToDefaultData();
  });

  it('1. Initializes default categories and subcategories according to spec', async () => {
    const categories = await getAllCategories();
    expect(categories.length).toBe(6);

    const names = categories.map((c) => c.name);
    expect(names).toContain('短裤');
    expect(names).toContain('短袖');
    expect(names).toContain('长袖');
    expect(names).toContain('长裤');
    expect(names).toContain('外套');
    expect(names).toContain('羽绒服');

    // Check subcategories for 短袖
    const shortSleeve = categories.find((c) => c.name === '短袖')!;
    const subs = await getAllSubcategories(shortSleeve.id);
    const subNames = subs.map((s) => s.name);
    expect(subNames).toContain('运动短袖');
    expect(subNames).toContain('紧身短袖');
    expect(subNames).toContain('日常短袖');

    // Check 羽绒服 has no subcategories by default
    const downJacket = categories.find((c) => c.name === '羽绒服')!;
    const downSubs = await getAllSubcategories(downJacket.id);
    expect(downSubs.length).toBe(0);
  });

  it('2. Adds clothing item under 短袖 -> 运动短袖 and queries successfully', async () => {
    const categories = await getAllCategories();
    const shortSleeve = categories.find((c) => c.name === '短袖')!;
    const subs = await getAllSubcategories(shortSleeve.id);
    const sportsSub = subs.find((s) => s.name === '运动短袖')!;

    const item = await addClothingItem({
      name: 'Nike 速干运动短袖',
      imageData: 'data:image/webp;base64,mockImageString',
      categoryId: shortSleeve.id,
      subcategoryId: sportsSub.id,
      notes: '透气排汗',
    });

    expect(item.id).toBeDefined();
    expect(item.name).toBe('Nike 速干运动短袖');

    const all = await getAllClothingItems();
    expect(all.length).toBe(1);
    expect(all[0].id).toBe(item.id);
    expect(all[0].subcategoryId).toBe(sportsSub.id);
  });

  it('3. Adds new Level 1 category 卫衣, then adds subcategory 连帽卫衣', async () => {
    const newCat = await addCategory('卫衣');
    expect(newCat.name).toBe('卫衣');

    const categories = await getAllCategories();
    expect(categories.some((c) => c.name === '卫衣')).toBe(true);

    const newSub = await addSubcategory(newCat.id, '连帽卫衣');
    expect(newSub.name).toBe('连帽卫衣');
    expect(newSub.categoryId).toBe(newCat.id);

    const subs = await getAllSubcategories(newCat.id);
    expect(subs.length).toBe(1);
    expect(subs[0].name).toBe('连帽卫衣');
  });

  it('4. Adds 防风外套 to existing 外套 category', async () => {
    const categories = await getAllCategories();
    const jacketCat = categories.find((c) => c.name === '外套')!;

    const newSub = await addSubcategory(jacketCat.id, '防风外套');
    expect(newSub.name).toBe('防风外套');

    const subs = await getAllSubcategories(jacketCat.id);
    expect(subs.some((s) => s.name === '防风外套')).toBe(true);
  });

  it('5. Adds a 羽绒服 item without subcategory directly under Level 1', async () => {
    const categories = await getAllCategories();
    const downJacket = categories.find((c) => c.name === '羽绒服')!;

    const item = await addClothingItem({
      name: '90白鸭绒极寒羽绒服',
      imageData: 'data:image/webp;base64,mockDownJacketImage',
      categoryId: downJacket.id,
      subcategoryId: null,
      notes: '零下15度保暖',
    });

    expect(item.categoryId).toBe(downJacket.id);
    expect(item.subcategoryId).toBeNull();

    const items = await getAllClothingItems();
    expect(items.some((i) => i.id === item.id)).toBe(true);
  });

  it('6. Prevents accidental category deletion when items exist without migration, and migrates safely when target provided', async () => {
    const categories = await getAllCategories();
    const pants = categories.find((c) => c.name === '长裤')!;
    const jacket = categories.find((c) => c.name === '外套')!;

    // Add item to pants
    await addClothingItem({
      name: '工装长裤',
      imageData: 'data:image/webp;base64,mockPants',
      categoryId: pants.id,
      subcategoryId: null,
    });

    // Deleting pants without migration must throw
    await expect(deleteCategory(pants.id)).rejects.toThrow();

    // Deleting pants WITH migration to jacket
    await deleteCategory(pants.id, jacket.id);

    // Verify pants category is deleted
    const updatedCats = await getAllCategories();
    expect(updatedCats.some((c) => c.id === pants.id)).toBe(false);

    // Verify item is NOT lost, but now belongs to jacket!
    const allItems = await getAllClothingItems();
    expect(allItems.length).toBe(1);
    expect(allItems[0].categoryId).toBe(jacket.id);
  });

  it('7. Exports and imports backup data accurately', async () => {
    const categories = await getAllCategories();
    const shirt = categories.find((c) => c.name === '短袖')!;

    await addClothingItem({
      name: '纯棉测试T恤',
      imageData: 'data:image/webp;base64,backupTestImage',
      categoryId: shirt.id,
      subcategoryId: null,
      notes: '备份测试备注',
    });

    const backup = await exportAllData();
    expect(backup.clothingItems.length).toBe(1);
    expect(backup.categories.length).toBe(6);

    // Reset database to blank/default
    await resetToDefaultData();
    const clearedItems = await getAllClothingItems();
    expect(clearedItems.length).toBe(0);

    // Import the backup
    await importAllData(backup);

    // Verify restored
    const restoredItems = await getAllClothingItems();
    expect(restoredItems.length).toBe(1);
    expect(restoredItems[0].name).toBe('纯棉测试T恤');
    expect(restoredItems[0].notes).toBe('备份测试备注');
    expect(restoredItems[0].imageData).toBe('data:image/webp;base64,backupTestImage');
  });

  it('8. Validates unique category names in the same scope', async () => {
    await expect(addCategory('短袖')).rejects.toThrow('已存在同名一级分类');

    const categories = await getAllCategories();
    const pants = categories.find((c) => c.name === '长裤')!;
    await expect(addSubcategory(pants.id, '运动长裤')).rejects.toThrow('已存在同名二级分类');
  });
});
