import { useCallback } from 'react';

/**
 * Text input'larda default değerleri temizlemek için kullanılan hook
 * Focus olduğunda default değerleri seçer ve kullanıcının yeni değer girmesini kolaylaştırır
 */
export const useInputClear = () => {
  /**
   * Input'un focus olduğunda default değerleri temizleyen fonksiyon
   * @param currentValue - Input'un mevcut değeri
   * @param defaultValues - Temizlenmesi gereken default değerler array'i
   * @returns Focus event handler fonksiyonu
   */
  const createFocusHandler = useCallback((
    currentValue: string | number | undefined,
    defaultValues: (string | number)[] = ['', '0', 0]
  ) => {
    return (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      const inputValue = e.target.value;
      const shouldClear = defaultValues.some(defaultVal => 
        inputValue === String(defaultVal) || 
        currentValue === defaultVal ||
        inputValue === '' ||
        (typeof defaultVal === 'string' && inputValue.includes(defaultVal))
      );
      
      if (shouldClear) {
        e.target.select(); // Tüm metni seç
      }
    };
  }, []);

  /**
   * Placeholder metinli input'lar için özel focus handler
   * @param currentValue - Input'un mevcut değeri
   * @param placeholder - Placeholder metni
   * @returns Focus event handler fonksiyonu
   */
  const createPlaceholderFocusHandler = useCallback((
    currentValue: string | number | undefined,
    placeholder: string
  ) => {
    return createFocusHandler(currentValue, ['', '0', 0, placeholder]);
  }, [createFocusHandler]);

  /**
   * Numeric input'lar için özel focus handler
   * @param currentValue - Input'un mevcut sayısal değeri
   * @param defaultValue - Default sayısal değer (varsayılan: 0)
   * @returns Focus event handler fonksiyonu
   */
  const createNumericFocusHandler = useCallback((
    currentValue: number | undefined,
    defaultValue: number = 0
  ) => {
    return (e: React.FocusEvent<HTMLInputElement>) => {
      // HER ZAMAN tüm metni seç - kolay veri girişi için
      e.target.select();
    };
  }, []);

  /**
   * Password input'lar için özel focus handler
   * @param currentValue - Input'un mevcut değeri
   * @returns Focus event handler fonksiyonu
   */
  const createPasswordFocusHandler = useCallback((
    currentValue: string | undefined
  ) => {
    return createFocusHandler(currentValue, ['']);
  }, [createFocusHandler]);

  /**
   * Email input'lar için özel focus handler
   * @param currentValue - Input'un mevcut değeri
   * @param placeholder - Email placeholder metni
   * @returns Focus event handler fonksiyonu
   */
  const createEmailFocusHandler = useCallback((
    currentValue: string | undefined,
    placeholder: string = 'E-posta adresi'
  ) => {
    return createPlaceholderFocusHandler(currentValue, placeholder);
  }, [createPlaceholderFocusHandler]);

  return {
    createFocusHandler,
    createPlaceholderFocusHandler,
    createNumericFocusHandler,
    createPasswordFocusHandler,
    createEmailFocusHandler
  };
};

export default useInputClear;