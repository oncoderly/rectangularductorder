import { useCallback } from 'react';

/**
 * Text input'larda otomatik seçim için kullanılan hook
 * Her focus olduğunda tüm metni seçer - kolay veri girişi için
 */
export const useInputClear = () => {
  /**
   * Basit focus handler - HER ZAMAN tüm metni seçer
   */
  const autoSelectHandler = useCallback((e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.select();
  }, []);

  /**
   * Genel focus handler (geriye dönük uyumluluk için)
   */
  const createFocusHandler = useCallback((
    currentValue?: string | number | undefined,
    defaultValues?: (string | number)[]
  ) => {
    return autoSelectHandler;
  }, [autoSelectHandler]);

  /**
   * Placeholder metinli input'lar için handler
   */
  const createPlaceholderFocusHandler = useCallback((
    currentValue?: string | number | undefined,
    placeholder?: string
  ) => {
    return autoSelectHandler;
  }, [autoSelectHandler]);

  /**
   * Numeric input'lar için handler
   */
  const createNumericFocusHandler = useCallback((
    currentValue?: number | undefined,
    defaultValue?: number
  ) => {
    return autoSelectHandler;
  }, [autoSelectHandler]);

  /**
   * Password input'lar için handler
   */
  const createPasswordFocusHandler = useCallback((
    currentValue?: string | undefined
  ) => {
    return autoSelectHandler;
  }, [autoSelectHandler]);

  /**
   * Email input'lar için handler
   */
  const createEmailFocusHandler = useCallback((
    currentValue?: string | undefined,
    placeholder?: string
  ) => {
    return autoSelectHandler;
  }, [autoSelectHandler]);

  return {
    autoSelectHandler,
    createFocusHandler,
    createPlaceholderFocusHandler,
    createNumericFocusHandler,
    createPasswordFocusHandler,
    createEmailFocusHandler
  };
};

export default useInputClear;