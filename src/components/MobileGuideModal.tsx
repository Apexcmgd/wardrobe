import React, { useState } from 'react';
import {
  Smartphone,
  X,
  Copy,
  Check,
  QrCode,
  Wifi,
  Apple,
  Globe,
  ArrowRight,
} from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface MobileGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileGuideModal: React.FC<MobileGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  // Automatically detected local LAN IP
  const lanHost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? '192.168.1.13'
    : window.location.hostname;
  const port = window.location.port || '5173';
  const mobileUrl = `http://${lanHost}:${port}/`;

  // QR Code generator using reliable public QR SVG API
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(mobileUrl)}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileUrl);
    setCopied(true);
    showToast('手机访问地址已复制到剪贴板！', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-sheet" style={{ maxWidth: 580 }} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Smartphone size={22} style={{ color: 'var(--primary)' }} />
            <h2 className="modal-title">手机端使用指南</h2>
          </div>
          <button className="modal-close-btn" onClick={onClose} title="关闭">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="modal-body" style={{ gap: 20 }}>
          {/* Quick Access Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: 20,
              background: '#f8fafc',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-lg)',
              textAlign: 'center',
              gap: 14,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.86rem', color: 'var(--primary)', fontWeight: 600 }}>
              <Wifi size={16} /> 确保手机与电脑连接同一 Wi-Fi
            </div>

            {/* QR Code */}
            <div
              style={{
                width: 180,
                height: 180,
                background: '#ffffff',
                padding: 10,
                borderRadius: 16,
                boxShadow: 'var(--shadow-md)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid var(--border-subtle)',
              }}
            >
              <img
                src={qrCodeUrl}
                alt="手机扫码访问"
                style={{ width: '100%', height: '100%', display: 'block' }}
              />
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              使用手机自带相机、微信或浏览器扫一扫即可打开
            </p>

            {/* Copyable URL Pill */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                background: '#ffffff',
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-full)',
                padding: '6px 14px',
                width: '100%',
                maxWidth: 380,
                justifyContent: 'space-between',
              }}
            >
              <span
                style={{
                  fontFamily: 'monospace',
                  fontSize: '0.92rem',
                  fontWeight: 600,
                  color: 'var(--text-main)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {mobileUrl}
              </span>
              <button
                className="btn-pill"
                onClick={handleCopy}
                style={{ padding: '4px 10px', fontSize: '0.78rem' }}
              >
                {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
                {copied ? '已复制' : '复制网址'}
              </button>
            </div>
          </div>

          {/* How to add to home screen as an app */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8 }}>
              ✨ 强烈推荐：添加到手机主屏幕（体验犹如原生 App）
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
              {/* iPhone Guide */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#1e293b' }}>
                  🍎 苹果手机 (iPhone / Safari)
                </div>
                <ol style={{ paddingLeft: 18, fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
                  <li>在 <strong>Safari 浏览器</strong> 中打开上述网址</li>
                  <li>点击浏览器底部的 <strong>【分享】图标</strong>（带向上箭头的方框）</li>
                  <li>向下滑动选择 <strong>【添加到主屏幕】</strong></li>
                  <li>桌面上生成“数字衣橱”App 图标，全屏打开使用</li>
                </ol>
              </div>

              {/* Android Guide */}
              <div
                style={{
                  padding: 14,
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-subtle)',
                  background: '#ffffff',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                <div style={{ fontWeight: 600, fontSize: '0.92rem', color: '#1e293b' }}>
                  🤖 安卓手机 (Chrome / 微信 / 系统浏览器)
                </div>
                <ol style={{ paddingLeft: 18, fontSize: '0.84rem', color: '#475569', lineHeight: 1.6 }}>
                  <li>在 <strong>手机自带浏览器或 Chrome</strong> 打开网址</li>
                  <li>点击右上角或底部的 <strong>【菜单】(三个点)</strong></li>
                  <li>选择 <strong>【添加至桌面】</strong> 或 <strong>【安装应用】</strong></li>
                  <li>之后直接从手机桌面一键点击拍照录入</li>
                </ol>
              </div>
            </div>
          </div>

          {/* Cloud Deploy Tip */}
          <div
            style={{
              padding: 12,
              borderRadius: 'var(--radius-md)',
              background: '#f1f5f9',
              fontSize: '0.82rem',
              color: '#475569',
              lineHeight: 1.5,
            }}
          >
            💡 <strong>出门在外随身使用提示：</strong>
            当前方式是在同一个 Wi-Fi 下访问。如果希望随时随地（即便不在家）也能在手机上使用，只需将本项目打包（<code>npm run build</code>）免费部署到 Vercel、Cloudflare Pages 或 GitHub Pages，便可获得永久公网专属网址，数据依然安全保存在你手机本地！
          </div>
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn-primary" onClick={onClose}>
            我知道了
          </button>
        </div>
      </div>
    </div>
  );
};
