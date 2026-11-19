/**
 * PostgREST caps every response at a fixed row count (1000 by default on Supabase)
 * and returns no error when it truncates. Any query expected to return the full
 * table must page explicitly.
 */
export const SUPABASE_PAGE_SIZE = 1000;

interface PageResult<T> {
  data: T[] | null;
  error: { message: string } | null;
}

/**
 * Read every row by requesting successive ranges until a short page comes back.
 *
 * @param page Builds the query for an inclusive `from`..`to` row range.
 */
export async function fetchAllRows<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>
): Promise<T[]> {
  const rows: T[] = [];

  for (let from = 0; ; from += SUPABASE_PAGE_SIZE) {
    const { data, error } = await page(from, from + SUPABASE_PAGE_SIZE - 1);
    if (error) throw new Error(error.message);
    if (!data || data.length === 0) break;

    rows.push(...data);
    if (data.length < SUPABASE_PAGE_SIZE) break;
  }

  return rows;
}
