'use client';

import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Message, ContactWithLastMessage, Bot } from '@/types/database';

const AV = ['av-1','av-2','av-3','av-4','av-5','av-6'];
const av = (id: number) => AV[id % 6];

function fmtTime(s: string) {
  return new Date(s).toLocaleTimeString('he-IL', { hour:'2-digit', minute:'2-digit' });
}

function dateSep(s: string): string {
  const d = new Date(s), t = new Date(), y = new Date(t);
  y.setDate(y.getDate() - 1);
  if (d.toDateString() === t.toDateString()) return 'היום';
  if (d.toDateString() === y.toDateString()) return 'אתמול';
  return d.toLocaleDateString('he-IL', { day:'numeric', month:'long', year:'numeric' });
}

function showSep(msgs: Message[], i: number) {
  if (i === 0) return true;
  return new Date(msgs[i].created_at).toDateString() !== new Date(msgs[i-1].created_at).toDateString();
}

interface Props {
  contact: ContactWithLastMessage | null;
  onBack?: () => void;
  onContactUpdate?: (c: ContactWithLastMessage) => void;
}

export default function ChatArea({ contact, onBack, onContactUpdate }: Props) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDrawer, setShowDrawer] = useState(false);
  const [bots, setBots] = useState<Bot[]>([]);
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('bots').select('*').order('name').then(({ data }) => setBots(data || []));

    const ch = supabase.channel('chat-area-bots')
      .on('postgres_changes', { event: '*', schema: 'whatsapp_project', table: 'bots' }, () => {
        supabase.from('bots').select('*').order('name').then(({ data }) => setBots(data || []));
      }).subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  async function toggleBot() {
    if (!contact || busy) return;
    setBusy(true);
    const val = !contact.is_bot_enabled;
    await supabase.from('contacts').update({ is_bot_enabled: val, updated_at: new Date().toISOString() }).eq('id', contact.id);
    onContactUpdate?.({ ...contact, is_bot_enabled: val });
    setBusy(false);
  }

  async function changeBot(botId: string) {
    if (!contact || busy) return;
    setBusy(true);
    const id = botId === '' ? null : parseInt(botId);
    const bot = bots.find(b => b.id === id) || null;
    await supabase.from('contacts').update({ assigned_bot_id: id, updated_at: new Date().toISOString() }).eq('id', contact.id);
    onContactUpdate?.({ ...contact, assigned_bot_id: id, assigned_bot: bot });
    setBusy(false);
  }

  useEffect(() => {
    if (!contact) { setMessages([]); return; }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('contact_id', contact.id)
        .order('created_at', { ascending: true });
      setMessages(data || []);
      setLoading(false);
    })();
  }, [contact?.id]);

  useEffect(() => {
    if (!contact) return;
    const ch = supabase.channel(`chat-${contact.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'whatsapp_project', table: 'messages',
        filter: `contact_id=eq.${contact.id}`,
      }, (p) => {
        const m = p.new as Message;
        setMessages(prev => prev.find(x => x.id === m.id) ? prev : [...prev, m]);
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [contact?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (!contact) {
    return (
      <div className="chat-panel chat-bg-pattern" style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:20 }}>
        <div className="empty-ring">
          <svg style={{ width:72, height:72, color:'var(--green)', opacity:.25 }} fill="currentColor" viewBox="0 0 24 24">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
        </div>
        <div style={{ textAlign:'center' }}>
          <h3 style={{ fontWeight:700, fontSize:'1.1rem', color:'var(--text-1)', marginBottom:6 }}>WhatsApp Dashboard</h3>
          <p style={{ fontSize:'.85rem', color:'var(--text-2)', lineHeight:1.6, maxWidth:280 }}>
            בחר שיחה מרשימת אנשי הקשר כדי להתחיל לצ׳טט
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-panel" style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      {/* Chat Header */}
      <div style={{
        height: 60,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--header-bg)',
        borderBottom: '1px solid var(--divider)',
        flexShrink: 0,
      }}>
        {/* Back button on mobile */}
        {onBack && (
          <button
            onClick={onBack}
            style={{
              display: 'none',
              alignItems: 'center',
              justifyContent: 'center',
              width: 36, height: 36,
              borderRadius: 9,
              background: 'var(--divider)',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-2)',
              flexShrink: 0,
            }}
            className="mobile-back-btn"
          >
            <svg style={{ width:18, height:18 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        )}

        <div
          onClick={() => setShowDrawer(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 12, flex: 1, minWidth: 0, cursor: 'pointer' }}
        >
          <div className={`avatar ${av(contact.id)}`} style={{ width: 40, height: 40, fontSize: '.9rem' }}>
            {contact.name ? contact.name.slice(0, 2) : contact.phone_number.slice(-2)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontWeight: 700, fontSize: '.92rem', color: 'var(--text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {contact.name || contact.phone_number}
            </p>
            <p style={{ fontSize: '.73rem', color: 'var(--text-2)' }} dir="ltr">
              {contact.phone_number}
            </p>
          </div>

          <span className={`status-badge ${contact.is_bot_enabled ? 'bot' : 'human'}`}>
            {contact.is_bot_enabled ? '🤖 בוט' : '👤 אנושי'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="chat-bg-pattern" style={{ flex:1, overflowY:'auto', padding:'12px 8%' }}>
        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:10 }}>
            <div style={{ display:'flex', gap:5 }}>
              <span className="dot" /><span className="dot" /><span className="dot" />
            </div>
            <p style={{ fontSize:'.8rem', color:'var(--text-3)' }}>טוען הודעות...</p>
          </div>
        ) : messages.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', gap:8, color:'var(--text-3)' }}>
            <svg style={{ width:56, height:56, opacity:.2 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p style={{ fontSize:'.85rem', fontWeight:500 }}>אין הודעות עדיין</p>
          </div>
        ) : (
          messages.map((msg, i) => (
            <div key={msg.id}>
              {showSep(messages, i) && (
                <div style={{ display:'flex', justifyContent:'center', margin:'14px 0' }}>
                  <span style={{
                    fontSize:'.72rem',
                    color:'var(--text-2)',
                    background:'rgba(255,255,255,.75)',
                    padding:'4px 12px',
                    borderRadius:8,
                    backdropFilter:'blur(8px)',
                    fontWeight:500,
                    boxShadow:'0 1px 3px rgba(0,0,0,.06)',
                  }}>
                    {dateSep(msg.created_at)}
                  </span>
                </div>
              )}

              <div
                className="anim-up"
                style={{
                  display:'flex',
                  marginBottom: 3,
                  justifyContent: msg.direction === 'outbound' ? 'flex-start' : 'flex-end',
                }}
              >
                <div
                  className={msg.direction === 'inbound' ? 'bubble-in' : 'bubble-out'}
                  style={{ maxWidth:'65%', padding:'8px 10px 6px' }}
                >
                  {msg.media_url && msg.message_type === 'image' && (
                    <img src={msg.media_url} alt="תמונה" style={{ borderRadius:8, maxWidth:'100%', marginBottom:4 }} loading="lazy" />
                  )}
                  {msg.media_url && msg.message_type === 'audio' && (
                    <audio controls src={msg.media_url} style={{ maxWidth:'100%', marginBottom:4 }} />
                  )}
                  {msg.content && (
                    <p style={{ fontSize:'.88rem', color:'var(--text-1)', lineHeight:1.5, whiteSpace:'pre-wrap', wordBreak:'break-word' }}>
                      {msg.content}
                    </p>
                  )}
                  <div style={{
                    display:'flex',
                    alignItems:'center',
                    gap:3,
                    marginTop:3,
                    justifyContent: msg.direction === 'outbound' ? 'flex-start' : 'flex-end',
                  }}>
                    <span style={{ fontSize:'.66rem', color:'var(--text-3)' }}>
                      {fmtTime(msg.created_at)}
                    </span>
                    {msg.direction === 'outbound' && (
                      <svg style={{ width:14, height:14, color:'#53BDEB' }} viewBox="0 0 16 11" fill="currentColor">
                        <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.339.143.43.43 0 0 0-.14.333c0 .132.053.247.16.345l2.304 2.399c.096.096.199.148.293.158a.49.49 0 0 0 .367-.166l6.54-8.064a.45.45 0 0 0 .108-.3.422.422 0 0 0-.072-.312z" />
                        <path d="M14.757.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178l-6.19 7.636-2.011-2.095a.463.463 0 0 0-.336-.153.457.457 0 0 0-.339.143.43.43 0 0 0-.14.333c0 .132.053.247.16.345l2.304 2.399c.096.096.199.148.293.158a.49.49 0 0 0 .367-.166l6.54-8.064a.45.45 0 0 0 .108-.3.422.422 0 0 0-.072-.312z" />
                      </svg>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Mobile Drawer (Bottom Sheet) */}
      {showDrawer && (
        <>
          <div className="bottom-sheet-backdrop" onClick={() => setShowDrawer(false)} />
          <div className="bottom-sheet" dir="rtl">
            {/* Handle bar */}
            <div style={{ width: 40, height: 4, background: 'var(--divider)', borderRadius: 2, margin: '0 auto 12px' }} />

            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid var(--divider)', paddingBottom: 12 }}>
              <p style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-1)' }}>פרטי איש קשר והגדרות</p>
              <button 
                onClick={() => setShowDrawer(false)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-3)' }}
              >
                <svg style={{ width: 24, height: 24 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Profile Info */}
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div
                className={`avatar ${av(contact.id)}`}
                style={{ width: 64, height: 64, fontSize: '1.4rem', margin: '0 auto 10px' }}
              >
                {contact.name ? contact.name.slice(0, 2) : contact.phone_number.slice(-2)}
              </div>
              <h4 style={{ fontWeight: 700, fontSize: '.98rem', color: 'var(--text-1)' }}>
                {contact.name || 'ללא שם'}
              </h4>
              <p style={{ fontSize: '.8rem', color: 'var(--text-2)', marginTop: 2 }} dir="ltr">
                {contact.phone_number}
              </p>
            </div>

            <div style={{ height: 1, background: 'var(--divider)', margin: '16px 0' }} />

            {/* Status toggle */}
            <p style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>
              מצב מענה
            </p>
            
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--input-bg)',
              borderRadius: 12,
              padding: '12px 14px',
              marginBottom: 10,
              border: '1.5px solid var(--divider)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.4rem' }}>{contact.is_bot_enabled ? '🤖' : '👤'}</span>
                <div>
                  <p style={{ fontSize: '.84rem', fontWeight: 700, color: 'var(--text-1)' }}>
                    {contact.is_bot_enabled ? 'בוט אוטומטי' : 'מענה אנושי'}
                  </p>
                  <p style={{ fontSize: '.72rem', color: 'var(--text-3)', marginTop: 1 }}>
                    {contact.is_bot_enabled ? 'הבוט עונה אוטומטית' : 'אתה עונה ידנית'}
                  </p>
                </div>
              </div>

              {/* Toggle Switch */}
              <button
                onClick={toggleBot}
                disabled={busy}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                <div className="toggle-wrap" style={{ pointerEvents: 'none' }}>
                  <div className={`toggle-track${contact.is_bot_enabled ? ' on' : ''}`}>
                    <div className="toggle-thumb" />
                  </div>
                </div>
              </button>
            </div>

            {/* Quick buttons */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 16 }}>
              {[
                { label: '👤 אנושי', bot: false, color: '#b45309', bg: 'rgba(245,158,11,.08)', border: 'rgba(245,158,11,.2)' },
                { label: '🤖 בוט',   bot: true,  color: 'var(--green-dark)', bg: 'rgba(0,168,132,.08)', border: 'rgba(0,168,132,.2)' },
              ].map(({ label, bot, color, bg, border }) => (
                <button
                  key={String(bot)}
                  onClick={() => { if (contact.is_bot_enabled !== bot) toggleBot(); }}
                  style={{
                    padding: '10px 8px',
                    borderRadius: 10,
                    border: `1.5px solid ${contact.is_bot_enabled === bot ? border : 'var(--divider)'}`,
                    background: contact.is_bot_enabled === bot ? bg : 'transparent',
                    color: contact.is_bot_enabled === bot ? color : 'var(--text-3)',
                    fontSize: '.8rem',
                    fontWeight: 600,
                    fontFamily: 'inherit',
                    cursor: 'pointer',
                    transition: 'all .2s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            <div style={{ height: 1, background: 'var(--divider)', margin: '16px 0' }} />

            {/* Bot Assignment */}
            <p style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>
              בוט משוייך
            </p>
            <select
              value={contact.assigned_bot_id || ''}
              onChange={e => changeBot(e.target.value)}
              disabled={busy}
              className="custom-select"
              style={{ marginBottom: contact.assigned_bot?.description ? 8 : 0 }}
            >
              <option value="">ללא בוט</option>
              {bots.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
            {contact.assigned_bot?.description && (
              <p style={{ fontSize: '.75rem', color: 'var(--text-2)', lineHeight: 1.5, marginTop: 6 }}>
                {contact.assigned_bot.description}
              </p>
            )}

            <div style={{ height: 1, background: 'var(--divider)', margin: '16px 0' }} />

            {/* Meta */}
            <p style={{ fontSize: '.68rem', fontWeight: 700, color: 'var(--text-3)', letterSpacing: '.07em', textTransform: 'uppercase', marginBottom: 10 }}>
              פרטים נוספים
            </p>
            <div style={{ background: 'var(--input-bg)', borderRadius: 10, padding: '4px 12px', border: '1.5px solid var(--divider)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <span style={{ fontSize: '.8rem', color: 'var(--text-3)' }}>נוצר</span>
                <span style={{ fontSize: '.78rem', color: 'var(--text-2)', fontWeight: 500 }}>
                  {new Date(contact.created_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
              <div style={{ height: 1, background: 'var(--divider)' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0' }}>
                <span style={{ fontSize: '.8rem', color: 'var(--text-3)' }}>עודכן</span>
                <span style={{ fontSize: '.78rem', color: 'var(--text-2)', fontWeight: 500 }}>
                  {new Date(contact.updated_at).toLocaleDateString('he-IL', { day: 'numeric', month: 'short', year: 'numeric' })}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
