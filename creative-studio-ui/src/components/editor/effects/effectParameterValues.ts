import type { EffectParameter, EffectParameterValue } from '@/types/effect';

export function readEffectNumber(value: EffectParameterValue | undefined, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const number = Number(value);
    if (Number.isFinite(number)) {
      return number;
    }
  }
  return fallback;
}

export function readEffectColor(value: EffectParameterValue): string {
  return typeof value === 'string' ? value : '#000000';
}

export function selectEffectOption(
  parameter: EffectParameter,
  selected: string,
  onChange: (value: EffectParameterValue) => void,
): void {
  const option = parameter.options?.find(({ value }) => String(value) === selected);
  if (option) onChange(option.value);
}
