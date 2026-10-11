import React, { useState } from 'react';
import { Category, Subcategory, ClothingItem } from '../types';
import {
  X,
  Plus,
  Edit2,
  Trash2,
  ArrowUp,
  ArrowDown,
  Layers,
  Check,
  AlertTriangle,
  FolderPlus,
} from 'lucide-react';
import {
  addCategory,
  updateCategory,
  deleteCategory,
  reorderCategories,
  addSubcategory,
  updateSubcategory,
  deleteSubcategory,
  reorderSubcategories,
} from '../db/indexedDB';
import { useToast } from '../context/ToastContext';

interface CategoryManagerModalProps {
  categories: Category[];
  subcategories: Subcategory[];
  clothingItems: ClothingItem[];
  onClose: () => void;
  onRefresh: () => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  categories,
  subcategories,
  clothingItems,
  onClose,
  onRefresh,
}) => {
  const { showToast } = useToast();

  // Create Level 1 Category
  const [newCatName, setNewCatName] = useState('');
  const [isAddingCat, setIsAddingCat] = useState(false);

  // Edit category modal states
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');

  // Add subcategory states
  const [addingSubForCatId, setAddingSubForCatId] = useState<string | null>(null);
  const [newSubName, setNewSubName] = useState('');

  // Edit subcategory states
  const [editingSubId, setEditingSubId] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState('');

  // Migration delete modal state for Category
  const [deleteCatTarget, setDeleteCatTarget] = useState<Category | null>(null);
  const [migrateTargetCatId, setMigrateTargetCatId] = useState<string>('');

  // Migration delete modal state for Subcategory
  const [deleteSubTarget, setDeleteSubTarget] = useState<Subcategory | null>(null);
  const [migrateTargetSubId, setMigrateTargetSubId] = useState<string>('');

  // 1. Add Category
  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      await addCategory(newCatName.trim());
      setNewCatName('');
      setIsAddingCat(false);
      onRefresh();
      showToast('一级分类添加成功', 'success');
    } catch (err: any) {
      showToast(err.message || '添加失败', 'error');
    }
  };

  // 2. Edit Category Name
  const handleSaveCatName = async (id: string) => {
    if (!editCatName.trim()) return;
    try {
      await updateCategory(id, editCatName.trim());
      setEditingCatId(null);
      onRefresh();
      showToast('分类名称修改成功', 'success');
    } catch (err: any) {
      showToast(err.message || '修改失败', 'error');
    }
  };

  // 3. Reorder Categories (Up/Down)
  const handleMoveCat = async (index: number, direction: 'up' | 'down') => {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= categories.length) return;

    const list = [...categories];
    const temp = list[index];
    list[index] = list[targetIndex];
    list[targetIndex] = temp;

    await reorderCategories(list.map((c) => c.id));
    onRefresh();
  };

  // 4. Pre-check delete category
  const initiateDeleteCategory = (cat: Category) => {
    const itemsInCat = clothingItems.filter((i) => i.categoryId === cat.id);
    const otherCats = categories.filter((c) => c.id !== cat.id);

    if (itemsInCat.length === 0) {
      // Directly delete
      if (confirm(`确定删除分类 "${cat.name}" 吗？`)) {
        deleteCategory(cat.id)
          .then(() => {
            showToast(`分类 "${cat.name}" 已删除`, 'success');
            onRefresh();
          })
          .catch((err) => showToast(err.message, 'error'));
      }
    } else {
      // Items exist: open migration prompt
      setDeleteCatTarget(cat);
      setMigrateTargetCatId(otherCats[0]?.id || '');
    }
  };

  // Confirm migration delete category
  const handleConfirmMigrateDeleteCat = async () => {
    if (!deleteCatTarget) return;
    if (!migrateTargetCatId) {
      showToast('请选择迁移目标分类', 'error');
      return;
    }

    try {
      await deleteCategory(deleteCatTarget.id, migrateTargetCatId);
      showToast(`已删除分类 "${deleteCatTarget.name}"，关联衣物已迁移`, 'success');
      setDeleteCatTarget(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error');
    }
  };

  // 5. Add Subcategory
  const handleAddSubcategory = async (catId: string) => {
    if (!newSubName.trim()) return;
    try {
      await addSubcategory(catId, newSubName.trim());
      setNewSubName('');
      setAddingSubForCatId(null);
      onRefresh();
      showToast('二级分类添加成功', 'success');
    } catch (err: any) {
      showToast(err.message || '添加失败', 'error');
    }
  };

  // 6. Edit Subcategory
  const handleSaveSubName = async (id: string) => {
    if (!editSubName.trim()) return;
    try {
      await updateSubcategory(id, editSubName.trim());
      setEditingSubId(null);
      onRefresh();
      showToast('二级分类名称修改成功', 'success');
    } catch (err: any) {
      showToast(err.message || '修改失败', 'error');
    }
  };

  // 7. Delete Subcategory
  const initiateDeleteSubcategory = (sub: Subcategory) => {
    const itemsInSub = clothingItems.filter((i) => i.subcategoryId === sub.id);
    const siblings = subcategories.filter(
      (s) => s.categoryId === sub.categoryId && s.id !== sub.id
    );

    if (itemsInSub.length === 0) {
      if (confirm(`确定删除二级分类 "${sub.name}" 吗？`)) {
        deleteSubcategory(sub.id)
          .then(() => {
            showToast(`二级分类 "${sub.name}" 已删除`, 'success');
            onRefresh();
          })
          .catch((err) => showToast(err.message, 'error'));
      }
    } else {
      // Items exist in this subcategory
      setDeleteSubTarget(sub);
      setMigrateTargetSubId('none'); // Default: become direct items under parent category
    }
  };

  // Confirm delete subcategory with migration
  const handleConfirmMigrateDeleteSub = async () => {
    if (!deleteSubTarget) return;

    try {
      const migrateTo = migrateTargetSubId === 'none' ? null : migrateTargetSubId;
      await deleteSubcategory(deleteSubTarget.id, migrateTo);
      showToast(`已删除二级分类 "${deleteSubTarget.name}"，关联衣物已迁移`, 'success');
      setDeleteSubTarget(null);
      onRefresh();
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: 680 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Layers size={20} style={{ color: 'var(--primary)' }} />
            <h2 className="modal-title">分类管理</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* Add Category Section */}
          <div
            style={{
              padding: 14,
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontWeight: 600, fontSize: '0.92rem' }}>新增一级分类</span>
              {!isAddingCat && (
                <button
                  className="btn-primary"
                  style={{ padding: '6px 14px', fontSize: '0.84rem' }}
                  onClick={() => setIsAddingCat(true)}
                >
                  <Plus size={16} /> 新增
                </button>
              )}
            </div>

            {isAddingCat && (
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="text-input"
                  placeholder="如：卫衣、鞋子、帽子、毛衣"
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddCategory();
                    if (e.key === 'Escape') setIsAddingCat(false);
                  }}
                />
                <button className="btn-primary" onClick={handleAddCategory}>
                  <Check size={16} /> 保存
                </button>
                <button className="btn-secondary" onClick={() => setIsAddingCat(false)}>
                  取消
                </button>
              </div>
            )}
          </div>

          {/* Categories List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {categories.map((cat, catIdx) => {
              const catItemsCount = clothingItems.filter((i) => i.categoryId === cat.id).length;
              const catSubs = subcategories.filter((s) => s.categoryId === cat.id);

              return (
                <div
                  key={cat.id}
                  style={{
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    background: '#ffffff',
                    padding: '14px 16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 12,
                  }}
                >
                  {/* Category Header Row */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    {editingCatId === cat.id ? (
                      <div style={{ display: 'flex', gap: 8, flex: 1, marginRight: 10 }}>
                        <input
                          type="text"
                          className="text-input"
                          value={editCatName}
                          onChange={(e) => setEditCatName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveCatName(cat.id);
                            if (e.key === 'Escape') setEditingCatId(null);
                          }}
                        />
                        <button className="btn-primary" style={{ padding: '6px 12px' }} onClick={() => handleSaveCatName(cat.id)}>
                          <Check size={14} />
                        </button>
                        <button className="btn-secondary" style={{ padding: '6px 12px' }} onClick={() => setEditingCatId(null)}>
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontWeight: 700, fontSize: '1rem', color: '#0f172a' }}>
                          {cat.name}
                        </span>
                        <span className="count-chip">{catItemsCount} 件衣物</span>
                      </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                      <button
                        className="header-action-icon-btn"
                        title="上移"
                        disabled={catIdx === 0}
                        style={{ opacity: catIdx === 0 ? 0.3 : 1 }}
                        onClick={() => handleMoveCat(catIdx, 'up')}
                      >
                        <ArrowUp size={16} />
                      </button>
                      <button
                        className="header-action-icon-btn"
                        title="下移"
                        disabled={catIdx === categories.length - 1}
                        style={{ opacity: catIdx === categories.length - 1 ? 0.3 : 1 }}
                        onClick={() => handleMoveCat(catIdx, 'down')}
                      >
                        <ArrowDown size={16} />
                      </button>
                      <button
                        className="header-action-icon-btn"
                        title="重命名"
                        onClick={() => {
                          setEditingCatId(cat.id);
                          setEditCatName(cat.name);
                        }}
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        className="header-action-icon-btn"
                        style={{ color: 'var(--danger)' }}
                        title="删除分类"
                        onClick={() => initiateDeleteCategory(cat)}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Subcategories Section */}
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: 'var(--radius-sm)',
                      padding: '10px 12px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 8,
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                        二级分类 ({catSubs.length})
                      </span>
                      {addingSubForCatId !== cat.id && (
                        <button
                          className="empty-add-link"
                          style={{ fontSize: '0.78rem' }}
                          onClick={() => {
                            setAddingSubForCatId(cat.id);
                            setNewSubName('');
                          }}
                        >
                          + 添加二级分类
                        </button>
                      )}
                    </div>

                    {/* Inline Add Subcategory */}
                    {addingSubForCatId === cat.id && (
                      <div style={{ display: 'flex', gap: 6, margin: '4px 0' }}>
                        <input
                          type="text"
                          className="text-input"
                          style={{ padding: '6px 10px', fontSize: '0.84rem' }}
                          placeholder="输入二级分类名称"
                          value={newSubName}
                          onChange={(e) => setNewSubName(e.target.value)}
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleAddSubcategory(cat.id);
                            if (e.key === 'Escape') setAddingSubForCatId(null);
                          }}
                        />
                        <button
                          className="btn-primary"
                          style={{ padding: '6px 12px', fontSize: '0.82rem' }}
                          onClick={() => handleAddSubcategory(cat.id)}
                        >
                          添加
                        </button>
                        <button
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.82rem' }}
                          onClick={() => setAddingSubForCatId(null)}
                        >
                          取消
                        </button>
                      </div>
                    )}

                    {/* Subcategories Chips */}
                    {catSubs.length > 0 ? (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {catSubs.map((sub) => {
                          const subCount = clothingItems.filter((i) => i.subcategoryId === sub.id).length;

                          return (
                            <div
                              key={sub.id}
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                background: '#ffffff',
                                border: '1px solid var(--border-subtle)',
                                borderRadius: 'var(--radius-full)',
                                padding: '4px 10px',
                                gap: 6,
                                fontSize: '0.82rem',
                              }}
                            >
                              {editingSubId === sub.id ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                  <input
                                    type="text"
                                    value={editSubName}
                                    onChange={(e) => setEditSubName(e.target.value)}
                                    style={{
                                      border: '1px solid var(--primary)',
                                      borderRadius: 4,
                                      padding: '2px 6px',
                                      fontSize: '0.82rem',
                                      outline: 'none',
                                      width: 90,
                                    }}
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSaveSubName(sub.id);
                                      if (e.key === 'Escape') setEditingSubId(null);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleSaveSubName(sub.id)}
                                    style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer' }}
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    onClick={() => setEditingSubId(null)}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <>
                                  <span style={{ fontWeight: 500, color: 'var(--text-main)' }}>{sub.name}</span>
                                  <span style={{ fontSize: '0.72rem', color: 'var(--text-light)' }}>({subCount})</span>
                                  <button
                                    onClick={() => {
                                      setEditingSubId(sub.id);
                                      setEditSubName(sub.name);
                                    }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-light)', cursor: 'pointer' }}
                                    title="重命名"
                                  >
                                    <Edit2 size={12} />
                                  </button>
                                  <button
                                    onClick={() => initiateDeleteSubcategory(sub)}
                                    style={{ background: 'none', border: 'none', color: 'var(--danger)', cursor: 'pointer' }}
                                    title="删除二级分类"
                                  >
                                    <Trash2 size={12} />
                                  </button>
                                </>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <span style={{ fontSize: '0.8rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                        暂无二级分类（衣物将直接存入该分类）
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            完成
          </button>
        </div>
      </div>

      {/* Migration Prompt for Category Delete */}
      {deleteCatTarget && (
        <div
          className="modal-overlay"
          style={{ zIndex: 70 }}
          onClick={() => setDeleteCatTarget(null)}
        >
          <div
            className="modal-sheet"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
                <AlertTriangle size={20} /> 删除分类确认
              </h3>
              <button className="modal-close-btn" onClick={() => setDeleteCatTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ gap: 14 }}>
              <p style={{ fontSize: '0.92rem', color: '#1e293b' }}>
                分类 <strong>"{deleteCatTarget.name}"</strong> 下目前有{' '}
                <strong style={{ color: 'var(--primary)' }}>
                  {clothingItems.filter((i) => i.categoryId === deleteCatTarget.id).length}
                </strong>{' '}
                件衣物。
              </p>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                为了防止照片与记录丢失，必须将已有衣物迁移至另一个分类后再执行删除：
              </p>

              <div className="form-field">
                <label className="field-label">将衣物迁移至：</label>
                <select
                  className="select-input"
                  value={migrateTargetCatId}
                  onChange={(e) => setMigrateTargetCatId(e.target.value)}
                >
                  {categories
                    .filter((c) => c.id !== deleteCatTarget.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteCatTarget(null)}>
                取消
              </button>
              <button className="btn-danger" onClick={handleConfirmMigrateDeleteCat}>
                迁移并删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Migration Prompt for Subcategory Delete */}
      {deleteSubTarget && (
        <div
          className="modal-overlay"
          style={{ zIndex: 70 }}
          onClick={() => setDeleteSubTarget(null)}
        >
          <div
            className="modal-sheet"
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--danger)' }}>
                <AlertTriangle size={20} /> 删除二级分类确认
              </h3>
              <button className="modal-close-btn" onClick={() => setDeleteSubTarget(null)}>
                <X size={18} />
              </button>
            </div>
            <div className="modal-body" style={{ gap: 14 }}>
              <p style={{ fontSize: '0.92rem', color: '#1e293b' }}>
                二级分类 <strong>"{deleteSubTarget.name}"</strong> 下目前有{' '}
                <strong style={{ color: 'var(--primary)' }}>
                  {clothingItems.filter((i) => i.subcategoryId === deleteSubTarget.id).length}
                </strong>{' '}
                件衣物。
              </p>
              <p style={{ fontSize: '0.85rem', color: '#64748b' }}>
                请选择已有衣物的处理方式，确保衣物照片 100% 完整保留：
              </p>

              <div className="form-field">
                <label className="field-label">将衣物转移至：</label>
                <select
                  className="select-input"
                  value={migrateTargetSubId}
                  onChange={(e) => setMigrateTargetSubId(e.target.value)}
                >
                  <option value="none">保留在当前一级分类下（无二级分类）</option>
                  {subcategories
                    .filter(
                      (s) =>
                        s.categoryId === deleteSubTarget.categoryId &&
                        s.id !== deleteSubTarget.id
                    )
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        迁移至同级分类：{s.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setDeleteSubTarget(null)}>
                取消
              </button>
              <button className="btn-danger" onClick={handleConfirmMigrateDeleteSub}>
                迁移并删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
