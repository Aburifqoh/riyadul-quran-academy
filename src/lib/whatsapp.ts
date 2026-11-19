export async function sendWhatsAppMessage(to: string, message: string) {
  const token = process.env.META_WHATSAPP_TOKEN;
  const phoneNumberId = process.env.META_PHONE_ID;
  
  if (!token || !phoneNumberId) {
    console.warn('WhatsApp API not configured. Skipping WhatsApp notification.');
    return false;
  }

  // Format phone number: remove all non-numeric characters (Meta requires country code without '+')
  const formattedTo = to.replace(/\D/g, '');

  if (!formattedTo) return false;

  try {
    // Note: If sending proactively outside a 24-hour window, Meta requires a 'template' type.
    // For simplicity, we are using 'text'. Ensure users message the bot first, or change to 'template' in production.
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: formattedTo,
        type: 'text',
        text: { 
          preview_url: false,
          body: message 
        }
      })
    });
    
    if (!res.ok) {
      const err = await res.json();
      console.error('[WhatsApp] sending failed:', JSON.stringify(err));
      return false;
    }
    return true;
  } catch (error) {
    console.error('[WhatsApp] API error:', error);
    return false;
  }
}
