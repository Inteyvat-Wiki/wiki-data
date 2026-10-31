# Archive publication boundary

GenshinData-scripts calibrates game fields, source exceptions and relationships.
genshin-db retains full source records, including hidden topics and resource metadata.
Wiki-data queries that interface, explicitly maps enums, selects publication assets
and converts dialogue structures. Wiki consumes the resulting display contract.

- Furniture selection uses exported `furniture_type`, mapped in ConvertRaw. Virtual
  furniture and suite placeholders are commented in the maintained directory; no
  ID-specific selection logic belongs in Wiki-data.
- Empty tutorial exceptions and their change guards live upstream. Wiki-data uses
  `show` normally. Missing detail references are not repaired by guessed ID edits.
- TCG biography time slots and circular portrait fields are resolved upstream.
- `convert_archive_images` validates all image kinds before selecting publication
  resources. Numeric resource keys, prefabs/configs, unused card faces, stage
  backgrounds and suite layout images stay upstream. Named, resolved hash icons
  remain valid illustrations.
- A source preview's `replaces` metadata describes its matching thumbnail. Wiki-data
  omits that thumbnail only when the replacement resolves. The UI never infers
  relationships from game filenames.
- Old generated PNGs can be moved to a recoverable backup with
  `node scripts/prune_archive_images.cjs OUTPUT NEW_BACKUP --apply`. Without
  `--apply` this only reports candidates. Both languages and all four categories
  are checked; every published image must exist before any moves occur. Source
  `src/images` and AnimeStudio extraction directories are never touched.
