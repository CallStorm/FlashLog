import type { ReactNode } from 'react';
import { Copy, MoreHorizontal } from 'lucide-react';
import type { ShareChannel } from '@/services/export/shareService';

const CHANNELS: {
  id: ShareChannel;
  label: string;
  bg: string;
  icon: ReactNode;
}[] = [
  {
    id: 'wechat',
    label: '微信',
    bg: '#07c160',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M8.5 4C5.46 4 3 6.13 3 8.86c0 1.47.8 2.78 2.05 3.67L4.5 14.5l2.28-.76c.7.2 1.44.31 2.22.31 3.04 0 5.5-2.13 5.5-4.74C14.5 6.13 12.04 4 8.5 4zm-2 3.1a.9.9 0 110-1.8.9.9 0 010 1.8zm4 0a.9.9 0 110-1.8.9.9 0 010 1.8zM15.5 9c-2.87 0-5.2 1.96-5.2 4.38 0 2.42 2.33 4.38 5.2 4.38.67 0 1.31-.11 1.9-.3l1.95.65-.52-1.9c.95-.75 1.57-1.86 1.57-3.13C20.4 10.96 18.37 9 15.5 9zm-1.6 2.6a.75.75 0 110-1.5.75.75 0 010 1.5zm3.2 0a.75.75 0 110-1.5.75.75 0 010 1.5z" />
      </svg>
    ),
  },
  {
    id: 'qq',
    label: 'QQ',
    bg: '#12b7f5',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M12 2C6.48 2 2 5.58 2 10c0 2.39 1.28 4.55 3.3 6.05L4.5 19.5l3.4-1.13c1.28.37 2.64.57 4.1.57 5.52 0 10-3.58 10-8S17.52 2 12 2zm0 13.5c-.88 0-1.73-.12-2.52-.34l-.48-.13-2.02.67.67-1.96-.15-.47A6.2 6.2 0 016 10c0-3.04 2.69-5.5 6-5.5s6 2.46 6 5.5-2.69 5.5-6 5.5z" />
      </svg>
    ),
  },
  {
    id: 'wework',
    label: '企业微信',
    bg: '#2f7cf6',
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden>
        <path d="M12 2a10 10 0 00-8.66 5 3.5 3.5 0 00-1.34 6.9v.1A10 10 0 1012 2zm-4.2 6.8a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm4.2 0a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zm4.2 0a1.2 1.2 0 110-2.4 1.2 1.2 0 010 2.4zM8.5 14.5c1.2 1.4 2.7 2.2 3.5 2.2s2.3-.8 3.5-2.2c-2.1 1.1-4.9 1.1-7 0z" />
      </svg>
    ),
  },
  {
    id: 'more',
    label: '更多',
    bg: 'var(--color-bg-base)',
    icon: <MoreHorizontal className="h-5 w-5 text-secondary" />,
  },
];

export type ShareChannelBarProps = {
  disabled?: boolean;
  busy?: boolean;
  showCopy?: boolean;
  onCopy?: () => void;
  onChannel: (channel: ShareChannel) => void;
};

export function ShareChannelBar({
  disabled,
  busy,
  showCopy,
  onCopy,
  onChannel,
}: ShareChannelBarProps) {
  return (
    <div className="share-channel-section">
      <p className="text-xs text-muted">分享到</p>
      <div className="share-channel-grid" role="group" aria-label="分享渠道">
        {CHANNELS.map(({ id, label, bg, icon }) => (
          <button
            key={id}
            type="button"
            disabled={disabled || busy}
            className="share-channel-item"
            onClick={() => onChannel(id)}
          >
            <span
              className="share-channel-icon"
              style={
                id === 'more'
                  ? { background: bg, border: '1px solid var(--color-border-subtle)' }
                  : { background: bg, color: '#fff' }
              }
            >
              {icon}
            </span>
            <span className="share-channel-label">{label}</span>
          </button>
        ))}
        {showCopy && (
          <button
            type="button"
            disabled={disabled || busy}
            className="share-channel-item"
            onClick={onCopy}
          >
            <span
              className="share-channel-icon"
              style={{
                background: 'var(--color-bg-base)',
                border: '1px solid var(--color-border-subtle)',
                color: 'var(--color-text-secondary)',
              }}
            >
              <Copy className="h-5 w-5" />
            </span>
            <span className="share-channel-label">复制</span>
          </button>
        )}
      </div>
      {busy ? <p className="text-center text-xs text-muted">生成中…</p> : null}
    </div>
  );
}