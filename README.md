Images Regex: `(UI_AvatarIcon_*)|(UI_Gacha_AvatarImg_*)|(Skill_*)|(UI_Talent_*)|(UI_EquipIcon_*)|(UI_RelicIcon_*)|(UI_ItemIcon_*)|(UI_MonsterIcon_*)|(UI_AnimalIcon_*)|(UI_Codex_Scenery_*)|(UI_DungeonPic_*)|(DungeonPic_*)|(UI_Map_*)|(UI_BigWorld_*)|(UI_ChapterIcon_*)|(UI_GcgIcon_*)`

## Books and readables

After exporting `books` and `documents` with GenshinData-scripts and rebuilding their genshin-db indexes:

```sh
npm run gen:reading-lists
npm run gen:reading
npm run check:reading
```

The normal `npm run gen` also exports both categories. Copy the generated `data` directory into the frontend's `data` directory.

`src/data/books.js` contains a flat volume list, ordered by `BooksCodex.sortOrder`, then `codexId`.
`src/book.ts` automatically groups those volumes by their source `setId` (BookSuit)
during the normal export. No separate grouping script or pre-generated group list is required.
Collection IDs derive from their English `setName`; duplicate IDs use `-0`, `-1`, etc.
Collisions with volume IDs use `-group`, including single-volume collections.
Collections follow their first volume's `BooksCodex.sortOrder`, then `codexId`;
volumes within each collection follow the same ordering.
Visible collection pages use the localized `setName`, never a volume's title.
Volume pages are hidden from the list and keep their original titles and related volumes.
Only individual volumes are exported as common item data objects, with their existing IDs.

`src/data/readables.js` follows `Document.id`. Only entries with an English title and readable content are listed. Public IDs derive from the English title; duplicate titles use `-0`, `-1`, etc. Punctuation-only titles use their Unicode code points. Internal `Document <id>` values are lookup aliases, not public IDs. Details contain only `name` and `content`; content parts retain the source `questIDList` order.

Readable illustrations require the PNG assets referenced by `<image name=.../>` in the source text, including `UI_ReadPic_*`, `UI_QuestPicture_*`, and older map/letter images. Add these assets to `src/images` before exporting; missing files are reported by the existing image converter.

## Pages and Data Objects

`src/data` is a handwritten generator input. It is never exported as a runtime index.
Every category except maps exports three kinds of files:

```text
data/common/<category>/ids.json
data/<language>/<category>/pages.json
data/<language>/<category>/items/<id>.json
```

Each data file represents one source record. Each page extends `PageDataTrait`;
its `items` and `related_items` reference data IDs, never other page IDs.
Page lists include hidden member pages. Only `show: true` pages appear in list views.
Detail views resolve a page ID first, then fetch each referenced data object.

Named groups retain their explicit IDs. Anonymous groups use the last member ID
with its trailing `-<number>` removed, followed by `-group`.
Group pages contain every member in `items`; member pages contain themselves in
`items` and their siblings in `related_items`. Member pages have `show: false`.
Detail views currently render `items` and `related_items` together, without duplicates.
Group display metadata comes from the last member. List badges use `items.length`.
Chapter groups remain single data objects; their pages carry chapter and task counts.
Tasks carry their description, chapter, type, and hidden-title state in the page list.

Use `npm run check:exports` to check IDs, page references, grouping, object shapes,
and language consistency. To convert an existing export without regenerating content:

```sh
npm run migrate:exports -- D:/Inteyvat-Wiki-data --dry-run
npm run migrate:exports -- D:/Inteyvat-Wiki-data
npm run migrate:exports -- D:/Inteyvat-Wiki
npm run check:exports -- D:/Inteyvat-Wiki
```

Migration removes legacy indexes and detail files after writing the new format.
Language-independent data exports live in `data/common`, alongside `data/zh_hans`
and `data/en`. It also contains `menu.json` and `maps.json`.
Images live separately in `data/images`.
Image URLs still use `/images/...`; language-specific map files keep their structure.
The migration command also moves existing shared data into `common` and restores
any `common/images` directory to `data/images`, without backups.
