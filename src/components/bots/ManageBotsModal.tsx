'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { Bot } from '@/types/database';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function ManageBotsModal({ isOpen, onClose }: Props) {
  const [bots, setBots] = useState<Bot[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingBot, setEditingBot] = useState<Partial<Bot> | null>(null); // null means list view, non-null means form view (add/edit)
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      fetchBots();
    }
  }, [isOpen]);

  async function fetchBots() {
    setLoading(true);
    const { data, error } = await supabase
      .from('bots')
      .select('*')
      .order('name');
    if (data) setBots(data);
    setLoading(false);
  }

  function handleStartAdd() {
    setError(null);
    setEditingBot({});
    setName('');
    setDescription('');
    setWebhookUrl('');
  }

  function handleStartEdit(bot: Bot) {
    setError(null);
    setEditingBot(bot);
    setName(bot.name);
    setDescription(bot.description || '');
    setWebhookUrl(bot.n8n_webhook_url || '');
  }

  async function handleSave() {
    if (!name.trim()) {
      setError('נא להזין שם בוט');
      return;
    }
    setBusy(true);
    setError(null);

    const botData = {
      name: name.trim(),
      description: description.trim() || null,
      n8n_webhook_url: webhookUrl.trim() || null,
    };

    if (editingBot?.id) {
      // Edit mode
      const { error: err } = await supabase
        .from('bots')
        .update(botData)
        .eq('id', editingBot.id);

      if (err) {
        setError(`שגיאה בעדכון הבוט: ${err.message}`);
      } else {
        setEditingBot(null);
        fetchBots();
      }
    } else {
      // Add mode
      const { error: err } = await supabase
        .from('bots')
        .insert([botData]);

      if (err) {
        setError(`שגיאה ביצירת הבוט: ${err.message}`);
      } else {
        setEditingBot(null);
        fetchBots();
      }
    }
    setBusy(false);
  }

  async function handleDelete(botId: number) {
    if (!confirm('האם אתה בטוח שברצונך למחוק בוט זה?')) return;
    setBusy(true);
    const { error: err } = await supabase
      .from('bots')
      .delete()
      .eq('id', botId);

    if (err) {
      alert(`שגיאה במחיקת הבוט: ${err.message}`);
    } else {
      fetchBots();
    }
    setBusy(false);
  }

  if (!isOpen) return null;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" dir="rtl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <h3 style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-1)' }}>
            {editingBot ? (editingBot.id ? 'עריכת בוט' : 'הוספת בוט חדש') : 'ניהול בוטים'}
          </h3>
          <button
            onClick={editingBot ? () => setEditingBot(null) : onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4, color: 'var(--text-3)' }}
          >
            <svg style={{ width: 22, height: 22 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {editingBot ? (
            /* ADD / EDIT FORM VIEW */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {error && (
                <div style={{ padding: '10px 12px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#b91c1c', fontSize: '.8rem', fontWeight: 500 }}>
                  {error}
                </div>
              )}

              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  שם הבוט <span style={{ color: 'red' }}>*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="form-input"
                  placeholder="למשל: בוט מכירות, תמיכה טכנית"
                  disabled={busy}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  כתובת Webhook של n8n
                </label>
                <input
                  type="url"
                  value={webhookUrl}
                  onChange={e => setWebhookUrl(e.target.value)}
                  className="form-input"
                  placeholder="https://n8n.yourdomain.com/webhook/..."
                  dir="ltr"
                  style={{ textAlign: 'left' }}
                  disabled={busy}
                />
                <p style={{ fontSize: '.7rem', color: 'var(--text-3)', marginTop: 4 }}>
                  הדבק כאן את כתובת ה-Production Webhook שקיבלת מ-n8n.
                </p>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '.78rem', fontWeight: 600, color: 'var(--text-2)', marginBottom: 6 }}>
                  תיאור הבוט (אופציונלי)
                </label>
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="form-input"
                  style={{ minHeight: 80, resize: 'vertical' }}
                  placeholder="מה תפקידו של הבוט הזה או מתי הוא מופעל..."
                  disabled={busy}
                />
              </div>
            </div>
          ) : (
            /* BOTS LIST VIEW */
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <p style={{ fontSize: '.84rem', color: 'var(--text-2)' }}>רשימת הבוטים הפעילים במערכת:</p>
                <button
                  onClick={handleStartAdd}
                  style={{
                    background: 'var(--green)',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '6px 12px',
                    fontSize: '.8rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <svg style={{ width: 14, height: 14 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                  </svg>
                  <span>בוט חדש</span>
                </button>
              </div>

              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: '30px 0' }}>
                  <p style={{ fontSize: '.85rem', color: 'var(--text-3)' }}>טוען בוטים...</p>
                </div>
              ) : bots.length === 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: 10, color: 'var(--text-3)' }}>
                  <span style={{ fontSize: '2rem' }}>🤖</span>
                  <p style={{ fontSize: '.84rem', fontWeight: 500 }}>אין בוטים רשומים במערכת עדיין</p>
                  <p style={{ fontSize: '.74rem' }}>לחץ על "בוט חדש" כדי להתחיל</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {bots.map(b => (
                    <div
                      key={b.id}
                      style={{
                        padding: 12,
                        background: 'var(--input-bg)',
                        borderRadius: 10,
                        border: '1.5px solid var(--divider)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 6,
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 700, fontSize: '.9rem', color: 'var(--text-1)' }}>{b.name}</span>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button
                            onClick={() => handleStartEdit(b)}
                            disabled={busy}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: 'var(--text-2)',
                              cursor: 'pointer',
                              padding: 4,
                              borderRadius: 6,
                            }}
                            title="ערוך"
                          >
                            <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDelete(b.id)}
                            disabled={busy}
                            style={{
                              background: 'none',
                              border: 'none',
                              color: '#ef4444',
                              cursor: 'pointer',
                              padding: 4,
                              borderRadius: 6,
                            }}
                            title="מחק"
                          >
                            <svg style={{ width: 16, height: 16 }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {b.description && (
                        <p style={{ fontSize: '.76rem', color: 'var(--text-2)', lineHeight: 1.4 }}>
                          {b.description}
                        </p>
                      )}

                      {b.n8n_webhook_url && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#fff', padding: '4px 8px', borderRadius: 6, border: '1px solid var(--divider)', marginTop: 4 }}>
                          <span style={{ fontSize: '.68rem', fontWeight: 600, color: 'var(--text-3)' }}>Webhook:</span>
                          <span className="truncate-1" style={{ fontSize: '.68rem', color: 'var(--text-2)', fontFamily: 'monospace', flex: 1, textAlign: 'left' }} dir="ltr">
                            {b.n8n_webhook_url}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {editingBot && (
          <div className="modal-footer">
            <button
              onClick={handleSave}
              disabled={busy}
              style={{
                background: 'var(--green)',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              {busy ? 'שומר...' : 'שמור בוט'}
            </button>
            <button
              onClick={() => setEditingBot(null)}
              disabled={busy}
              style={{
                background: 'none',
                border: '1.5px solid var(--divider)',
                color: 'var(--text-2)',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: '.82rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              ביטול
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
