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
    _currentValue?: string | number | undefined,
    _defaultValues?: (string | number)[]
  ) => {
    return autoSelectHandler;
  }, [autoSelectHandler]);

  /**
   * Placeholder metinli input'lar için handler
   */
  const createPlaceholderFocusHandler = useCallback((
    _currentValue?: string | number | undefined,
    _placeholder?: string
  ) => {
    return autoSelectHandler;
  }, [autoSelectHandler]);

  /**
   * Numeric input'lar için handler
   */
  const createNumericFocusHandler = useCallback((
    _currentValue?: number | undefined,
    _defaultValue?: number
  ) => {
    return autoSelectHandler;
  }, [autoSelectHandler]);

  /**
   * Password input'lar için handler
   */
  const createPasswordFocusHandler = useCallback((
    _currentValue?: string | undefined
  ) => {
    return autoSelectHandler;
  }, [autoSelectHandler]);

  /**
   * Email input'lar için handler
   */
  const createEmailFocusHandler = useCallback((
    _currentValue?: string | undefined,
    _placeholder?: string
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