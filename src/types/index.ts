export interface Category {
  id: string;
  name: string;
  sortOrder: number;
  createdAt: number;
}

export interface Subcategory {
  id: string;
  categoryId: string;
  name: string;
  sortOrder: number;
  createdAt: number;
}

export interface ClothingItem {
  id: string;
  name: string;
  imageData: string; // Base64 or Blob URL data string
  categoryId: string;
  subcategoryId: string | null;
  notes?: string;
  createdAt: number;
  updatedAt: number;
}

export interface WardrobeBackup {
  version: string;
  exportedAt: number;
  categories: Category[];
  subcategories: Subcategory[];
  clothingItems: ClothingItem[];
}

export interface CollapseState {
  [key: string]: boolean; // key -> isCollapsed
}

export type SortOrder = 'newest' | 'oldest' | 'name';
