import { useOSStore } from '../store';
import { useEffect, useRef } from 'react';

export default function ContextMenu() {
  const { contextMenu, hideContextMenu } = useOSStore();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!contextMenu) return;
    const handler = () => hideContextMenu();
    setTimeout(() => window.addEventListener('click', handler), 50);
    return () => window.removeEventListener('click', handler);
  }, [contextMenu, hideContextMenu]);

  if (!contextMenu) return null;

  // Clamp to viewport
  const left = Math.min(contextMenu.x, window.innerWidth - 200);
  const top = Math.min(contextMenu.y, window.innerHeight - 200);

  return (
    <div
      className="context-menu"
      ref={ref}
      style={{ left, top }}
      onClick={e => e.stopPropagation()}
    >
      {contextMenu.items.map((item, i) => (
        item as any).separator ? (
          <div key={i} className="context-menu-sep" />
        ) : (
          <div
            key={i}
            className={`context-menu-item${(item as any).disabled ? ' disabled' : ''}`}
            style={(item as any).disabled ? { color: '#999', cursor: 'default' } : {}}
            onClick={() => {
              if (!(item as any).disabled) {
                item.action();
                hideContextMenu();
              }
            }}
          >
            {item.label}
          </div>
        )
      )}
    </div>
  );
}
