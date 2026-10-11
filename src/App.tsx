import React, { useState, useEffect, useCallback } from 'react';
import { Category, Subcategory, ClothingItem } from './types';
import {
  getAllCategories,
  getAllSubcategories,
  getAllClothingItems,
} from './db/indexedDB';
import { Header } from './components/Header';
import { WardrobeView } from './components/WardrobeView';
import { AddClothingModal } from './components/AddClothingModal';
import { ClothingDetailModal } from './components/ClothingDetailModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { BackupModal } from './components/BackupModal';
import { MobileGuideModal } from './components/MobileGuideModal';
import { ToastProvider, useToast } from './context/ToastContext';
import {
  Shirt,
  FolderTree,
  Database,
  Plus,
} from 'lucide-react';

export const MainApp: React.FC = () => {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [clothingItems, setClothingItems] = useState<ClothingItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Tab state (for mobile & desktop view switches)
  const [activeTab, setActiveTab] = useState<'wardrobe' | 'categories' | 'backup'>('wardrobe');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addInitialCatId, setAddInitialCatId] = useState<string | undefined>();
  const [addInitialSubId, setAddInitialSubId] = useState<string | null | undefined>();

  const [selectedItemDetail, setSelectedItemDetail] = useState<ClothingItem | null>(null);
  const [isCatManagerModalOpen, setIsCatManagerModalOpen] = useState(false);
  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isMobileGuideOpen, setIsMobileGuideOpen] = useState(false);

  // Load all initial data from IndexedDB
  const refreshData = useCallback(async () => {
    try {
      const [cats, subs, items] = await Promise.all([
        getAllCategories(),
        getAllSubcategories(),
        getAllClothingItems(),
      ]);
      setCategories(cats);
      setSubcategories(subs);
      setClothingItems(items);
    } catch (err: any) {
      console.error('Error fetching wardrobe data:', err);
      showToast('读取衣橱数据失败', 'error');
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    refreshData();
  }, [refreshData]);

  // Open Add modal with preset category/subcategory
  const handleOpenAddWithCategory = (catId: string, subId?: string | null) => {
    setAddInitialCatId(catId);
    setAddInitialSubId(subId);
    setIsAddModalOpen(true);
  };

  const handleOpenAddGeneric = () => {
    setAddInitialCatId(undefined);
    setAddInitialSubId(undefined);
    setIsAddModalOpen(true);
  };

  // Callback when new item added
  const handleItemAdded = (newItem: ClothingItem) => {
    setClothingItems((prev) => [newItem, ...prev]);
  };

  // Callback when item updated
  const handleItemUpdated = (updatedItem: ClothingItem) => {
    setClothingItems((prev) =>
      prev.map((i) => (i.id === updatedItem.id ? updatedItem : i))
    );
    setSelectedItemDetail(updatedItem);
  };

  // Callback when item deleted
  const handleItemDeleted = (deletedId: string) => {
    setClothingItems((prev) => prev.filter((i) => i.id !== deletedId));
    setSelectedItemDetail(null);
  };

  // Switch tabs
  const handleTabChange = (tab: 'wardrobe' | 'categories' | 'backup') => {
    setActiveTab(tab);
    if (tab === 'categories') {
      setIsCatManagerModalOpen(true);
    } else if (tab === 'backup') {
      setIsBackupModalOpen(true);
    }
  };

  return (
    <div className="app-container">
      {/* Top Header */}
      <Header
        totalItems={clothingItems.length}
        totalCategories={categories.length}
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        onOpenAddModal={handleOpenAddGeneric}
        onOpenMobileGuide={() => setIsMobileGuideOpen(true)}
      />

      {/* Main View Area */}
      <main className="main-content">
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
            <Shirt
              size={36}
              style={{ animation: 'bounce 1s infinite', color: 'var(--primary)', marginBottom: 12 }}
            />
            <p>正在加载个人衣橱...</p>
          </div>
        ) : (
          <WardrobeView
            categories={categories}
            subcategories={subcategories}
            clothingItems={clothingItems}
            onSelectItem={(item) => setSelectedItemDetail(item)}
            onOpenAddModalWithCategory={handleOpenAddWithCategory}
          />
        )}
      </main>

      {/* Floating Add Button (for Tablet/Desktop) */}
      <button
        className="floating-add-btn"
        onClick={handleOpenAddGeneric}
        title="添加新衣物"
      >
        <Plus size={20} strokeWidth={2.5} />
        <span>添加衣物</span>
      </button>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="mobile-bottom-nav">
        <button
          className={`mobile-nav-item ${activeTab === 'wardrobe' ? 'active' : ''}`}
          onClick={() => setActiveTab('wardrobe')}
        >
          <Shirt size={20} />
          <span>衣橱</span>
        </button>

        <button
          className="mobile-nav-item fab-center"
          onClick={handleOpenAddGeneric}
          title="添加衣物"
        >
          <Plus size={28} strokeWidth={2.5} />
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('categories');
            setIsCatManagerModalOpen(true);
          }}
        >
          <FolderTree size={20} />
          <span>分类</span>
        </button>

        <button
          className={`mobile-nav-item ${activeTab === 'backup' ? 'active' : ''}`}
          onClick={() => {
            setActiveTab('backup');
            setIsBackupModalOpen(true);
          }}
        >
          <Database size={20} />
          <span>备份</span>
        </button>
      </nav>

      {/* Modals */}
      {/* 1. Add Clothing Modal */}
      <AddClothingModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onItemAdded={handleItemAdded}
        initialCategoryId={addInitialCatId}
        initialSubcategoryId={addInitialSubId}
        onRefreshCategories={refreshData}
      />

      {/* 2. Clothing Detail / Edit Modal */}
      <ClothingDetailModal
        item={selectedItemDetail}
        categories={categories}
        subcategories={subcategories}
        onClose={() => setSelectedItemDetail(null)}
        onItemUpdated={handleItemUpdated}
        onItemDeleted={handleItemDeleted}
      />

      {/* 3. Category Manager Modal */}
      {isCatManagerModalOpen && (
        <CategoryManagerModal
          categories={categories}
          subcategories={subcategories}
          clothingItems={clothingItems}
          onClose={() => {
            setIsCatManagerModalOpen(false);
            setActiveTab('wardrobe');
          }}
          onRefresh={refreshData}
        />
      )}

      {/* 4. Backup & Restore Modal */}
      {isBackupModalOpen && (
        <BackupModal
          totalItems={clothingItems.length}
          totalCategories={categories.length}
          totalSubcategories={subcategories.length}
          onClose={() => {
            setIsBackupModalOpen(false);
            setActiveTab('wardrobe');
          }}
          onDataChanged={refreshData}
        />
      )}

      {/* 5. Mobile Guide Modal */}
      <MobileGuideModal
        isOpen={isMobileGuideOpen}
        onClose={() => setIsMobileGuideOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <MainApp />
    </ToastProvider>
  );
}
