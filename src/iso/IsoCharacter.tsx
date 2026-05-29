// A simple billboarded character for the isometric prototype: a little
// front-facing figure (the standard cheap approach for iso prototypes — it
// reads fine and avoids per-direction spritesheets). Returns a <g> meant to be
// embedded in IsoPrototype's <svg>. `x`/`y` is the screen position of the
// figure's feet (the projected grid position); the body is drawn above it.
// `walking` drives a subtle bob via the shared `bob` keyframe (src/index.css).

export default function IsoCharacter({
  x,
  y,
  walking,
}: {
  x: number;
  y: number;
  walking: boolean;
}) {
  return (
    <g transform={`translate(${x} ${y})`}>
      {/* ground shadow */}
      <ellipse cx="0" cy="0" rx="9" ry="3.5" fill="rgba(0,0,0,.28)" />
      {/* body group bobs while walking */}
      <g
        style={
          walking
            ? { animation: "bob 0.4s ease-in-out infinite", transformOrigin: "0px -8px" }
            : undefined
        }
      >
        {/* legs */}
        <rect x="-5" y="-12" width="3.5" height="8" rx="1.4" fill="#3a4a63" />
        <rect x="1.5" y="-12" width="3.5" height="8" rx="1.4" fill="#3a4a63" />
        {/* torso (tunic) */}
        <path d="M-7,-26 Q-7,-30 0,-30 Q7,-30 7,-26 L6,-10 Q0,-7 -6,-10 Z" fill="#c7522a" />
        {/* belt */}
        <rect x="-6.4" y="-15" width="12.8" height="2.6" rx="1" fill="#6e3417" />
        {/* arms */}
        <rect x="-9" y="-27" width="3" height="13" rx="1.5" fill="#b1471f" />
        <rect x="6" y="-27" width="3" height="13" rx="1.5" fill="#b1471f" />
        {/* head */}
        <circle cx="0" cy="-34" r="6.2" fill="#e8b88f" />
        {/* hair cap */}
        <path d="M-6.2,-35 Q-6.5,-41 0,-41 Q6.5,-41 6.2,-35 Q3,-38 0,-37.5 Q-3,-38 -6.2,-35 Z" fill="#4a3322" />
        {/* eyes */}
        <circle cx="-2.3" cy="-34" r="0.9" fill="#2b2218" />
        <circle cx="2.3" cy="-34" r="0.9" fill="#2b2218" />
      </g>
    </g>
  );
}
