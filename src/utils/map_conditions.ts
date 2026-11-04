import { createHash } from 'node:crypto';
import type { MapPredicate, MapStateChoice } from '@inteyvat-wiki/wiki-contracts/map';

export type ReferenceConditions = Record<string, Record<string, { description: string | null; default?: boolean }>>;
const stable = (prefix: string, text: string) => prefix + createHash('sha256').update(text).digest('hex').slice(0, 16);
export function reference_choices(source: ReferenceConditions): MapStateChoice[] {
    return Object.entries(source).map(([name, options]) => {
        if (Object.keys(options).some(value => !value.startsWith(name + ':') || !value.slice(name.length + 1))
            || Object.values(options).filter(option => option.default).length > 1) throw new Error(`Invalid map reference choices: ${name}`);
        return ({ id: stable('reference-', name), label: name,
        evidence: 'manual-reference' as const,
        options: Object.entries(options).map(([value, option]) => ({ id: stable('option-', value), label: value.slice(name.length + 1),
            ...(option.description ? { description: option.description } : {}) })),
        ...(Object.entries(options).some(([, option]) => option.default) ? { default: stable('option-', Object.entries(options).find(([, option]) => option.default)![0]) } : {}),
    }); });
}
/** Parse only the finite, audited syntax used by the old reference data. No regex is shipped or executed by the Wiki. */
export function reference_predicate(expression: string | undefined, source: ReferenceConditions): MapPredicate | undefined {
    if (!expression) return undefined;
    const terms: string[] = [];
    if (expression.startsWith('(?=')) {
        let remainder = expression;
        const prefix = '(?=[\\s\\S]*';
        while (remainder) {
            if (!remainder.startsWith(prefix)) throw new Error(`Unsupported map reference condition: ${expression}`);
            const end = remainder.indexOf(')', prefix.length); if (end < 0) throw new Error('Unclosed map reference condition');
            terms.push(remainder.slice(prefix.length, end)); remainder = remainder.slice(end + 1);
        }
    } else terms.push(expression);
    const args: MapPredicate[] = terms.map(term => {
        // Match the entire group prefix. “安眠处” must never match “真正的安眠处”.
        const groups = Object.keys(source).filter(group => term.startsWith(group + ':'));
        if (groups.length !== 1) throw new Error(`Ambiguous or unknown map condition group: ${term}`);
        const group = groups[0]!, suffix = term.slice(group.length + 1);
        const options = Object.keys(source[group]!);
        let matches: string[];
        if (/^\[\d-\d\]$/.test(suffix)) {
            const start = Number(suffix[1]), end = Number(suffix[3]);
            if (end < start) throw new Error('Reversed map condition range');
            matches = options.filter(option => /^\d$/.test(option.slice(group.length + 1)) && Number(option.slice(group.length + 1)) >= start && Number(option.slice(group.length + 1)) <= end);
        } else if (/^\[\^\d\]$/.test(suffix)) matches = options.filter(option => option.slice(group.length + 1)[0] !== suffix[2]);
        else {
            if (/[\[\]()*+?{}\\^$|]/.test(suffix)) throw new Error(`Unsupported map condition syntax: ${suffix}`);
            matches = options.filter(option => option === term);
        }
        if (!matches.length) throw new Error(`Map condition selects no option: ${term}`);
        return { op: 'selected', key: stable('reference-', group), values: matches.map(value => stable('option-', value)) };
    });
    return args.length === 1 ? args[0] : { op: 'all', args };
}
export function predicate_keys(predicate?: MapPredicate): string[] {
    if (!predicate) return [];
    return predicate.op === 'selected' ? [predicate.key] : predicate.op === 'all' || predicate.op === 'any' ? predicate.args.flatMap(predicate_keys) : [];
}
