/** Number steps within each headed section, keeping unheaded recipes continuous. */
export function instructionNumbers(steps: ReadonlyArray<{ group_label?: string | null }>): number[] {
  let number = 0;
  let previous: string | null = null;
  return steps.map((step) => {
    const label = step.group_label ?? null;
    if (label !== null && label !== previous) number = 0;
    previous = label;
    return ++number;
  });
}
