export const POST = async ({ request }) => {
    console.log("--> 1. API HIT: /api/send-email");
  
    const RESEND_API_KEY = import.meta.env.RESEND_API_KEY; 
    console.log(`--> 2. KEY CHECK: ${RESEND_API_KEY ? "EXISTS" : "MISSING"} (Length: ${RESEND_API_KEY?.length})`);
  
    if (!RESEND_API_KEY) return new Response(JSON.stringify({ error: "No Key" }), { status: 500 });
  
    try {
      const body = await request.json();
      const userEmail = body.bookingData?.email;
      
      console.log(`--> 3. TARGET EMAIL: ${userEmail}`);
      
      // ⚠️ IMPORTANT: We hardcode 'onboarding@resend.dev' for the FROM address
      const payload = {
        from: 'NZ Coffee <onboarding@resend.dev>',
        to: [userEmail], 
        subject: "Test Email",
        html: "<p>If you see this, it works!</p>"
      };
      
      console.log("--> 4. SENDING PAYLOAD:", JSON.stringify(payload));
  
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${RESEND_API_KEY}`
        },
        body: JSON.stringify(payload)
      });
  
      const data = await response.json();
      console.log("--> 5. RESEND RESPONSE:", JSON.stringify(data));
  
      return new Response(JSON.stringify(data), { status: 200 });
  
    } catch (error) {
      console.error("--> FATAL ERROR:", error);
      return new Response(JSON.stringify({ error: error.message }), { status: 500 });
    }
  };