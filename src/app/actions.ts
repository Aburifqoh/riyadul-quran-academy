// This file has been converted from a Server Action to client-side mock functions
// because Next.js `output: 'export'` does not support Server Actions or Node.js backends.

export async function subscribeNewsletter(formData: FormData) {
  const email = String(formData.get('email') || '').trim();
  if (!email) return { error: 'Email is required' };

  try {
    const res = await fetch('/api/newsletter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { error: typeof data.error === 'string' ? data.error : 'Failed to subscribe. Please try again later.' };
    return { success: true };
  } catch (error) {
    console.error('Newsletter subscription error:', error);
    return { error: 'Failed to subscribe. Please try again later.' };
  }
}

export async function sendBillingInquiry(formData: FormData) {
  const name = formData.get('name') as string;
  const inquiry = formData.get('inquiry') as string;

  if (!name || !inquiry) {
    return { error: 'All fields are required' };
  }

  try {
    console.log(`Simulated billing inquiry from ${name}: ${inquiry}`);
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
  } catch (error) {
    console.error('Billing inquiry error:', error);
    return { error: 'Failed to send inquiry. Please try again later.' };
  }
}
