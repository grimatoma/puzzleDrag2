## Attributes vs. Powers rename — code level (deferred)

The Dev Panel UI now uses "Attributes" (passive, was "Abilities") and
"Powers" (active, tool effects). Code identifiers still use the old vocabulary.
When ready to migrate:

- src/config/abilities.js → src/config/attributes.js; exports ABILITIES → ATTRIBUTES, getAbility → getAttribute, abilitiesForScope → attributesForScope, defaultParamsFor → defaultsForAttribute, ABILITY_PARAM_TYPES → ATTRIBUTE_PARAM_TYPES, ABILITY_SCOPES → ATTRIBUTE_SCOPES.
- src/config/abilitiesAggregate.js and applyAbilityToChannels / dispatchAbilityFired → rename in lockstep.
- The `abilities` field on tile / worker / building data and the draft shape (`draft.tilePowers[*].abilities`) → `attributes`. Requires a migration in the reducer or a SAVE_SCHEMA_VERSION bump (see CLAUDE.md).
- src/balanceManager/AbilitiesEditor.jsx → AttributesEditor.jsx; AbilitiesReferenceTab → AttributesReferenceTab; TABS entry id `abilities` → `attributes` (router hash will break — note in commit).
- Visual-test scenario ids referencing "abilities" need updating too.
