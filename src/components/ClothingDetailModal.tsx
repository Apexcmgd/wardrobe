import React, { useState, useRef } from 'react';
import { Category, Subcategory, ClothingItem } from '../types';
import {
  X,
  Edit2,
  Trash2,
  Calendar,
  Layers,
  FileText,
  Check,
  Camera,
  Maximize2,
  AlertTriangle,
} from 'lucide-react';
import { formatDate, compressImage } from '../utils/imageUtils';
import { updateClothingItem, deleteClothingItem } from '../db/indexedDB';
import { useToast } from '../context/ToastContext';

interface ClothingDetailModalProps {
  item: ClothingItem | null;
  categories: Category[];
  subcategories: Subcategory[];
  onClose: () => void;
  onItemUpdated: (updatedItem: ClothingItem) => void;
  onItemDeleted: (id: string) => void;
}

export const ClothingDetailModal: React.FC<ClothingDetailModalProps> = ({
  item,
  categories,
  subcategories,
  onClose,
  onItemUpdated,
  onItemDeleted,
}) => {
  const { showToast } = useToast();

  const [isEditing, setIsEditing] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isFullScreenPhoto, setIsFullScreenPhoto] = useState(false);

  // Edit fields
  const [editName, setEditName] = useState('');
  const [editCatId, setEditCatId] = useState('');
  const [editSubId, setEditSubId] = useState<string | null>(null);
  const [editNotes, setEditNotes] = useState('');
  const [editImageData, setEditImageData] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!item) return null;

  // Initialize edit form when starting editing
  const startEditing = () => {
    setEditName(item.name);
    setEditCatId(item.categoryId);
    setEditSubId(item.subcategoryId);
    setEditNotes(item.notes || '');
    setEditImageData(item.imageData);
    setIsEditing(true);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressed = await compressImage(file);
      setEditImageData(compressed);
      showToast('已更新新照片预览', 'info');
    } catch (err: any) {
      showToast(err.message || '图片读取失败', 'error');
    }
  };

  const handleSaveEdit = async () => {
    if (!editName.trim()) {
      showToast('衣物名称不能为空', 'error');
      return;
    }
    if (!editCatId) {
      showToast('请选择一级分类', 'error');
      return;
    }

    try {
      setIsSaving(true);
      const updated = await updateClothingItem(item.id, {
        name: editName.trim(),
        categoryId: editCatId,
        subcategoryId: editSubId,
        notes: editNotes.trim(),
        imageData: editImageData,
      });

      onItemUpdated(updated);
      setIsEditing(false);
      showToast('衣物信息更新成功！', 'success');
    } catch (err: any) {
      showToast(err.message || '更新失败', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteClothingItem(item.id);
      showToast(`已删除衣物 "${item.name}"`, 'success');
      onItemDeleted(item.id);
      onClose();
    } catch (err: any) {
      showToast(err.message || '删除失败', 'error');
    }
  };

  const currentCategory = categories.find((c) => c.id === item.categoryId);
  const currentSubcategory = item.subcategoryId
    ? subcategories.find((s) => s.id === item.subcategoryId)
    : null;

  const currentEditSubcategories = subcategories.filter(
    (s) => s.categoryId === editCatId
  );

  return (
    <>
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-sheet" onClick={(e) => e.stopPropagation()}>
          {/* Modal Header */}
          <div className="modal-header">
            <h2 className="modal-title">
              {isEditing ? '编辑衣物' : item.name}
            </h2>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              {!isEditing && (
                <>
                  <button
                    className="header-action-icon-btn"
                    onClick={startEditing}
                    title="编辑信息"
                  >
                    <Edit2 size={18} />
                  </button>
                  <button
                    className="header-action-icon-btn"
                    style={{ color: 'var(--danger)' }}
                    onClick={() => setIsConfirmingDelete(true)}
                    title="删除此衣物"
                  >
                    <Trash2 size={18} />
                  </button>
                </>
              )}
              <button className="modal-close-btn" onClick={onClose} title="关闭">
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Modal Body */}
          <div className="modal-body">
            {isConfirmingDelete ? (
              /* Confirmation Box */
              <div style={{ padding: '20px 0', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: '50%',
                    background: 'var(--danger-light)',
                    color: 'var(--danger)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <AlertTriangle size={32} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                  确定要删除这件衣物吗？
                </h3>
                <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: 360 }}>
                  删除后该衣物数据及照片将从本地仓库彻底移除，此操作不可撤销。
                </p>

                <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                  <button
                    className="btn-secondary"
                    onClick={() => setIsConfirmingDelete(false)}
                  >
                    取消
                  </button>
                  <button className="btn-danger" onClick={handleDelete}>
                    确认删除
                  </button>
                </div>
              </div>
            ) : isEditing ? (
              /* Edit Form */
              <>
                <div className="form-field">
                  <label className="field-label">衣物照片</label>
                  <div className="preview-photo-wrap preview-photo-wrap--edit">
                    <img src={editImageData} alt="预览" className="preview-photo-img" />
                    <div className="preview-overlay-actions">
                      <button
                        className="btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.8rem', background: 'rgba(255, 255, 255, 0.95)' }}
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Camera size={14} /> 更换照片
                      </button>
                    </div>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleImageChange}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">衣物名称</label>
                  <input
                    type="text"
                    className="text-input"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                  />
                </div>

                <div className="form-field">
                  <label className="field-label">一级分类</label>
                  <select
                    className="select-input"
                    value={editCatId}
                    onChange={(e) => {
                      setEditCatId(e.target.value);
                      setEditSubId(null);
                    }}
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="field-label">二级分类</label>
                  <select
                    className="select-input"
                    value={editSubId || ''}
                    onChange={(e) => setEditSubId(e.target.value || null)}
                  >
                    <option value="">无二级分类</option>
                    {currentEditSubcategories.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-field">
                  <label className="field-label">备注信息</label>
                  <textarea
                    className="text-area"
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                  />
                </div>
              </>
            ) : (
              /* View Mode */
              <>
                {/* Photo Viewer */}
                <div
                  className="preview-photo-wrap preview-photo-wrap--detail"
                  style={{ cursor: 'zoom-in' }}
                  onClick={() => setIsFullScreenPhoto(true)}
                  title="点击查看全屏大图"
                >
                  <img
                    src={item.imageData}
                    alt={item.name}
                    className="preview-photo-img"
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: 12,
                      right: 12,
                      background: 'rgba(0, 0, 0, 0.5)',
                      color: '#ffffff',
                      borderRadius: '50%',
                      padding: 6,
                      display: 'flex',
                    }}
                  >
                    <Maximize2 size={16} />
                  </div>
                </div>

                {/* Details List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Layers size={18} style={{ color: 'var(--primary)' }} />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      所属分类：
                    </span>
                    <span
                      style={{
                        fontWeight: 600,
                        background: 'var(--primary-light)',
                        color: 'var(--primary)',
                        padding: '3px 10px',
                        borderRadius: 'var(--radius-full)',
                        fontSize: '0.85rem',
                      }}
                    >
                      {currentCategory?.name || '未知分类'}
                      {currentSubcategory && ` · ${currentSubcategory.name}`}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <Calendar size={18} style={{ color: 'var(--text-light)' }} />
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                      添加时间：
                    </span>
                    <span style={{ fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                      {formatDate(item.createdAt)}
                    </span>
                  </div>

                  {item.notes ? (
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginTop: 4 }}>
                      <FileText size={18} style={{ color: 'var(--text-light)', marginTop: 2 }} />
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                          备注说明：
                        </span>
                        <p style={{ fontSize: '0.92rem', color: 'var(--text-main)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                          {item.notes}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <FileText size={18} style={{ color: 'var(--text-light)' }} />
                      <span style={{ fontSize: '0.86rem', color: 'var(--text-light)', fontStyle: 'italic' }}>
                        暂无备注说明
                      </span>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Modal Footer */}
          {isEditing && (
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
              >
                取消
              </button>
              <button
                className="btn-primary"
                onClick={handleSaveEdit}
                disabled={isSaving}
              >
                <Check size={16} />
                {isSaving ? '保存中...' : '保存修改'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Full Screen Photo Modal */}
      {isFullScreenPhoto && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.95)',
            zIndex: 110,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'zoom-out',
          }}
          onClick={() => setIsFullScreenPhoto(false)}
        >
          <button
            style={{
              position: 'absolute',
              top: 24,
              right: 24,
              background: 'rgba(255, 255, 255, 0.2)',
              border: 'none',
              borderRadius: '50%',
              width: 44,
              height: 44,
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={() => setIsFullScreenPhoto(false)}
          >
            <X size={24} />
          </button>
          <img
            src={item.imageData}
            alt={item.name}
            style={{
              maxWidth: '92vw',
              maxHeight: '92vh',
              width: 'auto',
              height: 'auto',
              flex: 'none',
              objectFit: 'contain',
              borderRadius: 8,
            }}
          />
        </div>
      )}
    </>
  );
};
