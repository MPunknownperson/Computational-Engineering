/**
 * Shared illustration material layer.
 *
 * The drawn world on Quilloryn is a flat, 2D cartoon: solid fills, bold ink
 * outlines, hard offset shadows and cel-style highlights. There are no soft
 * gradients, paper grain or glossy lighting — every "gradient" id below
 * resolves to a flat colour (or a hard-edged cel band) so existing artwork
 * keeps working while reading like a hand-inked animation cel.
 *
 * Every def is namespaced with an `id` prefix because several illustrations can
 * live in the same document and SVG ids resolve globally.
 */

export type TextureTone = "warm" | "cool" | "mint" | "violet";

const WASH: Record<TextureTone, string> = {
  warm: "#ffe9b8",
  cool: "#bfe3ff",
  mint: "#c3f5d8",
  violet: "#e0d4ff",
};

function Flat({ id, color }: { id: string; color: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stopColor={color} />
      <stop offset="100%" stopColor={color} />
    </linearGradient>
  );
}

export function TextureDefs({
  id,
  tone = "warm",
}: {
  id: string;
  tone?: TextureTone;
  /** Kept for API compatibility; flat cartoon art has no paper grain. */
  grain?: number;
}) {
  return (
    <defs>
      <Flat id={`${id}-paper`} color="#fffdf4" />
      <Flat id={`${id}-wash`} color={WASH[tone]} />

      {/* Cel shading: a single hard-edged shadow band along the lower edge. */}
      <linearGradient id={`${id}-shade`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#0b1020" stopOpacity="0" />
        <stop offset="82%" stopColor="#0b1020" stopOpacity="0" />
        <stop offset="82%" stopColor="#0b1020" stopOpacity=".08" />
        <stop offset="100%" stopColor="#0b1020" stopOpacity=".08" />
      </linearGradient>

      <Flat id={`${id}-sun`} color="#ffd23f" />
      <Flat id={`${id}-coral`} color="#ff7a59" />
      <Flat id={`${id}-sky`} color="#5b8cff" />
      <Flat id={`${id}-mint`} color="#2fcf7a" />

      {/* Cartoon shine: a hard white band instead of a glossy fade. */}
      <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stopColor="#ffffff" stopOpacity=".55" />
        <stop offset="45%" stopColor="#ffffff" stopOpacity=".55" />
        <stop offset="45%" stopColor="#ffffff" stopOpacity="0" />
        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
      </linearGradient>

      {/* Empty tile: retained so older `url(#…-grain)` references stay valid. */}
      <pattern id={`${id}-grain`} width="10" height="10" patternUnits="userSpaceOnUse" />
    </defs>
  );
}

/**
 * Previously a paper-grain overlay. Flat 2D cartoon art has no grain, so this
 * now renders nothing; the signature is kept so callers need no changes.
 */
export function GrainOverlay(props: {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  opacity?: number;
  rx?: number;
}) {
  void props;
  return null;
}
