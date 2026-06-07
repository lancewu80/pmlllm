import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import zh from './zh';
import en from './en';

const locales = { zh, en };

export const I18nContext = createContext();

function deepGet(obj, path) {
  return path.split('.').reduce((o, k) => (o ? o[k] : undefined), obj) || path;
}

export function I18nProvider({ children }) {
  const [lang, setLangState] = useState('zh');
  const [ready, setReady] = useState(false);

  // Load persisted language on mount
  useEffect(() => {
    AsyncStorage.getItem('pmllm-lang').then((v) => {
      if (v) setLangState(v);
      setReady(true);
    }).catch(() => setReady(true));
  }, []);

  const setLang = useCallback((l) => {
    setLangState(l);
    AsyncStorage.setItem('pmllm-lang', l).catch(() => {});
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === 'zh' ? 'en' : 'zh');
  }, [lang, setLang]);

  const t = useCallback((path) => deepGet(locales[lang], path), [lang]);

  return (
    <I18nContext.Provider value={{ lang, setLang, toggleLang, t, ready }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    return { lang: 'zh', setLang: () => {}, toggleLang: () => {}, t: (path) => deepGet(locales['zh'], path), ready: true };
  }
  return ctx;
}

export { locales };
