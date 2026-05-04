import React, { useState } from 'react';
import { FESTIVAL_GOALS, MARKET_STOCK } from './data.js';
import { BIOMES } from '../../constants.js';

export const modalKey = 'festivals';

const ALL_RESOURCES = [...BIOMES.farm.resources, ...BIOMES.mine.resources];

function colorForKey(key) {
  const r = ALL_RESOURCES.find(x => x.key === key);
  if (!r) return '#888';
  return '#' + r.color.toString(16).padStart(6, '0');
}

function ProgressBar({ have, need, complete }) {
  const pct = Math.min((have / need) * 100, 100);
  return (
    <div className="w-full h-2 bg-[#e2d5bb] rounded-full overflow-hidden mt-0.5">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, backgroundColor: complete ? '#5aab30' : '#d4872a' }}
      />
    </div>
  );
}

function ResourceChip({ resKey, label }) {
  const bg = colorForKey(resKey);
  return (
    <span
      className="text-[10px] font-bold px-1.5 py-0.5 rounded text-white"
      style={{ backgroundColor: bg, border: '1px solid rgba(255,255,255,0.25)' }}
    >
      {label || resKey}
    </span>
  );
}

function DonateButtons({ resKey, have, need, contributed, dispatch }) {
  const remaining = Math.max(0, need - contributed);
  if (remaining === 0) return null;
  const canDonate = (amt) => have > 0 && remaining > 0 && amt > 0;
  const donate = (amt) => {
    if (amt > 0) dispatch({ type: 'FEST/CONTRIBUTE', resource: resKey, amount: amt });
  };
  return (
    <div className="flex gap-1 mt-1">
      {[1, 5].map(n => (
        <button
          key={n}
          disabled={!canDonate(n) || have < n}
          onClick={() => donate(n)}
          className="text-[10px] px-2 py-0.5 rounded border font-bold bg-[#f0e6d2] border-[#b28b62] text-[#6a4b31] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e8d8b8]"
        >
          +{n}
        </button>
      ))}
      <button
        disabled={!canDonate(1)}
        onClick={() => donate(Math.min(have, remaining))}
        className="text-[10px] px-2 py-0.5 rounded border font-bold bg-[#f0e6d2] border-[#b28b62] text-[#6a4b31] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#e8d8b8]"
      >
        +All
      </button>
    </div>
  );
}

function FestivalTab({ state, dispatch }) {
  const { festival, festivalContribution = {}, inventory = {} } = state;

  if (!festival) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6">
        <p className="text-[13px] text-[#8a6a4a] italic">No festival in season.</p>
        <button
          onClick={() => {
            const goals = FESTIVAL_GOALS;
            const goal = goals[Math.floor(Math.random() * goals.length)];
            dispatch({ type: 'FEST/START', id: goal.id });
          }}
          className="text-[12px] font-bold px-4 py-2 rounded-xl bg-[#91bf24] border-2 border-[#6a9010] text-white hover:bg-[#a3d028]"
        >
          🌼 Start a Test Festival
        </button>
      </div>
    );
  }

  const goal = FESTIVAL_GOALS.find(g => g.id === festival.id);
  const need = goal ? goal.need : festival.need || {};

  return (
    <div className="flex flex-col gap-2">
      <div>
        <p className="text-[14px] font-bold text-[#3a2715]">{festival.name}</p>
        <p className="text-[11px] italic text-[#8a6a4a]">{festival.flavor}</p>
      </div>

      <div className="flex flex-col gap-2 mt-1">
        {Object.entries(need).map(([res, amt]) => {
          const contributed = festivalContribution[res] || 0;
          const have = inventory[res] || 0;
          const complete = contributed >= amt;
          return (
            <div key={res} className="bg-[#fff8e8] rounded-xl p-2 border border-[#d4c09a]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ResourceChip resKey={res} label={res} />
                  <span className="text-[11px] text-[#6a4b31] font-bold">
                    {contributed}/{amt}
                  </span>
                  {complete && <span className="text-[11px] text-[#5aab30] font-bold">✓</span>}
                </div>
                <span className="text-[10px] text-[#8a6a4a]">have {have}</span>
              </div>
              <ProgressBar have={contributed} need={amt} complete={complete} />
              <DonateButtons
                resKey={res}
                have={have}
                need={amt}
                contributed={contributed}
                dispatch={dispatch}
              />
            </div>
          );
        })}
      </div>

      {festival.reward && (
        <p className="text-[11px] text-[#8a6a4a] mt-1">
          Reward: <span className="font-bold text-[#c8923a]">{festival.reward.coins}◉</span>
          {festival.reward.xp ? <span className="ml-2 font-bold text-[#5aab30]">+{festival.reward.xp} xp</span> : null}
        </p>
      )}

      {festival.complete && (
        <button
          onClick={() => dispatch({ type: 'FEST/CLAIM' })}
          className="mt-2 w-full py-2.5 rounded-xl bg-[#5aab30] border-2 border-[#3a8010] text-white font-bold text-[14px] hover:bg-[#6ac840]"
        >
          CLAIM REWARD
        </button>
      )}
    </div>
  );
}

function MarketCard({ item, state, dispatch }) {
  const inv = state.inventory || {};
  const coins = state.coins || 0;

  function affordable() {
    for (const [key, amt] of Object.entries(item.cost)) {
      if (key === 'coins') { if (coins < amt) return false; }
      else { if ((inv[key] || 0) < amt) return false; }
    }
    return true;
  }

  const canBuy = affordable();

  function costLabel() {
    return Object.entries(item.cost).map(([k, v]) => {
      if (k === 'coins') return `${v}◉`;
      return `${v} ${k}`;
    }).join(' + ');
  }

  function giveLabel() {
    const g = item.give;
    if (g.random) return 'Mystery gift';
    if (g.coins) return `+${g.coins}◉`;
    if (g.tool) return `+${g.amt || 1} ${g.tool}`;
    if (g.heirloom) return `Heirloom: ${g.heirloom}`;
    return Object.entries(g).map(([k, v]) => `+${v} ${k}`).join(', ');
  }

  return (
    <div className="bg-[#fff8e8] border border-[#d4c09a] rounded-xl p-2 flex flex-col gap-1 shadow-sm hover:bg-white transition-colors">
      <div className="flex items-center gap-1.5">
        <span className="text-[18px] leading-none">{item.icon}</span>
        <span className="font-bold text-[12px] text-[#3a2715] leading-tight">{item.name}</span>
      </div>
      <p className="text-[10px] text-[#8a6a4a] leading-snug">{item.desc}</p>
      <div className="flex items-center justify-between mt-auto pt-1 flex-wrap gap-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-bold text-[#c8923a]">{costLabel()}</span>
          <span className="text-[10px] text-[#5aab30] font-bold">{giveLabel()}</span>
        </div>
        <button
          disabled={!canBuy}
          onClick={() => dispatch({ type: 'MARKET/BUY', id: item.id })}
          className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border-2 ${
            canBuy
              ? 'bg-[#91bf24] border-[#6a9010] text-white hover:bg-[#a3d028]'
              : 'bg-[#ccc] border-[#aaa] text-[#666] cursor-not-allowed'
          }`}
        >
          BUY
        </button>
      </div>
    </div>
  );
}

function MarketTab({ state, dispatch }) {
  const { market = {} } = state;

  if (!market.open) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-6">
        <p className="text-[13px] text-[#8a6a4a] italic">The market is closed. Comes 'round on Fridays...</p>
        <button
          onClick={() => dispatch({ type: 'MARKET/ROLL' })}
          className="text-[12px] font-bold px-4 py-2 rounded-xl bg-[#c8923a] border-2 border-[#8a5a1a] text-white hover:bg-[#dda840]"
        >
          🎒 Open Market Now
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-2 gap-2">
        {(market.stock || []).map(item => (
          <MarketCard key={item.id} item={item} state={state} dispatch={dispatch} />
        ))}
      </div>
      <p className="text-[11px] italic text-[#8a6a4a] text-center mt-1">Wagon leaves at season end.</p>
    </div>
  );
}

export default function FestivalsModal({ state, dispatch }) {
  const [tab, setTab] = useState('festival');
  const { festival, market = {} } = state;

  const title = tab === 'festival'
    ? (festival ? festival.name : 'Festivals')
    : 'Wandering Market';

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50">
      <div className="bg-[#f4ecd8] border-[4px] border-[#b28b62] rounded-[20px] p-5 w-[min(640px,94vw)] max-h-[88vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <span className="font-bold text-[15px] text-[#3a2715]">{title}</span>
          <button
            onClick={() => dispatch({ type: 'CLOSE_MODAL' })}
            className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
          >
            ×
          </button>
        </div>

        <div className="flex gap-2 mb-4">
          {['festival', 'market'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`text-[12px] font-bold px-3 py-1 rounded-full border-2 transition-colors ${
                tab === t
                  ? 'bg-[#b28b62] border-[#8a6a42] text-white'
                  : 'bg-[#f0e6d2] border-[#b28b62] text-[#6a4b31] hover:bg-[#e8d8b8]'
              }`}
            >
              {t === 'festival' ? 'Festival' : 'Market'}
              {t === 'festival' && festival && !festival.complete && (
                <span className="ml-1 text-[#d4872a]">●</span>
              )}
              {t === 'market' && market.open && (
                <span className="ml-1 text-[#5aab30]">●</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'festival'
          ? <FestivalTab state={state} dispatch={dispatch} />
          : <MarketTab state={state} dispatch={dispatch} />
        }
      </div>
    </div>
  );
}
