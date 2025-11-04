/**
 * Format doctor name with MUDr. title
 * @param name - Doctor's full name
 * @returns Formatted name with MUDr. prefix
 */
export const formatDoctorName = (name: string | null | undefined): string => {
  if (!name) return "—";
  return `MUDr. ${name}`;
};

