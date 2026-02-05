/** Returns a Tailwind text color class for a numeric grade (0–100). */
export function gradeColor(grade: number): string {
  if (grade >= 80) return 'text-mb-success';
  if (grade >= 60) return 'text-mb-accent';
  if (grade >= 40) return 'text-yellow-500';
  return 'text-mb-danger';
}
