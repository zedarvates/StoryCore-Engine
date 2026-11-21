import { renderHook } from '@testing-library/react';
import { expect, it } from 'vitest';
import { comfyUIServerSchema } from '@/schemas/modalSchemas';
import { useModalValidation } from '../useModalValidation';

it('checks credentials only for the selected authentication mode', () => {
  const { result } = renderHook(() => useModalValidation(comfyUIServerSchema));
  const validate = result.current.validateField;
  expect(validate('username', '', { authType: 'basic' })).toMatch(/requis/);
  expect(validate('password', '', { authType: 'basic' })).toMatch(/requis/);
  expect(validate('token', '', { authType: 'api-key' })).toMatch(/requis/);
  expect(validate('token', '', { authType: 'none' })).toBeNull();
  expect(validate('token', 'test-token', { authType: 'bearer' })).toBeNull();
});
