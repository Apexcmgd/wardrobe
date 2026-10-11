import React, { useState, useMemo, useEffect } from 'react';
import {
  Category,
  Subcategory,
  ClothingItem,
  SortOrder,
} from '../types';
import {
  Search,
  X,
  ChevronDown,
  ChevronsDown,
  ChevronsUp,
  Shirt,
  Calendar,
  Layers,
  Sparkles,
  Plus,
} from 'lucide-react';
import { formatShortDate } from '../utils/imageUtils';
import { getPreference, setPreference } from '../db/indexedDB';

interface WardrobeViewProps {
  categories: Category[];
  subcategories: Subcategory[];
  clothingItems: ClothingItem[];
  onSelectItem: (item: ClothingItem) => void;
  onOpenAddModalWithCategory?: (categoryId: string, subcategoryId?: string | null) => void;
}

export const WardrobeView: React.FC<WardrobeViewProps> = ({
  categories,
  subcategories,
  clothingItems,
  onSelectItem,
  onOpenAddModalWithCategory,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');
  const [selectedSubFilter, setSelectedSubFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');

  // Collapse state maps: id -> boolean (true = collapsed)
  const [collapsedCategories, setCollapsedCategories] = useState<Record<string, boolean>>({});
  const [collapsedSubcategories, setCollapsedSubcategories] = useState<Record<string, boolean>>({});

  // Load saved collapse preferences
  useEffect(() => {
    async function loadPreferences() {
      const savedCatCollapse = await getPreference<Record<string, boolean>>('collapsed_categories', {});
      const savedSubCollapse = await getPreference<Record<string, boolean>>('collapsed_subcategories', {});
      setCollapsedCategories(savedCatCollapse || {});
      setCollapsedSubcategories(savedSubCollapse || {});
    }
    loadPreferences();
  }, []);

  // Save collapse preferences when changed
  const toggleCategoryCollapse = (catId: string) => {
    setCollapsedCategories((prev) => {
      const next = { ...prev, [catId]: !prev[catId] };
      setPreference('collapsed_categories', next);
      return next;
    });
  };

  const toggleSubcategoryCollapse = (subId: string) => {
    setCollapsedSubcategories((prev) => {
      const next = { ...prev, [subId]: !prev[subId] };
      setPreference('collapsed_subcategories', next);
      return next;
    });
  };

  // Expand all / Collapse all actions
  const expandAll = () => {
    setCollapsedCategories({});
    setCollapsedSubcategories({});
    setPreference('collapsed_categories', {});
    setPreference('collapsed_subcategories', {});
  };

  const collapseAll = () => {
    const allCatCollapsed: Record<string, boolean> = {};
    const allSubCollapsed: Record<string, boolean> = {};
    categories.forEach((c) => {
      allCatCollapsed[c.id] = true;
    });
    subcategories.forEach((s) => {
      allSubCollapsed[s.id] = true;
    });
    setCollapsedCategories(allCatCollapsed);
    setCollapsedSubcategories(allSubCollapsed);
    setPreference('collapsed_categories', allCatCollapsed);
    setPreference('collapsed_subcategories', allSubCollapsed);
  };

  // Available subcategories for the selected category filter
  const filterSubcategories = useMemo(() => {
    if (selectedCatFilter === 'all') return [];
    return subcategories.filter((s) => s.categoryId === selectedCatFilter);
  }, [selectedCatFilter, subcategories]);

  // Reset subcategory filter when category filter changes
  const handleCatFilterChange = (catId: string) => {
    setSelectedCatFilter(catId);
    setSelectedSubFilter('all');
  };

  // Fast lookup maps
  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const subMap = useMemo(() => new Map(subcategories.map((s) => [s.id, s])), [subcategories]);

  // Filtered and sorted items
  const filteredItems = useMemo(() => {
    let result = [...clothingItems];
    const query = searchQuery.trim().toLowerCase();

    if (query) {
      result = result.filter((item) => {
        const catName = catMap.get(item.categoryId)?.name || '';
        const subName = item.subcategoryId ? subMap.get(item.subcategoryId)?.name || '' : '';
        return (
          item.name.toLowerCase().includes(query) ||
          catName.toLowerCase().includes(query) ||
          subName.toLowerCase().includes(query) ||
          (item.notes && item.notes.toLowerCase().includes(query))
        );
      });
    }

    if (selectedCatFilter !== 'all') {
      result = result.filter((item) => item.categoryId === selectedCatFilter);
    }

    if (selectedSubFilter !== 'all') {
      result = result.filter((item) => item.subcategoryId === selectedSubFilter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder === 'newest') return b.createdAt - a.createdAt;
      if (sortOrder === 'oldest') return a.createdAt - b.createdAt;
      if (sortOrder === 'name') return a.name.localeCompare(b.name, 'zh-CN');
      return 0;
    });

    return result;
  }, [clothingItems, searchQuery, selectedCatFilter, selectedSubFilter, sortOrder, catMap, subMap]);

  // Group items by category and subcategory
  const groupedStructure = useMemo(() => {
    return categories
      .filter((cat) => {
        if (selectedCatFilter !== 'all' && cat.id !== selectedCatFilter) return false;
        return true;
      })
      .map((cat) => {
        const catItems = filteredItems.filter((i) => i.categoryId === cat.id);
        const catSubs = subcategories.filter((s) => s.categoryId === cat.id);

        const subGroups = catSubs
          .filter((sub) => {
            if (selectedSubFilter !== 'all' && sub.id !== selectedSubFilter) return false;
            return true;
          })
          .map((sub) => {
            const items = catItems.filter((i) => i.subcategoryId === sub.id);
            return {
              subcategory: sub,
              items,
            };
          });

        // Items with no subcategory under this category
        const directItems =
          selectedSubFilter === 'all'
            ? catItems.filter((i) => !i.subcategoryId)
            : [];

        return {
          category: cat,
          totalCount: catItems.length,
          subGroups,
          directItems,
        };
      });
  }, [categories, subcategories, filteredItems, selectedCatFilter, selectedSubFilter]);

  const isSearchingOrFiltering = searchQuery.trim().length > 0 || selectedCatFilter !== 'all';

  return (
    <div className="wardrobe-view-container">
      {/* Controls & Search Toolbar */}
      <div className="wardrobe-toolbar">
        {/* Search Input */}
        <div className="toolbar-search-row">
          <div className="search-input-wrapper">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="搜索衣物名称、分类、二级分类、备注..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => setSearchQuery('')}
                title="清空搜索"
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Filter controls row */}
        <div className="toolbar-controls-row">
          <div className="filter-group">
            {/* Category Filter */}
            <select
              className="filter-select"
              value={selectedCatFilter}
              onChange={(e) => handleCatFilterChange(e.target.value)}
            >
              <option value="all">所有一级分类</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Subcategory Filter */}
            {filterSubcategories.length > 0 && (
              <select
                className="filter-select"
                value={selectedSubFilter}
                onChange={(e) => setSelectedSubFilter(e.target.value)}
              >
                <option value="all">所有二级分类</option>
                {filterSubcategories.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            )}

            {/* Sort Order */}
            <select
              className="filter-select"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
            >
              <option value="newest">最新添加</option>
              <option value="oldest">最早添加</option>
              <option value="name">按名称排序</option>
            </select>
          </div>

          {/* Quick Collapse / Expand actions */}
          <div className="collapse-actions">
            <button className="btn-pill" onClick={expandAll} title="展开所有分类">
              <ChevronsDown size={14} />
              全部展开
            </button>
            <button className="btn-pill" onClick={collapseAll} title="折叠所有分类">
              <ChevronsUp size={14} />
              全部折叠
            </button>
          </div>
        </div>
      </div>

      {/* When search has no results */}
      {filteredItems.length === 0 && isSearchingOrFiltering && (
        <div className="empty-group-box" style={{ padding: '48px 20px', background: '#ffffff' }}>
          <Search size={36} strokeWidth={1.5} style={{ color: '#94a3b8' }} />
          <p style={{ fontWeight: 600, color: '#334155' }}>未找到匹配的衣物</p>
          <p style={{ fontSize: '0.84rem' }}>
            尝试更改搜索词或重置筛选条件
          </p>
          <button
            className="btn-secondary"
            style={{ marginTop: 8 }}
            onClick={() => {
              setSearchQuery('');
              setSelectedCatFilter('all');
              setSelectedSubFilter('all');
            }}
          >
            重置所有筛选
          </button>
        </div>
      )}

      {/* When entire wardrobe is empty */}
      {clothingItems.length === 0 && !isSearchingOrFiltering && (
        <div className="empty-group-box" style={{ padding: '60px 20px', background: '#ffffff', borderRadius: 16 }}>
          <Shirt size={48} strokeWidth={1.2} style={{ color: '#94a3b8' }} />
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b' }}>衣橱还是空的</h3>
          <p style={{ maxWidth: 360, color: '#64748b', fontSize: '0.9rem' }}>
            点击下方或顶部的“添加衣物”拍照录入你的第一件单品，或者前往“备份与恢复”载入演示数据！
          </p>
          {onOpenAddModalWithCategory && (
            <button
              className="btn-primary"
              style={{ marginTop: 12 }}
              onClick={() => onOpenAddModalWithCategory(categories[0]?.id || '')}
            >
              <Plus size={18} />
              拍照录入衣物
            </button>
          )}
        </div>
      )}

      {/* Main Hierarchical Categories & Subcategories View */}
      <div className="category-section-container">
        {groupedStructure.map((group) => {
          const isCatCollapsed = !!collapsedCategories[group.category.id];

          return (
            <section key={group.category.id} className="category-group-card">
              {/* Level 1 Category Header */}
              <div
                className={`category-header ${!isCatCollapsed ? 'expanded' : ''}`}
                onClick={() => toggleCategoryCollapse(group.category.id)}
              >
                <div className="category-title-info">
                  <div className="category-icon-badge">
                    <Layers size={18} />
                  </div>
                  <h2 className="category-title">{group.category.name}</h2>
                  <span className={`count-chip ${group.totalCount > 0 ? 'active' : ''}`}>
                    {group.totalCount} 件
                  </span>
                </div>

                <div className="category-header-right">
                  {onOpenAddModalWithCategory && (
                    <button
                      className="header-action-icon-btn"
                      title={`在 ${group.category.name} 添加衣物`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenAddModalWithCategory(group.category.id);
                      }}
                    >
                      <Plus size={18} />
                    </button>
                  )}
                  <ChevronDown
                    size={20}
                    className={`chevron-icon ${!isCatCollapsed ? 'rotated' : ''}`}
                  />
                </div>
              </div>

              {/* Level 1 Category Content (Expandable) */}
              {!isCatCollapsed && (
                <div className="category-content">
                  {/* Direct Items (items without subcategory, e.g. 羽绒服) */}
                  {group.directItems.length > 0 && (
                    <div className="clothing-grid">
                      {group.directItems.map((item) => (
                        <ClothingCard
                          key={item.id}
                          item={item}
                          categoryName={group.category.name}
                          subcategoryName={null}
                          onClick={() => onSelectItem(item)}
                        />
                      ))}
                    </div>
                  )}

                  {/* Subcategory Groups */}
                  {group.subGroups.map((subGroup) => {
                    const isSubCollapsed = !!collapsedSubcategories[subGroup.subcategory.id];

                    return (
                      <div key={subGroup.subcategory.id} className="subcategory-group-card">
                        {/* Level 2 Subcategory Header */}
                        <div
                          className={`subcategory-header ${!isSubCollapsed ? 'expanded' : ''}`}
                          onClick={() => toggleSubcategoryCollapse(subGroup.subcategory.id)}
                        >
                          <div className="subcategory-title-info">
                            <div className="subcategory-indicator-dot" />
                            <h3 className="subcategory-title">{subGroup.subcategory.name}</h3>
                            <span className="count-chip">{subGroup.items.length} 件</span>
                          </div>

                          <div className="category-header-right">
                            {onOpenAddModalWithCategory && (
                              <button
                                className="header-action-icon-btn"
                                title={`在 ${subGroup.subcategory.name} 添加衣物`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenAddModalWithCategory(
                                    group.category.id,
                                    subGroup.subcategory.id
                                  );
                                }}
                              >
                                <Plus size={16} />
                              </button>
                            )}
                            <ChevronDown
                              size={18}
                              className={`chevron-icon ${!isSubCollapsed ? 'rotated' : ''}`}
                            />
                          </div>
                        </div>

                        {/* Level 2 Subcategory Content */}
                        {!isSubCollapsed && (
                          <div className="subcategory-content">
                            {subGroup.items.length > 0 ? (
                              <div className="clothing-grid">
                                {subGroup.items.map((item) => (
                                  <ClothingCard
                                    key={item.id}
                                    item={item}
                                    categoryName={group.category.name}
                                    subcategoryName={subGroup.subcategory.name}
                                    onClick={() => onSelectItem(item)}
                                  />
                                ))}
                              </div>
                            ) : (
                              <div className="empty-group-box">
                                <span>暂无衣物</span>
                                {onOpenAddModalWithCategory && (
                                  <button
                                    className="empty-add-link"
                                    onClick={() =>
                                      onOpenAddModalWithCategory(
                                        group.category.id,
                                        subGroup.subcategory.id
                                      )
                                    }
                                  >
                                    + 立即添加
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* If category has neither subcategories nor direct items */}
                  {group.subGroups.length === 0 && group.directItems.length === 0 && (
                    <div className="empty-group-box">
                      <span>该分类下暂无衣物</span>
                      {onOpenAddModalWithCategory && (
                        <button
                          className="empty-add-link"
                          onClick={() => onOpenAddModalWithCategory(group.category.id)}
                        >
                          + 立即添加
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
};

// Subcomponent: ClothingCard
interface ClothingCardProps {
  item: ClothingItem;
  categoryName: string;
  subcategoryName: string | null;
  onClick: () => void;
}

const ClothingCard: React.FC<ClothingCardProps> = ({
  item,
  categoryName,
  subcategoryName,
  onClick,
}) => {
  return (
    <article className="clothing-card" onClick={onClick}>
      <div className="clothing-img-container">
        <img
          src={item.imageData}
          alt={item.name}
          className="clothing-img"
          loading="lazy"
        />
      </div>
      <div className="clothing-info">
        <div className="clothing-name" title={item.name}>
          {item.name}
        </div>
        <div className="clothing-meta-tags">
          <span className="clothing-tag-pill">
            {subcategoryName || categoryName}
          </span>
          <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#94a3b8' }}>
            {formatShortDate(item.createdAt)}
          </span>
        </div>
      </div>
    </article>
  );
};
