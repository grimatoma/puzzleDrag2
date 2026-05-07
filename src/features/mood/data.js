export const NPC_FAVORITES = {
  mira:  { favorite: 'grain_flour', dislike: 'mine_coal' },
  tomas: { favorite: 'berry_jam',   dislike: 'mine_stone' },
  bram:  { favorite: 'mine_ingot', dislike: 'berry' },
  liss:  { favorite: 'berry_jam',   dislike: 'mine_coal' },
  wren:  { favorite: 'wood_plank', dislike: 'mine_gem' },
};

export const MOOD_STATES = [
  { name: 'Sour',    minHearts: 0, modifier: 0.70, color: '#5a6973', icon: '😒' },
  { name: 'Cool',    minHearts: 2, modifier: 0.85, color: '#9a8a72', icon: '😐' },
  { name: 'Warm',    minHearts: 5, modifier: 1.00, color: '#c8923a', icon: '🙂' },
  { name: 'Beloved', minHearts: 8, modifier: 1.25, color: '#d6612a', icon: '😄' },
];

/** Return the MOOD_STATES entry that applies to a given bond value. */
export function moodForBond(bond) {
  let mood = MOOD_STATES[0];
  for (const m of MOOD_STATES) {
    if (bond >= m.minHearts) mood = m;
  }
  return mood;
}
