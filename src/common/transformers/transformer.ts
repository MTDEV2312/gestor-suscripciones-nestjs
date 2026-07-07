import { TransformFnParams } from 'class-transformer';

export function trimTransform({ value }: TransformFnParams): unknown {
  const v: unknown = value;
  if (typeof v === 'string') {
    return v.trim();
  }
  return v;
}

export function toLowerCaseTransform({ value }: TransformFnParams): unknown {
  const v: unknown = value;
  if (typeof v === 'string') {
    return v.toLowerCase();
  }
  return v;
}
