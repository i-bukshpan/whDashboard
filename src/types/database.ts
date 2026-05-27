// Types derived from the SQL schema

export interface Bot {
  id: number;
  name: string;
  description: string | null;
  n8n_webhook_url: string | null;
  created_at: string;
}

export interface Contact {
  id: number;
  phone_number: string;
  name: string | null;
  is_bot_enabled: boolean;
  assigned_bot_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: number;
  contact_id: number;
  direction: 'inbound' | 'outbound';
  message_type: string;
  content: string | null;
  media_url: string | null;
  whatsapp_message_id: string | null;
  created_at: string;
}

export interface ContactWithLastMessage extends Contact {
  last_message?: string | null;
  last_message_time?: string | null;
  last_message_direction?: 'inbound' | 'outbound' | null;
  assigned_bot?: Bot | null;
}
