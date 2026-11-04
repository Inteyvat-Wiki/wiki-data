// Compile-only regression cases; executed by generator_boundaries.test.cjs with noEmit.
import './data_catalogues.types';
import { create_page, export_category, type PageEntry } from '../src/utils/page';
import { ConvertRaw, mapped_key } from '../src/utils/convert_raw';
import { get_archive_export } from '../src/utils/archive';
import { get_tcg_export } from '../src/tcg';
import { get_serenitea_export } from '../src/serenitea';
import { get_miliastra_export } from '../src/miliastra';
import type { ArchiveType, ArchiveTalk, CardType } from '@inteyvat-wiki/wiki-contracts/archive';
import type { CharacterPage } from '@inteyvat-wiki/wiki-contracts/character';
import type { PageDataTrait } from '@inteyvat-wiki/wiki-contracts/common';
import type { MessageKind, TutorialCategory, LoadingAction, LoadingTerrain, LoadingDungeonType } from '@inteyvat-wiki/wiki-contracts/misc';

type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
type Assert<T extends true> = T;

const defaults = create_page({ id: 'demo', name: 'Demo' });
type DefaultIcon = Assert<Equal<typeof defaults.icon, string | null>>;
type DefaultStar = Assert<Equal<typeof defaults.star, PageDataTrait['star']>>;
// Structural input types can hide optional fields that exist on the runtime object.
const fullMetadata = { id: 'demo', name: 'Demo', icon: '/icon', show: false };
const narrowedMetadata: { id: string; name: string } = fullMetadata;
const hiddenFields = create_page(narrowedMetadata);
// @ts-expect-error an unmentioned icon can still be present at runtime.
const assumedNull: null = hiddenFields.icon;
// @ts-expect-error an unmentioned show flag can still be false at runtime.
const assumedTrue: true = hiddenFields.show;
declare const unionMetadata: { id: string; name: string; icon: '/icon'; kind: 'icon' } | { id: string; name: string; icon: null; kind: 'empty' };
const unionPage = create_page(unionMetadata);
if (unionPage.kind === 'icon') { const stillIcon: '/icon' = unionPage.icon; }
const explicitUndefined = create_page({ id: 'demo', name: 'Demo', icon: undefined, star: undefined });
type NormalizedIcon = Assert<Equal<typeof explicitUndefined.icon, null>>;
type NormalizedStar = Assert<Equal<typeof explicitUndefined.star, null>>;
// @ts-expect-error null normalization must not produce never (assignable to number).
const notANumber: number = explicitUndefined.icon;

declare const metadata: { id: string; name: string; icon: string; star: 4 | 5; element: 'pyro'; weapon: 'sword' };
const character: CharacterPage = create_page(metadata);
type PreciseIcon = Assert<Equal<typeof character.icon, string>>;
const precise = create_page(metadata);
type PreciseStar = Assert<Equal<typeof precise.star, 4 | 5>>;
declare const optionalIcon: { id: string; name: string; icon?: string };
const nullable = create_page(optionalIcon);
type NullableIcon = Assert<Equal<typeof nullable.icon, string | null>>;

declare const entry: PageEntry;
const grouped = create_page({ id: 'demo', name: 'Demo', show: false as const, items: ['old'] as [string] }, entry);
type OverwrittenShow = Assert<Equal<typeof grouped.show, boolean>>;
// @ts-expect-error entry.show can be true, despite false metadata.
const stillFalse: false = grouped.show;
// @ts-expect-error entry replaces tuple contents and length.
const stillTuple: [string] = grouped.items;
const ungrouped = create_page({ id: 'demo', name: 'Demo', show: false as const });
type PreservedShow = Assert<Equal<typeof ungrouped.show, false>>;
const undefinedShow = create_page({ id: 'demo', name: 'Demo', show: undefined });
type HonestUndefined = Assert<Equal<typeof undefinedShow.show, undefined>>;
declare const optionalEntry: PageEntry | undefined;
const maybeGrouped = create_page({ id: 'demo', name: 'Demo', show: undefined }, optionalEntry);
type MaybeOverwritten = Assert<Equal<typeof maybeGrouped.show, boolean | undefined>>;
// @ts-expect-error extra metadata cannot replace a PageDataTrait field with an invalid type.
create_page({ id: 'demo', name: 'Demo', show: 'visible' });
// @ts-expect-error likewise for group metadata.
create_page({ id: 'demo', name: 'Demo', group: { id: 'demo', mode: 'typo' } });
// @ts-expect-error the low-level writer accepts documents, not arbitrary primitives.
export_category('unused', [], [{ id: 'demo', data: 42 }]);

const mapped = mapped_key({ X: 'x', Y: 'y' }, 'X', 'test');
type LiteralMap = Assert<Equal<typeof mapped, 'x' | 'y'>>;
// @ts-expect-error mapping values must belong to the public namespace.
const badMap = { TEXT: 'TEXT' } as const satisfies Record<string, MessageKind>;
// @ts-expect-error even a valid archive type is wrong in a different category.
const badArchiveMap = { card: 'furniture' } as const satisfies Record<string, ArchiveType<'tcg'>>;
const tutorial: TutorialCategory = ConvertRaw.get_tutorial_category('CODEX_ELEMENT');
const message: MessageKind = ConvertRaw.get_message_kind('TEXT');
const action: LoadingAction = ConvertRaw.get_loading_action('SITUATION_TYPE_LOGIN');
const terrain: LoadingTerrain = ConvertRaw.get_loading_terrain('LOADING_AREA_CITY');
const dungeon: LoadingDungeonType = ConvertRaw.get_loading_dungeon_type('DUNGEON_CHAR_MASTER');
const card: CardType = ConvertRaw.get_card_type('GCG_CARD_CHARACTER');
const archiveType = ConvertRaw.get_archive_type('tcg', 'card');
type BoundArchive = Assert<Equal<typeof archiveType, ArchiveType<'tcg'>>>;
// @ts-expect-error return type cannot be chosen independently of the category.
const wrongCategory: ArchiveType<'serenitea'> = archiveType;
const archive = get_archive_export('tcg', 'en');
type BoundDocument = Assert<Equal<typeof archive.files[number]['data']['type'], ArchiveType<'tcg'>>>;
type BoundPage = Assert<Equal<typeof archive.list[number]['type'], ArchiveType<'tcg'>>>;
type BoundTcg = Assert<Equal<ReturnType<typeof get_tcg_export>['files'][number]['data']['type'], ArchiveType<'tcg'>>>;
type BoundSerenitea = Assert<Equal<ReturnType<typeof get_serenitea_export>['list'][number]['type'], ArchiveType<'serenitea'>>>;
type BoundMiliastra = Assert<Equal<ReturnType<typeof get_miliastra_export>['files'][number]['data']['type'], ArchiveType<'miliastra'>>>;
declare const talk: ArchiveTalk & { conditions: [{ id: 'source'; subtitle: 'QUEST_COND_ACTIVITY_OPEN'; title: ''; type: 'boolean'; value: true }] };
const converted = ConvertRaw.convert_dialogue_keys(talk);
// @ts-expect-error rewriting string identities cannot promise preservation of source literals.
const unchanged: typeof talk = converted;
