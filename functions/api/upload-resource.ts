export async function onRequestPost(context: any) {
  try {
    const formData = await context.request.formData();
    const file = formData.get('file');
    const filename = formData.get('filename');
    const contentType = formData.get('contentType') || 'application/octet-stream';

    if (!file || !filename) {
      return new Response(JSON.stringify({ error: 'Missing file or filename' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // ALMUQRI_VAULT is the R2 bucket for library resources (books, PDFs, etc.)
    if (!context.env.ALMUQRI_VAULT) {
      return new Response(JSON.stringify({ error: 'R2 bucket binding ALMUQRI_VAULT not found' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const key = `resources/${filename}`;

    await context.env.ALMUQRI_VAULT.put(key, file.stream(), {
      httpMetadata: {
        contentType: file.type || contentType,
      },
    });

    return new Response(JSON.stringify({ success: true, key, filename }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
