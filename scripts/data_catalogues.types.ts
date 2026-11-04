// Compile-only cases, included by generator_boundaries.types.ts; never exported or executed.
import characters from '~/data/characters';
import materials from '~/data/materials';
import tasks from '~/data/tasks';
import chapters from '~/data/chapters';
import questItems from '~/data/quest_items';
import outfits from '~/data/outfits';
import tcg from '~/data/tcg';
import aliases from '~/data/archive_id_aliases';
import halls from '~/data/miliastra_hall_groups';
import maps from '~/data/maps';
import dependencies from '~/data/map_task_dependencies';

type Assert<T extends true> = T;
type IsTyped<T> = 0 extends (1 & T) ? false : true;
type Catalogues = {
    archive_id_aliases: typeof aliases;
    artifacts: typeof import('~/data/artifacts').default;
    books: typeof import('~/data/books').default;
    chapters: typeof chapters;
    characters: typeof characters;
    geographies: typeof import('~/data/geographies').default;
    living_beings: typeof import('~/data/living_beings').default;
    maps: typeof maps;
    map_task_dependencies: typeof dependencies;
    materials: typeof materials;
    miliastra: typeof import('~/data/miliastra').default;
    miliastra_hall_groups: typeof halls;
    misc: typeof import('~/data/misc').default;
    npcs: typeof import('~/data/npcs').default;
    outfits: typeof outfits;
    quest_items: typeof questItems;
    readables: typeof import('~/data/readables').default;
    serenitea: typeof import('~/data/serenitea').default;
    tasks: typeof tasks;
    tcg: typeof tcg;
    weapons: typeof import('~/data/weapons').default;
    weapon_refine_materials: typeof import('~/data/weapon_refine_materials').default;
};
type EveryCatalogueIsTyped = Assert<{
    [K in keyof Catalogues]: IsTyped<Catalogues[K]>;
}[keyof Catalogues]>;

// Valid maintained formats, including grouped entries and file-qualified quests.
materials.material.push('item', ['variant_a', 'variant_b']);
tasks.world_quests.fixture = 'Quest 1';
tasks.world_quests.variant = 'Quest 1, File 2';
chapters.world_quests.fixture = ['chapter_a', 'chapter_b'];
questItems.fixture = { first: 'QuestItem 1', second: 'QuestItem 2' };
outfits.weapon.fixture = { first: 1, second: 2 };
tcg.player.fixture = 'player-1';
aliases.tcg = { old: 'player-1' };
halls.push(['hall-1', 'hall-1001']);
maps.scenes.fixture = { source: 'scene-3', places: [], labels: [], areas: [], maskGroups: {} };
dependencies.edges.push({ from: { task: 'first', step: 1 }, to: { task: 'second', step: 2 } });

// @ts-expect-error lists contain names, not numeric IDs.
characters.push(1);
// @ts-expect-error grouped material lists cannot contain arbitrary objects.
materials.material.push({ name: 'item' });
// @ts-expect-error source aliases have the correct prefix and numeric ID.
tasks.world_quests.fixture = 'Quest not-a-number';
// @ts-expect-error task categories are a closed set.
tasks.future_quests = {};
// @ts-expect-error chapter groups are lists, not a single name.
chapters.world_quests.fixture = 'chapter_a';
// @ts-expect-error grouped quest items cannot refer to another data family.
questItems.fixture = { first: 'NPC 1' };
// @ts-expect-error outfit source IDs are numeric, including grouped variants.
outfits.weapon.fixture = { first: '1' };
// @ts-expect-error a player entry cannot refer to a card source.
tcg.player.fixture = 'card-1';
// @ts-expect-error aliases stay inside their archive category.
aliases.tcg = { old: 'furniture-1' };
// @ts-expect-error halls are paired, not singleton groups.
halls.push(['hall-1']);
// @ts-expect-error map sources refer to scenes.
maps.scenes.fixture.source = 'hall-1';
// @ts-expect-error maintained selections contain arrays, not parsed Sets.
maps.scenes.fixture.labels = new Set<string>();
// @ts-expect-error the dependency schema version is fixed.
dependencies.schema = 2;
// @ts-expect-error task step IDs are numbers.
dependencies.edges.push({ from: { task: 'first', step: '1' }, to: { task: 'second', step: 2 } });
