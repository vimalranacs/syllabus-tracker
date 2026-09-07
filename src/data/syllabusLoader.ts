import type { RawSyllabusRecord } from '../types';
import localSyllabus from '../uppsc_ro_aro_syllabus_database.json';

let cachedData: RawSyllabusRecord[] | null = null;

export async function loadSyllabusData(): Promise<RawSyllabusRecord[]> {
  if (cachedData) return cachedData;

  try {
    const res = await fetch('/uppsc_ro_aro_syllabus_database.json');
    if (res.ok) {
      cachedData = await res.json();
      return cachedData!;
    }
  } catch {
    // fallback to bundled import
  }

  cachedData = localSyllabus as RawSyllabusRecord[];
  return cachedData;
}
