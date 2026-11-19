export async function onRequestGet(context: any) {
  try {
    const filename = context.params.filename;

    if (!filename) {
      return new Response('Missing filename', { status: 400 });
    }

    if (!context.env.HOMEWORK_AUDIO) {
       return new Response('R2 bucket binding HOMEWORK_AUDIO not found', { status: 500 });
    }

    const object = await context.env.HOMEWORK_AUDIO.get(filename);

    if (object === null) {
      return new Response('File not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year since audio doesn't change

    return new Response(object.body, {
      headers,
    });
  } catch (err: any) {
    return new Response(err.message, { status: 500 });
  }
}
