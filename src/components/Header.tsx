import React from 'react';
import { Shirt, FolderTree, Database, Plus, Smartphone } from 'lucide-react';

interface HeaderProps {
  totalItems: number;
  totalCategories: number;
  activeTab: 'wardrobe' | 'categories' | 'backup';
  setActiveTab: (tab: 'wardrobe' | 'categories' | 'backup') => void;
  onOpenAddModal: () => void;
  onOpenMobileGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  totalItems,
  totalCategories,
  activeTab,
  setActiveTab,
  onOpenAddModal,
  onOpenMobileGuide,
}) => {
  return (
    <header className="app-header">
      <div className="header-content">
        <div className="brand-section">
          <div className="brand-logo-icon">
            <Shirt size={22} strokeWidth={2.2} />
          </div>
          <div>
            <div className="brand-title">
              数字衣橱
              <span className="brand-stats-pill">
                {totalItems} 件 · {totalCategories} 分类
              </span>
            </div>
          </div>
        </div>

        {/* Desktop Navigation */}
        <nav className="nav-tabs">
          <button
            className={`nav-tab-btn ${activeTab === 'wardrobe' ? 'active' : ''}`}
            onClick={() => setActiveTab('wardrobe')}
          >
            <Shirt size={16} />
            衣物仓库
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'categories' ? 'active' : ''}`}
            onClick={() => setActiveTab('categories')}
          >
            <FolderTree size={16} />
            分类管理
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'backup' ? 'active' : ''}`}
            onClick={() => setActiveTab('backup')}
          >
            <Database size={16} />
            备份与恢复
          </button>
        </nav>

        {/* Right Action */}
        <div className="header-actions">
          <button
            className="btn-secondary"
            onClick={onOpenMobileGuide}
            style={{ padding: '8px 14px', fontSize: '0.86rem' }}
            title="查看手机访问地址和扫码"
          >
            <Smartphone size={16} />
            <span>手机访问</span>
          </button>
          <button
            className="btn-primary"
            onClick={onOpenAddModal}
            style={{ padding: '8px 16px', fontSize: '0.88rem' }}
          >
            <Plus size={18} />
            <span>添加衣物</span>
          </button>
        </div>
      </div>
    </header>
  );
};
