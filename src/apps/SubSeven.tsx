import { useState, useRef, useEffect } from 'react';

// ── Fake victim data ──────────────────────────────────────────────────────────
const VICTIM = {
  ip: '192.168.0.66',
  hostname: 'DESKTOP-W98SE',
  os: 'Windows 98 SE (4.10.2222 A)',
  cpu: 'Intel Pentium III 500MHz',
  ram: '64 MB',
  disk: 'C:\\ 2.1 GB free of 8.4 GB',
  username: 'User',
  windir: 'C:\\Windows',
  tempdir: 'C:\\Windows\\Temp',
  serverVer: '2.2 [G]old',
  connTime: '00:14:22',
  ping: '12ms',
};

const FAKE_PROCESSES = [
  { pid: '0001', name: 'KERNEL32.DLL',   mem: '2,048 KB', cpu: '—'   },
  { pid: '0004', name: 'EXPLORER.EXE',   mem: '4,352 KB', cpu: '1%'  },
  { pid: '0007', name: 'MSGSRV32.EXE',   mem: '512 KB',  cpu: '0%'  },
  { pid: '0011', name: 'MPREXE.EXE',     mem: '256 KB',  cpu: '0%'  },
  { pid: '0014', name: 'mmtask.tsk',     mem: '128 KB',  cpu: '0%'  },
  { pid: '0017', name: 'SYSTRAY.EXE',    mem: '384 KB',  cpu: '0%'  },
  { pid: '0021', name: 'SERVER.EXE',     mem: '896 KB',  cpu: '0%'  },
  { pid: '0028', name: 'WINAMP.EXE',     mem: '3,200 KB', cpu: '3%'  },
  { pid: '0035', name: 'ICQ32.EXE',      mem: '8,192 KB', cpu: '1%'  },
  { pid: '0042', name: 'MIRC.EXE',       mem: '2,048 KB', cpu: '0%'  },
  { pid: '0055', name: 'NAPSTER.EXE',    mem: '4,096 KB', cpu: '2%'  },
  { pid: '0063', name: 'IEXPLORE.EXE',   mem: '6,400 KB', cpu: '0%'  },
];

const FILE_TREE: Record<string, { type: 'dir' | 'file'; size?: string; children?: string[] }> = {
  'C:\\':                          { type: 'dir', children: ['C:\\Windows', 'C:\\My Documents', 'C:\\Program Files', 'C:\\AUTOEXEC.BAT', 'C:\\CONFIG.SYS'] },
  'C:\\Windows':                   { type: 'dir', children: ['C:\\Windows\\System', 'C:\\Windows\\Temp', 'C:\\Windows\\WIN.INI', 'C:\\Windows\\SYSTEM.INI'] },
  'C:\\Windows\\System':           { type: 'dir', children: [] },
  'C:\\Windows\\Temp':             { type: 'dir', children: ['C:\\Windows\\Temp\\tmp_8F2A.tmp', 'C:\\Windows\\Temp\\tmp_3C1B.tmp'] },
  'C:\\Windows\\WIN.INI':          { type: 'file', size: '2 KB' },
  'C:\\Windows\\SYSTEM.INI':       { type: 'file', size: '1 KB' },
  'C:\\Windows\\Temp\\tmp_8F2A.tmp': { type: 'file', size: '14 KB' },
  'C:\\Windows\\Temp\\tmp_3C1B.tmp': { type: 'file', size: '3 KB' },
  'C:\\My Documents':              { type: 'dir', children: ['C:\\My Documents\\passwords.txt', 'C:\\My Documents\\diary.txt', 'C:\\My Documents\\top_secret.doc', 'C:\\My Documents\\saved_mp3s'] },
  'C:\\My Documents\\passwords.txt':  { type: 'file', size: '1 KB' },
  'C:\\My Documents\\diary.txt':      { type: 'file', size: '3 KB' },
  'C:\\My Documents\\top_secret.doc': { type: 'file', size: '24 KB' },
  'C:\\My Documents\\saved_mp3s':     { type: 'dir', children: ['C:\\My Documents\\saved_mp3s\\metallica_napster_rip.mp3', 'C:\\My Documents\\saved_mp3s\\eminem_slim_shady.mp3'] },
  'C:\\My Documents\\saved_mp3s\\metallica_napster_rip.mp3': { type: 'file', size: '4,096 KB' },
  'C:\\My Documents\\saved_mp3s\\eminem_slim_shady.mp3':     { type: 'file', size: '3,840 KB' },
  'C:\\Program Files':             { type: 'dir', children: ['C:\\Program Files\\ICQ', 'C:\\Program Files\\Winamp', 'C:\\Program Files\\mIRC', 'C:\\Program Files\\Napster'] },
  'C:\\Program Files\\ICQ':        { type: 'dir', children: [] },
  'C:\\Program Files\\Winamp':     { type: 'dir', children: [] },
  'C:\\Program Files\\mIRC':       { type: 'dir', children: [] },
  'C:\\Program Files\\Napster':    { type: 'dir', children: [] },
  'C:\\AUTOEXEC.BAT':              { type: 'file', size: '512 B' },
  'C:\\CONFIG.SYS':                { type: 'file', size: '256 B' },
};

const REG_TREE: Record<string, { children?: string[]; values?: Record<string, string> }> = {
  'HKEY_LOCAL_MACHINE':  { children: ['HKEY_LOCAL_MACHINE\\SOFTWARE', 'HKEY_LOCAL_MACHINE\\SYSTEM', 'HKEY_LOCAL_MACHINE\\HARDWARE'] },
  'HKEY_LOCAL_MACHINE\\SOFTWARE':  { children: ['HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft', 'HKEY_LOCAL_MACHINE\\SOFTWARE\\ICQ Inc'] },
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft': { children: ['HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows'], values: { 'Version': '"4.10.2222"', 'ProductName': '"Windows 98 SE"' } },
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows': { values: { 'SystemRoot': '"C:\\\\Windows"', 'WinDir': '"C:\\\\Windows"' } },
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\ICQ Inc': { values: { 'ICQPath': '"C:\\\\Program Files\\\\ICQ"', 'UIN': '"1337420"' } },
  'HKEY_LOCAL_MACHINE\\SYSTEM':    { children: [] },
  'HKEY_LOCAL_MACHINE\\HARDWARE':  { children: [] },
  'HKEY_CURRENT_USER':  { children: ['HKEY_CURRENT_USER\\Software', 'HKEY_CURRENT_USER\\AppEvents'] },
  'HKEY_CURRENT_USER\\Software':   { children: [] },
  'HKEY_CURRENT_USER\\AppEvents':  { children: [] },
};

const KEYLOG_LINES = [
  '[12:34:01] [EXPLORER.EXE]  hello how are you doing tonight',
  '[12:34:15] [mIRC.EXE]  hey whats up dude',
  '[12:34:28] [mIRC.EXE]  did you get that mp3 i sent you on napster',
  '[12:35:02] [ICQ32.EXE]  im good, check out this new winamp skin i found',
  '[12:35:44] [Notepad.exe]  my icq password is hunter2',
  '[12:36:00] [IEXPLORE.EXE]  www.napster.com',
  '[12:36:18] [IEXPLORE.EXE]  www.kazaa.com',
  '[12:37:05] [mIRC.EXE]  has anyone tried that new linuxxx distro',
  '[12:37:44] [ICQ32.EXE]  lol no way im staying on windows 98',
  '[12:38:22] [Notepad.exe]  TODO: buy more blank CD-Rs for burning',
];

const CHAT_HISTORY = [
  { from: 'You', msg: 'hey' },
  { from: 'Victim', msg: 'who is this??' },
  { from: 'You', msg: 'just a friend ;)' },
  { from: 'Victim', msg: 'how did you get in here' },
  { from: 'You', msg: 'update your antivirus lol' },
];

const FUN_ACTIONS = [
  { label: '💿 Open/Close CD-ROM',  cmd: 'cdtray'   },
  { label: '🔄 Flip Screen',        cmd: 'flip'      },
  { label: '🖱️ Swap Mouse Buttons', cmd: 'swapMouse' },
  { label: '🖥️ Show Blue Screen',   cmd: 'bsod'      },
  { label: '💬 Send Message Box',   cmd: 'msgbox'    },
  { label: '🔊 Play Wav File',      cmd: 'playwav'   },
  { label: '🖥️ Hide Desktop Icons', cmd: 'hideicons' },
  { label: '🔒 Lock Keyboard',      cmd: 'lockkeys'  },
  { label: '🌀 Rotate Wallpaper',   cmd: 'wallpaper' },
  { label: '🕹️ Move Mouse to 0,0',  cmd: 'mousemove' },
  { label: '📺 Set Screen Res 640x480', cmd: 'screenres' },
  { label: '⏻ Fake Shutdown',      cmd: 'shutdown'  },
];

// ── Shared styles ─────────────────────────────────────────────────────────────
const S = {
  panel: {
    background: '#0d1a0d',
    border: '1px solid #1a3a1a',
    borderRadius: 2,
    padding: 8,
    fontSize: 11,
    color: '#00cc44',
    fontFamily: 'monospace',
  } as React.CSSProperties,
  row: {
    display: 'flex', gap: 4, alignItems: 'center',
  } as React.CSSProperties,
  btn: (active = false) => ({
    padding: '2px 10px', fontSize: 10, cursor: 'pointer', fontFamily: 'monospace',
    background: active ? '#003300' : '#001a00',
    color: active ? '#00ff66' : '#00aa33',
    border: `1px solid ${active ? '#00ff66' : '#004400'}`,
    borderRadius: 2,
  } as React.CSSProperties),
  label: { fontSize: 9, color: '#006622', fontFamily: 'monospace', letterSpacing: 1 } as React.CSSProperties,
  val:   { fontSize: 11, color: '#00ee55', fontFamily: 'monospace' } as React.CSSProperties,
};

// ── Sub-components ────────────────────────────────────────────────────────────

function InfoTab() {
  const rows: [string, string][] = [
    ['IP Address',    VICTIM.ip],
    ['Hostname',      VICTIM.hostname],
    ['OS',            VICTIM.os],
    ['CPU',           VICTIM.cpu],
    ['RAM',           VICTIM.ram],
    ['Disk',          VICTIM.disk],
    ['Username',      VICTIM.username],
    ['Windows Dir',   VICTIM.windir],
    ['Temp Dir',      VICTIM.tempdir],
    ['Server Ver',    `SubSeven ${VICTIM.serverVer}`],
    ['Connected',     VICTIM.connTime],
    ['Ping',          VICTIM.ping],
  ];
  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 9, color: '#005522', fontFamily: 'monospace', letterSpacing: 2, marginBottom: 4 }}>
        ── SYSTEM INFORMATION ──────────────────────────────────────
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '3px 8px' }}>
        {rows.map(([k, v]) => (
          <>
            <span key={`k-${k}`} style={S.label}>{k}</span>
            <span key={`v-${k}`} style={S.val}>{v}</span>
          </>
        ))}
      </div>
    </div>
  );
}

function FilesTab({ onStatus }: { onStatus: (s: string) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['C:\\']));
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (path: string) => {
    setExpanded(prev => {
      const s = new Set(prev);
      if (s.has(path)) s.delete(path); else s.add(path);
      return s;
    });
  };

  const renderNode = (path: string, depth: number): React.ReactNode => {
    const node = FILE_TREE[path];
    if (!node) return null;
    const isDir = node.type === 'dir';
    const name = path.split('\\').pop() || path;
    const isSelected = selected === path;
    const isExpanded = expanded.has(path);
    return (
      <div key={path}>
        <div
          style={{
            paddingLeft: depth * 12 + 4, paddingTop: 1, paddingBottom: 1, cursor: 'pointer',
            background: isSelected ? '#003300' : 'transparent',
            color: isSelected ? '#00ff66' : isDir ? '#00cc44' : '#009933',
            fontSize: 10, fontFamily: 'monospace', userSelect: 'none',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
          onClick={() => {
            setSelected(path);
            if (isDir) toggle(path);
          }}
          onDoubleClick={() => {
            if (!isDir) onStatus(`Downloading: ${path} → transfer started`);
          }}
        >
          <span style={{ fontSize: 9, opacity: 0.6 }}>{isDir ? (isExpanded ? '▼' : '▶') : ' '}</span>
          <span>{isDir ? '📁' : '📄'}</span>
          <span>{name}</span>
          {!isDir && node.size && <span style={{ opacity: 0.5, fontSize: 9, marginLeft: 4 }}>{node.size}</span>}
        </div>
        {isDir && isExpanded && node.children?.map(child => renderNode(child, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 9, color: '#005522', fontFamily: 'monospace', letterSpacing: 2, padding: '6px 10px 3px' }}>
        ── FILE MANAGER — {VICTIM.hostname} ────────────────────────
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 4px' }}>
        {renderNode('C:\\', 0)}
      </div>
      <div style={{ padding: '4px 8px', borderTop: '1px solid #1a3a1a', fontSize: 9, color: '#005522', fontFamily: 'monospace' }}>
        Double-click a file to download · Single-click to select
      </div>
    </div>
  );
}

function ProcessTab({ onStatus }: { onStatus: (s: string) => void }) {
  const [procs, setProcs] = useState(FAKE_PROCESSES);
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 9, color: '#005522', fontFamily: 'monospace', letterSpacing: 2, padding: '6px 10px 3px' }}>
        ── PROCESS LIST ────────────────────────────────────────────
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, fontFamily: 'monospace' }}>
          <thead>
            <tr style={{ background: '#001a00', color: '#006622' }}>
              <th style={{ padding: '2px 8px', textAlign: 'left', fontWeight: 'normal' }}>PID</th>
              <th style={{ padding: '2px 8px', textAlign: 'left', fontWeight: 'normal' }}>Process Name</th>
              <th style={{ padding: '2px 8px', textAlign: 'right', fontWeight: 'normal' }}>Memory</th>
              <th style={{ padding: '2px 8px', textAlign: 'right', fontWeight: 'normal' }}>CPU</th>
            </tr>
          </thead>
          <tbody>
            {procs.map(p => (
              <tr
                key={p.pid}
                style={{
                  background: selected === p.pid ? '#003300' : 'transparent',
                  color: selected === p.pid ? '#00ff66' : '#00cc44',
                  cursor: 'pointer',
                }}
                onClick={() => setSelected(p.pid)}
              >
                <td style={{ padding: '1px 8px' }}>{p.pid}</td>
                <td style={{ padding: '1px 8px' }}>{p.name}</td>
                <td style={{ padding: '1px 8px', textAlign: 'right' }}>{p.mem}</td>
                <td style={{ padding: '1px 8px', textAlign: 'right' }}>{p.cpu}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '4px 8px', borderTop: '1px solid #1a3a1a', display: 'flex', gap: 6 }}>
        <button style={S.btn()} onClick={() => {
          if (!selected) return;
          const p = procs.find(x => x.pid === selected);
          if (!p) return;
          if (['0001','0004','0007'].includes(selected)) { onStatus(`Cannot kill system process ${p.name}`); return; }
          setProcs(prev => prev.filter(x => x.pid !== selected));
          setSelected(null);
          onStatus(`Process ${p.name} (PID ${selected}) terminated`);
        }}>Kill Process</button>
        <button style={S.btn()} onClick={() => onStatus('Process list refreshed')}>Refresh</button>
      </div>
    </div>
  );
}

function RegistryTab({ onStatus }: { onStatus: (s: string) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['HKEY_LOCAL_MACHINE', 'HKEY_CURRENT_USER']));
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (key: string) => {
    setExpanded(prev => {
      const s = new Set(prev);
      if (s.has(key)) s.delete(key); else s.add(key);
      return s;
    });
  };

  const renderKey = (key: string, depth: number): React.ReactNode => {
    const node = REG_TREE[key];
    if (!node) return null;
    const name = key.split('\\').pop() || key;
    const isSelected = selected === key;
    const isExpanded = expanded.has(key);
    const hasChildren = (node.children?.length ?? 0) > 0 || Object.keys(node.values ?? {}).length > 0;
    return (
      <div key={key}>
        <div
          style={{
            paddingLeft: depth * 12 + 4, paddingTop: 1, paddingBottom: 1, cursor: 'pointer',
            background: isSelected ? '#003300' : 'transparent',
            color: isSelected ? '#00ff66' : '#00cc44',
            fontSize: 10, fontFamily: 'monospace', userSelect: 'none',
            display: 'flex', alignItems: 'center', gap: 4,
          }}
          onClick={() => { setSelected(key); if (hasChildren) toggle(key); }}
        >
          <span style={{ fontSize: 9, opacity: 0.6 }}>{hasChildren ? (isExpanded ? '▼' : '▶') : ' '}</span>
          <span>🗝️</span>
          <span>{name}</span>
        </div>
        {isExpanded && (
          <>
            {Object.entries(node.values ?? {}).map(([k, v]) => (
              <div
                key={`${key}::${k}`}
                style={{ paddingLeft: (depth + 1) * 12 + 4, paddingTop: 1, paddingBottom: 1, fontSize: 10, fontFamily: 'monospace', color: '#009933', display: 'flex', gap: 8 }}
              >
                <span style={{ opacity: 0.6 }}>📝</span>
                <span style={{ color: '#00aa44' }}>{k}</span>
                <span style={{ opacity: 0.5 }}>REG_SZ</span>
                <span>{v}</span>
              </div>
            ))}
            {node.children?.map(child => renderKey(child, depth + 1))}
          </>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ fontSize: 9, color: '#005522', fontFamily: 'monospace', letterSpacing: 2, padding: '6px 10px 3px' }}>
        ── REGISTRY EDITOR ─────────────────────────────────────────
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: '2px 4px' }}>
        {['HKEY_LOCAL_MACHINE', 'HKEY_CURRENT_USER'].map(k => renderKey(k, 0))}
      </div>
      <div style={{ padding: '4px 8px', borderTop: '1px solid #1a3a1a', display: 'flex', gap: 6 }}>
        <button style={S.btn()} onClick={() => {
          if (!selected) return;
          onStatus(`Registry key ${selected.split('\\').pop()} exported`);
        }}>Export Key</button>
        <button style={S.btn()} onClick={() => onStatus('Registry refreshed')}>Refresh</button>
      </div>
    </div>
  );
}

function FunTab({ onStatus }: { onStatus: (s: string) => void }) {
  return (
    <div style={{ padding: 10 }}>
      <div style={{ fontSize: 9, color: '#005522', fontFamily: 'monospace', letterSpacing: 2, marginBottom: 8 }}>
        ── FUN MANAGER ─────────────────────────────────────────────
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {FUN_ACTIONS.map(a => (
          <button
            key={a.cmd}
            style={{
              ...S.btn(), textAlign: 'left', padding: '5px 8px',
              fontSize: 10,
            }}
            onClick={() => onStatus(`[${a.cmd}] → Command sent to ${VICTIM.hostname}`)}
          >
            {a.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 12, padding: 8, border: '1px solid #1a3a1a', borderRadius: 2 }}>
        <div style={{ fontSize: 9, color: '#005522', fontFamily: 'monospace', marginBottom: 6 }}>CUSTOM MESSAGE BOX</div>
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <input
            defaultValue="lol owned"
            style={{
              flex: 1, background: '#000d00', border: '1px solid #1a3a1a', color: '#00cc44',
              fontSize: 10, fontFamily: 'monospace', padding: '2px 6px', outline: 'none', borderRadius: 2,
            }}
            id="s7-msgbox-input"
          />
          <button style={S.btn()} onClick={() => {
            const val = (document.getElementById('s7-msgbox-input') as HTMLInputElement)?.value;
            onStatus(`[msgbox] Sent: "${val}" → ${VICTIM.hostname}`);
          }}>Send</button>
        </div>
      </div>
    </div>
  );
}

function SpyTab({ onStatus }: { onStatus: (s: string) => void }) {
  const [showLog, setShowLog] = useState(true);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 10, gap: 8 }}>
      <div style={{ fontSize: 9, color: '#005522', fontFamily: 'monospace', letterSpacing: 2 }}>
        ── SPY TOOLS ───────────────────────────────────────────────
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={S.btn(showLog)} onClick={() => setShowLog(true)}>Keylogger</button>
        <button style={S.btn(!showLog)} onClick={() => setShowLog(false)}>Screen Capture</button>
        <button style={{ ...S.btn(), marginLeft: 'auto' }} onClick={() => onStatus('Capturing screenshot...')}>
          📸 Capture Now
        </button>
      </div>
      {showLog ? (
        <div style={{
          flex: 1, background: '#000900', border: '1px solid #1a3a1a', borderRadius: 2,
          padding: 8, overflowY: 'auto', fontSize: 10, fontFamily: 'monospace', color: '#00bb44',
          lineHeight: 1.6,
        }}>
          {KEYLOG_LINES.map((line, i) => <div key={i}>{line}</div>)}
        </div>
      ) : (
        <div style={{
          flex: 1, background: '#000900', border: '1px solid #1a3a1a', borderRadius: 2,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}>
          <div style={{ fontSize: 9, color: '#005522', fontFamily: 'monospace' }}>[ LAST CAPTURE — 12:36:02 ]</div>
          {/* Mock CRT screen preview */}
          <div style={{ width: 200, height: 150, background: '#001400', border: '1px solid #003300', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 4, gap: 2 }}>
              <div style={{ height: 14, background: '#000080', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                <span style={{ fontSize: 7, color: 'white', fontFamily: 'sans-serif' }}>My Computer</span>
              </div>
              <div style={{ flex: 1, background: '#c0c0c0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: 4, gap: 4 }}>
                {['💻','📁','🌐','🗑️','📝','🎵'].map((ic,i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: 8 }}>{ic}</span>
                    <div style={{ width: 20, height: 2, background: '#000080', opacity: 0.5 }} />
                  </div>
                ))}
              </div>
              <div style={{ height: 8, background: '#c0c0c0', borderTop: '1px solid #808080' }} />
            </div>
          </div>
          <div style={{ fontSize: 9, color: '#006622', fontFamily: 'monospace' }}>Desktop resolution: 800×600 @ 16-bit</div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6 }}>
        <button style={S.btn()} onClick={() => onStatus('Keylog cleared on victim')}>Clear Log</button>
        <button style={S.btn()} onClick={() => onStatus('Keylog saved to: keylog_DESKTOP-W98SE.txt')}>Save Log</button>
      </div>
    </div>
  );
}

function ChatTab() {
  const [msgs, setMsgs] = useState(CHAT_HISTORY);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [msgs]);

  const send = () => {
    if (!input.trim()) return;
    setMsgs(prev => [...prev, { from: 'You', msg: input.trim() }]);
    setInput('');
    setTimeout(() => {
      setMsgs(prev => [...prev, { from: 'Victim', msg: ['what do you want', 'stop it', 'who are you', 'leave me alone', 'how???'][Math.floor(Math.random() * 5)] }]);
    }, 800 + Math.random() * 1200);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', padding: 10, gap: 6 }}>
      <div style={{ fontSize: 9, color: '#005522', fontFamily: 'monospace', letterSpacing: 2 }}>
        ── CHAT — {VICTIM.hostname} ({VICTIM.ip}) ──────────────────
      </div>
      <div style={{
        flex: 1, background: '#000900', border: '1px solid #1a3a1a', borderRadius: 2,
        padding: 8, overflowY: 'auto', fontSize: 10, fontFamily: 'monospace', lineHeight: 1.7,
      }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ color: m.from === 'You' ? '#00ff66' : '#00aa44' }}>
            <span style={{ opacity: 0.5 }}>[{m.from === 'You' ? 'me' : VICTIM.hostname}]</span>{' '}
            {m.msg}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 6 }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Type a message..."
          style={{
            flex: 1, background: '#000d00', border: '1px solid #1a3a1a', color: '#00cc44',
            fontSize: 10, fontFamily: 'monospace', padding: '3px 8px', outline: 'none', borderRadius: 2,
          }}
        />
        <button style={S.btn()} onClick={send}>Send</button>
      </div>
    </div>
  );
}

function ServerTab({ onStatus }: { onStatus: (s: string) => void }) {
  return (
    <div style={{ padding: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ fontSize: 9, color: '#005522', fontFamily: 'monospace', letterSpacing: 2 }}>
        ── SERVER ADMIN ────────────────────────────────────────────
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6 }}>
        {[
          { label: '🔄 Restart Server',    cmd: 'restart'    },
          { label: '🗑️ Remove Server',     cmd: 'remove'     },
          { label: '🔒 Change Password',   cmd: 'chgpass'    },
          { label: '📡 Change Port',       cmd: 'chgport'    },
          { label: '🚀 Update Server',     cmd: 'update'     },
          { label: '🛡️ Disable Firewall',  cmd: 'firewall'   },
          { label: '🔧 Edit Run Keys',     cmd: 'runkeys'    },
          { label: '📋 View Startup',      cmd: 'startup'    },
        ].map(a => (
          <button key={a.cmd} style={{ ...S.btn(), textAlign: 'left', padding: '5px 8px' }}
            onClick={() => onStatus(`[${a.cmd}] Command sent to server on ${VICTIM.ip}`)}>
            {a.label}
          </button>
        ))}
      </div>
      <div style={{ marginTop: 4, padding: 8, border: '1px solid #1a3a1a', borderRadius: 2 }}>
        <div style={{ fontSize: 9, color: '#005522', fontFamily: 'monospace', marginBottom: 6 }}>SERVER INFO</div>
        <div style={{ fontSize: 10, fontFamily: 'monospace', color: '#009933', display: 'grid', gridTemplateColumns: '100px 1fr', gap: '2px 8px' }}>
          <span style={S.label}>Server Ver</span><span style={S.val}>SubSeven {VICTIM.serverVer}</span>
          <span style={S.label}>Listening On</span><span style={S.val}>{VICTIM.ip}:27374</span>
          <span style={S.label}>Installed</span><span style={S.val}>C:\Windows\System\msrexe.exe</span>
          <span style={S.label}>Run Key</span><span style={S.val}>HKLM\...\Run → msrexe</span>
          <span style={S.label}>Password</span><span style={S.val}>••••••••</span>
        </div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const TABS = ['INFO', 'FILES', 'PROC', 'REGISTRY', 'FUN', 'SPY', 'CHAT', 'SERVER'] as const;
type Tab = typeof TABS[number];

export default function SubSeven() {
  const [tab, setTab] = useState<Tab>('INFO');
  const [status, setStatus] = useState(`Connected to ${VICTIM.hostname} (${VICTIM.ip}) — SubSeven ${VICTIM.serverVer}`);
  const [connected, setConnected] = useState(true);
  const [hostInput, setHostInput] = useState(VICTIM.ip);

  const onStatus = (s: string) => setStatus(s);

  return (
    <div style={{
      background: '#050e05', color: '#00cc44', fontFamily: 'monospace',
      display: 'flex', flexDirection: 'column', height: '100%',
      border: '1px solid #1a3a1a',
    }}>

      {/* Title bar */}
      <div style={{
        background: 'linear-gradient(90deg, #001a00, #003300)',
        padding: '5px 10px',
        borderBottom: '1px solid #005500',
        display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0,
      }}>
        <span style={{ fontSize: 14, filter: 'drop-shadow(0 0 4px #00ff44)' }}>💀</span>
        <span style={{ fontSize: 14, letterSpacing: 2, color: '#00ff66', fontWeight: 'bold' }}>SubSeven</span>
        <span style={{ fontSize: 11, color: '#006622' }}>2.2 [G]old Edition</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 9, color: '#005522' }}>by mobman</span>
      </div>

      {/* Connection bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, padding: '5px 10px',
        borderBottom: '1px solid #1a3a1a', flexShrink: 0, background: '#020a02',
      }}>
        <span style={{ fontSize: 9, color: '#005522' }}>HOST:</span>
        <input
          value={hostInput}
          onChange={e => setHostInput(e.target.value)}
          style={{
            width: 110, background: '#000d00', border: '1px solid #1a3a1a', color: '#00cc44',
            fontSize: 10, padding: '1px 5px', outline: 'none', fontFamily: 'monospace',
          }}
        />
        <span style={{ fontSize: 9, color: '#005522' }}>PORT: 27374</span>
        <span style={{ fontSize: 9, color: '#005522' }}>PASS:</span>
        <input
          defaultValue="••••••"
          type="password"
          style={{
            width: 60, background: '#000d00', border: '1px solid #1a3a1a', color: '#00cc44',
            fontSize: 10, padding: '1px 5px', outline: 'none', fontFamily: 'monospace',
          }}
        />
        <button
          style={{ ...S.btn(!connected), fontSize: 9 }}
          onClick={() => { setConnected(true); onStatus(`Connected to ${hostInput} — SubSeven ${VICTIM.serverVer}`); }}
        >Connect</button>
        <button
          style={{ ...S.btn(), fontSize: 9, color: '#aa3333', borderColor: '#330000' }}
          onClick={() => { setConnected(false); onStatus('Disconnected'); }}
        >Disconnect</button>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: connected ? '#00ff44' : '#440000', boxShadow: connected ? '0 0 5px #00ff44' : 'none' }} />
          <span style={{ fontSize: 9, color: connected ? '#00aa33' : '#440000' }}>
            {connected ? `${VICTIM.hostname} | ${VICTIM.os}` : 'Not connected'}
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 1, padding: '4px 8px 0',
        borderBottom: '1px solid #1a3a1a', flexShrink: 0, background: '#020a02',
      }}>
        {TABS.map(t => (
          <button
            key={t}
            style={{
              padding: '3px 10px', fontSize: 9, cursor: 'pointer', fontFamily: 'monospace',
              letterSpacing: 1, border: '1px solid',
              borderBottom: tab === t ? '1px solid #050e05' : '1px solid #1a3a1a',
              background: tab === t ? '#050e05' : '#010601',
              color: tab === t ? '#00ff66' : '#005522',
              borderColor: tab === t ? '#005522' : '#1a3a1a',
              borderRadius: '2px 2px 0 0',
              marginBottom: tab === t ? -1 : 0,
            }}
            onClick={() => setTab(t)}
          >{t}</button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {tab === 'INFO'     && <InfoTab />}
        {tab === 'FILES'    && <FilesTab onStatus={onStatus} />}
        {tab === 'PROC'     && <ProcessTab onStatus={onStatus} />}
        {tab === 'REGISTRY' && <RegistryTab onStatus={onStatus} />}
        {tab === 'FUN'      && <FunTab onStatus={onStatus} />}
        {tab === 'SPY'      && <SpyTab onStatus={onStatus} />}
        {tab === 'CHAT'     && <ChatTab />}
        {tab === 'SERVER'   && <ServerTab onStatus={onStatus} />}
      </div>

      {/* Status bar */}
      <div style={{
        padding: '3px 10px', borderTop: '1px solid #1a3a1a', flexShrink: 0,
        fontSize: 9, color: '#006622', fontFamily: 'monospace', background: '#020a02',
        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
      }}>
        › {status}
      </div>

    </div>
  );
}
