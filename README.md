Images Regex: `(UI_AvatarIcon_*)|(UI_Gacha_AvatarImg_*)|(Skill_*)|(UI_Talent_*)|(UI_EquipIcon_*)|(UI_RelicIcon_*)|(UI_ItemIcon_*)|(UI_MonsterIcon_*)|(UI_AnimalIcon_*)|(UI_Codex_Scenery_*)|(UI_DungeonPic_*)|(DungeonPic_*)|(UI_Map_*)|(UI_BigWorld_*)|(UI_ChapterIcon_*)|(UI_GcgIcon_*)`

## Books and readables

After exporting `books` and `documents` with GenshinData-scripts and rebuilding their genshin-db indexes:

```sh
npm run gen:reading-lists
npm run gen:reading
npm run check:reading
```

The normal `npm run gen` also exports both categories. Copy `data/books.json`, `data/readables.json`, the language-specific `book` and `readable` directories, and their image directories into the frontend's `data` directory.

`src/data/books.js` follows `BooksCodex.sortOrder`, then `codexId`. Book details use the common item format.

`src/data/readables.js` follows `Document.id`. Only entries with an English title and readable content are listed. Public IDs derive from the English title; duplicate titles use `-0`, `-1`, etc. Punctuation-only titles use their Unicode code points. Internal `Document <id>` values are lookup aliases, not public IDs. Details contain only `name` and `content`; content parts retain the source `questIDList` order.

Readable illustrations require the PNG assets referenced by `<image name=.../>` in the source text, including `UI_ReadPic_*`, `UI_QuestPicture_*`, and older map/letter images. Add these assets to `src/images` before exporting; missing files are reported by the existing image converter.
