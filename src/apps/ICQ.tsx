import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useOSStore } from '../store';

// ── Types ──────────────────────────────────────────────────────────────────────
type IcqStatus = 'online' | 'away' | 'dnd' | 'na' | 'offline';

interface Contact {
  id: string;
  uin: string;
  name: string;
  status: IcqStatus;
  group: string;
  personality: string;
  fallbacks: string[];
}

interface ChatMsg {
  from: 'me' | 'them';
  text: string;
  time: string;
}

interface ChatWin {
  contactId: string;
  messages: ChatMsg[];
  typing: boolean;
  input: string;
  x: number;
  y: number;
}

// ── Status config ──────────────────────────────────────────────────────────────
export const ICQ_STATUS_CONFIG: Record<IcqStatus, { label: string; color: string; petal: string }> = {
  online:  { label: 'Online',            color: '#00aa00', petal: '#00ee00' },
  away:    { label: 'Away',              color: '#bb8800', petal: '#ffcc00' },
  dnd:     { label: 'Do Not Disturb',    color: '#cc2200', petal: '#ff5500' },
  na:      { label: 'Not Available',     color: '#7722aa', petal: '#bb66ff' },
  offline: { label: 'Offline/Invisible', color: '#666666', petal: '#aaaaaa' },
};
const STATUS_ORDER: IcqStatus[] = ['online', 'away', 'dnd', 'na', 'offline'];

// ── Contacts ───────────────────────────────────────────────────────────────────
const CONTACTS: Contact[] = [
  {
    id: 'x1337x',
    uin: '4201337',
    name: 'xX_1337_Xx',
    status: 'online',
    group: 'Friends',
    personality: 'You are a cocky teenage hacker in 1999. You use leet speak (3=e, 0=o, 4=a), brag about hacking, talk about SubSeven, Back Orifice, port scanning, cracking. Very proud of your 56k modem speed. Use lol, rofl, brb, gtg, omg, n00b, hax0r.',
    fallbacks: [
      'lol sup n00b u got subseven installed yet??',
      'dude i just port scanned my whole school network omg',
      'rofl my 56k is running at full speed rn lol',
      'bro i found this sick exploit for iis 4.0',
      'have u tried back orifice?? makes sub7 look weak lmao',
      'omg i got like 50 zombies on my irc bot now',
      'n00bs still using win95 lol',
    ],
  },
  {
    id: 'napsterqueen',
    uin: '7777420',
    name: 'napster_queen',
    status: 'online',
    group: 'Friends',
    personality: 'You are a 16 year old girl in 1999 obsessed with music and the internet. You love Napster, Winamp and its skins, Britney Spears, Backstreet Boys, N*SYNC. Very bubbly and use lots of :) ;) !!! and emoticons. Ask a/s/l a lot.',
    fallbacks: [
      'omg have u heard the new britney song?? its SO good!!',
      'downloading SO many mp3s on napster rn lol',
      'did u see my new winamp skin?? the aqua one is so cute!!',
      'a/s/l?? im 16/f/california :)',
      'backstreet boys > nsync and thats final lol',
      'my parents r gonna kill me i was on dial up for 4 hours',
      'omg i made the best geocities page u have to see it!!',
    ],
  },
  {
    id: 'sk8erboi',
    uin: '2341985',
    name: 'sk8er_boi_2k',
    status: 'away',
    group: 'Friends',
    personality: 'You are a chill skater teen in 1999. You talk about Tony Hawk Pro Skater (just released), Blink-182, skating, being outside. You are laid back, use dude, bro, sick, gnarly, rad. Not super into computers but you have ICQ.',
    fallbacks: [
      'dude tony hawk pro skater is the sickest game ever made',
      'bro just got back from the skatepark what up',
      'blink 182 concert was absolutely gnarly last night dude',
      'sick ollie i landed today finally got it down',
      'bro my deck snapped gonna need a new one lol',
      'sum 41 or blink?? both are rad honestly',
      'dude ive been away all day skating my bad lol',
    ],
  },
  {
    id: 'linuxlord',
    uin: '3141592',
    name: 'LinuxL0rd',
    status: 'online',
    group: 'Tech',
    personality: 'You are a passionate and slightly insufferable Linux evangelist in 1999. You call Windows "Windoze" or "M$ Windoze". You love Red Hat Linux, compiling kernels, Linus Torvalds, open source. You think everyone should switch to Linux immediately.',
    fallbacks: [
      'windoze 98 is such garbage when are u switching to linux',
      'just compiled kernel 2.2.14, runs circles around windoze',
      'red hat 6.1 is the future bro, m$ is dying',
      'lol u still using internet exploder?? use netscape at least',
      'gates is literally stealing from the GPL, open source will win',
      'dude just install linux its not even hard anymore',
      'i wrote a bash script that replaces windows explorer lol',
    ],
  },
  {
    id: 'y2kjenny',
    uin: '9990001',
    name: 'y2k_jenny',
    status: 'online',
    group: 'Family',
    personality: 'You are a friendly woman in her 30s in 1999, new to the internet. You are paranoid and excited about Y2K, love AOL, chain emails, geocities, and think the internet is magical. You are sweet and slightly naive about technology.',
    fallbacks: [
      'honey have u stocked up for y2k?? the banks might fail!!!',
      'just updated my geocities page with a new background :)',
      'i got an email that bill gates pays u $1000 if u fwd it!!',
      'aol has been so slow... i think everyone is online at once',
      'did u know u can ORDER PIZZA on the internet now amazing',
      'forward this to 10 friends for good luck!! it really works!!',
      'my son had to set up this icq thing for me isnt it neat',
    ],
  },
];

const GROUPS = [...new Set(CONTACTS.map(c => c.group))];

// ── Scripted responses ────────────────────────────────────────────────────────
async function getResponse(contact: Contact, _userMsg: string, _history: ChatMsg[]): Promise<string> {
  const pool = contact.fallbacks;
  return pool[Math.floor(Math.random() * pool.length)];
}

// ── Win98 styles ───────────────────────────────────────────────────────────────
const W98_BG     = '#d4d0c8';
const W98_BORDER = { borderTop: '2px solid #ffffff', borderLeft: '2px solid #ffffff', borderRight: '2px solid #808080', borderBottom: '2px solid #808080' };
const W98_INSET  = { borderTop: '2px solid #808080', borderLeft: '2px solid #808080', borderRight: '2px solid #ffffff', borderBottom: '2px solid #ffffff' };
const W98_BTN: React.CSSProperties = {
  background: W98_BG, ...W98_BORDER, padding: '3px 10px',
  fontFamily: 'Tahoma, Arial, sans-serif', fontSize: 11, cursor: 'pointer',
  whiteSpace: 'nowrap' as const,
};
const W98_TITLE: React.CSSProperties = {
  background: 'linear-gradient(to right, #000080, #1084d0)',
  color: '#fff', fontFamily: 'Tahoma, Arial, sans-serif',
  fontSize: 11, fontWeight: 'bold', padding: '2px 6px',
  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
  userSelect: 'none' as const,
};

// ── Status dot ─────────────────────────────────────────────────────────────────
function StatusDot({ status, size = 8 }: { status: IcqStatus; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: ICQ_STATUS_CONFIG[status].petal,
      border: `1px solid ${ICQ_STATUS_CONFIG[status].color}`,
      flexShrink: 0,
      boxShadow: status !== 'offline' ? `0 0 3px ${ICQ_STATUS_CONFIG[status].petal}` : 'none',
    }} />
  );
}

// ── Chat Window (portal) ───────────────────────────────────────────────────────
function ChatWindow({
  win, contact, onClose, onSend, onInputChange,
}: {
  win: ChatWin;
  contact: Contact;
  onClose: () => void;
  onSend: (text: string) => void;
  onInputChange: (text: string) => void;
}) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ sx: number; sy: number; ox: number; oy: number } | null>(null);
  const [pos, setPos] = useState({ x: win.x, y: win.y });

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [win.messages, win.typing]);

  const onTitleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragRef.current = { sx: e.clientX, sy: e.clientY, ox: pos.x, oy: pos.y };
    const move = (me: MouseEvent) => {
      if (!dragRef.current) return;
      setPos({ x: dragRef.current.ox + me.clientX - dragRef.current.sx, y: dragRef.current.oy + me.clientY - dragRef.current.sy });
    };
    const up = () => { dragRef.current = null; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
  };

  const send = () => {
    if (win.input.trim()) onSend(win.input.trim());
  };

  return createPortal(
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, zIndex: 99990,
      width: 380, background: W98_BG, ...W98_BORDER,
      fontFamily: 'Tahoma, Arial, sans-serif', fontSize: 11,
      boxShadow: '4px 4px 8px rgba(0,0,0,0.4)',
    }}>
      {/* Title bar */}
      <div style={W98_TITLE} onMouseDown={onTitleMouseDown}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <StatusDot status={contact.status} size={9} />
          <span>{contact.name} — ICQ Chat</span>
        </div>
        <button onClick={onClose} style={{ ...W98_BTN, padding: '0 4px', lineHeight: '14px', fontSize: 11 }}>✕</button>
      </div>

      {/* Contact info bar */}
      <div style={{ background: '#000080', color: '#fff', padding: '3px 8px', fontSize: 10, display: 'flex', gap: 12 }}>
        <span>{contact.name}</span>
        <span style={{ color: '#aaccff' }}>UIN: {contact.uin}</span>
        <span style={{ marginLeft: 'auto', color: ICQ_STATUS_CONFIG[contact.status].petal }}>
          ● {ICQ_STATUS_CONFIG[contact.status].label}
        </span>
      </div>

      {/* Chat history */}
      <div style={{
        height: 200, overflowY: 'auto', background: '#fff', ...W98_INSET,
        margin: 6, padding: '4px 6px',
      }}>
        {win.messages.length === 0 && (
          <div style={{ color: '#888', fontSize: 10, padding: '8px 0' }}>
            Session started with {contact.name}
          </div>
        )}
        {win.messages.map((m, i) => (
          <div key={i} style={{ marginBottom: 4 }}>
            <span style={{ color: m.from === 'me' ? '#000080' : '#cc0000', fontWeight: 'bold', fontSize: 10 }}>
              {m.from === 'me' ? 'Me' : contact.name}
            </span>
            <span style={{ color: '#888', fontSize: 9, marginLeft: 4 }}>{m.time}</span>
            <br />
            <span style={{ color: '#000', paddingLeft: 4 }}>{m.text}</span>
          </div>
        ))}
        {win.typing && (
          <div style={{ color: '#888', fontSize: 10, fontStyle: 'italic' }}>
            {contact.name} is typing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{ ...W98_INSET, margin: '0 6px 6px', background: '#fff', padding: 4 }}>
        <textarea
          value={win.input}
          onChange={e => onInputChange(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
          style={{
            width: '100%', height: 52, resize: 'none', border: 'none', outline: 'none',
            fontFamily: 'Tahoma, Arial, sans-serif', fontSize: 11, boxSizing: 'border-box',
            background: 'transparent',
          }}
          placeholder="Type a message..."
        />
      </div>

      {/* Buttons */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, padding: '0 6px 6px' }}>
        <button style={W98_BTN} onClick={send}>Send</button>
        <button style={W98_BTN} onClick={onClose}>Close</button>
      </div>
    </div>,
    document.body
  );
}

// ── Main ICQ component ─────────────────────────────────────────────────────────
export default function ICQ() {
  const { icqStatus, setIcqStatus } = useOSStore();
  const [chatWins, setChatWins] = useState<ChatWin[]>([]);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const [showStatus, setShowStatus] = useState(false);
  const myUin = '1337420';

  const openChat = useCallback((contact: Contact) => {
    setChatWins(prev => {
      if (prev.find(w => w.contactId === contact.id)) return prev;
      const offset = prev.length * 24;
      return [...prev, {
        contactId: contact.id,
        messages: [],
        typing: false,
        input: '',
        x: Math.min(200 + offset, window.innerWidth - 400),
        y: Math.min(100 + offset, window.innerHeight - 340),
      }];
    });
  }, []);

  const closeChat = useCallback((contactId: string) => {
    setChatWins(prev => prev.filter(w => w.contactId !== contactId));
  }, []);

  const sendMessage = useCallback(async (contactId: string, text: string) => {
    const contact = CONTACTS.find(c => c.id === contactId);
    if (!contact) return;

    const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    const myMsg: ChatMsg = { from: 'me', text, time };

    // Add my message + set typing
    setChatWins(prev => prev.map(w => w.contactId === contactId
      ? { ...w, messages: [...w.messages, myMsg], input: '', typing: true }
      : w
    ));

    // Get AI/scripted response
    const delay = 800 + Math.random() * 2200;
    const currentHistory = chatWins.find(w => w.contactId === contactId)?.messages ?? [];

    setTimeout(async () => {
      const responseText = await getResponse(contact, text, [...currentHistory, myMsg]);
      const replyTime = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      setChatWins(prev => prev.map(w => w.contactId === contactId
        ? { ...w, typing: false, messages: [...w.messages, { from: 'them', text: responseText, time: replyTime }] }
        : w
      ));
    }, delay);
  }, [chatWins]);

  const updateInput = useCallback((contactId: string, text: string) => {
    setChatWins(prev => prev.map(w => w.contactId === contactId ? { ...w, input: text } : w));
  }, []);

  const toggleGroup = (g: string) => setCollapsedGroups(prev => {
    const s = new Set(prev);
    s.has(g) ? s.delete(g) : s.add(g);
    return s;
  });

  const cfg = ICQ_STATUS_CONFIG[icqStatus];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: W98_BG, fontFamily: 'Tahoma, Arial, sans-serif', fontSize: 11, userSelect: 'none' }}>

      {/* ICQ Header */}
      <div style={{
        background: 'linear-gradient(180deg, #4a9a30 0%, #2d6e18 50%, #1a4a08 100%)',
        padding: '8px 10px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        {/* ICQ Flower logo */}
        <svg width="24" height="24" viewBox="0 0 16 16">
          <g transform="translate(8,8)">
            {[0,45,90,135,180,225,270,315].map((r, i) => (
              <ellipse key={r} cx="0" cy="-3.6" rx="2.0" ry="2.8" fill="black" transform={`rotate(${r})`} />
            ))}
            {[0,45,90,135,180,270,315].map(r => (
              <ellipse key={r} cx="0" cy="-3.6" rx="1.4" ry="2.2" fill={cfg.petal} transform={`rotate(${r})`} />
            ))}
            <ellipse cx="0" cy="-3.6" rx="1.4" ry="2.2" fill="#ee0000" transform="rotate(225)" />
            <circle cx="0" cy="0" r="1.8" fill="black" />
            <circle cx="0" cy="0" r="1.2" fill="#ffcc00" />
          </g>
        </svg>
        <div>
          <div style={{ color: '#ffffff', fontSize: 16, fontWeight: 'bold', letterSpacing: 1, lineHeight: 1 }}>ICQ</div>
          <div style={{ color: '#aaddaa', fontSize: 9 }}>UIN: {myUin}</div>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
          <div
            onClick={() => setShowStatus(s => !s)}
            style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer',
              background: 'rgba(0,0,0,0.3)', borderRadius: 3, padding: '2px 6px' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: cfg.petal }} />
            <span style={{ color: '#fff', fontSize: 10 }}>{cfg.label}</span>
            <span style={{ color: '#aaa', fontSize: 9 }}>▼</span>
          </div>
        </div>
      </div>

      {/* Status dropdown */}
      {showStatus && (
        <div style={{ background: W98_BG, ...W98_BORDER, zIndex: 10 }}>
          {STATUS_ORDER.map(s => (
            <div key={s}
              onClick={() => { setIcqStatus(s); setShowStatus(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '4px 10px', cursor: 'pointer',
                background: icqStatus === s ? '#000080' : 'transparent',
                color: icqStatus === s ? '#fff' : '#000',
              }}
              onMouseEnter={e => { if (icqStatus !== s) (e.currentTarget as HTMLElement).style.background = '#000080'; (e.currentTarget as HTMLElement).style.color = '#fff'; }}
              onMouseLeave={e => { if (icqStatus !== s) { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = '#000'; } }}
            >
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: ICQ_STATUS_CONFIG[s].petal }} />
              <span>{ICQ_STATUS_CONFIG[s].label}</span>
            </div>
          ))}
        </div>
      )}

      {/* Contact list */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#fff', ...W98_INSET, margin: 4 }}>
        {GROUPS.map(group => (
          <div key={group}>
            {/* Group header */}
            <div
              onClick={() => toggleGroup(group)}
              style={{
                background: '#d4d0c8', padding: '2px 6px', cursor: 'pointer',
                fontSize: 10, fontWeight: 'bold', color: '#000',
                display: 'flex', alignItems: 'center', gap: 4,
                borderBottom: '1px solid #808080',
              }}
            >
              <span>{collapsedGroups.has(group) ? '▶' : '▼'}</span>
              <span>{group}</span>
              <span style={{ color: '#888', fontWeight: 'normal', marginLeft: 'auto' }}>
                {CONTACTS.filter(c => c.group === group && c.status !== 'offline').length}/
                {CONTACTS.filter(c => c.group === group).length}
              </span>
            </div>

            {/* Contacts */}
            {!collapsedGroups.has(group) && CONTACTS
              .filter(c => c.group === group)
              .sort((a, b) => (a.status === 'offline' ? 1 : 0) - (b.status === 'offline' ? 1 : 0))
              .map(contact => (
                <div
                  key={contact.id}
                  onDoubleClick={() => openChat(contact)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '3px 8px', cursor: 'pointer',
                    borderBottom: '1px solid #eeeeee',
                    opacity: contact.status === 'offline' ? 0.5 : 1,
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = '#000080'; (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('*').forEach(el => { if (!el.style.borderRadius) el.style.color = '#fff'; }); }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = ''; (e.currentTarget as HTMLElement).querySelectorAll<HTMLElement>('*').forEach(el => { el.style.color = ''; }); }}
                >
                  <StatusDot status={contact.status} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: contact.status !== 'offline' ? 'bold' : 'normal', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {contact.name}
                    </div>
                    {contact.status === 'away' && (
                      <div style={{ fontSize: 9, color: '#888', fontStyle: 'italic' }}>Away</div>
                    )}
                  </div>
                  {chatWins.some(w => w.contactId === contact.id) && (
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#ff4400', flexShrink: 0 }} title="Chat open" />
                  )}
                </div>
              ))
            }
          </div>
        ))}
      </div>

      {/* Bottom toolbar */}
      <div style={{ borderTop: '2px solid #ffffff', padding: '4px 6px', display: 'flex', gap: 3 }}>
        <button style={{ ...W98_BTN, fontSize: 10, padding: '2px 8px' }}
          onClick={() => { const c = CONTACTS.find(c => c.status === 'online'); if (c) openChat(c); }}>
          ICQ Chat
        </button>
      </div>

      {/* Status bar */}
      <div style={{
        background: '#d4d0c8', borderTop: '1px solid #808080', padding: '2px 8px',
        fontSize: 9, display: 'flex', justifyContent: 'space-between', color: '#444',
      }}>
        <span>{CONTACTS.filter(c => c.status !== 'offline').length} online</span>
        <span style={{ color: cfg.color, fontWeight: 'bold' }}>{cfg.label}</span>
        <span>UIN: {myUin}</span>
      </div>

      {/* Chat windows (portals) */}
      {chatWins.map(win => {
        const contact = CONTACTS.find(c => c.id === win.contactId);
        if (!contact) return null;
        return (
          <ChatWindow
            key={win.contactId}
            win={win}
            contact={contact}
            onClose={() => closeChat(win.contactId)}
            onSend={text => sendMessage(win.contactId, text)}
            onInputChange={text => updateInput(win.contactId, text)}
          />
        );
      })}
    </div>
  );
}
