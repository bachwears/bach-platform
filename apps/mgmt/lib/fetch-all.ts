// PostgREST caps every response at max_rows (1000): a plain select silently drops the rest.
// Pages with .range() until a short page comes back. The query must have a stable order
// (end it with a unique column, e.g. .order("id")) or rows can repeat/skip across pages.
const PAGE = 1000;

type PageResult<T> = { data: T[] | null; error: { message: string } | null };

export async function fetchAllPages<T>(
  page: (from: number, to: number) => PromiseLike<PageResult<T>>,
): Promise<{ data: T[]; error: { message: string } | null }> {
  const data: T[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data: rows, error } = await page(from, from + PAGE - 1);
    if (error) return { data, error };
    data.push(...(rows ?? []));
    if (!rows || rows.length < PAGE) return { data, error: null };
  }
}
