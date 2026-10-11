import { Category, Subcategory, ClothingItem } from '../types';
import { generateClothingArtwork } from './imageUtils';
import { getAllCategories, getAllSubcategories, addClothingItem } from '../db/indexedDB';

export async function populateSampleWardrobe(): Promise<ClothingItem[]> {
  const categories = await getAllCategories();
  const subcategories = await getAllSubcategories();

  const getCatId = (name: string) => categories.find((c) => c.name === name)?.id;
  const getSubId = (catName: string, subName: string) => {
    const cat = categories.find((c) => c.name === catName);
    if (!cat) return null;
    return subcategories.find((s) => s.categoryId === cat.id && s.name === subName)?.id || null;
  };

  const samples = [
    {
      name: 'Nike 速干运动短袖',
      catName: '短袖',
      subName: '运动短袖',
      type: 'tshirt' as const,
      color: '#3b82f6',
      bg: '#e0f2fe',
      notes: '透气排汗，适合跑步和健身房穿',
    },
    {
      name: 'MA-1 军绿经典飞行夹克',
      catName: '外套',
      subName: '飞行夹克',
      type: 'jacket' as const,
      color: '#15803d',
      bg: '#dcfce7',
      notes: '防风保暖，秋季出街百搭',
    },
    {
      name: '90白鸭绒极寒羽绒服',
      catName: '羽绒服',
      subName: null,
      type: 'downjacket' as const,
      color: '#475569',
      bg: '#f1f5f9',
      notes: '充绒量 280g，零下 15 度保暖',
    },
    {
      name: 'Lululemon 训练运动短裤',
      catName: '短裤',
      subName: '运动短裤',
      type: 'shorts' as const,
      color: '#0284c7',
      bg: '#e0f2fe',
      notes: '双层内衬防走光，带拉链口袋',
    },
    {
      name: '直筒休闲日常长裤',
      catName: '长裤',
      subName: '日常长裤',
      type: 'pants' as const,
      color: '#334155',
      bg: '#e2e8f0',
      notes: '垂坠感抗皱面料，通勤必备',
    },
    {
      name: '纯棉重磅日常短袖',
      catName: '短袖',
      subName: '日常短袖',
      type: 'tshirt' as const,
      color: '#e11d48',
      bg: '#ffe4e6',
      notes: '260g 新疆长绒棉，宽松版型',
    },
  ];

  const createdItems: ClothingItem[] = [];

  for (const s of samples) {
    const catId = getCatId(s.catName);
    if (!catId) continue;
    const subId = s.subName ? getSubId(s.catName, s.subName) : null;
    const imageData = generateClothingArtwork(s.type, s.color, s.bg);

    const item = await addClothingItem({
      name: s.name,
      imageData,
      categoryId: catId,
      subcategoryId: subId,
      notes: s.notes,
    });
    createdItems.push(item);
  }

  return createdItems;
}
