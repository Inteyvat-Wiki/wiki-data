export type ElementType = 'pyro' | 'hydro' | 'anemo' | 'electro' | 'dendro' | 'cryo' | 'geo';

export type WeaponType = 'sword' | 'claymore' | 'polearm' | 'bow' | 'catalyst';

export type MaterialType = 'forge' | 'material'
    | 'develop'
    | 'character_develop' | 'character_ascension' | 'character_talent'
    | 'talent_develop'
    | 'weapon_ascension'
    | 'precious' | 'chest' | 'gadget'
    | 'wood' | 'fish' | 'food';

export type LivingBeingType =
    'enemy_elemental' | 'enemy_hilichurl' | 'enemy_abyss' | 'enemy_fatui' | 'enemy_automaton' | 'enemy_human' | 'enemy_others' | 'enemy_boss'
    | 'animal_bird' | 'animal_beast' | 'animal_fish' | 'animal_others';

export type GeographyType = 'viewpoint' | 'dungeon';
export type GeographyArea = 'mondstadt' | 'liyue' | 'inazuma' | 'sumeru' | 'fontaine' | 'natlan' | 'nod-krai';

export type PageDataTrait = {
    id: string,
    name: string,
    icon: string | null,
    star: 1 | 2 | 3 | 4 | 5 | null,
    show: boolean,
    items: string[],
    related_items: string[],
};

export type ItemCommon<ItemTypes extends string | null = string> = {
    name: string,
    icon: string,
    star: 1 | 2 | 3 | 4 | 5 | null,
    type: ItemTypes,
    info: ({
        title: string,
        description: string,
        type: 'description',
    } | {
        title: string | null,
        description: string,
        type: 'normal' | 'text',
    } | {
        title: string | null,
        description: string[],
        type: 'text-list',
    })[],
};
