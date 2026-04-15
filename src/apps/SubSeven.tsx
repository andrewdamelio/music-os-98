import { useState, useRef, useEffect } from 'react';
import { audioEngine } from '../audio/engine';

// ── Mock data ─────────────────────────────────────────────────────────────────
const VICTIM = {
  ip: '192.168.0.66', hostname: 'DESKTOP-W98SE',
  os: 'Windows 98 SE (4.10.2222 A)', cpu: 'Intel Pentium III 500MHz',
  ram: '64 MB', disk: 'C:\\ 2.1 GB free of 8.4 GB',
  username: 'User', windir: 'C:\\Windows', tempdir: 'C:\\Windows\\Temp',
  serverVer: '2.2', connTime: '00:14:22', ping: '12ms',
};

const FAKE_PROCESSES = [
  { pid: '0001', name: 'KERNEL32.DLL',  mem: '2,048 KB', cpu: '—'  },
  { pid: '0004', name: 'EXPLORER.EXE',  mem: '4,352 KB', cpu: '1%' },
  { pid: '0007', name: 'MSGSRV32.EXE',  mem: '512 KB',   cpu: '0%' },
  { pid: '0011', name: 'MPREXE.EXE',    mem: '256 KB',   cpu: '0%' },
  { pid: '0014', name: 'mmtask.tsk',    mem: '128 KB',   cpu: '0%' },
  { pid: '0017', name: 'SYSTRAY.EXE',   mem: '384 KB',   cpu: '0%' },
  { pid: '0021', name: 'SERVER.EXE',    mem: '896 KB',   cpu: '0%' },
  { pid: '0028', name: 'WINAMP.EXE',    mem: '3,200 KB', cpu: '3%' },
  { pid: '0035', name: 'ICQ32.EXE',     mem: '8,192 KB', cpu: '1%' },
  { pid: '0042', name: 'MIRC.EXE',      mem: '2,048 KB', cpu: '0%' },
  { pid: '0055', name: 'NAPSTER.EXE',   mem: '4,096 KB', cpu: '2%' },
  { pid: '0063', name: 'IEXPLORE.EXE',  mem: '6,400 KB', cpu: '0%' },
];

const FILE_TREE: Record<string, { type: 'dir'|'file'; size?: string; children?: string[] }> = {
  'C:\\': { type: 'dir', children: ['C:\\Windows','C:\\My Documents','C:\\Program Files','C:\\AUTOEXEC.BAT','C:\\CONFIG.SYS'] },
  'C:\\Windows': { type: 'dir', children: ['C:\\Windows\\System','C:\\Windows\\Temp','C:\\Windows\\WIN.INI','C:\\Windows\\SYSTEM.INI'] },
  'C:\\Windows\\System': { type: 'dir', children: [] },
  'C:\\Windows\\Temp': { type: 'dir', children: ['C:\\Windows\\Temp\\tmp_8F2A.tmp','C:\\Windows\\Temp\\tmp_3C1B.tmp'] },
  'C:\\Windows\\WIN.INI': { type: 'file', size: '2 KB' },
  'C:\\Windows\\SYSTEM.INI': { type: 'file', size: '1 KB' },
  'C:\\Windows\\Temp\\tmp_8F2A.tmp': { type: 'file', size: '14 KB' },
  'C:\\Windows\\Temp\\tmp_3C1B.tmp': { type: 'file', size: '3 KB' },
  'C:\\My Documents': { type: 'dir', children: ['C:\\My Documents\\passwords.txt','C:\\My Documents\\diary.txt','C:\\My Documents\\top_secret.doc','C:\\My Documents\\saved_mp3s'] },
  'C:\\My Documents\\passwords.txt': { type: 'file', size: '1 KB' },
  'C:\\My Documents\\diary.txt': { type: 'file', size: '3 KB' },
  'C:\\My Documents\\top_secret.doc': { type: 'file', size: '24 KB' },
  'C:\\My Documents\\saved_mp3s': { type: 'dir', children: ['C:\\My Documents\\saved_mp3s\\metallica_napster_rip.mp3','C:\\My Documents\\saved_mp3s\\eminem_slim_shady.mp3'] },
  'C:\\My Documents\\saved_mp3s\\metallica_napster_rip.mp3': { type: 'file', size: '4,096 KB' },
  'C:\\My Documents\\saved_mp3s\\eminem_slim_shady.mp3': { type: 'file', size: '3,840 KB' },
  'C:\\Program Files': { type: 'dir', children: ['C:\\Program Files\\ICQ','C:\\Program Files\\Winamp','C:\\Program Files\\mIRC','C:\\Program Files\\Napster'] },
  'C:\\Program Files\\ICQ': { type: 'dir', children: [] },
  'C:\\Program Files\\Winamp': { type: 'dir', children: [] },
  'C:\\Program Files\\mIRC': { type: 'dir', children: [] },
  'C:\\Program Files\\Napster': { type: 'dir', children: [] },
  'C:\\AUTOEXEC.BAT': { type: 'file', size: '512 B' },
  'C:\\CONFIG.SYS': { type: 'file', size: '256 B' },
};

const REG_TREE: Record<string, { children?: string[]; values?: Record<string, string> }> = {
  'HKEY_LOCAL_MACHINE': { children: ['HKEY_LOCAL_MACHINE\\SOFTWARE','HKEY_LOCAL_MACHINE\\SYSTEM','HKEY_LOCAL_MACHINE\\HARDWARE'] },
  'HKEY_LOCAL_MACHINE\\SOFTWARE': { children: ['HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft','HKEY_LOCAL_MACHINE\\SOFTWARE\\ICQ Inc'] },
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft': { children: ['HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows'], values: { Version: '"4.10.2222"', ProductName: '"Windows 98 SE"' } },
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\Microsoft\\Windows': { values: { SystemRoot: '"C:\\\\Windows"', WinDir: '"C:\\\\Windows"' } },
  'HKEY_LOCAL_MACHINE\\SOFTWARE\\ICQ Inc': { values: { ICQPath: '"C:\\\\Program Files\\\\ICQ"', UIN: '"1337420"' } },
  'HKEY_LOCAL_MACHINE\\SYSTEM': { children: [] },
  'HKEY_LOCAL_MACHINE\\HARDWARE': { children: [] },
  'HKEY_CURRENT_USER': { children: ['HKEY_CURRENT_USER\\Software','HKEY_CURRENT_USER\\AppEvents'] },
  'HKEY_CURRENT_USER\\Software': { children: [] },
  'HKEY_CURRENT_USER\\AppEvents': { children: [] },
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
  { label: 'Flip Screen',           cmd: 'flip'       },
  { label: 'Swap Mouse Buttons',    cmd: 'swapMouse'  },
  { label: 'Show Blue Screen',      cmd: 'bsod'       },
  { label: 'Play Wav File',         cmd: 'playwav'    },
  { label: 'Hide Desktop Icons',    cmd: 'hideicons'  },
  { label: 'Rotate Wallpaper',      cmd: 'wallpaper'  },
  { label: 'Move Mouse to 0,0',     cmd: 'mousemove'  },
  { label: 'Set Resolution 640×480',cmd: 'screenres'  },
  { label: 'Fake Shutdown',         cmd: 'shutdown'   },
  { label: 'Send Message Box',      cmd: 'msgbox'     },
  // ── Web-native extras ───────────────────────────────
  { label: 'Earthquake',            cmd: 'earthquake' },
  { label: 'Invert Colors',         cmd: 'invert'     },
  { label: 'Disco Mode',            cmd: 'disco'      },
  { label: 'Matrix Rain',           cmd: 'matrix'     },
  { label: 'Cursor Trail',          cmd: 'cursorTrail'},
  { label: 'Drunk Mode',            cmd: 'drunk'      },
  { label: 'Pop-up Storm',          cmd: 'popupStorm' },
  { label: 'VHS Glitch',            cmd: 'vhs'        },
  { label: 'Nyan Cat',              cmd: 'nyan'       },
  { label: 'Confetti Blast',        cmd: 'confetti'   },
];

// ── Fun Effect Engine ─────────────────────────────────────────────────────────
// Module-level so effects persist even if the SubSeven window is unmounted.
let _clearFunEffect: (() => void) | null = null;

function applyFunEffect(applyFn: () => () => void) {
  if (_clearFunEffect) { _clearFunEffect(); _clearFunEffect = null; }
  const undo = applyFn();
  const handler = (e: KeyboardEvent) => {
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
    undo();
    window.removeEventListener('keydown', handler);
    _clearFunEffect = null;
  };
  window.addEventListener('keydown', handler);
  _clearFunEffect = () => { undo(); window.removeEventListener('keydown', handler); };
}

function mkOverlay(bg: string, extra = ''): HTMLDivElement {
  const el = document.createElement('div');
  el.style.cssText = `position:fixed;inset:0;z-index:999999;background:${bg};${extra}`;
  return el;
}

const funEffects = {
  flip(): () => void {
    const prev = { t: document.body.style.transform, o: document.body.style.transformOrigin };
    document.body.style.transform = 'rotate(180deg)';
    document.body.style.transformOrigin = 'center center';
    return () => { document.body.style.transform = prev.t; document.body.style.transformOrigin = prev.o; };
  },

  swapMouse(): () => void {
    const h = (e: MouseEvent) => {
      if (e.button === 0) {
        e.preventDefault(); e.stopImmediatePropagation();
        (e.target as HTMLElement)?.dispatchEvent(new MouseEvent('contextmenu', {
          bubbles: true, cancelable: true, clientX: e.clientX, clientY: e.clientY,
        }));
      }
    };
    window.addEventListener('mousedown', h, true);
    document.body.style.cursor = 'context-menu';
    return () => { window.removeEventListener('mousedown', h, true); document.body.style.cursor = ''; };
  },

  bsod(): () => void {
    const el = mkOverlay('#0000aa');
    const pre = document.createElement('pre');
    pre.style.cssText = 'font-family:"Courier New",monospace;font-size:14px;color:white;padding:40px 80px;line-height:2;white-space:pre-wrap;';
    pre.textContent = [
      'Windows\n',
      'A fatal exception 0E has occurred at 0028:C0011E36 in VXD VMM(01) +',
      '00010E36. The current application will be terminated.\n',
      '*  Press any key to terminate the current application.',
      '*  Press CTRL+ALT+DEL again to restart your computer. You will',
      '   lose any unsaved information in all applications.\n\n',
      'Press any key to continue _',
    ].join('\n');
    el.appendChild(pre);
    document.body.appendChild(el);
    return () => el.remove();
  },

  msgbox(message: string): () => void {
    const overlay = mkOverlay('rgba(0,0,0,0.45)', 'display:flex;align-items:center;justify-content:center;');
    const dlg = document.createElement('div');
    dlg.style.cssText = 'background:#c0c0c0;border:2px solid;border-color:#fff #808080 #808080 #fff;min-width:320px;max-width:480px;font-family:Tahoma,sans-serif;box-shadow:4px 4px 10px rgba(0,0,0,0.6);';

    const titleBar = document.createElement('div');
    titleBar.style.cssText = 'background:linear-gradient(to right,#000080,#1084d0);color:#fff;padding:3px 8px;font-size:12px;font-weight:bold;user-select:none;display:flex;justify-content:space-between;align-items:center;';
    titleBar.textContent = 'SubSeven';
    const xBtn = document.createElement('button');
    xBtn.textContent = '✕';
    xBtn.style.cssText = 'background:#c0c0c0;border:1px solid;border-color:#fff #808080 #808080 #fff;color:#000;font-size:10px;width:16px;height:14px;cursor:pointer;padding:0;line-height:1;';
    xBtn.onclick = () => overlay.remove();
    titleBar.appendChild(xBtn);

    const body = document.createElement('div');
    body.style.cssText = 'padding:20px;display:flex;align-items:flex-start;gap:14px;';
    const icon = document.createElement('span');
    icon.style.cssText = 'font-size:28px;flex-shrink:0;';
    icon.textContent = 'ℹ️';
    const msg = document.createElement('span');
    msg.style.cssText = 'font-size:13px;line-height:1.5;';
    msg.textContent = message;
    body.appendChild(icon); body.appendChild(msg);

    const foot = document.createElement('div');
    foot.style.cssText = 'padding:10px;display:flex;justify-content:center;border-top:1px solid #808080;';
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.cssText = 'background:#c0c0c0;border:2px solid;border-color:#fff #808080 #808080 #fff;padding:4px 24px;font-family:Tahoma;font-size:12px;cursor:pointer;min-width:80px;';
    okBtn.onclick = () => overlay.remove();
    foot.appendChild(okBtn);

    dlg.appendChild(titleBar); dlg.appendChild(body); dlg.appendChild(foot);
    overlay.appendChild(dlg);
    document.body.appendChild(overlay);
    return () => overlay.remove();
  },

  playwav(): void {
    audioEngine.ensureRunning(() => {
      const ctx = audioEngine.ctx!;
      const notes = [523, 659, 784, 1047];
      let t = ctx.currentTime + 0.01;
      notes.forEach(f => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.frequency.value = f; osc.type = 'sine';
        g.gain.setValueAtTime(0.25, t);
        g.gain.exponentialRampToValueAtTime(0.001, t + 0.15);
        osc.connect(g); g.connect(ctx.destination);
        osc.start(t); osc.stop(t + 0.15);
        t += 0.11;
      });
    });
  },

  hideicons(): () => void {
    const icons = Array.from(document.querySelectorAll<HTMLElement>('.desktop-icon'));
    icons.forEach(el => { el.style.visibility = 'hidden'; });
    return () => icons.forEach(el => { el.style.visibility = ''; });
  },

  wallpaper(): void {
    window.dispatchEvent(new CustomEvent('s7:rotate-wallpaper'));
  },

  mousemove(): () => void {
    document.body.style.cursor = 'none';
    const fake = document.createElement('div');
    fake.style.cssText = [
      'position:fixed;z-index:999999;pointer-events:none;',
      'width:0;height:0;',
      'border-left:8px solid white;border-bottom:8px solid transparent;border-right:8px solid transparent;',
      'filter:drop-shadow(1px 1px 2px black);',
      `left:${window.innerWidth / 2}px;top:${window.innerHeight / 2}px;`,
      'transition:left 0.9s cubic-bezier(.4,0,.2,1),top 0.9s cubic-bezier(.4,0,.2,1);',
    ].join('');
    document.body.appendChild(fake);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      fake.style.left = '0px'; fake.style.top = '0px';
    }));
    return () => { fake.remove(); document.body.style.cursor = ''; };
  },

  screenres(): () => void {
    const scale = Math.min(640 / window.innerWidth, 480 / window.innerHeight);
    document.body.style.transform = `scale(${scale})`;
    document.body.style.transformOrigin = 'top left';
    document.body.style.width = `${(100 / scale).toFixed(2)}%`;
    document.body.style.height = `${(100 / scale).toFixed(2)}%`;
    return () => {
      document.body.style.transform = '';
      document.body.style.transformOrigin = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  },

  shutdown(): () => void {
    const el = mkOverlay('#000080', 'display:flex;flex-direction:column;align-items:center;justify-content:center;');
    const logo = document.createElement('div');
    logo.style.cssText = 'font-family:Tahoma,sans-serif;color:#fff;text-align:center;margin-bottom:32px;';
    logo.innerHTML = '<span style="font-size:32px;font-weight:bold;letter-spacing:3px;">Windows</span><span style="font-size:32px;font-style:italic;color:#ff8c00;font-weight:bold;">98</span>';
    const msg = document.createElement('div');
    msg.style.cssText = 'color:#fff;font-family:Tahoma,sans-serif;font-size:15px;';
    msg.textContent = 'Windows is shutting down...';
    const hint = document.createElement('div');
    hint.style.cssText = 'position:absolute;bottom:40px;color:#aaa;font-family:Tahoma,sans-serif;font-size:11px;';
    hint.textContent = 'Press any key to cancel';
    el.appendChild(logo); el.appendChild(msg); el.appendChild(hint);
    document.body.appendChild(el);
    const tid = setTimeout(() => { msg.textContent = 'It is now safe to turn off your computer.'; }, 2200);
    return () => { clearTimeout(tid); el.remove(); };
  },

  // ── Web-native extras ──────────────────────────────────────────────────────

  earthquake(): () => void {
    const sty = document.createElement('style');
    sty.textContent = '@keyframes s7q{0%,100%{transform:translate(0,0) rotate(0deg)}20%{transform:translate(-5px,4px) rotate(-0.4deg)}40%{transform:translate(5px,-4px) rotate(0.4deg)}60%{transform:translate(-4px,5px) rotate(-0.3deg)}80%{transform:translate(4px,-5px) rotate(0.3deg)}}';
    document.head.appendChild(sty);
    document.body.style.animation = 's7q 0.1s linear infinite';
    return () => { document.body.style.animation = ''; sty.remove(); };
  },

  invert(): () => void {
    const prev = document.body.style.filter;
    document.body.style.filter = 'invert(1) hue-rotate(180deg)';
    return () => { document.body.style.filter = prev; };
  },

  disco(): () => void {
    const sty = document.createElement('style');
    sty.textContent = '@keyframes s7disco{from{filter:hue-rotate(0deg) saturate(3) brightness(1.1)}to{filter:hue-rotate(360deg) saturate(3) brightness(1.1)}}';
    document.head.appendChild(sty);
    const prev = document.body.style.animation;
    document.body.style.animation = 's7disco 0.4s linear infinite';
    return () => { document.body.style.animation = prev; sty.remove(); };
  },

  matrix(): () => void {
    const canvas = document.createElement('canvas');
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    canvas.style.cssText = 'position:fixed;inset:0;z-index:999998;pointer-events:none;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d')!;
    const cols = Math.floor(canvas.width / 14);
    const drops = Array.from({ length: cols }, () => Math.random() * -60);
    const chars = 'アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホ0123456789ABCDEF!@#$%^&*';
    let raf: number;
    const draw = () => {
      ctx.fillStyle = 'rgba(0,0,0,0.06)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.font = '13px monospace';
      drops.forEach((y, i) => {
        // Lead char is bright white, trail is green
        ctx.fillStyle = '#aaffaa';
        ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, y * 14);
        if (y > 2) { ctx.fillStyle = '#00cc33'; ctx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 14, (y - 1) * 14); }
        if (y * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i] += 0.5;
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); canvas.remove(); };
  },

  cursorTrail(): () => void {
    const colors = ['#ff0044','#ff8800','#ffee00','#00ff88','#00cfff','#cc44ff','#ff44cc'];
    const dots: HTMLDivElement[] = [];
    const onMove = (e: MouseEvent) => {
      const dot = document.createElement('div');
      const size = 6 + Math.floor(Math.random() * 6);
      dot.style.cssText = `position:fixed;left:${e.clientX - size/2}px;top:${e.clientY - size/2}px;width:${size}px;height:${size}px;border-radius:50%;background:${colors[Math.floor(Math.random() * colors.length)]};pointer-events:none;z-index:999997;transition:opacity 0.5s,transform 0.5s;`;
      document.body.appendChild(dot);
      dots.push(dot);
      requestAnimationFrame(() => requestAnimationFrame(() => { dot.style.opacity = '0'; dot.style.transform = 'scale(0.1)'; }));
      setTimeout(() => { dot.remove(); const idx = dots.indexOf(dot); if (idx >= 0) dots.splice(idx, 1); }, 520);
    };
    window.addEventListener('mousemove', onMove);
    return () => { window.removeEventListener('mousemove', onMove); dots.forEach(d => d.remove()); };
  },

  drunk(): () => void {
    const sty = document.createElement('style');
    sty.textContent = '@keyframes s7drunk{0%{transform:rotate(-2.5deg) translate(-3px,1px)}25%{transform:rotate(1.5deg) translate(3px,-2px)}50%{transform:rotate(-1deg) translate(-2px,3px)}75%{transform:rotate(2.5deg) translate(2px,-1px)}100%{transform:rotate(-2.5deg) translate(-3px,1px)}}';
    document.head.appendChild(sty);
    document.body.style.animation = 's7drunk 1.1s ease-in-out infinite';
    document.body.style.transformOrigin = 'center center';
    return () => { document.body.style.animation = ''; document.body.style.transformOrigin = ''; sty.remove(); };
  },

  popupStorm(): () => void {
    const msgs = [
      ['FATAL ERROR: KERNEL32.DLL corrupted at 0x00401000', '💀'],
      ['VIRUS DETECTED: Win32.SubSeven.Trojan', '☠️'],
      ['Stack overflow in module: MSVBVM60.DLL', '💣'],
      ['Not enough memory to complete operation', '😵'],
      ['Illegal operation performed by EXPLORER.EXE', '🚨'],
      ['Registry corruption detected. Run SCANREG.', '⚠️'],
      ['Your free trial of Windows has expired.', '🪟'],
    ];
    const popups: HTMLElement[] = [];
    let count = 0;
    const spawnOne = () => {
      if (count >= msgs.length) return;
      const [text, icon] = msgs[count];
      const wrap = document.createElement('div');
      wrap.style.cssText = `position:fixed;left:${80 + count*55}px;top:${60 + count*38}px;z-index:${999990+count};font-family:Tahoma,sans-serif;`;
      const dlg = document.createElement('div');
      dlg.style.cssText = 'background:#d4d0c8;border:2px solid;border-color:#fff #808080 #808080 #fff;min-width:280px;box-shadow:4px 4px 0 #000;';
      const tb = document.createElement('div');
      tb.style.cssText = 'background:linear-gradient(to right,#000080,#1084d0);color:#fff;padding:3px 8px;font-size:11px;font-weight:bold;display:flex;justify-content:space-between;align-items:center;';
      tb.innerHTML = `<span>Error</span>`;
      const xb = document.createElement('button');
      xb.textContent = '✕'; xb.style.cssText = 'background:#c0c0c0;border:1px solid;border-color:#fff #808080 #808080 #fff;width:16px;height:14px;font-size:9px;cursor:pointer;padding:0;';
      xb.onclick = () => wrap.remove();
      tb.appendChild(xb);
      const body = document.createElement('div');
      body.style.cssText = 'padding:14px 16px;display:flex;gap:12px;align-items:flex-start;font-size:12px;';
      body.innerHTML = `<span style="font-size:22px;flex-shrink:0;">${icon}</span><span>${text}</span>`;
      const foot = document.createElement('div');
      foot.style.cssText = 'padding:8px;display:flex;justify-content:center;border-top:1px solid #808080;gap:6px;';
      ['OK','Ignore','Retry'].slice(0, (count % 3) + 1).forEach(lbl => {
        const b = document.createElement('button');
        b.textContent = lbl; b.style.cssText = 'background:#d4d0c8;border:2px solid;border-color:#fff #808080 #808080 #fff;padding:3px 16px;font-family:Tahoma;font-size:11px;cursor:pointer;min-width:60px;';
        b.onclick = () => wrap.remove();
        foot.appendChild(b);
      });
      dlg.appendChild(tb); dlg.appendChild(body); dlg.appendChild(foot);
      wrap.appendChild(dlg);
      document.body.appendChild(wrap);
      popups.push(wrap);
      count++;
      if (count < msgs.length) setTimeout(spawnOne, 250 + Math.random() * 150);
    };
    spawnOne();
    return () => { popups.forEach(p => p.remove()); };
  },

  vhs(): () => void {
    const overlay = mkOverlay('transparent', 'pointer-events:none;');
    overlay.style.backgroundImage = 'repeating-linear-gradient(0deg,rgba(0,0,0,0.07) 0px,rgba(0,0,0,0.07) 1px,transparent 1px,transparent 3px)';
    document.body.appendChild(overlay);
    const sty = document.createElement('style');
    sty.textContent = '@keyframes s7vhs{0%,100%{transform:translate(0,0);filter:none}5%{transform:translate(-4px,0);filter:hue-rotate(90deg) saturate(2)}10%{transform:translate(3px,0);filter:hue-rotate(-90deg) saturate(2)}12%{transform:translate(0,0);filter:none}30%{transform:translate(-2px,1px);filter:brightness(1.3) saturate(0)}32%{transform:translate(0,0);filter:none}60%{transform:translate(4px,0);filter:hue-rotate(180deg)}62%{transform:translate(-4px,0);filter:hue-rotate(-180deg)}64%{transform:translate(0,0);filter:none}}';
    document.head.appendChild(sty);
    document.body.style.animation = 's7vhs 2.8s steps(1) infinite';
    return () => { document.body.style.animation = ''; overlay.remove(); sty.remove(); };
  },

  nyan(): () => void {
    const sty = document.createElement('style');
    sty.textContent = '@keyframes s7nyan{from{left:-140px}to{left:calc(100vw + 30px)}}';
    document.head.appendChild(sty);
    const el = document.createElement('div');
    el.style.cssText = 'position:fixed;top:28%;z-index:999998;pointer-events:none;font-size:48px;white-space:nowrap;animation:s7nyan 2.2s linear forwards;filter:drop-shadow(0 0 8px #ff88ff);';
    el.textContent = '🌈🐱✨';
    document.body.appendChild(el);
    const tid = setTimeout(() => { el.remove(); sty.remove(); }, 2400);
    return () => { clearTimeout(tid); el.remove(); sty.remove(); };
  },

  confetti(): () => void {
    const colors = ['#ff0044','#ff8800','#ffee00','#00ff88','#00cfff','#cc44ff','#ff44cc','#ffffff'];
    const cx = window.innerWidth / 2;
    const cy = window.innerHeight * 0.35;
    const particles: HTMLDivElement[] = [];
    for (let i = 0; i < 90; i++) {
      const p = document.createElement('div');
      const angle = Math.random() * Math.PI * 2;
      const spd = 5 + Math.random() * 10;
      let vx = Math.cos(angle) * spd, vy = Math.sin(angle) * spd - 6;
      const size = 4 + Math.floor(Math.random() * 7);
      const color = colors[Math.floor(Math.random() * colors.length)];
      const isRect = Math.random() > 0.5;
      p.style.cssText = `position:fixed;width:${size}px;height:${isRect ? size*0.5 : size}px;background:${color};pointer-events:none;z-index:999997;border-radius:${isRect ? 0 : '50%'};left:${cx}px;top:${cy}px;`;
      document.body.appendChild(p);
      particles.push(p);
      let x = cx, y = cy;
      const tick = () => {
        x += vx; y += vy; vy += 0.35; vx *= 0.99;
        p.style.left = x + 'px'; p.style.top = y + 'px';
        p.style.transform = `rotate(${x * 2}deg)`;
        if (y < window.innerHeight + 30) requestAnimationFrame(tick);
        else p.remove();
      };
      setTimeout(() => requestAnimationFrame(tick), i * 8);
    }
    return () => particles.forEach(p => { try { p.remove(); } catch {} });
  },
};

// ── Color palette matching SubSeven Legacy exactly ────────────────────────────
const C = {
  bg:        '#07091a',   // main background
  bgPanel:   '#0a0d22',   // panel/content background
  bgRow:     '#0d1128',   // alternating row
  bgHdr:     '#0c1030',   // toolbar/header strip
  selected:  '#1a4acc',   // tree selected item
  selText:   '#ffffff',
  border:    '#1a2a5e',   // panel borders
  borderDim: '#0e1840',
  text:      '#c8d4f0',   // normal text
  textDim:   '#6878aa',   // dim text / depth-1 items
  textCat:   '#ffffff',   // category headers
  accent:    '#4488ff',   // links / highlights
  inputBg:   '#020614',
  inputBorder: '#2a3a7a',
  btnBg:     '#1a2248',
  btnBorder: '#3a4a8a',
  btnText:   '#c8d4f0',
  statusBg:  '#05070f',
};

// Win98-style raised button
const btn98: React.CSSProperties = {
  background: C.btnBg,
  color: C.btnText,
  border: `1px solid`,
  borderColor: `${C.btnBorder} #080c22 #080c22 ${C.btnBorder}`,
  padding: '2px 10px',
  fontSize: 11,
  fontFamily: 'Tahoma, Arial, sans-serif',
  cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
};

// Win98 sunken input
const input98: React.CSSProperties = {
  background: C.inputBg,
  color: C.text,
  border: `1px solid`,
  borderColor: `#080c22 ${C.inputBorder} ${C.inputBorder} #080c22`,
  padding: '1px 4px',
  fontSize: 11,
  fontFamily: 'Tahoma, Arial, sans-serif',
  outline: 'none',
};

// ── S7 Logo ───────────────────────────────────────────────────────────────────
function S7Logo({ size = 52 }: { size?: number }) {
  return (
    <div style={{
      width: size, height: size,
      background: 'linear-gradient(135deg, #0a0e22 0%, #050818 100%)',
      border: '2px solid',
      borderColor: '#2a3a7a #080c1e #080c1e #2a3a7a',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
      boxShadow: 'inset 0 0 12px rgba(30,60,180,0.3)',
    }}>
      <svg width={size * 0.72} height={size * 0.72} viewBox="0 0 38 38">
        {/* S */}
        <path d="M4 8 Q4 5 7 5 L16 5 Q19 5 19 8 L19 12 Q19 15 16 15 L7 15 Q4 15 4 18 L4 22 Q4 25 7 25 L16 25 Q19 25 19 22"
          fill="none" stroke="#2244aa" strokeWidth="3.5" strokeLinecap="round" opacity="0.6"/>
        {/* 7 */}
        <path d="M22 5 L34 5 L26 30" fill="none" stroke="#2244aa" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.6"/>
        {/* Bright overlay */}
        <path d="M4 8 Q4 5 7 5 L16 5 Q19 5 19 8 L19 12 Q19 15 16 15 L7 15 Q4 15 4 18 L4 22 Q4 25 7 25 L16 25 Q19 25 19 22"
          fill="none" stroke="#4466cc" strokeWidth="1.5" strokeLinecap="round" opacity="0.5"/>
        <path d="M22 5 L34 5 L26 30" fill="none" stroke="#4466cc" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.5"/>
      </svg>
    </div>
  );
}

// ── Large watermark logo shown in empty content panel ─────────────────────────
function S7Watermark() {
  return (
    <div style={{
      position: 'absolute', inset: 0,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      pointerEvents: 'none',
    }}>
      <svg width="160" height="160" viewBox="0 0 80 80" opacity={0.07}>
        <path d="M8 16 Q8 10 14 10 L32 10 Q38 10 38 16 L38 24 Q38 30 32 30 L14 30 Q8 30 8 36 L8 44 Q8 50 14 50 L32 50 Q38 50 38 44"
          fill="none" stroke="#4466ff" strokeWidth="7" strokeLinecap="round"/>
        <path d="M44 10 L68 10 L52 70" fill="none" stroke="#4466ff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    </div>
  );
}

// ── Toolbar button ────────────────────────────────────────────────────────────
function TBtn({ title, children, onClick }: { title: string; children: React.ReactNode; onClick?: () => void }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      title={title} onClick={onClick}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center',
        cursor: 'pointer', fontSize: 12,
        background: hover ? '#1a2a5e' : 'transparent',
        border: hover ? `1px solid ${C.btnBorder}` : '1px solid transparent',
        borderRadius: 1,
      }}
    >{children}</div>
  );
}

// ── Nav tree ──────────────────────────────────────────────────────────────────
type NavId = 'process-manager' | 'file-manager' | 'registry' | 'fun-manager' | 'spy' | 'remote-shell' | 'machine-info' | 'server-admin' | 'ping';

interface NavItem { id: NavId | string; label: string; depth: number; isCategory?: boolean; }

const NAV_ITEMS: NavItem[] = [
  { id: 'system',         label: '- system',        depth: 0, isCategory: true },
  { id: 'process-manager',label: 'process manager', depth: 1 },
  { id: 'machine-info',   label: 'machine info',    depth: 1 },
  { id: 'ping',           label: 'ping',            depth: 1 },
  { id: 'control',        label: '- control',       depth: 0, isCategory: true },
  { id: 'fun-manager',    label: 'fun manager',     depth: 1 },
  { id: 'spy',            label: 'spy tools',       depth: 1 },
  { id: 'files',          label: '- files',         depth: 0, isCategory: true },
  { id: 'file-manager',   label: 'file manager',    depth: 1 },
  { id: 'registry',       label: 'registry editor', depth: 1 },
  { id: 'commands',       label: '- commands',      depth: 0, isCategory: true },
  { id: 'remote-shell',   label: 'remote shell',    depth: 1 },
  { id: 'machine',        label: '- machine',       depth: 0, isCategory: true },
  { id: 'server-admin',   label: 'server admin',    depth: 1 },
];

// ── Content panels ────────────────────────────────────────────────────────────

function PanelProcessManager({ onStatus }: { onStatus: (s: string) => void }) {
  const [selected, setSelected] = useState<string | null>(null);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Panel title bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '3px 8px', borderBottom: `1px solid ${C.border}`, background: C.bgHdr, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: C.text, fontFamily: 'Tahoma, sans-serif' }}>process manager</span>
        <div style={{ display: 'flex', gap: 2 }}>
          <TBtn title="Refresh" onClick={() => onStatus('Process list refreshed')}>↻</TBtn>
        </div>
      </div>
      {/* Column headers */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px',
        background: C.bgHdr, borderBottom: `1px solid ${C.border}`, flexShrink: 0 }}>
        {['process name ▲','process id','memory','cpu'].map(h => (
          <div key={h} style={{ padding: '2px 6px', fontSize: 11, color: C.accent,
            fontFamily: 'Tahoma, sans-serif', borderRight: `1px solid ${C.borderDim}` }}>{h}</div>
        ))}
      </div>
      {/* Rows */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {FAKE_PROCESSES.map((p, i) => {
          const sel = selected === p.pid;
          return (
            <div key={p.pid} onClick={() => setSelected(p.pid)}
              style={{ display: 'grid', gridTemplateColumns: '1fr 80px 80px 70px',
                background: sel ? C.selected : i % 2 === 0 ? C.bgPanel : C.bgRow,
                cursor: 'default' }}>
              {[p.name, p.pid, p.mem, p.cpu].map((v, j) => (
                <div key={j} style={{ padding: '2px 6px', fontSize: 11,
                  fontFamily: 'Tahoma, sans-serif', color: sel ? '#fff' : C.text,
                  borderRight: `1px solid ${C.borderDim}`, whiteSpace: 'nowrap', overflow: 'hidden' }}>{v}</div>
              ))}
            </div>
          );
        })}
      </div>
      {/* Buttons */}
      <div style={{ display: 'flex', gap: 6, padding: '6px 8px',
        borderTop: `1px solid ${C.border}`, background: C.bgHdr, flexShrink: 0 }}>
        <button style={btn98} onClick={() => onStatus('Process list refreshed')}>refresh</button>
        <button style={btn98} onClick={() => selected
          ? onStatus(`Killed process ${FAKE_PROCESSES.find(p => p.pid === selected)?.name}`)
          : onStatus('No process selected')
        }>kill selected</button>
      </div>
    </div>
  );
}

function PanelMachineInfo() {
  const rows: [string, string][] = [
    ['IP Address', VICTIM.ip], ['Hostname', VICTIM.hostname], ['OS', VICTIM.os],
    ['CPU', VICTIM.cpu], ['RAM', VICTIM.ram], ['Disk', VICTIM.disk],
    ['Username', VICTIM.username], ['Windows Dir', VICTIM.windir], ['Temp Dir', VICTIM.tempdir],
    ['Server Ver', `SubSeven ${VICTIM.serverVer}`], ['Connected', VICTIM.connTime], ['Ping', VICTIM.ping],
  ];
  return (
    <div style={{ padding: 10, overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 11, color: C.accent, fontFamily: 'Tahoma, sans-serif',
        marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>
        machine info — {VICTIM.hostname} ({VICTIM.ip})
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <tbody>
          {rows.map(([k, v], i) => (
            <tr key={k} style={{ background: i % 2 === 0 ? C.bgPanel : C.bgRow }}>
              <td style={{ padding: '2px 8px', fontSize: 11, color: C.textDim,
                fontFamily: 'Tahoma, sans-serif', width: 130, whiteSpace: 'nowrap' }}>{k}</td>
              <td style={{ padding: '2px 8px', fontSize: 11, color: C.text,
                fontFamily: 'Tahoma, sans-serif' }}>{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PanelPing({ onStatus }: { onStatus: (s: string) => void }) {
  const [lines, setLines] = useState<string[]>([
    `Pinging ${VICTIM.hostname} [${VICTIM.ip}] with 32 bytes of data:`,
    `Reply from ${VICTIM.ip}: bytes=32 time=12ms TTL=128`,
    `Reply from ${VICTIM.ip}: bytes=32 time=11ms TTL=128`,
    `Reply from ${VICTIM.ip}: bytes=32 time=13ms TTL=128`,
    `Reply from ${VICTIM.ip}: bytes=32 time=12ms TTL=128`,
    '',
    `Ping statistics for ${VICTIM.ip}:`,
    `    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss),`,
    `Approximate round trip times in milli-seconds:`,
    `    Minimum = 11ms, Maximum = 13ms, Average = 12ms`,
  ]);
  const ping = () => {
    const ms = 10 + Math.floor(Math.random() * 8);
    setLines(prev => [...prev, `Reply from ${VICTIM.ip}: bytes=32 time=${ms}ms TTL=128`]);
    onStatus(`Ping reply: ${ms}ms`);
  };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8,
        fontFamily: '"Courier New", monospace', fontSize: 11, color: '#88aacc', lineHeight: 1.6 }}>
        {lines.map((l, i) => <div key={i}>{l || <br />}</div>)}
      </div>
      <div style={{ padding: '6px 8px', borderTop: `1px solid ${C.border}`, background: C.bgHdr,
        display: 'flex', gap: 6, flexShrink: 0 }}>
        <button style={btn98} onClick={ping}>ping again</button>
      </div>
    </div>
  );
}

function PanelFileManager({ onStatus }: { onStatus: (s: string) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['C:\\']));
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (path: string) => setExpanded(prev => {
    const s = new Set(prev);
    s.has(path) ? s.delete(path) : s.add(path);
    return s;
  });

  const renderNode = (path: string, depth: number): React.ReactNode => {
    const node = FILE_TREE[path];
    if (!node) return null;
    const isDir = node.type === 'dir';
    const name = path.split('\\').pop() || path;
    const isSelected = selected === path;
    const isExpanded = expanded.has(path);
    return (
      <div key={path}>
        <div onClick={() => { setSelected(path); if (isDir) toggle(path); onStatus(path); }}
          style={{
            paddingLeft: depth * 14 + 4, paddingTop: 1, paddingBottom: 1,
            background: isSelected ? C.selected : 'transparent',
            display: 'flex', alignItems: 'center', gap: 4, cursor: 'default',
          }}>
          <span style={{ fontSize: 10, color: isSelected ? '#fff' : C.textDim, width: 10 }}>
            {isDir ? (isExpanded ? '▼' : '▶') : ''}
          </span>
          <span style={{ fontSize: 10, marginRight: 2 }}>{isDir ? '📁' : '📄'}</span>
          <span style={{ fontSize: 11, fontFamily: 'Tahoma, sans-serif',
            color: isSelected ? '#fff' : C.text, flex: 1 }}>{name}</span>
          {!isDir && node.size && (
            <span style={{ fontSize: 10, fontFamily: 'Tahoma, sans-serif',
              color: isSelected ? '#ccc' : C.textDim, paddingRight: 8 }}>{node.size}</span>
          )}
        </div>
        {isDir && isExpanded && (node.children ?? []).map(c => renderNode(c, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 8px', borderBottom: `1px solid ${C.border}`, background: C.bgHdr, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: C.text, fontFamily: 'Tahoma, sans-serif' }}>file manager</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <TBtn title="Upload" onClick={() => onStatus('Upload dialog opened')}>⬆</TBtn>
          <TBtn title="Download" onClick={() => selected ? onStatus(`Downloading ${selected}`) : undefined}>⬇</TBtn>
          <TBtn title="Delete" onClick={() => selected ? onStatus(`Deleted ${selected}`) : undefined}>✕</TBtn>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {renderNode('C:\\', 0)}
      </div>
      <div style={{ padding: '4px 8px', borderTop: `1px solid ${C.border}`, background: C.bgHdr,
        fontSize: 10, fontFamily: 'Tahoma, sans-serif', color: C.textDim, flexShrink: 0 }}>
        {selected ?? 'No file selected'}
      </div>
    </div>
  );
}

function PanelRegistry({ onStatus }: { onStatus: (s: string) => void }) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['HKEY_LOCAL_MACHINE', 'HKEY_CURRENT_USER']));
  const [selected, setSelected] = useState<string | null>(null);

  const toggle = (key: string) => setExpanded(prev => {
    const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s;
  });

  const renderKey = (key: string, depth: number): React.ReactNode => {
    const node = REG_TREE[key]; if (!node) return null;
    const name = key.split('\\').pop() || key;
    const isSel = selected === key;
    const hasChildren = (node.children?.length ?? 0) > 0;
    const isExpanded = expanded.has(key);
    return (
      <div key={key}>
        <div onClick={() => { setSelected(key); if (hasChildren) toggle(key); }}
          style={{ paddingLeft: depth * 14 + 4, paddingTop: 1, paddingBottom: 1,
            background: isSel ? C.selected : 'transparent',
            display: 'flex', alignItems: 'center', gap: 4, cursor: 'default' }}>
          <span style={{ fontSize: 10, color: isSel ? '#fff' : C.textDim, width: 10 }}>
            {hasChildren ? (isExpanded ? '▼' : '▶') : ''}
          </span>
          <span style={{ fontSize: 10, marginRight: 2 }}>🗂️</span>
          <span style={{ fontSize: 11, fontFamily: 'Tahoma, sans-serif', color: isSel ? '#fff' : C.text }}>{name}</span>
        </div>
        {isSel && node.values && Object.entries(node.values).map(([k, v]) => (
          <div key={k} style={{ paddingLeft: depth * 14 + 28, paddingTop: 1, paddingBottom: 1,
            display: 'flex', gap: 12, background: C.bgRow }}>
            <span style={{ fontSize: 11, fontFamily: 'Tahoma, sans-serif', color: C.textDim, width: 120 }}>{k}</span>
            <span style={{ fontSize: 11, fontFamily: 'Tahoma, sans-serif', color: '#88aaff' }}>{v}</span>
          </div>
        ))}
        {hasChildren && isExpanded && (node.children ?? []).map(c => renderKey(c, depth + 1))}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 8px', borderBottom: `1px solid ${C.border}`, background: C.bgHdr, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: C.text, fontFamily: 'Tahoma, sans-serif' }}>registry editor</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
          <TBtn title="Refresh" onClick={() => onStatus('Registry refreshed')}>↻</TBtn>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {Object.keys(REG_TREE).filter(k => !k.includes('\\')).map(k => renderKey(k, 0))}
      </div>
      <div style={{ padding: '4px 8px', borderTop: `1px solid ${C.border}`, background: C.bgHdr,
        display: 'flex', gap: 6, flexShrink: 0 }}>
        <button style={btn98} onClick={() => onStatus('Registry exported')}>export key</button>
        <button style={btn98} onClick={() => onStatus('Registry refreshed')}>refresh</button>
      </div>
    </div>
  );
}

function PanelFunManager({ onStatus }: { onStatus: (s: string) => void }) {
  const [msgVal, setMsgVal] = useState('lol owned');

  const fire = (cmd: string) => {
    switch (cmd) {
      case 'flip':
        applyFunEffect(() => { onStatus('[flip] Screen flipped — press any key to restore'); return funEffects.flip(); });
        break;
      case 'swapMouse':
        applyFunEffect(() => { onStatus('[swapMouse] Mouse buttons swapped — press any key to restore'); return funEffects.swapMouse(); });
        break;
      case 'bsod':
        applyFunEffect(() => { onStatus('[bsod] Blue screen sent — press any key to restore'); return funEffects.bsod(); });
        break;
      case 'playwav':
        onStatus('[playwav] Playing audio on victim...');
        funEffects.playwav();
        break;
      case 'hideicons':
        applyFunEffect(() => { onStatus('[hideicons] Desktop icons hidden — press any key to restore'); return funEffects.hideicons(); });
        break;
      case 'wallpaper':
        onStatus('[wallpaper] Wallpaper rotated');
        funEffects.wallpaper();
        break;
      case 'mousemove':
        applyFunEffect(() => { onStatus('[mousemove] Mouse sent to 0,0 — press any key to restore'); return funEffects.mousemove(); });
        break;
      case 'screenres':
        applyFunEffect(() => { onStatus('[screenres] Resolution set to 640×480 — press any key to restore'); return funEffects.screenres(); });
        break;
      case 'shutdown':
        applyFunEffect(() => { onStatus('[shutdown] Fake shutdown initiated — press any key to cancel'); return funEffects.shutdown(); });
        break;
      case 'msgbox':
        applyFunEffect(() => { onStatus(`[msgbox] "${msgVal}" → ${VICTIM.hostname}`); return funEffects.msgbox(msgVal); });
        break;
      case 'earthquake':
        applyFunEffect(() => { onStatus('[earthquake] Shaking screen — press any key to stop'); return funEffects.earthquake(); });
        break;
      case 'invert':
        applyFunEffect(() => { onStatus('[invert] Colors inverted — press any key to restore'); return funEffects.invert(); });
        break;
      case 'disco':
        applyFunEffect(() => { onStatus('[disco] Disco mode activated — press any key to stop'); return funEffects.disco(); });
        break;
      case 'matrix':
        applyFunEffect(() => { onStatus('[matrix] Matrix rain initiated — press any key to stop'); return funEffects.matrix(); });
        break;
      case 'cursorTrail':
        applyFunEffect(() => { onStatus('[cursorTrail] Cursor trail active — press any key to stop'); return funEffects.cursorTrail(); });
        break;
      case 'drunk':
        applyFunEffect(() => { onStatus('[drunk] Drunk mode on — press any key to sober up'); return funEffects.drunk(); });
        break;
      case 'popupStorm':
        applyFunEffect(() => { onStatus('[popupStorm] Pop-up storm unleashed — press any key to clear'); return funEffects.popupStorm(); });
        break;
      case 'vhs':
        applyFunEffect(() => { onStatus('[vhs] VHS glitch active — press any key to restore'); return funEffects.vhs(); });
        break;
      case 'nyan':
        onStatus('[nyan] 🌈🐱 Nyan cat deployed');
        funEffects.nyan();
        break;
      case 'confetti':
        onStatus('[confetti] 🎉 Confetti blast fired');
        funEffects.confetti();
        break;
    }
  };

  return (
    <div style={{ padding: 10, overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 11, color: C.accent, fontFamily: 'Tahoma, sans-serif',
        marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>
        fun manager — {VICTIM.hostname}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12 }}>
        {FUN_ACTIONS.filter(a => a.cmd !== 'msgbox').map(a => (
          <button key={a.cmd} style={{ ...btn98, textAlign: 'left', padding: '4px 8px', fontSize: 11 }}
            onClick={() => fire(a.cmd)}>
            {a.label}
          </button>
        ))}
      </div>
      <div style={{ border: `1px solid ${C.border}`, padding: 8 }}>
        <div style={{ fontSize: 11, color: C.textDim, fontFamily: 'Tahoma, sans-serif', marginBottom: 6 }}>
          custom message box
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <input value={msgVal} onChange={e => setMsgVal(e.target.value)}
            style={{ ...input98, flex: 1 }} />
          <button style={btn98} onClick={() => fire('msgbox')}>
            send
          </button>
        </div>
      </div>
    </div>
  );
}

function PanelSpy({ onStatus }: { onStatus: (s: string) => void }) {
  const [mode, setMode] = useState<'keylog' | 'screen'>('keylog');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6,
        padding: '3px 8px', borderBottom: `1px solid ${C.border}`, background: C.bgHdr, flexShrink: 0 }}>
        <button style={{ ...btn98, background: mode === 'keylog' ? C.selected : C.btnBg,
          color: mode === 'keylog' ? '#fff' : C.btnText }}
          onClick={() => setMode('keylog')}>keylogger</button>
        <button style={{ ...btn98, background: mode === 'screen' ? C.selected : C.btnBg,
          color: mode === 'screen' ? '#fff' : C.btnText }}
          onClick={() => setMode('screen')}>screen capture</button>
        <div style={{ marginLeft: 'auto' }}>
          <button style={btn98} onClick={() => onStatus('Capturing screenshot...')}>capture now</button>
        </div>
      </div>
      {mode === 'keylog' ? (
        <div style={{ flex: 1, overflowY: 'auto', padding: 8,
          fontFamily: '"Courier New", monospace', fontSize: 11, color: '#88aacc', lineHeight: 1.8 }}>
          {KEYLOG_LINES.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      ) : (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', gap: 8 }}>
          <div style={{ fontSize: 11, fontFamily: 'Tahoma, sans-serif', color: C.textDim }}>
            [ LAST CAPTURE — 12:36:02 ]
          </div>
          <div style={{ width: 220, height: 165, background: '#001208', border: `1px solid ${C.border}`,
            position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', padding: 3, gap: 2 }}>
              <div style={{ height: 14, background: '#000080', display: 'flex', alignItems: 'center', padding: '0 4px' }}>
                <span style={{ fontSize: 8, color: 'white', fontFamily: 'sans-serif' }}>My Computer</span>
              </div>
              <div style={{ flex: 1, background: '#c0c0c0', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', padding: 4, gap: 4 }}>
                {['💻','📁','🌐','🗑️','📝','🎵'].map((ic,i) => (
                  <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                    <span style={{ fontSize: 9 }}>{ic}</span>
                    <div style={{ width: 22, height: 2, background: '#000080', opacity: 0.5 }} />
                  </div>
                ))}
              </div>
              <div style={{ height: 9, background: '#c0c0c0', borderTop: '1px solid #808080' }} />
            </div>
          </div>
          <div style={{ fontSize: 11, fontFamily: 'Tahoma, sans-serif', color: C.textDim }}>
            Desktop — 800×600 @ 16-bit color
          </div>
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, padding: '6px 8px',
        borderTop: `1px solid ${C.border}`, background: C.bgHdr, flexShrink: 0 }}>
        <button style={btn98} onClick={() => onStatus('Keylog cleared on victim')}>clear log</button>
        <button style={btn98} onClick={() => onStatus('Keylog saved to: keylog_DESKTOP-W98SE.txt')}>save log</button>
      </div>
    </div>
  );
}

function PanelRemoteShell({ onStatus }: { onStatus: (s: string) => void }) {
  const [msgs, setMsgs] = useState(CHAT_HISTORY);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => { bottomRef.current?.scrollIntoView(); }, [msgs]);

  const send = () => {
    if (!input.trim()) return;
    setMsgs(prev => [...prev, { from: 'You', msg: input.trim() }]);
    setInput('');
    setTimeout(() => {
      setMsgs(prev => [...prev, {
        from: 'Victim',
        msg: ['what do you want','stop it','who are you','leave me alone','how???'][Math.floor(Math.random() * 5)],
      }]);
    }, 800 + Math.random() * 1200);
    onStatus('Message sent');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '3px 8px', borderBottom: `1px solid ${C.border}`,
        background: C.bgHdr, fontSize: 11, color: C.textDim, fontFamily: 'Tahoma, sans-serif', flexShrink: 0 }}>
        chat — {VICTIM.hostname} ({VICTIM.ip})
      </div>
      <div style={{ flex: 1, overflowY: 'auto', padding: 8,
        fontFamily: '"Courier New", monospace', fontSize: 11, lineHeight: 1.7 }}>
        {msgs.map((m, i) => (
          <div key={i}>
            <span style={{ color: C.textDim }}>[{m.from === 'You' ? 'me' : VICTIM.hostname}]</span>
            {' '}
            <span style={{ color: m.from === 'You' ? '#88aaff' : C.text }}>{m.msg}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div style={{ display: 'flex', gap: 6, padding: '6px 8px',
        borderTop: `1px solid ${C.border}`, background: C.bgHdr, flexShrink: 0 }}>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="type a message..."
          style={{ ...input98, flex: 1 }} />
        <button style={btn98} onClick={send}>send</button>
      </div>
    </div>
  );
}

function PanelServerAdmin({ onStatus }: { onStatus: (s: string) => void }) {
  const actions = [
    { label: 'Restart Server',   cmd: 'restart'  },
    { label: 'Remove Server',    cmd: 'remove'   },
    { label: 'Change Password',  cmd: 'chgpass'  },
    { label: 'Change Port',      cmd: 'chgport'  },
    { label: 'Update Server',    cmd: 'update'   },
    { label: 'Disable Firewall', cmd: 'firewall' },
    { label: 'Edit Run Keys',    cmd: 'runkeys'  },
    { label: 'View Startup',     cmd: 'startup'  },
  ];
  return (
    <div style={{ padding: 10, overflowY: 'auto', height: '100%' }}>
      <div style={{ fontSize: 11, color: C.accent, fontFamily: 'Tahoma, sans-serif',
        marginBottom: 8, borderBottom: `1px solid ${C.border}`, paddingBottom: 4 }}>
        server admin — {VICTIM.hostname} ({VICTIM.ip}):27374
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 4, marginBottom: 12 }}>
        {actions.map(a => (
          <button key={a.cmd} style={{ ...btn98, textAlign: 'left', padding: '4px 8px', fontSize: 11 }}
            onClick={() => onStatus(`[${a.cmd}] sent to ${VICTIM.ip}`)}>
            {a.label}
          </button>
        ))}
      </div>
      <div style={{ border: `1px solid ${C.border}`, padding: 8 }}>
        <div style={{ fontSize: 11, color: C.textDim, fontFamily: 'Tahoma, sans-serif', marginBottom: 6 }}>
          server information
        </div>
        {[
          ['Server Ver', `SubSeven ${VICTIM.serverVer}`],
          ['Listening On', `${VICTIM.ip}:27374`],
          ['Installed', 'C:\\Windows\\System\\msrexe.exe'],
          ['Run Key', 'HKLM\\...\\Run → msrexe'],
          ['Password', '••••••••'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'grid', gridTemplateColumns: '110px 1fr', gap: 8,
            padding: '2px 0', fontSize: 11, fontFamily: 'Tahoma, sans-serif' }}>
            <span style={{ color: C.textDim }}>{k}</span>
            <span style={{ color: C.text }}>{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function SubSeven() {
  const [connected, setConnected] = useState(true);
  const [hostInput, setHostInput] = useState(VICTIM.ip);
  const [portInput] = useState('27374');
  const [selected, setSelected] = useState<string>('process-manager');
  const [status, setStatus] = useState(`Session successfully established with remote host.`);

  const onStatus = (s: string) => setStatus(s);

  const toolbar = [
    { title: 'Disconnect', icon: '⚡' },
    { title: 'Ping', icon: '📡' },
    { title: 'Refresh', icon: '↻' },
    { title: 'Kill Process', icon: '✕' },
    { title: 'File Manager', icon: '📁' },
    { title: 'Registry', icon: '🗂' },
    { title: 'Chat', icon: '💬' },
    { title: 'Screen Capture', icon: '📷' },
    { title: 'Keylogger', icon: '⌨' },
    { title: 'Fun Manager', icon: '🎭' },
    { title: 'Server Settings', icon: '⚙' },
    { title: 'Help', icon: '?' },
  ];

  const renderContent = () => {
    switch (selected) {
      case 'process-manager': return <PanelProcessManager onStatus={onStatus} />;
      case 'machine-info':    return <PanelMachineInfo />;
      case 'ping':            return <PanelPing onStatus={onStatus} />;
      case 'fun-manager':     return <PanelFunManager onStatus={onStatus} />;
      case 'spy':             return <PanelSpy onStatus={onStatus} />;
      case 'file-manager':    return <PanelFileManager onStatus={onStatus} />;
      case 'registry':        return <PanelRegistry onStatus={onStatus} />;
      case 'remote-shell':    return <PanelRemoteShell onStatus={onStatus} />;
      case 'server-admin':    return <PanelServerAdmin onStatus={onStatus} />;
      default:
        return (
          <div style={{ flex: 1, position: 'relative', display: 'flex',
            alignItems: 'center', justifyContent: 'center' }}>
            <S7Watermark />
            <span style={{ fontSize: 11, color: C.textDim, fontFamily: 'Tahoma, sans-serif', position: 'relative' }}>
              select an item from the left panel
            </span>
          </div>
        );
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%',
      background: C.bg, fontFamily: 'Tahoma, Arial, sans-serif', color: C.text,
      border: `1px solid ${C.border}` }}>

      {/* ── Connection bar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6,
        padding: '4px 6px', borderBottom: `1px solid ${C.border}`,
        background: C.bgHdr, flexShrink: 0 }}>
        <span style={{ fontSize: 11, color: C.textDim }}>destination:</span>
        <input value={hostInput} onChange={e => setHostInput(e.target.value)}
          style={{ ...input98, width: 110 }} />
        <span style={{ fontSize: 11, color: C.textDim }}>Port :</span>
        <input readOnly value={portInput}
          style={{ ...input98, width: 48 }} />
        <button style={btn98}
          onClick={() => {
            setConnected(c => !c);
            onStatus(connected ? 'Disconnected from remote host.' : `Session established with ${hostInput}.`);
          }}>
          {connected ? 'Disconnect' : 'Connect'}
        </button>
        <button style={{ ...btn98, padding: '2px 5px' }}>...</button>
        <div style={{ flex: 1 }} />
        <S7Logo size={40} />
      </div>

      {/* ── Toolbar ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 1,
        padding: '2px 4px', borderBottom: `1px solid ${C.border}`,
        background: C.bgHdr, flexShrink: 0 }}>
        {toolbar.map((t, i) => (
          <TBtn key={i} title={t.title}>{t.icon}</TBtn>
        ))}
        <div style={{ flex: 1 }} />
        {/* Connection indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, paddingRight: 4 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%',
            background: connected ? '#22ee44' : '#441111',
            boxShadow: connected ? '0 0 5px #22ee44' : 'none' }} />
          <span style={{ fontSize: 10, color: connected ? '#88cc88' : C.textDim }}>
            {connected ? VICTIM.hostname : 'offline'}
          </span>
        </div>
      </div>

      {/* ── Main area: nav + content ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left nav tree */}
        <div style={{ width: 148, flexShrink: 0, borderRight: `1px solid ${C.border}`,
          background: C.bgPanel, overflowY: 'auto', userSelect: 'none' }}>
          {NAV_ITEMS.map(item => {
            const isSel = selected === item.id && !item.isCategory;
            return (
              <div key={item.id}
                onClick={() => !item.isCategory && setSelected(item.id)}
                style={{
                  paddingLeft: item.depth === 0 ? 6 : 18,
                  paddingTop: item.isCategory ? 5 : 2,
                  paddingBottom: item.isCategory ? 2 : 2,
                  paddingRight: 6,
                  background: isSel ? C.selected : 'transparent',
                  cursor: item.isCategory ? 'default' : 'pointer',
                  fontSize: 11,
                  color: item.isCategory ? C.textCat : isSel ? '#fff' : C.textDim,
                  fontWeight: item.isCategory ? 600 : 400,
                }}>
                {item.label}
              </div>
            );
          })}
        </div>

        {/* Content panel */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column',
          background: C.bgPanel, position: 'relative' }}>
          {renderContent()}
        </div>
      </div>

      {/* ── Status bar: 3 sections ── */}
      <div style={{ display: 'flex', borderTop: `1px solid ${C.border}`,
        background: C.statusBg, flexShrink: 0 }}>
        {[
          { text: connected ? 'connected.' : 'ready.', w: 90 },
          { text: `${VICTIM.serverVer}`, w: 80 },
          { text: status, w: undefined },
        ].map((s, i) => (
          <div key={i} style={{
            width: s.w, flex: s.w ? undefined : 1,
            padding: '2px 6px', fontSize: 11, fontFamily: 'Tahoma, sans-serif',
            color: C.textDim,
            borderRight: i < 2 ? `1px solid ${C.border}` : undefined,
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
          }}>{s.text}</div>
        ))}
      </div>
    </div>
  );
}
