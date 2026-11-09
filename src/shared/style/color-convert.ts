/** A colour as hue (0-360), saturation (0-1) and value, the brightness (0-1) */
export interface Hsv {
  h: number;
  s: number;
  v: number;
}

const HUE_SECTORS = 6;
const HUE_DEGREES = 360;
const BYTE_MAX = 255;
const HEX_RADIX = 16;
const HEX_DIGITS = 2;
/** Where the red, green and blue digits start in `#rrggbb` */
const CHANNEL_STARTS = [1, 3, 5];

/** `#rrggbb` (a valid, normalised colour) as hue, saturation and value */
export function hexToHsv(hex: string): Hsv {
  const [red, green, blue] = CHANNEL_STARTS.map(
    (start) =>
      parseInt(hex.slice(start, start + HEX_DIGITS), HEX_RADIX) / BYTE_MAX
  );
  const max = Math.max(red, green, blue);
  const delta = max - Math.min(red, green, blue);
  let hue = 0;
  if (delta !== 0) {
    if (max === red) {
      hue = ((green - blue) / delta) % HUE_SECTORS;
    } else if (max === green) {
      hue = (blue - red) / delta + 2;
    } else {
      hue = (red - green) / delta + 4;
    }
  }
  const degrees =
    (hue * (HUE_DEGREES / HUE_SECTORS) + HUE_DEGREES) % HUE_DEGREES;
  return { h: degrees, s: max === 0 ? 0 : delta / max, v: max };
}

/** Hue, saturation and value as `#rrggbb` */
export function hsvToHex({ h, s, v }: Hsv): string {
  const sector = (h % HUE_DEGREES) / (HUE_DEGREES / HUE_SECTORS);
  const whole = Math.floor(sector);
  const fraction = sector - whole;
  const low = v * (1 - s);
  const falling = v * (1 - s * fraction);
  const rising = v * (1 - s * (1 - fraction));
  const [red, green, blue] = [
    [v, rising, low],
    [falling, v, low],
    [low, v, rising],
    [low, falling, v],
    [rising, low, v],
    [v, low, falling],
  ][whole % HUE_SECTORS];
  return `#${[red, green, blue]
    .map((channel) =>
      Math.round(channel * BYTE_MAX)
        .toString(HEX_RADIX)
        .padStart(HEX_DIGITS, "0")
    )
    .join("")}`;
}
