import React from "react";
import Icon from "./Icon.jsx";

/**
 * Parses a string containing `[icon:key]` tokens and renders them as `<Icon />` components.
 */
export default function RichText({ text, iconSize = 16 }) {
  if (typeof text !== "string") return <>{text}</>;

  const regex = /\[icon:([a-zA-Z0-9_]+)\]/g;
  const parts = [];
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const iconKey = match[1];
    parts.push(
      <span key={`icon-${match.index}`} className="mx-0.5 inline-block align-text-bottom">
        <Icon iconKey={iconKey} size={iconSize} />
      </span>
    );
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return <>{parts}</>;
}
