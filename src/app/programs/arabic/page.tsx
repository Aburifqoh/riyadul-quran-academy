import { getProgramme } from '@/lib/programmes';
import { ProgrammeLanding, programmeMetadata } from '@/components/ProgrammeLanding';

const programme = getProgramme('arabic')!;

export const metadata = programmeMetadata('arabic');

export default function Page() {
  return <ProgrammeLanding programme={programme} />;
}