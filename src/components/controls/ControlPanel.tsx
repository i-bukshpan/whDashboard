'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Bot, ContactWithLastMessage } from '@/types/database';

interface Props {
  contact: ContactWithLastMessage | null;
  onContactUpdate: (c: ContactWithLastMessage) => void;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'6px 0' }}>
      <span style={{ fontSize:'.8rem', color:'var(--text-3)' }}>{label}</span>
      <span style={{ fontSize:'.78rem', color:'var(--text-2)', fontWeight:500 }}>{value}</span>
    </div>
  );
}

const AV = ['av-1','av-2','av-3','av-4','av-5','av-6'];

export default function ControlPanel({ contact, onContactUpdate }: Props) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [busy, setBusy] = useState(false);
  const supabase = createClient();

  useEffect(() => {
    supabase.from('bots').select('*').order('name').then(({ data }) => setBots(data || []));

    const ch = supabase.channel('control-panel-bots')
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
    onContactUpdate({ ...contact, is_bot_enabled: val });
    setBusy(false);
  }

  async function changeBot(botId: string) {
    if (!contact || busy) return;
    setBusy(true);
    const id = botId === '' ? null : parseInt(botId);
    const bot = bots.find(b => b.id === id) || null;
    await supabase.from('contacts').update({ assigned_bot_id: id, updated_at: new Date().toISOString() }).eq('id', contact.id);
    onContactUpdate({ ...contact, assigned_bot_id: id, assigned_bot: bot });
    setBusy(false);
  }

  const Section = ({ title }: { title: string }) => (
    <p style={{ fontSize:'.68rem', fontWeight:700, color:'var(--text-3)', letterSpacing:'.07em', textTransform:'uppercase', marginBottom:10 }}>
      {title}
    </p>
  );

  const Divider = () => <div style={{ height:1, background:'var(--divider)', margin:'16px 0' }} />;

  if (!contact) {
    return (
      <div className="control-panel" style={{ alignItems:'center', justifyContent:'center', padding:24, textAlign:'center', color:'var(--text-3)' }}>
        <svg style={{ width:36, height:36, opacity:.3, marginBottom:10 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <p style={{ fontSize:'.83rem', fontWeight:600 }}>בחר איש קשר</p>
        <p style={{ fontSize:'.74rem', marginTop:4 }}>כדי לנהל הגדרות</p>
      </div>
    );
  }

  return (
    <div className="control-panel" style={{ overflowY:'auto' }}>
      {/* Header */}
      <div style={{
        height: 60,
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        borderBottom: '1px solid var(--divider)',
        flexShrink: 0,
        background: 'var(--header-bg)',
      }}>
        <p style={{ fontWeight:700, fontSize:'.9rem', color:'var(--text-1)' }}>פרטי איש קשר</p>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {/* Contact identity */}
        <div style={{ textAlign:'center', marginBottom:20 }}>
          <div
            className={`avatar ${AV[contact.id % 6]}`}
            style={{ width:72, height:72, fontSize:'1.6rem', margin:'0 auto 12px' }}
          >
            {contact.name ? contact.name.slice(0,2) : contact.phone_number.slice(-2)}
          </div>
          <p style={{ fontWeight:700, fontSize:'1rem', color:'var(--text-1)' }}>
            {contact.name || 'ללא שם'}
          </p>
          <p style={{ fontSize:'.8rem', color:'var(--text-2)', marginTop:3 }} dir="ltr">
            {contact.phone_number}
          </p>
        </div>

        <Divider />

        {/* Bot / Human status */}
        <Section title="מצב מענה" />

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
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:'1.4rem' }}>{contact.is_bot_enabled ? '🤖' : '👤'}</span>
            <div>
              <p style={{ fontSize:'.84rem', fontWeight:700, color:'var(--text-1)' }}>
                {contact.is_bot_enabled ? 'בוט אוטומטי' : 'מענה אנושי'}
              </p>
              <p style={{ fontSize:'.72rem', color:'var(--text-3)', marginTop:1 }}>
                {contact.is_bot_enabled ? 'הבוט עונה אוטומטית' : 'אתה עונה ידנית'}
              </p>
            </div>
          </div>

          {/* Toggle */}
          <button
            onClick={toggleBot}
            disabled={busy}
            style={{ background:'none', border:'none', cursor:'pointer', padding:0 }}
          >
            <div className={`toggle-wrap`} style={{ pointerEvents:'none' }}>
              <div className={`toggle-track${contact.is_bot_enabled ? ' on' : ''}`}>
                <div className="toggle-thumb" />
              </div>
            </div>
          </button>
        </div>

        {/* Quick mode buttons */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:4 }}>
          {[
            { label:'👤 אנושי', bot:false, color:'#b45309', bg:'rgba(245,158,11,.08)', border:'rgba(245,158,11,.2)' },
            { label:'🤖 בוט',   bot:true,  color:'var(--green-dark)', bg:'rgba(0,168,132,.08)', border:'rgba(0,168,132,.2)' },
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

        <Divider />

        {/* Bot assignment */}
        <Section title="בוט משוייך" />
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
          <p style={{ fontSize:'.75rem', color:'var(--text-2)', lineHeight:1.5, marginTop:6 }}>
            {contact.assigned_bot.description}
          </p>
        )}

        <Divider />

        {/* Meta */}
        <Section title="פרטים נוספים" />
        <div style={{ background:'var(--input-bg)', borderRadius:10, padding:'4px 12px', border:'1.5px solid var(--divider)' }}>
          <Row label="נוצר" value={new Date(contact.created_at).toLocaleDateString('he-IL', { day:'numeric', month:'short', year:'numeric' })} />
          <div style={{ height:1, background:'var(--divider)' }} />
          <Row label="עודכן" value={new Date(contact.updated_at).toLocaleDateString('he-IL', { day:'numeric', month:'short', year:'numeric' })} />
        </div>
      </div>
    </div>
  );
}
