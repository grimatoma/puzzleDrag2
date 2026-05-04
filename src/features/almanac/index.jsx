import QuestsScreen from "../quests/index.jsx";

export const viewKey = "almanac";

export default function AlmanacProxy({ state, dispatch }) {
  return <QuestsScreen state={state} dispatch={dispatch} initialTab="almanac" />;
}
