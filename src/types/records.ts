import type { JsonValue } from './json';

/** Generic record for loosely-typed admin/portal table rows. */
export interface AdminRecord {
  id?: string;
  name?: string;
  email?: string;
  role?: string;
  status?: string;
  [key: string]: JsonValue | undefined;
}
