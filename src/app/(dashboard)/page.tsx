'use client';

import { useState, useCallback } from 'react';
import ContactsSidebar from '@/components/contacts/ContactsSidebar';
import ChatArea from '@/components/chat/ChatArea';
import MessageInput from '@/components/chat/MessageInput';
import ControlPanel from '@/components/controls/ControlPanel';
import type { ContactWithLastMessage } from '@/types/database';

export default function DashboardPage() {
  const [selectedContact, setSelectedContact] = useState<ContactWithLastMessage | null>(null);
  const [showChat, setShowChat] = useState(false); // mobile toggle

  const handleSelectContact = useCallback((contact: ContactWithLastMessage) => {
    setSelectedContact(contact);
    setShowChat(true);
  }, []);

  const handleBack = useCallback(() => {
    setShowChat(false);
  }, []);

  const handleContactUpdate = useCallback((updated: ContactWithLastMessage) => {
    setSelectedContact(updated);
  }, []);

  return (
    <div className="main-layout" dir="rtl">

      {/* ─── RIGHT: Contacts Sidebar ─── */}
      {/* On mobile: hidden when showChat=true */}
      <div className={`sidebar${showChat ? ' mobile-hidden' : ''}`}>
        <ContactsSidebar
          selectedContactId={selectedContact?.id ?? null}
          onSelectContact={handleSelectContact}
        />
      </div>

      {/* ─── CENTER: Chat + Input ─── */}
      {/* On mobile: hidden when showChat=false */}
      <div className={`chat-panel${!showChat ? ' mobile-hidden' : ''}`}>
        <ChatArea
          contact={selectedContact}
          onBack={handleBack}
          onContactUpdate={handleContactUpdate}
        />
        <MessageInput contact={selectedContact} />
      </div>

      {/* ─── LEFT: Control Panel (desktop only) ─── */}
      <ControlPanel
        contact={selectedContact}
        onContactUpdate={handleContactUpdate}
      />

    </div>
  );
}
