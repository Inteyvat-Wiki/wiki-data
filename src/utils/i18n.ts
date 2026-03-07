import zh_cn from '~~/i18n/locales/zh_cn.json'
import en from '~~/i18n/locales/en.json'

export type Lang = 'en' | 'zh_cn';

export const lang_list: Lang[] = ['en', 'zh_cn'];

const messages = { en, zh_cn }

export function get_lang(lang: any): Lang {
    if (lang === 'en') return 'en';
    if (lang === 'zh-cn' || lang === 'zh_cn') return 'zh_cn';
    return 'zh_cn';
}

export function t(key: string, lang: Lang) {
    let [group, item] = key.split('.');
    if (!group || !item) return key;
    return (messages[lang] as any)[group]?.[item] || key;
}