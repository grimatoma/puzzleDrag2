import React from "react";
import { InventoryGrid } from "../../ui.jsx";

export const viewKey = "inventory";

export default function InventoryScreen({ state, dispatch }) {
  return (
    <div className="absolute inset-0 bg-gradient-to-b from-[#7c4f2c] to-[#6b4225] border-[3px] border-[#e2c19b] flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 flex-shrink-0 border-b border-[#e2c19b]/40">
        <span className="font-bold text-[14px] text-[#f8e7c6]">🎒 Inventory</span>
        <button
          onClick={() => dispatch({ type: "SET_VIEW", view: "town" })}
          className="w-7 h-7 rounded-lg bg-[#f6efe0] border-2 border-[#b28b62] grid place-items-center text-[#6a4b31] font-bold text-[14px]"
        >✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-3 py-3">
        <InventoryGrid inventory={state.inventory} biomeKey={state.biomeKey} />
      </div>
    </div>
  );
}
