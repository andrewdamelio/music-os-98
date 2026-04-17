import { memo, useRef, useCallback, type ReactNode } from 'react';
import { useOSStore, type WindowState } from '../store';
import { useShallow } from 'zustand/react/shallow';

interface Props {
  win: WindowState;
  children: ReactNode;
  icon?: string;
  menuItems?: { label: string; items?: { label: string; action: () => void }[] }[];
}

function Window({ win, children, icon, menuItems }: Props) {
  const { focusWindow, closeWindow, minimizeWindow, maximizeWindow, moveWindow } =
    useOSStore(useShallow(s => ({
      focusWindow: s.focusWindow, closeWindow: s.closeWindow,
      minimizeWindow: s.minimizeWindow, maximizeWindow: s.maximizeWindow,
      moveWindow: s.moveWindow,
    })));
  const focusedWindowId = useOSStore(s => s.focusedWindowId);
  const isFocused = focusedWindowId === win.instanceId;
  const dragRef = useRef<{ startX: number; startY: number; winX: number; winY: number } | null>(null);

  const style: React.CSSProperties = win.maximized
    ? { left: 0, top: 0, width: '100vw', height: `calc(100vh - var(--tb-height))`, zIndex: win.zIndex }
    : { left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.zIndex };

  const onTitleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0 || win.maximized) return;
    e.preventDefault();
    focusWindow(win.instanceId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, winX: win.x, winY: win.y };

    const onMove = (me: MouseEvent) => {
      if (!dragRef.current) return;
      const dx = me.clientX - dragRef.current.startX;
      const dy = me.clientY - dragRef.current.startY;
      const newX = Math.max(-win.w + 40, dragRef.current.winX + dx);
      const newY = Math.max(0, dragRef.current.winY + dy);
      moveWindow(win.instanceId, newX, newY);
    };

    const onUp = () => {
      dragRef.current = null;
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, [win, focusWindow, moveWindow]);

  const onTitleDblClick = useCallback(() => {
    maximizeWindow(win.instanceId);
  }, [win.instanceId, maximizeWindow]);

  // All hooks must be called before any early return
  if (win.minimized) return null;

  return (
    <div
      className={`win98-window${isFocused ? ' focused' : ''}`}
      style={style}
      onMouseDown={() => focusWindow(win.instanceId)}
    >
      {/* Title bar */}
      <div
        className={`win98-titlebar${isFocused ? '' : ' inactive'}`}
        onMouseDown={onTitleMouseDown}
        onDoubleClick={onTitleDblClick}
      >
        {icon && <span className="win98-titlebar-icon">{icon}</span>}
        <span className="win98-titlebar-title">{win.title}</span>
        <div className="win98-titlebar-btns" onMouseDown={e => e.stopPropagation()}>
          <div
            className="win98-tb-btn"
            title="Minimize"
            onClick={() => minimizeWindow(win.instanceId)}
          >
            <svg width="9" height="9" viewBox="0 0 9 9">
              <rect x="0" y="7" width="9" height="2" fill="currentColor"/>
            </svg>
          </div>
          <div
            className="win98-tb-btn"
            title={win.maximized ? 'Restore' : 'Maximize'}
            onClick={() => maximizeWindow(win.instanceId)}
          >
            {win.maximized ? (
              <svg width="9" height="9" viewBox="0 0 9 9">
                <rect x="2" y="0" width="7" height="7" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="0" y="2" width="7" height="7" fill="#c0c0c0" stroke="currentColor" strokeWidth="1.5"/>
              </svg>
            ) : (
              <svg width="9" height="9" viewBox="0 0 9 9">
                <rect x="0" y="0" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1.5"/>
                <rect x="0" y="0" width="9" height="2" fill="currentColor"/>
              </svg>
            )}
          </div>
          <div
            className="win98-tb-btn close"
            title="Close"
            onClick={() => closeWindow(win.instanceId)}
          >
            <svg width="9" height="9" viewBox="0 0 9 9">
              <line x1="1" y1="1" x2="8" y2="8" stroke="currentColor" strokeWidth="1.5"/>
              <line x1="8" y1="1" x2="1" y2="8" stroke="currentColor" strokeWidth="1.5"/>
            </svg>
          </div>
        </div>
      </div>

      {/* Optional menu bar */}
      {menuItems && menuItems.length > 0 && (
        <div className="win98-menubar">
          {menuItems.map(item => (
            <div key={item.label} className="win98-menubar-item">{item.label}</div>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="win98-content">
        {children}
      </div>
    </div>
  );
}

export default memo(Window);
