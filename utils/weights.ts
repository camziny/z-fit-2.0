export type WeightUnit = 'kg' | 'lbs';

function convertRaw(value: number, fromUnit: WeightUnit, toUnit: WeightUnit) {
  if (fromUnit === toUnit) return value;
  return fromUnit === 'kg' ? value * 2.20462 : value / 2.20462;
}

export function convertWeight(value: number, fromUnit: WeightUnit, toUnit: WeightUnit) {
  const raw = convertRaw(value, fromUnit, toUnit);
  if (toUnit === 'lbs') {
    return Math.round(raw / 5) * 5;
  }
  if (toUnit === 'kg') {
    return Math.round(raw * 2) / 2;
  }
  return raw;
}

export function formatWeight(value: number, unit: WeightUnit) {
  const rounded = Math.round(value * 10) / 10;
  return `${rounded} ${unit}`;
}


