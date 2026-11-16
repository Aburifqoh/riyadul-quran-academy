export async function onRequestPost(context: any) {
  try {
    const { request, env } = context;
    const body = await request.json();
    const token = body.token;

    if (!token) {
      return new Response(JSON.stringify({ success: false, error: 'No token provided' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const secretKey = env.TURNSTILE_SECRET_KEY;
    if (!secretKey) {
      return new Response(JSON.stringify({ success: false, error: 'Server misconfiguration' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = new FormData();
    formData.append('secret', secretKey);
    formData.append('response', token);

    const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: formData,
    });

    const data = await res.json();

    if (!data.success) {
      return new Response(JSON.stringify({ success: false, error: 'CAPTCHA verification failed. Please try again.' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
