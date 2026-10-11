import React, { useRef, useState } from 'react';
import { WardrobeBackup } from '../types';
import {
  Download,
  Upload,
  Sparkles,
  Trash2,
  X,
  Database,
  CheckCircle2,
  HardDrive,
  FileCheck,
} from 'lucide-react';
import {
  exportAllData,
  importAllData,
  clearAllData,
  resetToDefaultData,
} from '../db/indexedDB';
import { populateSampleWardrobe } from '../utils/sampleData';
import { useToast } from '../context/ToastContext';

interface BackupModalProps {
  totalItems: number;
  totalCategories: number;
  totalSubcategories: number;
  onClose: () => void;
  onDataChanged: () => void;
}

export const BackupModal: React.FC<BackupModalProps> = ({
  totalItems,
  totalCategories,
  totalSubcategories,
  onClose,
  onDataChanged,
}) => {
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearInputVal, setClearInputVal] = useState('');

  // 1. Export JSON
  const handleExport = async () => {
    try {
      setIsProcessing(true);
      const data = await exportAllData();
      const jsonStr = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);

      const now = new Date();
      const dateStr = `${now.getFullYear()}${(now.getMonth() + 1).toString().padStart(2, '0')}${now.getDate().toString().padStart(2, '0')}`;
      const filename = `wardrobe_backup_${dateStr}.json`;

      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast(`备份已成功导出：${filename}`, 'success');
    } catch (err: any) {
      showToast(err.message || '导出备份失败', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Import JSON
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsProcessing(true);
      const text = await file.text();
      const parsed: WardrobeBackup = JSON.parse(text);

      if (!parsed.categories || !parsed.clothingItems) {
        throw new Error('无效的衣橱备份文件格式');
      }

      await importAllData(parsed);
      showToast(
        `成功恢复备份！共导入 ${parsed.clothingItems.length} 件衣物、${parsed.categories.length} 个分类`,
        'success'
      );
      onDataChanged();
      onClose();
    } catch (err: any) {
      showToast(err.message || '导入文件解析失败，请检查文件格式', 'error');
    } finally {
      setIsProcessing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // 3. Load Sample Wardrobe
  const handleLoadSamples = async () => {
    try {
      setIsProcessing(true);
      const items = await populateSampleWardrobe();
      showToast(`已成功载入 ${items.length} 件精选示例衣物！`, 'success');
      onDataChanged();
      onClose();
    } catch (err: any) {
      showToast(err.message || '载入示例失败', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 4. Reset & Clear All
  const handleClearAll = async () => {
    if (clearInputVal !== '清空') {
      showToast('请输入“清空”以确认操作', 'error');
      return;
    }

    try {
      setIsProcessing(true);
      await resetToDefaultData();
      showToast('已清空衣物并恢复默认分类体系', 'info');
      onDataChanged();
      setShowClearConfirm(false);
      onClose();
    } catch (err: any) {
      showToast(err.message || '重置失败', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: 540 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Database size={20} style={{ color: 'var(--primary)' }} />
            <h2 className="modal-title">数据备份与恢复</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ gap: 18 }}>
          {/* Stats Box */}
          <div
            style={{
              padding: 16,
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              textAlign: 'center',
              gap: 12,
            }}
          >
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: 'var(--primary)' }}>
                {totalItems}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>衣物总数</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                {totalCategories}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>一级分类</div>
            </div>
            <div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0f172a' }}>
                {totalSubcategories}
              </div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>二级分类</div>
            </div>
          </div>

          {/* Backup / Export */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              background: '#ffffff',
            }}
          >
            <div>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a' }}>
                导出完整备份文件
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                保存所有分类、衣物信息及高画质照片（.json 格式）
              </p>
            </div>
            <button
              className="btn-primary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={handleExport}
              disabled={isProcessing}
            >
              <Download size={16} /> 导出备份
            </button>
          </div>

          {/* Restore / Import */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              background: '#ffffff',
            }}
          >
            <div>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a' }}>
                从备份恢复数据
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                选择本地备份文件导入，完整恢复衣橱所有数据
              </p>
            </div>
            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
            >
              <Upload size={16} /> 导入恢复
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>

          {/* Load Sample Data */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              background: '#ffffff',
            }}
          >
            <div>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: '#0f172a' }}>
                载入演示示例数据
              </h4>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: 2 }}>
                一键添加短袖、羽绒服、飞行夹克等 6 件精美示例
              </p>
            </div>
            <button
              className="btn-secondary"
              style={{ padding: '8px 16px', fontSize: '0.85rem', color: 'var(--primary)', borderColor: 'var(--primary)' }}
              onClick={handleLoadSamples}
              disabled={isProcessing}
            >
              <Sparkles size={16} /> 载入演示
            </button>
          </div>

          {/* Reset / Clear Data */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: 16,
              border: '1px solid rgba(239, 68, 68, 0.2)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--danger-light)',
            }}
          >
            <div>
              <h4 style={{ fontSize: '0.96rem', fontWeight: 600, color: 'var(--danger)' }}>
                清空衣橱并重置
              </h4>
              <p style={{ fontSize: '0.82rem', color: '#991b1b', marginTop: 2 }}>
                清空所有衣物照片并重置为初始默认分类
              </p>
            </div>
            <button
              className="btn-danger"
              style={{ padding: '8px 16px', fontSize: '0.85rem' }}
              onClick={() => setShowClearConfirm(true)}
              disabled={isProcessing}
            >
              <Trash2 size={16} /> 清空重置
            </button>
          </div>

          {/* Danger Confirm Dialog */}
          {showClearConfirm && (
            <div
              style={{
                padding: 14,
                border: '1px solid var(--danger)',
                borderRadius: 'var(--radius-md)',
                background: '#ffffff',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <p style={{ fontSize: '0.85rem', color: '#991b1b' }}>
                ⚠️ 此操作将永久清空当前所有衣物照片！若确定重置，请输入“<strong>清空</strong>”后点击确认：
              </p>
              <div style={{ display: 'flex', gap: 8 }}>
                <input
                  type="text"
                  className="text-input"
                  style={{ padding: '6px 12px' }}
                  placeholder="输入“清空”"
                  value={clearInputVal}
                  onChange={(e) => setClearInputVal(e.target.value)}
                />
                <button
                  className="btn-danger"
                  style={{ padding: '6px 14px' }}
                  onClick={handleClearAll}
                >
                  确认清空
                </button>
                <button
                  className="btn-secondary"
                  style={{ padding: '6px 14px' }}
                  onClick={() => setShowClearConfirm(false)}
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>
            关闭
          </button>
        </div>
      </div>
    </div>
  );
};
