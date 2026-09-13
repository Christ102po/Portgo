import { useEffect, useState } from "react";
import { getLanguage, setLanguage, subscribeLanguage, translate } from "../lib/i18n";

export function useLanguage() {
  const [lang, setLangState] = useState(() => getLanguage());

  useEffect(() => {
    const unsubscribe = subscribeLanguage(() => setLangState(getLanguage()));
    return unsubscribe;
  }, []);

  function t(key, vars) {
    return translate(key, lang, vars);
  }

  return { lang, setLanguage, t };
}
