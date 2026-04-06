export const elasticDrag = (
  inputValue: number,
  easeStart: number,
  maxValue: number,
): number => {
  if (inputValue <= easeStart) {
    return inputValue;
  }
  const range = maxValue - easeStart;
  const x = inputValue - easeStart;
  const k = 1 / range;
  return easeStart + range * (1 - Math.exp(-k * x));
};
