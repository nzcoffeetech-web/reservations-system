import { Resend } from 'resend';

export const POST = async ({ request }) => {
  const apiKey = import.meta.env.RESEND_API_KEY;

  if (!apiKey) {
    return new Response(JSON.stringify({ error: "Server Error: Missing API Key" }), { status: 500 });
  }

  const resend = new Resend(apiKey);

  try {
    const body = await request.json();
    const { bookingData } = body;

    // 🚀 PRODUCTION SEND
    const { data, error } = await resend.emails.send({
      // 1. PROFESSIONAL SENDER ADDRESS
      // (Since your DKIM is verified on the root, this looks great!)
      from: 'NZ Coffee <reservations@nzcoffee.work>', 
      
      // 2. SEND TO THE REAL CUSTOMER
      to: [bookingData.email], 
      
      // (Optional) BCC yourself so you also get a copy of every booking
      bcc: ['khairulazri.sha@gmail.com'],

      subject: `Booking Confirmed: ${bookingData.date}`,
      html: `
        <div style="font-family: sans-serif; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #e5e5e5; padding: 20px;">
          <h1 style="color: #C08D5D; text-align: center; font-size: 24px;">Reservation Confirmed</h1>
          <hr style="border: 0; border-bottom: 1px solid #eee; margin: 20px 0;">
          
          <p>Hi <strong>${bookingData.name}</strong>,</p>
          <p>We look forward to hosting you at NZ Coffee.</p>
          
          <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${bookingData.date}</p>
            <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${bookingData.time}</p>
            <p style="margin: 5px 0;"><strong>🪑 Table:</strong> ${bookingData.table}</p>
          </div>
          
          <p style="font-size: 12px; color: #888; text-align: center; margin-top: 30px;">
            NZ Coffee Reservations • Seremban, Malaysia
          </p>
        </div>
      `
    });

    if (error) {
      console.error("Resend Error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 400 });
    }

    return new Response(JSON.stringify({ success: true, id: data.id }), { status: 200 });

  } catch (err) {
    console.error("Unexpected Error:", err);
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
};