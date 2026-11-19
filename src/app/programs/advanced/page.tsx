import { getProgramme } from '@/lib/programmes';
import { ProgrammeLanding, programmeMetadata } from '@/components/ProgrammeLanding';

const programme = getProgramme('advanced')!;

export const metadata = programmeMetadata('advanced');

export default function Page() {
  return <ProgrammeLanding programme={programme} />;
}