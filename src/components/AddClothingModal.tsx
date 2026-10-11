import React, { useState, useRef, useEffect } from 'react';
import {
  Category,
  Subcategory,
  ClothingItem,
} from '../types';
import {
  Camera,
  Upload,
  X,
  Plus,
  RotateCcw,
  Check,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from 'lucide-react';
import { compressImage, generateDefaultClothingName } from '../utils/imageUtils';
import {
  addClothingItem,
  addCategory,
  addSubcategory,
  getAllCategories,
  getAllSubcategories,
  getAllClothingItems,
} from '../db/indexedDB';
import { useToast } from '../context/ToastContext';

interface AddClothingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onItemAdded: (item: ClothingItem) => void;
  initialCategoryId?: string;
  initialSubcategoryId?: string | null;
  onRefreshCategories: () => void;
}

export const AddClothingModal: React.FC<AddClothingModalProps> = ({
  isOpen,
  onClose,
  onItemAdded,
  initialCategoryId,
  initialSubcategoryId,
  onRefreshCategories,
}) => {
  const { showToast } = useToast();

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);

  // Form states
  const [imageData, setImageData] = useState<string>('');
  const [selectedCatId, setSelectedCatId] = useState<string>('');
  const [selectedSubId, setSelectedSubId] = useState<string | null>(null);
  const [clothingName, setClothingName] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [savedSuccessItem, setSavedSuccessItem] = useState<ClothingItem | null>(null);

  // Quick inline creation states
  const [showAddCatInput, setShowAddCatInput] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [showAddSubInput, setShowAddSubInput] = useState(false);
  const [newSubName, setNewSubName] = useState('');

  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Load fresh categories whenever modal opens
  useEffect(() => {
    if (isOpen) {
      loadData();
      setSavedSuccessItem(null);
    }
  }, [isOpen, initialCategoryId, initialSubcategoryId]);

  async function loadData() {
    const cats = await getAllCategories();
    const subs = await getAllSubcategories();
    setCategories(cats);
    setSubcategories(subs);

    if (initialCategoryId && cats.some((c) => c.id === initialCategoryId)) {
      setSelectedCatId(initialCategoryId);
      if (initialSubcategoryId !== undefined) {
        setSelectedSubId(initialSubcategoryId);
      }
    } else if (cats.length > 0 && !selectedCatId) {
      setSelectedCatId(cats[0].id);
    }
  }

  // Handle image selection/capture
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setImageData(compressed);
      showToast('照片处理完成', 'info');
      // If no category selected yet, pick the first one automatically
      if (!selectedCatId && categories.length > 0) {
        setSelectedCatId(categories[0].id);
      }
    } catch (err: any) {
      showToast(err.message || '图片读取失败', 'error');
    }
  };

  // Inline add Category
  const handleCreateCategory = async () => {
    if (!newCatName.trim()) return;
    try {
      const newCat = await addCategory(newCatName);
      setCategories((prev) => [...prev, newCat]);
      setSelectedCatId(newCat.id);
      setSelectedSubId(null);
      setNewCatName('');
      setShowAddCatInput(false);
      onRefreshCategories();
      showToast(`已创建分类 "${newCat.name}" 并已选中`, 'success');
    } catch (err: any) {
      showToast(err.message || '创建一级分类失败', 'error');
    }
  };

  // Inline add Subcategory
  const handleCreateSubcategory = async () => {
    if (!selectedCatId) {
      showToast('请先选择一级分类', 'error');
      return;
    }
    if (!newSubName.trim()) return;

    try {
      const newSub = await addSubcategory(selectedCatId, newSubName);
      setSubcategories((prev) => [...prev, newSub]);
      setSelectedSubId(newSub.id);
      setNewSubName('');
      setShowAddSubInput(false);
      onRefreshCategories();
      showToast(`已创建二级分类 "${newSub.name}" 并已选中`, 'success');
    } catch (err: any) {
      showToast(err.message || '创建二级分类失败', 'error');
    }
  };

  // Current category's subcategories
  const currentSubcategories = subcategories.filter((s) => s.categoryId === selectedCatId);

  // Submit save
  const handleSave = async () => {
    if (!imageData) {
      showToast('请先拍摄或上传衣物照片', 'error');
      return;
    }
    if (!selectedCatId) {
      showToast('请选择一级分类', 'error');
      return;
    }

    try {
      setIsSubmitting(true);
      const allItems = await getAllClothingItems();
      const catObj = categories.find((c) => c.id === selectedCatId);
      const subObj = subcategories.find((s) => s.id === selectedSubId);

      // Auto generate name if blank
      const finalName =
        clothingName.trim() ||
        generateDefaultClothingName(
          catObj?.name || '衣物',
          subObj?.name,
          allItems.length
        );

      const newItem = await addClothingItem({
        name: finalName,
        imageData,
        categoryId: selectedCatId,
        subcategoryId: selectedSubId || null,
        notes: notes.trim(),
      });

      onItemAdded(newItem);
      setSavedSuccessItem(newItem);
      showToast('衣物保存成功！', 'success');
    } catch (err: any) {
      showToast(err.message || '保存失败，请重试', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form to add another
  const handleResetForAnother = () => {
    setImageData('');
    setClothingName('');
    setNotes('');
    setSavedSuccessItem(null);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div className="modal-header">
          <h2 className="modal-title">
            {savedSuccessItem ? '录入完成' : '添加衣物'}
          </h2>
          <button className="modal-close-btn" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </div>

        {/* Modal Content */}
        <div className="modal-body">
          {savedSuccessItem ? (
            /* Success State */
            <div style={{ textAlign: 'center', padding: '24px 0', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div
                style={{
                  width: 68,
                  height: 68,
                  borderRadius: '50%',
                  background: '#dcfce7',
                  color: '#16a34a',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <CheckCircle2 size={40} />
              </div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#166534' }}>
                衣物已成功加入仓库！
              </h3>
              <p style={{ color: '#64748b', fontSize: '0.92rem' }}>
                【{savedSuccessItem.name}】已保存到对应分类中。
              </p>

              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 12,
                  overflow: 'hidden',
                  boxShadow: 'var(--shadow-md)',
                  border: '1px solid var(--border-subtle)',
                  marginTop: 8,
                }}
              >
                <img
                  src={savedSuccessItem.imageData}
                  alt={savedSuccessItem.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 12, marginTop: 20 }}>
                <button
                  className="btn-primary"
                  onClick={handleResetForAnother}
                >
                  <Plus size={16} />
                  继续添加下一件
                </button>
                <button className="btn-secondary" onClick={onClose}>
                  查看衣物仓库
                </button>
              </div>
            </div>
          ) : (
            /* Input Form */
            <>
              {/* Photo Input / Preview Area */}
              <div className="form-field">
                <label className="field-label">
                  衣物照片 <span className="field-hint">* 拍照或相册上传</span>
                </label>

                {imageData ? (
                  <div className="preview-photo-wrap">
                    <img src={imageData} alt="预览" className="preview-photo-img" />
                    <div className="preview-overlay-actions">
                      <button
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.9)' }}
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <RotateCcw size={14} /> 重新拍照
                      </button>
                      <button
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.9)' }}
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        <Upload size={14} /> 更换相片
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="photo-uploader-box">
                    <div className="uploader-icon-circle">
                      <Camera size={28} />
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <p style={{ fontWeight: 600, color: '#334155' }}>
                        点击拍照或选择相册照片
                      </p>
                      <p style={{ fontSize: '0.78rem', color: '#94a3b8', marginTop: 2 }}>
                        拍摄完成后将自动展开分类选择
                      </p>
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        onClick={() => cameraInputRef.current?.click()}
                      >
                        <Camera size={16} /> 拍照
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '8px 16px', fontSize: '0.85rem' }}
                        onClick={() => galleryInputRef.current?.click()}
                      >
                        <Upload size={16} /> 相册上传
                      </button>
                    </div>
                  </div>
                )}

                {/* Hidden input tags */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
                <input
                  ref={galleryInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFileChange}
                />
              </div>

              {/* Step 2: Category Selection (Automatically visible and prominent) */}
              <div className="form-field">
                <label className="field-label">
                  一级分类 <span className="field-hint">* 必选</span>
                </label>
                <div className="chip-group">
                  {categories.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`choice-chip ${selectedCatId === c.id ? 'selected' : ''}`}
                      onClick={() => {
                        setSelectedCatId(c.id);
                        setSelectedSubId(null);
                      }}
                    >
                      {c.name}
                    </button>
                  ))}

                  {/* Inline Add Category */}
                  {!showAddCatInput ? (
                    <button
                      type="button"
                      className="chip-add-new"
                      onClick={() => setShowAddCatInput(true)}
                    >
                      <Plus size={14} /> 新建一级分类
                    </button>
                  ) : (
                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="分类名 (如卫衣)"
                        value={newCatName}
                        onChange={(e) => setNewCatName(e.target.value)}
                        style={{
                          padding: '5px 10px',
                          border: '1px solid var(--primary)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.82rem',
                          outline: 'none',
                          width: 110,
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateCategory();
                          if (e.key === 'Escape') setShowAddCatInput(false);
                        }}
                      />
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '4px 8px', borderRadius: '50%', minWidth: 26, height: 26 }}
                        onClick={handleCreateCategory}
                        title="确认创建"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 8px', borderRadius: '50%', minWidth: 26, height: 26 }}
                        onClick={() => setShowAddCatInput(false)}
                        title="取消"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 3: Subcategory Selection */}
              <div className="form-field">
                <label className="field-label">
                  二级分类{' '}
                  <span className="field-hint">
                    {currentSubcategories.length === 0
                      ? '（当前分类无二级分类，可直接保存）'
                      : '（可选，精准分类）'}
                  </span>
                </label>

                <div className="chip-group">
                  {/* Option for no subcategory */}
                  <button
                    type="button"
                    className={`choice-chip ${selectedSubId === null ? 'selected' : ''}`}
                    onClick={() => setSelectedSubId(null)}
                  >
                    无二级分类
                  </button>

                  {currentSubcategories.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`choice-chip ${selectedSubId === s.id ? 'selected' : ''}`}
                      onClick={() => setSelectedSubId(s.id)}
                    >
                      {s.name}
                    </button>
                  ))}

                  {/* Inline Add Subcategory */}
                  {!showAddSubInput ? (
                    <button
                      type="button"
                      className="chip-add-new"
                      onClick={() => setShowAddSubInput(true)}
                    >
                      <Plus size={14} /> 新建二级分类
                    </button>
                  ) : (
                    <div style={{ display: 'inline-flex', gap: 6, alignItems: 'center' }}>
                      <input
                        type="text"
                        placeholder="二级名 (如连帽卫衣)"
                        value={newSubName}
                        onChange={(e) => setNewSubName(e.target.value)}
                        style={{
                          padding: '5px 10px',
                          border: '1px solid var(--primary)',
                          borderRadius: 'var(--radius-full)',
                          fontSize: '0.82rem',
                          outline: 'none',
                          width: 120,
                        }}
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleCreateSubcategory();
                          if (e.key === 'Escape') setShowAddSubInput(false);
                        }}
                      />
                      <button
                        type="button"
                        className="btn-primary"
                        style={{ padding: '4px 8px', borderRadius: '50%', minWidth: 26, height: 26 }}
                        onClick={handleCreateSubcategory}
                        title="确认创建"
                      >
                        <Check size={14} />
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        style={{ padding: '4px 8px', borderRadius: '50%', minWidth: 26, height: 26 }}
                        onClick={() => setShowAddSubInput(false)}
                        title="取消"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Step 4: Clothing Name (Optional) */}
              <div className="form-field">
                <label className="field-label">
                  衣物名称 <span className="field-hint">（可选，留空将自动按分类命名）</span>
                </label>
                <input
                  type="text"
                  className="text-input"
                  placeholder="如：Nike 白色速干短袖"
                  value={clothingName}
                  onChange={(e) => setClothingName(e.target.value)}
                />
              </div>

              {/* Step 5: Notes (Optional) */}
              <div className="form-field">
                <label className="field-label">
                  备注信息 <span className="field-hint">（可选，材质、尺码或收纳位置）</span>
                </label>
                <textarea
                  className="text-area"
                  placeholder="如：适合春季穿着，挂在主卧衣柜第二层"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        {!savedSuccessItem && (
          <div className="modal-footer">
            <button className="btn-secondary" onClick={onClose} disabled={isSubmitting}>
              取消
            </button>
            <button
              className="btn-primary"
              onClick={handleSave}
              disabled={isSubmitting || !imageData}
            >
              <Check size={18} />
              {isSubmitting ? '保存中...' : '保存衣物'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
