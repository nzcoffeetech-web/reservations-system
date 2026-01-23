export const POST = async ({ request }) => {
    if (!request.body) return new Response(JSON.stringify({ error: "No body" }), { status: 400 });
  
    const RESEND_API_KEY = import.meta.env.RESEND_API_KEY; 
    if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "Missing Key" }), { status: 500 });
  
    try {
      const { type, bookingData } = await request.json();
      
      // ... (Use the HTML content from previous steps or keep it simple for now)
      const htmlContent = `
        <h1>Booking Confirmed</h1>
        <p>Hi ${bookingData.name}, your table ${bookingData.table} is reserved for ${bookingData.date} at ${bookingData.time}.</p>
      `;
  
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          from: 'NZ Coffee <reservations@nzcoffee.work>',
          to: [bookingData.email],
          subject: `Booking Confirmed: ${bookingData.date}`,
          html: htmlContent
        })
      });
  
      const data = await response.json();
      return new Response(JSON.stringify(data), { status: 200 });
  
    } catch (error) {
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  };