import { getProgramme } from '@/lib/programmes';
import { ProgrammeLanding, programmeMetadata } from '@/components/ProgrammeLanding';

const programme = getProgramme('hifz')!;

export const metadata = programmeMetadata('hifz');

export default function Page() {
  return <ProgrammeLanding programme={programme} />;
}