import { getProgramme } from '@/lib/programmes';
import { ProgrammeLanding, programmeMetadata } from '@/components/ProgrammeLanding';

const programme = getProgramme('islamic-studies')!;

export const metadata = programmeMetadata('islamic-studies');

export default function Page() {
  return <ProgrammeLanding programme={programme} />;
}