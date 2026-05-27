import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { phone_number, message, contact_id, contact_name, assigned_bot_webhook } = body;

    const globalWebhook = process.env.NEXT_PUBLIC_OUTBOUND_WEBHOOK_URL || 'https://n8n.ibsites.co.il/webhook/85654c31-8242-4000-a3c5-b8be4a2491f5';

    // 1. Call the global webhook
    const response = await fetch(globalWebhook, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone_number,
        message,
        contact_id,
        contact_name,
        direction: 'outbound',
      }),
    });

    // 2. Call bot webhook if assigned and different
    if (assigned_bot_webhook && assigned_bot_webhook !== globalWebhook) {
      await fetch(assigned_bot_webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone_number,
          message,
          contact_id,
          contact_name,
          direction: 'outbound',
        }),
      });
    }

    return NextResponse.json({ success: true, status: response.status });
  } catch (error: any) {
    console.error('Server-side webhook forward error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
