import { supabase } from '@/lib/supabase';

type FallbackClient = Pick<typeof supabase, 'from'>;

/** Extract a missing-column name from a PostgREST / Postgres error message. */
export function missingColumnFromError(message?: string): string | null {
  if (!message) return null;
  const match =
    message.match(/Could not find the '([^']+)' column/i) ||
    message.match(/column ["']?([^"'\s]+)["']? of relation/i) ||
    message.match(/column ["']?([^"'\s]+)["']? does not exist/i);
  return match?.[1] || null;
}

/** Insert a row, dropping columns the schema cache does not know about, then retry. */
export async function insertWithColumnFallback(
  client: FallbackClient,
  table: string,
  payload: Record<string, unknown>
): Promise<{ data: Record<string, unknown> | null; error: string | null }> {
  let body: Record<string, unknown> = { ...payload };
  let lastError = 'Insert failed';

  for (let i = 0; i < 12; i++) {
    const { data, error } = await client.from(table).insert([body] as never).select().single();
    if (!error) return { data: data as Record<string, unknown> | null, error: null };
    lastError = error.message;
    const col = missingColumnFromError(error.message);
    if (!col || !(col in body)) break;
    const next = { ...body };
    delete next[col];
    body = next;
  }

  return { data: null, error: lastError };
}

/** Update a row, dropping columns the schema cache does not know about, then retry. */
export async function updateWithColumnFallback(
  client: FallbackClient,
  table: string,
  payload: Record<string, unknown>,
  match: { column: string; value: string }
): Promise<{ data: Record<string, unknown>[] | null; error: string | null; dropped: string[] }> {
  let body: Record<string, unknown> = { ...payload };
  const dropped: string[] = [];
  let lastError = 'Update failed';

  for (let i = 0; i < 12; i++) {
    const { data, error } = await client
      .from(table)
      .update(body as never)
      .eq(match.column, match.value)
      .select('id');
    if (!error) {
      if (!data || data.length === 0) {
        return {
          data: null,
          error: 'Update was blocked (permissions). Please sign out and back in, then try again.',
          dropped,
        };
      }
      return { data: data as Record<string, unknown>[], error: null, dropped };
    }
    lastError = error.message;
    const col = missingColumnFromError(error.message);
    if (!col || !(col in body)) break;
    const next = { ...body };
    delete next[col];
    body = next;
    dropped.push(col);
  }

  return { data: null, error: lastError, dropped };
}
