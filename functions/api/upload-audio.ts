export async function onRequestPost(context: any) {
  try {
    const formData = await context.request.formData();
    const file = formData.get('audioFile');
    const filename = formData.get('filename');

    if (!file || !filename) {
      return new Response(JSON.stringify({ error: 'Missing file or filename' }), { 
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // HOMEWORK_AUDIO is the R2 bucket binding configured in Cloudflare Pages settings
    if (!context.env.HOMEWORK_AUDIO) {
       return new Response(JSON.stringify({ error: 'R2 bucket binding HOMEWORK_AUDIO not found' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    await context.env.HOMEWORK_AUDIO.put(filename, file.stream(), {
      httpMetadata: {
        contentType: file.type || 'audio/webm',
      },
    });

    return new Response(JSON.stringify({ success: true, filename }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
