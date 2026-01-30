export const prerender = false; // Run on request, not build time

export async function POST({ request }) {
  try {
    const data = await request.json();
    const { name, phone, date, time, pax, table, notes } = data;

    // --- KEYS from Netlify Environment Variables ---
    const BOT_TOKEN = import.meta.env.TELEGRAM_BOT_TOKEN;
    const CHAT_ID = import.meta.env.TELEGRAM_CHAT_ID;

    if (!BOT_TOKEN || !CHAT_ID) {
      return new Response(JSON.stringify({ error: 'Missing API Keys' }), { status: 500 });
    }

    // --- MESSAGE FORMATTING ---
    const message = `
🚨 *NEW BOOKING ALERT* 🚨

👤 *Customer:* ${name}
📞 *Phone:* ${phone}
📅 *Date:* ${date}
⏰ *Time:* ${time}
👥 *Pax:* ${pax} Guests
🪑 *Zone:* ${table}

📝 *Note:* ${notes || "None"}
    `;

    // --- SEND TO TELEGRAM ---
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    const response = await fetch(telegramUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: message,
        parse_mode: 'Markdown'
      })
    });

    if (response.ok) {
      return new Response(JSON.stringify({ success: true }), { status: 200 });
    } else {
      const err = await response.text();
      console.error('Telegram Error:', err);
      return new Response(JSON.stringify({ error: 'Failed to send to Telegram' }), { status: 500 });
    }

  } catch (error) {
    console.error('API Error:', error);
    return new Response(JSON.stringify({ error: 'Server Error' }), { status: 500 });
  }
}