export const POST = async ({ request }) => {
    // 1. Safety Check: Ensure there is data to process
    if (!request.body) {
      return new Response(JSON.stringify({ error: "No body found" }), { status: 400 });
    }
  
    // 2. Get API Key from Netlify Environment
    const RESEND_API_KEY = import.meta.env.RESEND_API_KEY; 
  
    if (!RESEND_API_KEY) {
      console.error("Missing RESEND_API_KEY");
      return new Response(JSON.stringify({ error: "Server Configuration Error: Missing API Key" }), { status: 500 });
    }
  
    try {
      const body = await request.json();
      const { type, bookingData } = body;
  
      // 3. Prepare Email Content
      let subject = "Booking Update";
      let htmlContent = "<p>Update from NZ Coffee</p>";
  
      if (type === 'confirmation') {
        subject = `Booking Confirmed: ${bookingData.date}`;
        htmlContent = `
          <div style="font-family: sans-serif; color: #333; padding: 20px; border: 1px solid #C08D5D; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #C08D5D; text-align: center;">Reservation Confirmed</h1>
            <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
            
            <p>Hi <strong>${bookingData.name}</strong>,</p>
            <p>Your table at NZ Coffee is secured.</p>
            
            <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> ${bookingData.date}</p>
              <p style="margin: 5px 0;"><strong>⏰ Time:</strong> ${bookingData.time}</p>
              <p style="margin: 5px 0;"><strong>🪑 Table:</strong> ${bookingData.table}</p>
            </div>
  
            <p style="font-size: 14px; color: #666;">Please show this email upon arrival.</p>
          </div>
        `;
      }
  
      // 4. Send to Resend API
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify({
          // ⚠️ TEST MODE: You must use this specific address until you verify your domain
          from: 'NZ Coffee <onboarding@resend.dev>', 
          
          // This will grab the email the user typed in the form
          // BUT it will only deliver if this email matches your Resend account email
          to: [bookingData.email], 
          
          subject: subject,
          html: htmlContent
        })
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        console.error("Resend API Error:", data);
        return new Response(JSON.stringify(data), { status: 500 });
      }
  
      return new Response(JSON.stringify({ success: true, id: data.id }), { status: 200 });
  
    } catch (error) {
      console.error("Server Error:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  };