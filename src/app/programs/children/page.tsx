import { getProgramme } from '@/lib/programmes';
import { ProgrammeLanding, programmeMetadata } from '@/components/ProgrammeLanding';

const programme = getProgramme('children')!;

export const metadata = programmeMetadata('children');

export default function Page() {
  return <ProgrammeLanding programme={programme} />;
}