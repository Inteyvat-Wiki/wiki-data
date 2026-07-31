import de from '~~/i18n/locales/de.json'
import en from '~~/i18n/locales/en.json'
import es from '~~/i18n/locales/es.json'
import fr from '~~/i18n/locales/fr.json'
import id from '~~/i18n/locales/id.json'
import it from '~~/i18n/locales/it.json'
import ja from '~~/i18n/locales/ja.json'
import ko from '~~/i18n/locales/ko.json'
import pt from '~~/i18n/locales/pt.json'
import ru from '~~/i18n/locales/ru.json'
import th from '~~/i18n/locales/th.json'
import tr from '~~/i18n/locales/tr.json'
import vi from '~~/i18n/locales/vi.json'
import zh_hans from '~~/i18n/locales/zh_hans.json'
import zh_hant from '~~/i18n/locales/zh_hant.json'

export type Lang = 'zh_hans' | 'zh_hant' | 'de' | 'en' | 'es' | 'fr' | 'id' | 'it' | 'ja' | 'ko' | 'pt' | 'ru' | 'th' | 'tr' | 'vi';

export const lang_list: Lang[] = ['zh_hans', 'zh_hant', 'de', 'en', 'es', 'fr', 'id', 'it', 'ja', 'ko', 'pt', 'ru', 'th', 'tr', 'vi'];

const messages: Record<Lang, any> = { de, en, es, fr, id, it, ja, ko, pt, ru, th, tr, vi, zh_hans, zh_hant }

const lang_aliases: Record<string, Lang> = {
    chs: 'zh_hans',
    'zh-cn': 'zh_hans',
    'zh-hans': 'zh_hans',
    zh_cn: 'zh_hans',
    zh_hans: 'zh_hans',
    cht: 'zh_hant',
    'zh-tw': 'zh_hant',
    'zh-hk': 'zh_hant',
    'zh-hant': 'zh_hant',
    zh_tw: 'zh_hant',
    zh_hant: 'zh_hant',
    de: 'de',
    en: 'en',
    es: 'es',
    fr: 'fr',
    id: 'id',
    it: 'it',
    ja: 'ja',
    jp: 'ja',
    'ja-jp': 'ja',
    ko: 'ko',
    kr: 'ko',
    'ko-kr': 'ko',
    pt: 'pt',
    ru: 'ru',
    th: 'th',
    tr: 'tr',
    vi: 'vi',
}

export function get_lang(lang: any): Lang {
    return lang_aliases[String(lang || '').toLowerCase()] || 'zh_hans';
}

function lookup(message: any, parts: string[]) {
    return parts.reduce((value, part) => value?.[part], message);
}

export function t(key: string, lang: Lang) {
    const parts = key.split('.');
    if (parts.length < 2) return key;
    return lookup(messages[lang], parts) ?? lookup(messages.en, parts) ?? lookup(messages.zh_hans, parts) ?? key;
}

export function te(key: string, lang: Lang): string | undefined {
    const parts = key.split('.');
    if (parts.length < 2) return undefined;
    const value = lookup(messages[lang], parts);
    return typeof value === 'string' ? value : undefined;
}

export function ta(key: string, lang: Lang): string[] {
    const parts = key.split('.');
    if (parts.length < 2) return [];
    const value = lookup(messages[lang], parts) ?? lookup(messages.en, parts) ?? lookup(messages.zh_hans, parts);
    return Array.isArray(value) ? value.filter(item => typeof item === 'string') : [];
}
