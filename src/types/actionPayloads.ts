/**
 * Discriminated reducer actions — `type` narrows `payload` and legacy top-level fields.
 * The full {@link ActionType} catalog is covered by {@link TypedAction}; {@link GenericAction}
 * is intentionally uninhabited (compile-time guard in `actionCatalogCoverage.ts`).
 */

import type { ActionType } from "./actions.js";
import type { ResourceKey, ToolKey } from "./catalogKeys.js";
import type { Grid, Tile } from "./state.js";
import type { ToolPower } from "../state/toolPowerRuntime.js";

// ── Shared payload shapes ───────────────────────────────────────────────────

export interface ChainCollectedPayload {
  gains?: Record<string, number>;
  key: string;
  gained: number;
  upgrades?: number;
  value?: number;
  chainLength?: number;
  noTurn?: boolean;
  /** Boss slice progress key (alias of resourceKey). */
  resource?: string;
  resourceKey?: string;
  chain?: Tile[];
}

export interface ToolFiredFields {
  key?: ToolKey;
  row?: number;
  col?: number;
}

export interface UseToolPayload {
  id?: string;
  key?: ToolKey;
  power?: ToolPower;
}

export interface RouteSnapshot {
  view?: string;
  modal?: string | null;
  viewParams?: Record<string, unknown>;
  modalParams?: { tab?: string };
}

export interface CraftingPayload {
  key?: string;
  station?: string;
}

export interface StoryPickChoicePayload {
  choiceId?: string;
  value?: unknown;
}

export interface SettlementPayload {
  zoneId?: string;
  name?: string;
  biome?: string;
}

export interface KeeperPayload {
  zoneId?: string;
  path?: string;
  won?: boolean;
}

export interface BuildingPayload {
  id?: string;
  plot?: number;
}

export interface MarketSellPayload {
  resource?: ResourceKey;
  qty?: number;
}

export interface CastleContributePayload {
  key?: string;
  amount?: number;
}

// ── Typed actions (bridge + core reducer hot paths) ───────────────────────

export interface VisualLoadStateAction {
  type: "VISUAL/LOAD_STATE";
  payload?: {
    state?: import("./state.js").GameState;
    /** Visual scenario id (bridge only; ignored by reducer). */
    id?: string;
  };
  state?: import("./state.js").GameState;
}

export interface GridSyncAction {
  type: "GRID/SYNC";
  payload: { grid: Grid };
}

export interface ChainCollectedAction {
  type: "CHAIN_COLLECTED";
  payload: ChainCollectedPayload;
}

export interface TurnInOrderAction {
  type: "TURN_IN_ORDER";
  id: number;
}

export interface CraftToolAction {
  type: "CRAFT_TOOL";
  id?: string;
  payload?: { id?: string };
}

export interface ToolFiredAction {
  type: "TOOL_FIRED";
  payload?: ToolFiredFields;
  key?: ToolKey;
  row?: number;
  col?: number;
}

export interface UseToolAction {
  type: "USE_TOOL";
  key?: ToolKey;
  payload?: UseToolPayload;
}

export interface SwitchBiomeAction {
  type: "SWITCH_BIOME";
  key?: string;
  payload?: { biome?: string };
}

export interface SetViewAction {
  type: "SET_VIEW";
  view: string;
  viewParams?: Record<string, unknown>;
  craftingTab?: string | null;
}

export interface SetViewParamsAction {
  type: "SET_VIEW_PARAMS";
  params?: Record<string, unknown>;
}

export interface SettlementNameAction {
  type: "SET_SETTLEMENT_NAME";
  payload?: SettlementPayload;
  zoneId?: string;
  name?: string;
}

export interface FoundSettlementAction {
  type: "FOUND_SETTLEMENT";
  payload?: SettlementPayload;
  zoneId?: string;
}

export interface KeeperConfrontAction {
  type: "KEEPER/CONFRONT";
  payload?: KeeperPayload;
  zoneId?: string;
  path?: string;
}

export interface KeeperStartTrialAction {
  type: "KEEPER/START_TRIAL";
  payload?: KeeperPayload;
  zoneId?: string;
  path?: string;
}

export interface KeeperAppeaseAction {
  type: "KEEPER/APPEASE";
  payload?: KeeperPayload;
  zoneId?: string;
}

export interface KeeperTrialResolveAction {
  type: "KEEPER/TRIAL_RESOLVE";
  payload?: KeeperPayload;
  won?: boolean;
}

export interface OpenModalAction {
  type: "OPEN_MODAL";
  modal: string | null;
  settingsTab?: string;
}

export interface RouteApplyAction {
  type: "ROUTE/APPLY";
  route?: RouteSnapshot;
}

export interface BuildAction {
  type: "BUILD";
  payload?: BuildingPayload;
  plot?: number;
  building?: { id: string; name: string; cost: Record<string, number> };
}

export interface CraftingRecipeAction {
  type: "CRAFTING/CRAFT_RECIPE";
  recipeKey?: string;
  payload?: CraftingPayload;
}

export interface CraftingQueueAction {
  type: "CRAFTING/QUEUE_RECIPE";
  recipeKey?: string;
  payload?: CraftingPayload;
}

export interface CraftingClaimAction {
  type: "CRAFTING/CLAIM_CRAFT";
  station?: string;
  payload?: CraftingPayload;
}

export interface CraftingSkipAction {
  type: "CRAFTING/SKIP_CRAFT";
  station?: string;
  payload?: CraftingPayload;
}

export interface TradeResourcePayload {
  key: ResourceKey;
  qty: number;
}

export interface BuyResourceAction {
  type: "BUY_RESOURCE";
  payload: TradeResourcePayload;
}

export interface SellResourceAction {
  type: "SELL_RESOURCE";
  payload: TradeResourcePayload;
}

export interface CartoTravelAction {
  type: "CARTO/TRAVEL";
  nodeId?: string;
  payload?: { nodeId?: string };
}

export interface StoryPickChoiceAction {
  type: "STORY/PICK_CHOICE";
  payload?: StoryPickChoicePayload;
  choiceId?: string;
  value?: unknown;
}

export interface SettingsToggleAction {
  type: "SETTINGS/TOGGLE";
  key: string;
}

export interface SettingsSetTabAction {
  type: "SETTINGS/SET_TAB";
  tab: string;
}

export interface MarketSellAction {
  type: "MARKET/SELL";
  payload?: MarketSellPayload;
}

export interface BuildDecorationAction {
  type: "BUILD_DECORATION";
  payload: { id: string };
}

export interface CastleContributeAction {
  type: "CASTLE/CONTRIBUTE";
  payload: CastleContributePayload;
}

export interface FarmEnterAction {
  type: "FARM/ENTER";
  payload?: { selectedTiles?: unknown; useFertilizer?: unknown };
}

export interface ExpeditionDepartAction {
  type: "EXPEDITION/DEPART";
  payload?: { biomeKey?: string; supply?: Record<string, number> };
}

export interface BossTriggerAction {
  type: "BOSS/TRIGGER";
  bossKey?: string;
}

export interface BossResolveAction {
  type: "BOSS/RESOLVE";
  won?: boolean;
}

export type BossUiAction = {
  type: "BOSS/CLOSE" | "BOSS/MINIMIZE" | "BOSS/EXPAND" | "BOSS/REJECT";
};

export interface QuestProgressAction {
  type: "QUESTS/PROGRESS_QUEST";
  key: string;
  amount: number;
}

export interface QuestClaimAction {
  type: "QUESTS/CLAIM_QUEST";
  id: string;
}

export interface QuestClaimAlmanacAction {
  type: "QUESTS/CLAIM_ALMANAC";
  tier: number;
}

export interface ConvertToSupplyAction {
  type: "CONVERT_TO_SUPPLY";
  payload?: { qty?: number };
}

export interface CraftAction {
  type: "CRAFT";
  payload?: { id?: string; qty?: number };
}

export interface GrantRunesAction {
  type: "GRANT_RUNES";
  payload?: { amount?: number };
}

export interface SellItemAction {
  type: "SELL_ITEM";
  id?: string;
  qty?: number;
  payload?: { id?: string; qty?: number };
}

export interface SetBiomeAction {
  type: "SET_BIOME";
  id?: string;
  payload?: { id?: string };
}

export interface SetActiveTileAction {
  type: "SET_ACTIVE_TILE";
  payload: { category: string; tileId: string | null };
}

export interface TileDiscoveredAction {
  type: "TILE_DISCOVERED";
  payload: { ids: string[] };
}

export interface BuyTileAction {
  type: "BUY_TILE";
  payload: { id: string };
}

export interface GiveGiftAction {
  type: "GIVE_GIFT";
  payload: { npcId: string; itemKey: string };
}

export interface LoginTickAction {
  type: "LOGIN_TICK";
  payload?: { today?: string };
}

export interface BoonPurchaseAction {
  type: "BOON/PURCHASE";
  payload?: { id?: string };
  id?: string;
}

export interface WorkersHireAction {
  type: "WORKERS/HIRE";
  payload: { id: string };
}

export interface WorkersFireAction {
  type: "WORKERS/FIRE";
  payload: { id: string };
}

export interface StoryBeatFiredAction {
  type: "STORY/BEAT_FIRED";
  payload: {
    firedBeat: unknown;
    newFlags: Record<string, boolean>;
    sideEffects: unknown;
    repeatCooldown?: unknown;
  };
}

export interface SummonMagicToolAction {
  type: "SUMMON_MAGIC_TOOL";
  payload?: { id?: string };
}

export interface SessionStartAction {
  type: "SESSION_START";
}

export interface FertilizerConsumedAction {
  type: "FERTILIZER/CONSUMED";
}

export interface EndTurnAction {
  type: "END_TURN";
}

export interface CloseSeasonAction {
  type: "CLOSE_SEASON";
}

export interface AdvanceSeasonAction {
  type: "ADVANCE_SEASON";
}

export interface ActivateRuneWildcardAction {
  type: "ACTIVATE_RUNE_WILDCARD";
}

export interface FishForceTideFlipAction {
  type: "FISH/FORCE_TIDE_FLIP";
}

// ── Modal / NPC / migration (core reducer) ───────────────────────────────────

export interface CancelToolAction {
  type: "CANCEL_TOOL";
}

export interface CloseModalAction {
  type: "CLOSE_MODAL";
}

export interface PopNpcAction {
  type: "POP_NPC";
  npc: string;
  text: string;
  ms?: number;
}

export interface DismissBubbleAction {
  type: "DISMISS_BUBBLE";
  id: number;
}

export interface MigrateApplyCapsAction {
  type: "MIGRATE/APPLY_CAPS";
}

// ── Run summary (catalog + slice) ───────────────────────────────────────────

export interface RunSummaryOpenAction {
  type: "RUN_SUMMARY/OPEN";
}

export interface RunSummaryCloseAction {
  type: "RUN_SUMMARY/CLOSE";
}

// ── Settings (beyond TOGGLE / SET_TAB) ─────────────────────────────────────

export interface SettingsOpenDebugAction {
  type: "SETTINGS/OPEN_DEBUG";
}

export interface SettingsLeaveBoardAction {
  type: "SETTINGS/LEAVE_BOARD";
}

export interface SettingsResetSaveAction {
  type: "SETTINGS/RESET_SAVE";
}

export interface SettingsShowTutorialAction {
  type: "SETTINGS/SHOW_TUTORIAL";
}

// ── Story / tutorial (slices) ───────────────────────────────────────────────

export interface StoryDismissModalAction {
  type: "STORY/DISMISS_MODAL";
}

export interface TutorialStartAction {
  type: "TUTORIAL/START";
}

export interface TutorialNextAction {
  type: "TUTORIAL/NEXT";
}

export interface TutorialPrevAction {
  type: "TUTORIAL/PREV";
}

export interface TutorialSkipAction {
  type: "TUTORIAL/SKIP";
}

// ── Dev panel (debug; core reducer default branch) ───────────────────────────

export interface DevAddGoldAction {
  type: "DEV/ADD_GOLD";
  amount?: number;
}

export interface DevFillStorageAction {
  type: "DEV/FILL_STORAGE";
  amount?: number;
}

export interface DevAddItemAction {
  type: "DEV/ADD_ITEM";
  key: string;
  amount?: number;
}

export interface DevAddXpAction {
  type: "DEV/ADD_XP";
  amount?: number;
}

export interface DevAddLevelAction {
  type: "DEV/ADD_LEVEL";
  amount?: number;
}

export interface DevAddAlmanacXpAction {
  type: "DEV/ADD_ALMANAC_XP";
  amount?: number;
}

export interface DevAddRunesAction {
  type: "DEV/ADD_RUNES";
  amount?: number;
}

export interface DevAddInfluenceAction {
  type: "DEV/ADD_INFLUENCE";
  amount?: number;
}

export interface DevFillToolsAction {
  type: "DEV/FILL_TOOLS";
  amount?: number;
}

export interface DevAddSuppliesAction {
  type: "DEV/ADD_SUPPLIES";
  amount?: number;
}

export interface DevBuildAllAction {
  type: "DEV/BUILD_ALL";
}

export interface DevResetGameAction {
  type: "DEV/RESET_GAME";
}

/** Action types with dedicated interfaces in this module. */
export type TypedActionType =
  | VisualLoadStateAction["type"]
  | GridSyncAction["type"]
  | ChainCollectedAction["type"]
  | TurnInOrderAction["type"]
  | CraftToolAction["type"]
  | ToolFiredAction["type"]
  | UseToolAction["type"]
  | SwitchBiomeAction["type"]
  | SetViewAction["type"]
  | SetViewParamsAction["type"]
  | SettlementNameAction["type"]
  | FoundSettlementAction["type"]
  | KeeperConfrontAction["type"]
  | KeeperStartTrialAction["type"]
  | KeeperAppeaseAction["type"]
  | KeeperTrialResolveAction["type"]
  | OpenModalAction["type"]
  | RouteApplyAction["type"]
  | BuildAction["type"]
  | CraftingRecipeAction["type"]
  | CraftingQueueAction["type"]
  | CraftingClaimAction["type"]
  | CraftingSkipAction["type"]
  | BuyResourceAction["type"]
  | SellResourceAction["type"]
  | CartoTravelAction["type"]
  | StoryPickChoiceAction["type"]
  | SettingsToggleAction["type"]
  | SettingsSetTabAction["type"]
  | MarketSellAction["type"]
  | BuildDecorationAction["type"]
  | CastleContributeAction["type"]
  | FarmEnterAction["type"]
  | ExpeditionDepartAction["type"]
  | BossTriggerAction["type"]
  | BossResolveAction["type"]
  | BossUiAction["type"]
  | QuestProgressAction["type"]
  | QuestClaimAction["type"]
  | QuestClaimAlmanacAction["type"]
  | ConvertToSupplyAction["type"]
  | CraftAction["type"]
  | GrantRunesAction["type"]
  | SellItemAction["type"]
  | SetBiomeAction["type"]
  | SetActiveTileAction["type"]
  | TileDiscoveredAction["type"]
  | BuyTileAction["type"]
  | GiveGiftAction["type"]
  | LoginTickAction["type"]
  | BoonPurchaseAction["type"]
  | WorkersHireAction["type"]
  | WorkersFireAction["type"]
  | StoryBeatFiredAction["type"]
  | SummonMagicToolAction["type"]
  | SessionStartAction["type"]
  | FertilizerConsumedAction["type"]
  | EndTurnAction["type"]
  | CloseSeasonAction["type"]
  | AdvanceSeasonAction["type"]
  | ActivateRuneWildcardAction["type"]
  | FishForceTideFlipAction["type"]
  | CancelToolAction["type"]
  | CloseModalAction["type"]
  | PopNpcAction["type"]
  | DismissBubbleAction["type"]
  | MigrateApplyCapsAction["type"]
  | RunSummaryOpenAction["type"]
  | RunSummaryCloseAction["type"]
  | SettingsOpenDebugAction["type"]
  | SettingsLeaveBoardAction["type"]
  | SettingsResetSaveAction["type"]
  | SettingsShowTutorialAction["type"]
  | StoryDismissModalAction["type"]
  | TutorialStartAction["type"]
  | TutorialNextAction["type"]
  | TutorialPrevAction["type"]
  | TutorialSkipAction["type"]
  | DevAddGoldAction["type"]
  | DevFillStorageAction["type"]
  | DevAddItemAction["type"]
  | DevAddXpAction["type"]
  | DevAddLevelAction["type"]
  | DevAddAlmanacXpAction["type"]
  | DevAddRunesAction["type"]
  | DevAddInfluenceAction["type"]
  | DevFillToolsAction["type"]
  | DevAddSuppliesAction["type"]
  | DevBuildAllAction["type"]
  | DevResetGameAction["type"];

export type TypedAction =
  | VisualLoadStateAction
  | GridSyncAction
  | ChainCollectedAction
  | TurnInOrderAction
  | CraftToolAction
  | ToolFiredAction
  | UseToolAction
  | SwitchBiomeAction
  | SetViewAction
  | SetViewParamsAction
  | SettlementNameAction
  | FoundSettlementAction
  | KeeperConfrontAction
  | KeeperStartTrialAction
  | KeeperAppeaseAction
  | KeeperTrialResolveAction
  | OpenModalAction
  | RouteApplyAction
  | BuildAction
  | CraftingRecipeAction
  | CraftingQueueAction
  | CraftingClaimAction
  | CraftingSkipAction
  | BuyResourceAction
  | SellResourceAction
  | CartoTravelAction
  | StoryPickChoiceAction
  | SettingsToggleAction
  | SettingsSetTabAction
  | MarketSellAction
  | BuildDecorationAction
  | CastleContributeAction
  | FarmEnterAction
  | ExpeditionDepartAction
  | BossTriggerAction
  | BossResolveAction
  | BossUiAction
  | QuestProgressAction
  | QuestClaimAction
  | QuestClaimAlmanacAction
  | ConvertToSupplyAction
  | CraftAction
  | GrantRunesAction
  | SellItemAction
  | SetBiomeAction
  | SetActiveTileAction
  | TileDiscoveredAction
  | BuyTileAction
  | GiveGiftAction
  | LoginTickAction
  | BoonPurchaseAction
  | WorkersHireAction
  | WorkersFireAction
  | StoryBeatFiredAction
  | SummonMagicToolAction
  | SessionStartAction
  | FertilizerConsumedAction
  | EndTurnAction
  | CloseSeasonAction
  | AdvanceSeasonAction
  | ActivateRuneWildcardAction
  | FishForceTideFlipAction
  | CancelToolAction
  | CloseModalAction
  | PopNpcAction
  | DismissBubbleAction
  | MigrateApplyCapsAction
  | RunSummaryOpenAction
  | RunSummaryCloseAction
  | SettingsOpenDebugAction
  | SettingsLeaveBoardAction
  | SettingsResetSaveAction
  | SettingsShowTutorialAction
  | StoryDismissModalAction
  | TutorialStartAction
  | TutorialNextAction
  | TutorialPrevAction
  | TutorialSkipAction
  | DevAddGoldAction
  | DevFillStorageAction
  | DevAddItemAction
  | DevAddXpAction
  | DevAddLevelAction
  | DevAddAlmanacXpAction
  | DevAddRunesAction
  | DevAddInfluenceAction
  | DevFillToolsAction
  | DevAddSuppliesAction
  | DevBuildAllAction
  | DevResetGameAction;

/** Remaining catalog actions — must stay empty; add a {@link TypedAction} branch instead. */
export interface GenericAction {
  type: Exclude<ActionType, TypedActionType>;
  payload?: unknown;
  readonly [key: string]: unknown;
}

export type Action = TypedAction | GenericAction;
