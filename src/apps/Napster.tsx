import { useState, useEffect, useRef, useCallback } from 'react';

// ── IndexedDB persistence ─────────────────────────────────────────────────────
const IDB_NAME = 'napsterLibrary';
const IDB_STORE = 'files';

interface IDBRecord {
  id: string; name: string; size: number; duration: number; buffer: ArrayBuffer;
}

function idbOpen(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(IDB_STORE, { keyPath: 'id' });
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
function idbGetAll(db: IDBDatabase): Promise<IDBRecord[]> {
  return new Promise((resolve, reject) => {
    const req = db.transaction(IDB_STORE, 'readonly').objectStore(IDB_STORE).getAll();
    req.onsuccess = () => resolve(req.result as IDBRecord[]);
    req.onerror = () => reject(req.error);
  });
}
function idbPut(db: IDBDatabase, record: IDBRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    tx.objectStore(IDB_STORE).put(record);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
function idbPatchDuration(db: IDBDatabase, id: string, duration: number): void {
  const tx = db.transaction(IDB_STORE, 'readwrite');
  const store = tx.objectStore(IDB_STORE);
  const req = store.get(id);
  req.onsuccess = () => { if (req.result) { req.result.duration = duration; store.put(req.result); } };
}

// ── Napster Cat Icon ──────────────────────────────────────────────────────────
export function NapsterCatIcon({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="napFace" cx="50%" cy="40%" r="55%">
          <stop offset="0%" stopColor="#f0f0f0" />
          <stop offset="100%" stopColor="#b8b8b8" />
        </radialGradient>
        <radialGradient id="napBg" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#1a1a6e" />
          <stop offset="100%" stopColor="#000033" />
        </radialGradient>
      </defs>
      {/* Dark blue circle background */}
      <circle cx="16" cy="16" r="15.5" fill="url(#napBg)" />
      {/* Cat face */}
      <ellipse cx="16" cy="20" rx="10.5" ry="9.5" fill="url(#napFace)" />
      {/* Left ear */}
      <polygon points="6.5,14 9.5,6.5 13,13.5" fill="#c0c0c0" />
      <polygon points="8,13 10,7.5 12,13" fill="#d898a8" />
      {/* Right ear */}
      <polygon points="25.5,14 22.5,6.5 19,13.5" fill="#c0c0c0" />
      <polygon points="24,13 22,7.5 20,13" fill="#d898a8" />
      {/* Eyes */}
      <ellipse cx="12.2" cy="19" rx="2.4" ry="2.3" fill="#1a1a1a" />
      <ellipse cx="19.8" cy="19" rx="2.4" ry="2.3" fill="#1a1a1a" />
      {/* Eye shine */}
      <circle cx="12.9" cy="18.1" r="0.85" fill="white" />
      <circle cx="20.5" cy="18.1" r="0.85" fill="white" />
      {/* Nose */}
      <polygon points="16,21.2 14.8,22.8 17.2,22.8" fill="#e87090" />
      {/* Mouth */}
      <path d="M14.2,23.2 Q16,24.8 17.8,23.2" stroke="#aaa" strokeWidth="0.65" fill="none" strokeLinecap="round" />
      {/* Whiskers left */}
      <line x1="6.5" y1="21" x2="13" y2="21.8" stroke="#aaa" strokeWidth="0.7" />
      <line x1="6.5" y1="23" x2="13" y2="23" stroke="#aaa" strokeWidth="0.7" />
      {/* Whiskers right */}
      <line x1="19" y1="21.8" x2="25.5" y2="21" stroke="#aaa" strokeWidth="0.7" />
      <line x1="19" y1="23" x2="25.5" y2="23" stroke="#aaa" strokeWidth="0.7" />
      {/* Headphones band */}
      <path d="M6.5,16 Q6,5.5 16,5.5 Q26,5.5 25.5,16" stroke="#1a1a1a" strokeWidth="2.8" fill="none" strokeLinecap="round" />
      {/* Left cup */}
      <rect x="3.5" y="14.5" width="4.2" height="5.5" rx="2.1" fill="#111" />
      <rect x="4.2" y="15.2" width="2.8" height="4" rx="1.4" fill="#333" />
      {/* Right cup */}
      <rect x="24.3" y="14.5" width="4.2" height="5.5" rx="2.1" fill="#111" />
      <rect x="25" y="15.2" width="2.8" height="4" rx="1.4" fill="#333" />
    </svg>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface NapFile {
  id: string;
  name: string;
  url: string;
  size: number; // bytes
  duration: number; // seconds, 0 if unknown
}

interface FakeDownload {
  id: string;
  user: string;
  filename: string;
  progress: number; // 0–100
  speedKbps: number;
  status: 'connecting' | 'downloading' | 'complete' | 'cancelled';
  fileId: string;
}

type NapTab = 'search' | 'library' | 'transfers' | 'hotlist';

// ── Static fake data ──────────────────────────────────────────────────────────
const FAKE_USERS = [
  'xXMetallicaFan99Xx', 'mp3_k1ng_2001', 'NapsterAddict', 'FREE_MUSIC_4EVR',
  'DarkSideOfTheNet', 'warez_dude_lol', 'CoolKid2001', 'dj_shad0w_net',
  'r0ckstar_lyfe', 'DigitalMuzikMan', 'kazaa_refugee', 'winamp_4ever',
  'pr0_hax0r_1337', 'musicpirate99', 'broadband_kid', 'DialUp_Dan_56k',
  'AudioPhile_Rox', 'LimewireNewbie', 'sk8er_boi_mp3', 'TechnoVikingDK',
  'basement_dj', 'floppy_disk_man', 'ICQ_123456789', 'AOL_Buddy_List',
  'YahooMsgr_FTW', 'netscape_user', 'JetAudioFan', 'WinMXmaster',
];

const SEARCH_RESULTS = [
  { artist: 'Metallica', title: 'Enter Sandman', size: '4.21 MB', bitrate: '128 kbps', user: 'metal_head99', ping: '45ms', speed: '56K' },
  { artist: 'Daft Punk', title: 'Around the World', size: '7.14 MB', bitrate: '192 kbps', user: 'techno_freak', ping: '23ms', speed: 'DSL' },
  { artist: 'Radiohead', title: 'Creep', size: '3.84 MB', bitrate: '128 kbps', user: 'alt_rock_4ever', ping: '67ms', speed: '56K' },
  { artist: 'Dr. Dre', title: 'Still D.R.E.', size: '5.52 MB', bitrate: '160 kbps', user: 'hiphop_head_LA', ping: '89ms', speed: 'DSL' },
  { artist: 'Nirvana', title: 'Smells Like Teen Spirit', size: '4.91 MB', bitrate: '128 kbps', user: 'grunge_4ever', ping: '12ms', speed: 'T1' },
  { artist: 'The Prodigy', title: 'Firestarter', size: '5.03 MB', bitrate: '128 kbps', user: 'rave_kid_1999', ping: '34ms', speed: '56K' },
  { artist: 'Eminem', title: 'The Real Slim Shady', size: '3.97 MB', bitrate: '128 kbps', user: 'slim_shady_fan', ping: '55ms', speed: 'Cable' },
  { artist: 'Fatboy Slim', title: 'Praise You', size: '4.66 MB', bitrate: '128 kbps', user: 'fatboyslim_uk', ping: '78ms', speed: '56K' },
  { artist: 'Moby', title: 'Porcelain', size: '4.18 MB', bitrate: '128 kbps', user: 'moby_fan_nyc', ping: '41ms', speed: 'DSL' },
  { artist: 'Aphex Twin', title: 'Come to Daddy', size: '5.77 MB', bitrate: '160 kbps', user: 'drukqs_lover', ping: '29ms', speed: 'T1' },
  { artist: 'Chemical Brothers', title: 'Block Rockin Beats', size: '6.12 MB', bitrate: '192 kbps', user: 'chembroz_fan', ping: '18ms', speed: 'DSL' },
  { artist: 'Massive Attack', title: 'Teardrop', size: '5.49 MB', bitrate: '160 kbps', user: 'bristol_sound', ping: '91ms', speed: '56K' },
];

const HOT_LIST = [
  { rank: 1,  artist: 'Daft Punk',        title: 'One More Time',           downloads: '2,841,234' },
  { rank: 2,  artist: 'Eminem',            title: 'Stan',                    downloads: '2,614,009' },
  { rank: 3,  artist: 'Linkin Park',       title: 'In the End',              downloads: '2,508,771' },
  { rank: 4,  artist: 'Limp Bizkit',       title: 'Rollin',                  downloads: '1,993,450' },
  { rank: 5,  artist: 'Madonna',           title: 'Music',                   downloads: '1,876,200' },
  { rank: 6,  artist: 'Outkast',           title: 'Ms. Jackson',             downloads: '1,721,088' },
  { rank: 7,  artist: 'NSYNC',             title: 'Bye Bye Bye',             downloads: '1,698,442' },
  { rank: 8,  artist: 'Britney Spears',    title: 'Oops I Did It Again',     downloads: '1,654,801' },
  { rank: 9,  artist: 'Jay-Z',             title: 'Big Pimpin',              downloads: '1,544,233' },
  { rank: 10, artist: 'Destiny\'s Child',  title: 'Say My Name',             downloads: '1,499,876' },
  { rank: 11, artist: 'Radiohead',         title: 'Karma Police',            downloads: '1,388,540' },
  { rank: 12, artist: 'Dr. Dre',           title: 'The Next Episode',        downloads: '1,301,002' },
];

function randomUser(): string {
  return FAKE_USERS[Math.floor(Math.random() * FAKE_USERS.length)];
}
function randomSpeed(): number {
  // 2–80 KB/s to simulate dial-up / DSL era
  return 2 + Math.random() * 78;
}
function formatBytes(b: number): string {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / (1024 * 1024)).toFixed(2)} MB`;
}
function formatDuration(s: number): string {
  if (!s) return '--:--';
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

// ── Napster colour palette ────────────────────────────────────────────────────
const N = {
  bg:       '#d4d0c8',   // win98 body
  dark:     '#000066',   // header blue
  header:   '#003399',   // toolbar blue
  row:      '#ffffff',
  rowAlt:   '#f0f0f8',
  rowSel:   '#000080',
  textSel:  '#ffffff',
  border:   '#808080',
  inset:    '#ffffff',
  btnFace:  '#d4d0c8',
  gold:     '#ffcc00',
  dim:      '#666666',
};

// Win98 button style
const btn98: React.CSSProperties = {
  padding: '2px 10px',
  background: N.btnFace,
  border: `1px solid`,
  borderColor: '#ffffff #808080 #808080 #ffffff',
  fontFamily: 'Tahoma, Arial, sans-serif',
  fontSize: 11,
  cursor: 'pointer',
  borderRadius: 0,
  whiteSpace: 'nowrap' as const,
};

const colHdr: React.CSSProperties = {
  background: N.bg,
  border: `1px solid`,
  borderColor: '#ffffff #808080 #808080 #ffffff',
  padding: '1px 6px',
  fontSize: 11,
  fontFamily: 'Tahoma, Arial, sans-serif',
  fontWeight: 'bold',
  textAlign: 'left' as const,
  whiteSpace: 'nowrap' as const,
  userSelect: 'none' as const,
};

// ── Main Component ────────────────────────────────────────────────────────────
export default function Napster() {
  const [tab, setTab] = useState<NapTab>('library');
  const [files, setFiles] = useState<NapFile[]>([]);
  const [downloads, setDownloads] = useState<FakeDownload[]>([]);
  const [selectedFile, setSelectedFile] = useState<NapFile | null>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [playError, setPlayError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState(SEARCH_RESULTS);
  const [selectedRow, setSelectedRow] = useState<number | null>(null);
  const [usersOnline] = useState(() => 1_200_000 + Math.floor(Math.random() * 800_000));
  const [filesShared] = useState(() => 400_000_000 + Math.floor(Math.random() * 100_000_000));

  // Web Audio API refs — bypasses MIME type rejection for video/webm containers
  const napCtxRef = useRef<AudioContext | null>(null);
  const waRef = useRef<{
    buffer: AudioBuffer;
    source: AudioBufferSourceNode | null;
    startCtxTime: number;
    pausedOffset: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dlTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const timePollerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dbRef = useRef<IDBDatabase | null>(null);
  // Track blob URLs we own so we can revoke on unmount
  const blobUrlsRef = useRef<string[]>([]);

  const getCtx = useCallback(() => {
    if (!napCtxRef.current) napCtxRef.current = new AudioContext();
    return napCtxRef.current;
  }, []);

  // ── Fake download simulation ──────────────────────────────────────────────
  const spawnFakeDownload = useCallback((file: NapFile) => {
    const dl: FakeDownload = {
      id: `${Date.now()}_${Math.random()}`,
      user: randomUser(),
      filename: file.name,
      progress: 0,
      speedKbps: randomSpeed(),
      status: 'connecting',
      fileId: file.id,
    };
    setDownloads(prev => [dl, ...prev].slice(0, 20));
    return dl.id;
  }, []);

  // ── Load persisted library from IndexedDB on mount ───────────────────────
  useEffect(() => {
    idbOpen().then(async db => {
      dbRef.current = db;
      const records = await idbGetAll(db);
      if (records.length === 0) return;
      const loaded: NapFile[] = records.map(r => {
        // Recreate blob URL from stored bytes — no MIME type needed (Web Audio decodes it)
        const blob = new Blob([r.buffer]);
        const url = URL.createObjectURL(blob);
        blobUrlsRef.current.push(url);
        return { id: r.id, name: r.name, url, size: r.size, duration: r.duration };
      });
      setFiles(loaded);
    }).catch(err => console.warn('[Napster] IndexedDB load failed:', err));

    return () => {
      // Revoke all blob URLs we created to free memory
      blobUrlsRef.current.forEach(u => URL.revokeObjectURL(u));
      blobUrlsRef.current = [];
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Progress ticker
  useEffect(() => {
    if (dlTimerRef.current) clearInterval(dlTimerRef.current);
    dlTimerRef.current = setInterval(() => {
      setDownloads(prev => prev.map(dl => {
        if (dl.status === 'complete' || dl.status === 'cancelled') return dl;
        if (dl.status === 'connecting') {
          return { ...dl, status: 'downloading' as const };
        }
        const newProgress = dl.progress + (dl.speedKbps * 0.12);
        if (newProgress >= 100) {
          return { ...dl, progress: 100, status: 'complete' as const };
        }
        // Occasional speed fluctuation
        const newSpeed = Math.max(1, dl.speedKbps + (Math.random() - 0.5) * 8);
        return { ...dl, progress: newProgress, speedKbps: newSpeed };
      }));
    }, 500);
    return () => { if (dlTimerRef.current) clearInterval(dlTimerRef.current); };
  }, []);

  // Spawn new fake downloads whenever we have files
  useEffect(() => {
    if (files.length === 0) return;
    const t = setInterval(() => {
      const file = files[Math.floor(Math.random() * files.length)];
      // Only spawn if not too many active
      setDownloads(prev => {
        const active = prev.filter(d => d.status !== 'complete' && d.status !== 'cancelled').length;
        if (active >= 8) return prev;
        const dl: FakeDownload = {
          id: `${Date.now()}_${Math.random()}`,
          user: randomUser(),
          filename: file.name,
          progress: 0,
          speedKbps: randomSpeed(),
          status: 'connecting',
          fileId: file.id,
        };
        return [dl, ...prev].slice(0, 20);
      });
    }, 4000 + Math.random() * 6000);
    return () => clearInterval(t);
  }, [files]);

  // ── File handling ─────────────────────────────────────────────────────────
  const handleFileLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList) return;
    Array.from(fileList).forEach(f => {
      const url = URL.createObjectURL(f);
      blobUrlsRef.current.push(url);
      const id = `${Date.now()}_${Math.random()}`;
      const newFile: NapFile = { id, name: f.name.replace(/\.webm$/i, ''), url, size: f.size, duration: 0 };
      setFiles(prev => [...prev, newFile]);
      spawnFakeDownload(newFile);

      // Persist bytes to IndexedDB so the library survives page refresh
      const reader = new FileReader();
      reader.onload = () => {
        if (!dbRef.current || !(reader.result instanceof ArrayBuffer)) return;
        idbPut(dbRef.current, { id, name: newFile.name, size: f.size, duration: 0, buffer: reader.result })
          .catch(err => console.warn('[Napster] IDB save failed:', err));
      };
      reader.readAsArrayBuffer(f);
    });
    e.target.value = '';
  }, [spawnFakeDownload]);

  // ── Playback (Web Audio API — works with video/webm containers) ──────────
  const stopPoller = useCallback(() => {
    if (timePollerRef.current) { clearInterval(timePollerRef.current); timePollerRef.current = null; }
  }, []);

  const startPoller = useCallback(() => {
    stopPoller();
    timePollerRef.current = setInterval(() => {
      const wa = waRef.current;
      const ctx = napCtxRef.current;
      if (wa && ctx) {
        const t = ctx.currentTime - wa.startCtxTime + wa.pausedOffset;
        setCurrentTime(Math.min(Math.floor(t), Math.round(wa.buffer.duration)));
      }
    }, 250);
  }, [stopPoller]);

  const playFile = useCallback(async (file: NapFile) => {
    stopPoller();

    // Stop current source cleanly
    const prevWa = waRef.current;
    if (prevWa?.source) { try { prevWa.source.stop(); } catch {} prevWa.source = null; }
    waRef.current = null;

    setSelectedFile(file);
    setCurrentTime(0);
    setPlaying(false);
    setPlayError(null);

    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') await ctx.resume();

      const resp = await fetch(file.url);
      const ab = await resp.arrayBuffer();
      const buffer = await ctx.decodeAudioData(ab);

      // Update duration now that we've decoded, and persist it to IndexedDB
      const dur = Math.round(buffer.duration);
      setFiles(prev => prev.map(p => p.id === file.id ? { ...p, duration: dur } : p));
      if (dbRef.current) idbPatchDuration(dbRef.current, file.id, dur);

      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);

      const startCtxTime = ctx.currentTime;
      waRef.current = { buffer, source, startCtxTime, pausedOffset: 0 };

      source.onended = () => {
        if (waRef.current?.source === source) {
          setPlaying(false);
          setCurrentTime(Math.round(buffer.duration));
          stopPoller();
        }
      };

      source.start(0);
      setPlaying(true);
      startPoller();
    } catch (err) {
      console.error('Napster playFile error:', err);
      setPlayError('Could not decode audio — is this a valid audio file?');
      setPlaying(false);
    }
  }, [stopPoller, startPoller, getCtx]);

  const togglePlay = useCallback(async () => {
    const wa = waRef.current;
    const ctx = napCtxRef.current;
    if (!wa || !ctx) return;

    if (playing) {
      const elapsed = ctx.currentTime - wa.startCtxTime + wa.pausedOffset;
      const cappedOffset = Math.min(elapsed, wa.buffer.duration);
      waRef.current = { buffer: wa.buffer, source: null, startCtxTime: 0, pausedOffset: cappedOffset };
      try { wa.source?.stop(); } catch {}
      setPlaying(false);
      stopPoller();
    } else {
      setPlayError(null);
      if (ctx.state === 'suspended') await ctx.resume();

      const source = ctx.createBufferSource();
      source.buffer = wa.buffer;
      source.connect(ctx.destination);

      const offset = wa.pausedOffset;
      const startCtxTime = ctx.currentTime;
      waRef.current = { buffer: wa.buffer, source, startCtxTime, pausedOffset: offset };

      source.onended = () => {
        if (waRef.current?.source === source) {
          setPlaying(false);
          setCurrentTime(Math.round(wa.buffer.duration));
          stopPoller();
        }
      };

      source.start(0, offset);
      setPlaying(true);
      startPoller();
    }
  }, [playing, stopPoller, startPoller]);

  // Clean up on unmount
  useEffect(() => () => {
    stopPoller();
    const wa = waRef.current;
    if (wa?.source) { try { wa.source.stop(); } catch {} }
  }, [stopPoller]);

  // ── Search ────────────────────────────────────────────────────────────────
  const handleSearch = useCallback(() => {
    if (!searchQuery.trim()) { setSearchResults(SEARCH_RESULTS); return; }
    const q = searchQuery.toLowerCase();
    setSearchResults(SEARCH_RESULTS.filter(r =>
      r.artist.toLowerCase().includes(q) || r.title.toLowerCase().includes(q)
    ).concat(
      // Always show some results
      SEARCH_RESULTS.filter(r => !r.artist.toLowerCase().includes(q) && !r.title.toLowerCase().includes(q)).slice(0, 3)
    ));
  }, [searchQuery]);

  const activeUploads = downloads.filter(d => d.status !== 'complete' && d.status !== 'cancelled').length;
  const completedUploads = downloads.filter(d => d.status === 'complete').length;

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden',
      background: N.bg,
      fontFamily: 'Tahoma, Arial, sans-serif',
      fontSize: 11,
    }}>
      {/* ── Dark blue header ── */}
      <div style={{
        background: `linear-gradient(180deg, #0044cc 0%, #002299 40%, #000066 100%)`,
        padding: '4px 8px',
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0,
        borderBottom: '2px solid #000033',
      }}>
        <NapsterCatIcon size={28} />
        <div style={{
          fontFamily: "'Arial Black', Arial, sans-serif",
          fontWeight: 900,
          fontStyle: 'italic',
          fontSize: 20,
          color: N.gold,
          letterSpacing: -0.5,
          textShadow: '1px 1px 2px rgba(0,0,0,0.6)',
          lineHeight: 1,
        }}>
          napster
        </div>
        <div style={{ flex: 1 }} />
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.7)', textAlign: 'right', lineHeight: 1.4 }}>
          <div style={{ color: '#88ff88' }}>● Connected</div>
          <div>{usersOnline.toLocaleString()} users online</div>
        </div>
      </div>

      {/* ── Stats bar ── */}
      <div style={{
        background: '#0033aa',
        padding: '2px 10px',
        display: 'flex', gap: 16, alignItems: 'center',
        fontSize: 9, color: 'rgba(255,255,255,0.8)',
        flexShrink: 0,
      }}>
        <span>📁 {filesShared.toLocaleString()} files shared</span>
        <span>⬆️ {files.length} files in your library</span>
        <span>↕️ {activeUploads} active transfers</span>
        <div style={{ flex: 1 }} />
        <span style={{ color: '#aaccff' }}>Napster v2.0 Beta 9.5</span>
      </div>

      {/* ── Tab bar ── */}
      <div style={{
        display: 'flex',
        background: N.bg,
        borderBottom: `2px solid ${N.border}`,
        flexShrink: 0,
        paddingLeft: 4,
        paddingTop: 3,
        gap: 2,
      }}>
        {([
          { id: 'search',    label: '🔍 Search'   },
          { id: 'library',   label: '📁 Library'  },
          { id: 'transfers', label: `↕️ Transfers${activeUploads > 0 ? ` (${activeUploads})` : ''}` },
          { id: 'hotlist',   label: '🔥 Hot List' },
        ] as { id: NapTab; label: string }[]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              ...btn98,
              borderBottom: tab === t.id ? `2px solid ${N.bg}` : `1px solid ${N.border}`,
              marginBottom: tab === t.id ? -1 : 0,
              background: tab === t.id ? N.bg : '#c8c4bc',
              fontWeight: tab === t.id ? 'bold' : 'normal',
              padding: '3px 12px',
              zIndex: tab === t.id ? 2 : 1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Tab content ── */}
      <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {/* Search Tab */}
        {tab === 'search' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '6px 8px', background: N.bg, borderBottom: `1px solid ${N.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11 }}>Artist / Title:</span>
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSearch()}
                style={{
                  flex: 1, padding: '2px 4px', fontSize: 11,
                  border: '1px solid', borderColor: `${N.border} #ffffff #ffffff ${N.border}`,
                  background: 'white', fontFamily: 'Tahoma, Arial, sans-serif',
                }}
                placeholder='e.g. "Daft Punk" or "Around the World"'
              />
              <button style={btn98} onClick={handleSearch}>Search</button>
              <button style={btn98} onClick={() => { setSearchQuery(''); setSearchResults(SEARCH_RESULTS); }}>Clear</button>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '22%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '5%' }} />
                  <col style={{ width: '5%' }} />
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    {['Artist', 'Title', 'Size', 'Bitrate', 'User', 'Ping', 'Speed'].map(h => (
                      <th key={h} style={colHdr}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {searchResults.map((r, i) => (
                    <tr
                      key={i}
                      onClick={() => setSelectedRow(i)}
                      onDoubleClick={() => setSelectedRow(i)}
                      style={{
                        background: selectedRow === i ? N.rowSel : (i % 2 === 0 ? N.row : N.rowAlt),
                        color: selectedRow === i ? N.textSel : '#000',
                        cursor: 'default',
                      }}
                    >
                      <td style={{ padding: '1px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, borderRight: `1px solid #e0e0e0` }}>{r.artist}</td>
                      <td style={{ padding: '1px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, borderRight: `1px solid #e0e0e0` }}>{r.title}</td>
                      <td style={{ padding: '1px 6px', fontSize: 11, borderRight: `1px solid #e0e0e0` }}>{r.size}</td>
                      <td style={{ padding: '1px 6px', fontSize: 11, borderRight: `1px solid #e0e0e0` }}>{r.bitrate}</td>
                      <td style={{ padding: '1px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, borderRight: `1px solid #e0e0e0`, color: selectedRow === i ? N.textSel : '#0000aa' }}>{r.user}</td>
                      <td style={{ padding: '1px 6px', fontSize: 11, borderRight: `1px solid #e0e0e0` }}>{r.ping}</td>
                      <td style={{ padding: '1px 6px', fontSize: 11 }}>{r.speed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '3px 8px', background: N.bg, borderTop: `1px solid ${N.border}`, fontSize: 10, color: N.dim }}>
              {searchResults.length} files found • Double-click to download
            </div>
          </div>
        )}

        {/* Library Tab */}
        {tab === 'library' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '6px 8px', background: N.bg, borderBottom: `1px solid ${N.border}`, display: 'flex', gap: 6, alignItems: 'center' }}>
              <input ref={fileInputRef} type="file" accept=".webm,audio/*" multiple style={{ display: 'none' }} onChange={handleFileLoad} />
              <button style={btn98} onClick={() => fileInputRef.current?.click()}>
                📂 Add Files...
              </button>
              <span style={{ fontSize: 10, color: N.dim }}>Load .webm recordings from Tape Deck to share them</span>
              <div style={{ flex: 1 }} />
              {selectedFile && (
                <span style={{ fontSize: 10, color: '#000080' }}>
                  Selected: <strong>{selectedFile.name}</strong>
                </span>
              )}
            </div>

            {files.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 10, color: N.dim }}>
                <NapsterCatIcon size={48} />
                <div style={{ fontSize: 13, fontWeight: 'bold' }}>Your library is empty</div>
                <div style={{ fontSize: 11 }}>Click "Add Files..." to load .webm recordings from Tape Deck</div>
                <button style={{ ...btn98, padding: '4px 16px', fontSize: 12 }} onClick={() => fileInputRef.current?.click()}>
                  📂 Add Files...
                </button>
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '38%' }} />
                    <col style={{ width: '14%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '12%' }} />
                    <col style={{ width: '24%' }} />
                  </colgroup>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      {['Name', 'Size', 'Duration', 'Format', 'Status'].map(h => (
                        <th key={h} style={colHdr}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {files.map((f, i) => {
                      const isSelected = selectedFile?.id === f.id;
                      const dlsForFile = downloads.filter(d => d.fileId === f.id && d.status !== 'cancelled');
                      const activeForFile = dlsForFile.filter(d => d.status !== 'complete').length;
                      const completedForFile = dlsForFile.filter(d => d.status === 'complete').length;
                      return (
                        <tr
                          key={f.id}
                          onClick={() => { setSelectedFile(f); }}
                          onDoubleClick={() => playFile(f)}
                          style={{
                            background: isSelected ? N.rowSel : (i % 2 === 0 ? N.row : N.rowAlt),
                            color: isSelected ? N.textSel : '#000',
                            cursor: 'default',
                          }}
                        >
                          <td style={{ padding: '1px 6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 11, borderRight: `1px solid #e0e0e0` }}>
                            🎵 {f.name}
                          </td>
                          <td style={{ padding: '1px 6px', fontSize: 11, borderRight: `1px solid #e0e0e0` }}>{formatBytes(f.size)}</td>
                          <td style={{ padding: '1px 6px', fontSize: 11, borderRight: `1px solid #e0e0e0` }}>{formatDuration(f.duration)}</td>
                          <td style={{ padding: '1px 6px', fontSize: 11, borderRight: `1px solid #e0e0e0`, color: isSelected ? N.textSel : '#666' }}>WebM</td>
                          <td style={{ padding: '1px 6px', fontSize: 10 }}>
                            {activeForFile > 0 ? (
                              <span style={{ color: isSelected ? '#88ff88' : '#006600' }}>
                                ↑ {activeForFile} uploading, {completedForFile} done
                              </span>
                            ) : completedForFile > 0 ? (
                              <span style={{ color: isSelected ? '#aaccff' : '#000088' }}>
                                ✓ {completedForFile} sent
                              </span>
                            ) : (
                              <span style={{ color: isSelected ? '#aaaaaa' : N.dim }}>Shared</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            <div style={{ padding: '3px 8px', background: N.bg, borderTop: `1px solid ${N.border}`, fontSize: 10, color: N.dim }}>
              {files.length} file{files.length !== 1 ? 's' : ''} in library • Double-click to play
            </div>
          </div>
        )}

        {/* Transfers Tab */}
        {tab === 'transfers' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '4px 8px', background: N.bg, borderBottom: `1px solid ${N.border}`, display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{ fontWeight: 'bold', fontSize: 11 }}>Uploads (people downloading from you)</span>
              <div style={{ flex: 1 }} />
              <button style={btn98} onClick={() => setDownloads(prev => prev.filter(d => d.status !== 'complete'))}>
                Clear Completed
              </button>
            </div>
            {downloads.length === 0 ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: N.dim, flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 24 }}>↕️</div>
                <div>No active transfers. Add files to your library to start sharing.</div>
              </div>
            ) : (
              <div style={{ flex: 1, overflow: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '20%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '30%' }} />
                    <col style={{ width: '10%' }} />
                    <col style={{ width: '10%' }} />
                  </colgroup>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                    <tr>
                      {['User', 'File', 'Progress', 'Speed', 'Status'].map(h => (
                        <th key={h} style={colHdr}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {downloads.map((dl, i) => (
                      <tr
                        key={dl.id}
                        style={{ background: i % 2 === 0 ? N.row : N.rowAlt, cursor: 'default' }}
                      >
                        <td style={{ padding: '2px 6px', fontSize: 11, borderRight: `1px solid #e0e0e0`, color: '#0000aa', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {dl.user}
                        </td>
                        <td style={{ padding: '2px 6px', fontSize: 11, borderRight: `1px solid #e0e0e0`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          🎵 {dl.filename}
                        </td>
                        <td style={{ padding: '2px 6px', borderRight: `1px solid #e0e0e0` }}>
                          {dl.status === 'connecting' ? (
                            <span style={{ fontSize: 10, color: N.dim }}>Connecting...</span>
                          ) : dl.status === 'complete' ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ flex: 1, height: 10, background: '#e0e0e0', border: `1px inset ${N.border}` }}>
                                <div style={{ width: '100%', height: '100%', background: '#006600' }} />
                              </div>
                              <span style={{ fontSize: 10, color: '#006600', minWidth: 28 }}>100%</span>
                            </div>
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              <div style={{ flex: 1, height: 10, background: '#e0e0e0', border: `1px inset ${N.border}`, position: 'relative' }}>
                                <div style={{
                                  width: `${dl.progress}%`, height: '100%',
                                  background: 'linear-gradient(90deg, #0044cc, #0088ff)',
                                  transition: 'width 0.4s linear',
                                }} />
                              </div>
                              <span style={{ fontSize: 10, color: '#000080', minWidth: 28 }}>{Math.floor(dl.progress)}%</span>
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '2px 6px', fontSize: 10, borderRight: `1px solid #e0e0e0`, textAlign: 'right', whiteSpace: 'nowrap' }}>
                          {dl.status === 'complete' ? '—' : dl.status === 'connecting' ? '—' : `${dl.speedKbps.toFixed(1)} KB/s`}
                        </td>
                        <td style={{ padding: '2px 6px', fontSize: 10, whiteSpace: 'nowrap' }}>
                          {dl.status === 'connecting' && <span style={{ color: N.dim }}>⌛ Wait</span>}
                          {dl.status === 'downloading' && <span style={{ color: '#0000cc' }}>⬆️ Up</span>}
                          {dl.status === 'complete' && <span style={{ color: '#006600' }}>✓ Done</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ padding: '3px 8px', background: N.bg, borderTop: `1px solid ${N.border}`, fontSize: 10, color: N.dim }}>
              {activeUploads} active · {completedUploads} completed
            </div>
          </div>
        )}

        {/* Hot List Tab */}
        {tab === 'hotlist' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <div style={{ padding: '4px 8px', background: N.bg, borderBottom: `1px solid ${N.border}`, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 'bold' }}>🔥 Most Downloaded Today</span>
              <div style={{ flex: 1 }} />
              <span style={{ fontSize: 10, color: N.dim }}>Updated hourly</span>
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '6%' }} />
                  <col style={{ width: '28%' }} />
                  <col style={{ width: '34%' }} />
                  <col style={{ width: '32%' }} />
                </colgroup>
                <thead style={{ position: 'sticky', top: 0, zIndex: 1 }}>
                  <tr>
                    {['#', 'Artist', 'Title', 'Downloads'].map(h => (
                      <th key={h} style={colHdr}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {HOT_LIST.map((r, i) => (
                    <tr
                      key={r.rank}
                      onClick={() => setSelectedRow(100 + i)}
                      style={{
                        background: selectedRow === 100 + i ? N.rowSel : (i % 2 === 0 ? N.row : N.rowAlt),
                        color: selectedRow === 100 + i ? N.textSel : '#000',
                        cursor: 'default',
                      }}
                    >
                      <td style={{ padding: '2px 6px', fontSize: 11, fontWeight: 'bold', textAlign: 'center', borderRight: `1px solid #e0e0e0`, color: selectedRow === 100 + i ? '#ffdd44' : (r.rank <= 3 ? '#cc8800' : 'inherit') }}>
                        {r.rank}
                      </td>
                      <td style={{ padding: '2px 6px', fontSize: 11, borderRight: `1px solid #e0e0e0`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.artist}</td>
                      <td style={{ padding: '2px 6px', fontSize: 11, borderRight: `1px solid #e0e0e0`, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.title}</td>
                      <td style={{ padding: '2px 6px', fontSize: 11, color: selectedRow === 100 + i ? N.textSel : '#0000aa' }}>{r.downloads}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: '3px 8px', background: N.bg, borderTop: `1px solid ${N.border}`, fontSize: 10, color: N.dim }}>
              Top {HOT_LIST.length} most downloaded files on Napster today
            </div>
          </div>
        )}
      </div>

      {/* ── Now Playing bar ── */}
      <div style={{
        background: `linear-gradient(180deg, #002299 0%, #000066 100%)`,
        borderTop: '2px solid #000033',
        padding: '4px 10px',
        display: 'flex', alignItems: 'center', gap: 8,
        flexShrink: 0,
        minHeight: 38,
      }}>
        <button
          onClick={togglePlay}
          disabled={!selectedFile}
          style={{
            ...btn98,
            background: 'linear-gradient(180deg, #334488 0%, #001166 100%)',
            color: selectedFile ? '#ffffff' : '#6688aa',
            borderColor: '#4466aa #000033 #000033 #4466aa',
            padding: '2px 10px',
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          {playing ? '⏸' : '▶'}
        </button>
        <button
          onClick={() => {
          stopPoller();
          const wa = waRef.current;
          if (wa?.source) { try { wa.source.stop(); } catch {} }
          if (wa) waRef.current = { ...wa, source: null, pausedOffset: 0 };
          setPlaying(false);
          setCurrentTime(0);
        }}
          disabled={!selectedFile}
          style={{
            ...btn98,
            background: 'linear-gradient(180deg, #334488 0%, #001166 100%)',
            color: selectedFile ? '#ffffff' : '#6688aa',
            borderColor: '#4466aa #000033 #000033 #4466aa',
            padding: '2px 8px',
            fontSize: 12,
            lineHeight: 1,
          }}
        >
          ■
        </button>

        {/* Track info + progress */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 3 }}>
          {selectedFile ? (
            <>
              <div style={{ fontSize: 11, color: playError ? '#ff8888' : '#ffffff', fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {playError ? `⚠️ ${playError}` : `🎵 ${selectedFile.name}`}
              </div>
              {/* Progress bar — always show when file selected */}
              <div
                style={{ width: '100%', height: 6, background: '#001144', border: '1px solid #2244aa', cursor: 'pointer', flexShrink: 0, borderRadius: 1 }}
                onClick={e => {
                  const wa = waRef.current;
                  const ctx = napCtxRef.current;
                  if (!wa || !ctx) return;
                  const dur = wa.buffer.duration;
                  const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                  const newTime = ((e.clientX - rect.left) / rect.width) * dur;
                  if (wa.source) { try { wa.source.stop(); } catch {} }
                  if (playing) {
                    const source = ctx.createBufferSource();
                    source.buffer = wa.buffer;
                    source.connect(ctx.destination);
                    const startCtxTime = ctx.currentTime;
                    waRef.current = { buffer: wa.buffer, source, startCtxTime, pausedOffset: newTime };
                    source.onended = () => {
                      if (waRef.current?.source === source) { setPlaying(false); stopPoller(); }
                    };
                    source.start(0, newTime);
                  } else {
                    waRef.current = { ...wa, source: null, pausedOffset: newTime };
                  }
                  setCurrentTime(Math.floor(newTime));
                }}
              >
                {(() => {
                  const dur = waRef.current?.buffer.duration;
                  const pct = dur ? (currentTime / dur) * 100 : 0;
                  return (
                    <div style={{
                      width: `${pct}%`, height: '100%',
                      background: 'linear-gradient(90deg, #4488ff, #88bbff)',
                      transition: 'width 0.5s linear', borderRadius: 1,
                    }} />
                  );
                })()}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 11, color: '#4466aa', fontStyle: 'italic' }}>
              No track selected — double-click a file in Library to play
            </div>
          )}
        </div>

        {/* Digital time counter */}
        <div style={{
          background: '#000022',
          border: '1px solid #2244aa',
          borderRadius: 2,
          padding: '2px 8px',
          flexShrink: 0,
          textAlign: 'center',
          minWidth: 90,
        }}>
          <div style={{
            fontFamily: "'VT323', 'Courier New', monospace",
            fontSize: 22,
            color: selectedFile ? '#44aaff' : '#112244',
            textShadow: selectedFile ? '0 0 8px #4488ff88' : 'none',
            lineHeight: 1,
            letterSpacing: 2,
          }}>
            {selectedFile ? formatDuration(currentTime) : '--:--'}
          </div>
          {selectedFile && (() => {
            const knownDur = waRef.current?.buffer ? Math.round(waRef.current.buffer.duration) : selectedFile.duration;
            return (
              <div style={{ fontSize: 8, color: '#2255aa', letterSpacing: 1, marginTop: 1 }}>
                {knownDur > 0 ? `/ ${formatDuration(knownDur)}` : 'LIVE'}
              </div>
            );
          })()}</div>

        <NapsterCatIcon size={24} />
      </div>
    </div>
  );
}
