'use client';

import { useState, useRef, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { ContactWithLastMessage } from '@/types/database';

interface Props {
  contact: ContactWithLastMessage | null;
}

export default function MessageInput({ contact }: Props) {
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (contact) inputRef.current?.focus();
  }, [contact?.id]);

  useEffect(() => {
    const el = inputRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
    }
  }, [msg]);

  async function send() {
    if (!contact || !msg.trim() || sending) return;
    const text = msg.trim();
    setSending(true);
    setMsg('');

    const { error } = await supabase.from('messages').insert({
      contact_id: contact.id,
      direction: 'outbound',
      message_type: 'text',
      content: text,
    });

    if (error) {
      console.error(error);
      setMsg(text);
      setSending(false);
      return;
    }

    await supabase.from('contacts').update({ updated_at: new Date().toISOString() }).eq('id', contact.id);

    try {
      await fetch('/api/outbound', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number: contact.phone_number,
          message: text,
          contact_id: contact.id,
          contact_name: contact.name,
          assigned_bot_webhook: contact.assigned_bot?.n8n_webhook_url || null,
        }),
      });
    } catch (e) {
      console.warn('Webhook proxy error:', e);
    }

    setSending(false);
    inputRef.current?.focus();
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); }
  }

  if (!contact) return null;

  return (
    <div style={{
      display: 'flex',
      alignItems: 'flex-end',
      gap: 10,
      padding: '10px 16px',
      background: 'var(--header-bg)',
      borderTop: '1px solid var(--divider)',
      flexShrink: 0,
    }}>
      {/* Emoji / Attach placeholder */}
      <button
        title="צרף קובץ"
        style={{
          width: 40, height: 40,
          borderRadius: 10,
          background: 'transparent',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--text-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'color .15s, background .15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.color = 'var(--green)', e.currentTarget.style.background = 'rgba(0,168,132,.08)')}
        onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-3)', e.currentTarget.style.background = 'transparent')}
      >
        <svg style={{ width:20, height:20 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      </button>

      {/* Input */}
      <div style={{ flex:1, position:'relative' }}>
        <textarea
          ref={inputRef}
          value={msg}
          onChange={e => setMsg(e.target.value)}
          onKeyDown={onKey}
          placeholder="הקלד הודעה..."
          rows={1}
          disabled={sending}
          style={{
            width: '100%',
            resize: 'none',
            background: '#fff',
            border: '1.5px solid var(--divider)',
            borderRadius: 12,
            padding: '10px 14px',
            fontSize: '.9rem',
            color: 'var(--text-1)',
            fontFamily: 'inherit',
            lineHeight: 1.5,
            outline: 'none',
            transition: 'border-color .2s',
            maxHeight: 120,
            overflowY: 'auto',
          }}
          onFocus={e => { e.currentTarget.style.borderColor = 'var(--green)'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,168,132,.08)'; }}
          onBlur={e => { e.currentTarget.style.borderColor = 'var(--divider)'; e.currentTarget.style.boxShadow = 'none'; }}
        />
      </div>

      {/* Send button */}
      <button
        onClick={send}
        disabled={!msg.trim() || sending}
        title="שלח הודעה"
        style={{
          width: 44, height: 44,
          borderRadius: 12,
          background: msg.trim() && !sending ? 'linear-gradient(135deg, var(--green), var(--green-dark))' : 'var(--divider)',
          border: 'none',
          cursor: msg.trim() && !sending ? 'pointer' : 'not-allowed',
          color: msg.trim() && !sending ? '#fff' : 'var(--text-3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          transition: 'background .2s, transform .15s, box-shadow .2s',
          boxShadow: msg.trim() && !sending ? '0 2px 8px rgba(0,168,132,.25)' : 'none',
        }}
        onMouseEnter={e => { if (msg.trim() && !sending) e.currentTarget.style.transform = 'scale(1.06)'; }}
        onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
      >
        {sending ? (
          <svg style={{ width:18, height:18, animation:'spin 1s linear infinite' }} viewBox="0 0 24 24">
            <circle style={{ opacity:.25 }} cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
            <path style={{ opacity:.75 }} fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        ) : (
          <svg style={{ width:19, height:19, transform:'rotate(180deg)' }} viewBox="0 0 24 24" fill="currentColor">
            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
          </svg>
        )}
      </button>
    </div>
  );
}
