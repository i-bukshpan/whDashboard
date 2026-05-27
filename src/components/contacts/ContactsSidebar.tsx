'use client';

import { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ContactWithLastMessage } from '@/types/database';
import ManageBotsModal from '@/components/bots/ManageBotsModal';

const AV_CLASSES = ['av-1','av-2','av-3','av-4','av-5','av-6'];
const av = (id: number) => AV_CLASSES[id % 6];

function initials(name: string | null, phone: string): string {
  if (name) {
    const p = name.trim().split(/\s+/);
    return p.length >= 2 ? p[0][0] + p[1][0] : name.slice(0, 2);
  }
  return phone.slice(-2);
}

function fmtTime(s: string | null | undefined): string {
  if (!s) return '';
  const d = new Date(s), now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days === 0) return d.toLocaleTimeString('he-IL', { hour:'2-digit', minute:'2-digit' });
  if (days === 1) return 'אתמול';
  if (days < 7)  return d.toLocaleDateString('he-IL', { weekday:'long' });
  return d.toLocaleDateString('he-IL', { day:'2-digit', month:'2-digit', year:'2-digit' });
}

interface Props {
  selectedContactId: number | null;
  onSelectContact: (c: ContactWithLastMessage) => void;
}

export default function ContactsSidebar({ selectedContactId, onSelectContact }: Props) {
  const [contacts, setContacts] = useState<ContactWithLastMessage[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showBotsModal, setShowBotsModal] = useState(false);
  const supabase = createClient();

  const fetchContacts = async (active: boolean) => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const { data, error } = await supabase
        .from('contacts')
        .select('*, bots(*)')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching contacts:', error.message, error.details, error.hint);
        if (active) {
          setErrorMsg(error.message || 'שגיאה בטעינת אנשי קשר');
          setLoading(false);
        }
        return;
      }

      const list: ContactWithLastMessage[] = await Promise.all(
        (data || []).map(async (c) => {
          try {
            const { data: msgs } = await supabase
              .from('messages')
              .select('content, created_at, direction')
              .eq('contact_id', c.id)
              .order('created_at', { ascending: false })
              .limit(1);
            const m = msgs?.[0];
            return {
              ...c,
              assigned_bot: c.bots || null,
              last_message: m?.content ?? null,
              last_message_time: m?.created_at ?? null,
              last_message_direction: m?.direction ?? null,
            } as ContactWithLastMessage;
          } catch (err: any) {
            console.error('Error fetching last msg for contact', c.id, err);
            return {
              ...c,
              assigned_bot: c.bots || null,
              last_message: null,
              last_message_time: null,
              last_message_direction: null,
            } as ContactWithLastMessage;
          }
        })
      );

      if (active) {
        setContacts(list);
        setLoading(false);
      }
    } catch (err: any) {
      console.error('Unhandled error in ContactsSidebar:', err);
      if (active) {
        setErrorMsg(err.message || 'שגיאת מערכת לא צפויה');
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    let active = true;
    fetchContacts(active);
    return () => { active = false; };
  }, []);

  // Realtime – contacts
  useEffect(() => {
    const ch = supabase.channel('sidebar-contacts')
      .on('postgres_changes', { event: '*', schema: 'whatsapp_project', table: 'contacts' }, (p) => {
        if (p.eventType === 'INSERT') setContacts(prev => [{ ...(p.new as ContactWithLastMessage), last_message: null, last_message_time: null }, ...prev]);
        if (p.eventType === 'UPDATE') setContacts(prev => prev.map(c => c.id === (p.new as ContactWithLastMessage).id ? { ...c, ...p.new } : c));
        if (p.eventType === 'DELETE') setContacts(prev => prev.filter(c => c.id !== (p.old as ContactWithLastMessage).id));
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  // Realtime – messages (update last message preview)
  useEffect(() => {
    const ch = supabase.channel('sidebar-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'whatsapp_project', table: 'messages' }, (p) => {
        const m = p.new as { contact_id: number; content: string; created_at: string; direction: string };
        setContacts(prev => prev
          .map(c => c.id === m.contact_id
            ? { ...c, last_message: m.content, last_message_time: m.created_at, last_message_direction: m.direction as 'inbound'|'outbound' }
            : c
          )
          .sort((a, b) => new Date(b.last_message_time ?? 0).getTime() - new Date(a.last_message_time ?? 0).getTime())
        );
      }).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return contacts;
    const q = query.toLowerCase();
    return contacts.filter(c => (c.name?.toLowerCase().includes(q)) || c.phone_number.includes(q));
  }, [contacts, query]);

  return (
    <div className="sidebar">
      {/* Header */}
      <div style={{
        height: 60,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--divider)',
        flexShrink: 0,
        background: 'var(--header-bg)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ fontWeight: 700, fontSize: '1rem', color: 'var(--text-1)' }}>שיחות</h2>
          <span style={{
            fontSize: '.72rem',
            color: 'var(--text-2)',
            background: 'var(--divider)',
            padding: '3px 10px',
            borderRadius: 99,
            fontWeight: 600,
          }}>
            {contacts.length}
          </span>
        </div>

        <button
          onClick={() => setShowBotsModal(true)}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '.82rem',
            fontWeight: 600,
            color: 'var(--green-dark)',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            padding: '6px 10px',
            borderRadius: 8,
            transition: 'all 0.2s',
          }}
          className="btn-bots-manage"
        >
          <span>🤖 ניהול בוטים</span>
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '10px 12px', flexShrink: 0, background: 'var(--header-bg)' }}>
        <div style={{ position: 'relative' }}>
          <svg style={{ position:'absolute', right:11, top:'50%', transform:'translateY(-50%)', width:15, height:15, color:'var(--text-3)', pointerEvents:'none' }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="חיפוש שיחה..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{
              width: '100%',
              background: '#fff',
              border: '1.5px solid var(--divider)',
              borderRadius: 10,
              padding: '8px 36px 8px 12px',
              fontSize: '.84rem',
              color: 'var(--text-1)',
              outline: 'none',
              fontFamily: 'inherit',
            }}
          />
        </div>
      </div>

      {/* List */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {errorMsg ? (
          <div style={{ padding: 20, textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 10, alignItems: 'center' }}>
            <p style={{ fontSize: '.84rem', color: '#b91c1c', fontWeight: 500 }}>{errorMsg}</p>
            <button
              onClick={() => fetchContacts(true)}
              style={{
                padding: '6px 12px',
                borderRadius: 8,
                background: 'var(--green)',
                color: '#fff',
                border: 'none',
                fontSize: '.78rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              נסה שוב
            </button>
          </div>
        ) : loading ? (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ display:'flex', gap:12, alignItems:'center' }}>
                <div style={{ width:48, height:48, borderRadius:'50%', background:'var(--divider)', flexShrink:0, animation:'pulse 1.5s ease-in-out infinite' }} />
                <div style={{ flex:1, display:'flex', flexDirection:'column', gap:8 }}>
                  <div style={{ height:13, borderRadius:6, background:'var(--divider)', width:'70%' }} />
                  <div style={{ height:11, borderRadius:6, background:'var(--divider)', width:'50%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', padding:32, gap:10, color:'var(--text-3)' }}>
            <svg style={{ width:44, height:44, opacity:.3 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p style={{ fontSize:'.85rem', fontWeight:500 }}>{query ? 'לא נמצאו תוצאות' : 'אין אנשי קשר'}</p>
          </div>
        ) : (
          filtered.map(c => (
            <div
              key={c.id}
              onClick={() => onSelectContact(c)}
              className={`contact-row${selectedContactId === c.id ? ' active' : ''}`}
            >
              {/* Avatar */}
              <div className={`avatar ${av(c.id)}`} style={{ width:48, height:48, fontSize:'1rem' }}>
                {initials(c.name, c.phone_number)}
              </div>

              {/* Text */}
              <div style={{ flex:1, minWidth:0, display:'flex', flexDirection:'column', gap:3 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                  <span className="truncate-1" style={{ fontWeight:600, fontSize:'.9rem', color:'var(--text-1)' }}>
                    {c.name || c.phone_number}
                  </span>
                  <span style={{ fontSize:'.68rem', color:'var(--text-3)', flexShrink:0 }}>
                    {fmtTime(c.last_message_time)}
                  </span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:6 }}>
                  <span className="truncate-1" style={{ fontSize:'.78rem', color:'var(--text-2)' }}>
                    {c.last_message_direction === 'outbound' && <span style={{ color:'var(--green)', marginLeft:2 }}>✓✓ </span>}
                    {c.last_message || <span style={{ fontStyle:'italic', color:'var(--text-3)' }}>אין הודעות</span>}
                  </span>
                  <span className={`status-badge ${c.is_bot_enabled ? 'bot' : 'human'}`}>
                    {c.is_bot_enabled ? '🤖' : '👤'}
                    {c.is_bot_enabled ? ' בוט' : ' אנושי'}
                  </span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <ManageBotsModal
        isOpen={showBotsModal}
        onClose={() => setShowBotsModal(false)}
      />
    </div>
  );
}
