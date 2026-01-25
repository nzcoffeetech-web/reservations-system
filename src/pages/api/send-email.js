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
      from: 'NZ Coffee <reservations@nzcoffee.work>',
      to: [bookingData.email],
      bcc: ['khairulazri.sha@gmail.com'], // You get a copy too

      subject: `Booking Confirmed: ${bookingData.date}`,
      
      html: `
        <div style="font-family: sans-serif; color: #111; max-width: 600px; margin: 0 auto; border: 1px solid #e5e5e5; padding: 40px 20px;">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #C08D5D; font-family: serif; font-size: 28px; margin: 0;">NZ Coffee</h1>
            <p style="font-size: 10px; text-transform: uppercase; letter-spacing: 2px; color: #888; margin-top: 5px;">Reservation Confirmed</p>
          </div>

          <hr style="border: 0; border-bottom: 1px solid #eee; margin: 30px 0;">
          
          <p style="font-size: 16px; line-height: 1.6;">Hi <strong>${bookingData.name}</strong>,</p>
          
          <p style="font-size: 16px; line-height: 1.6; color: #444;">
            Your table is confirmed! We can’t wait to serve you at <strong>NZ Coffee</strong>, where every cup is brewed fresh and every visit feels like home.
          </p>
          
          <div style="background: #f9f9f9; padding: 20px; border-radius: 4px; margin: 30px 0; border-left: 4px solid #C08D5D;">
            <h3 style="margin: 0 0 15px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 1px; color: #C08D5D;">📅 Booking Details</h3>
            <p style="margin: 5px 0; font-size: 15px;"><strong>Date:</strong> ${bookingData.date}</p>
            <p style="margin: 5px 0; font-size: 15px;"><strong>Time:</strong> ${bookingData.time}</p>
            <p style="margin: 5px 0; font-size: 15px;"><strong>Pax:</strong> ${bookingData.pax} Guests</p>
            <p style="margin: 5px 0; font-size: 15px;"><strong>Preference:</strong> ${bookingData.table}</p>
          </div>
          
          <p style="font-size: 16px; margin-bottom: 10px;">View our menu:</p>
          <a href="https://nzcoffee.work/menu" style="color: #C08D5D; text-decoration: underline; font-weight: bold; font-size: 16px;">
            NZ Coffee Menu
          </a>

          <br><br>

          <p style="font-size: 16px; margin-top: 30px;">See you soon at <strong>NZ Coffee</strong>!</p>

          <div style="text-align: center; margin-top: 50px; border-top: 1px solid #eee; padding-top: 20px;">
            <p style="font-size: 12px; color: #aaa;">
              NZ Coffee • Seremban, Malaysia
            </p>
          </div>
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