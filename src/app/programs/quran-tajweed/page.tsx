import { getProgramme } from '@/lib/programmes';
import { ProgrammeLanding, programmeMetadata } from '@/components/ProgrammeLanding';

const programme = getProgramme('quran-tajweed')!;

export const metadata = programmeMetadata('quran-tajweed');

export default function Page() {
  return <ProgrammeLanding programme={programme} />;
}