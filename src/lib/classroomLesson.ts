export type ClassroomLessonState = {
  surah: number;
  ayah: number;
  chapterName: string;
  materialTitle?: string;
  materialUrl?: string;
};

let lastLesson: ClassroomLessonState | null = null;

export function rememberClassroomLesson(partial: Partial<ClassroomLessonState>) {
  lastLesson = {
    surah: lastLesson?.surah || 1,
    ayah: lastLesson?.ayah || 1,
    chapterName: lastLesson?.chapterName || 'Al-Fatihah',
    materialTitle: lastLesson?.materialTitle,
    materialUrl: lastLesson?.materialUrl,
    ...partial,
  };
}

export function getClassroomLesson(): ClassroomLessonState | null {
  return lastLesson;
}
