import { NextResponse } from 'next/server';
import { listFacultyCards } from '@/lib/facultyCardsStore';

export async function GET() {
  try {
    const cards = await listFacultyCards();
    return NextResponse.json({ cards });
  } catch (error) {
    console.error('faculty cards read failed:', error);
    return NextResponse.json({ error: 'Could not load instructor profiles.' }, { status: 500 });
  }
}
