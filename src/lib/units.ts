import { bignumber } from "mathjs";

// Conversion data passes through a canonical SI-compatible base per category.
// Factors are decimal strings so conversions can use arbitrary-precision decimal
// arithmetic instead of inheriting a binary floating-point approximation.
export type Category = "length" | "mass" | "time" | "temperature" | "area" | "volume" | "speed" | "data";
export type UnitDefinition = { label: string; factor: string };

export const CATEGORIES: Record<Category, string> = {
  length: "Length", mass: "Mass", time: "Time", temperature: "Temperature",
  area: "Area", volume: "Volume", speed: "Speed", data: "Digital data",
};

export const FACTORS: Record<Exclude<Category, "temperature">, Record<string, UnitDefinition>> = {
  length: {
    mm: { label: "millimetre (mm)", factor: "0.001" }, cm: { label: "centimetre (cm)", factor: "0.01" },
    m: { label: "metre (m)", factor: "1" }, km: { label: "kilometre (km)", factor: "1000" },
    in: { label: "inch (in)", factor: "0.0254" }, ft: { label: "foot (ft)", factor: "0.3048" },
    yd: { label: "yard (yd)", factor: "0.9144" }, mi: { label: "mile (mi)", factor: "1609.344" },
    nmi: { label: "nautical mile (nmi)", factor: "1852" },
  },
  mass: {
    mg: { label: "milligram (mg)", factor: "0.000001" }, g: { label: "gram (g)", factor: "0.001" },
    kg: { label: "kilogram (kg)", factor: "1" }, t: { label: "tonne (t)", factor: "1000" },
    oz: { label: "ounce (oz)", factor: "0.028349523125" }, lb: { label: "pound (lb)", factor: "0.45359237" },
  },
  time: {
    ms: { label: "millisecond (ms)", factor: "0.001" }, s: { label: "second (s)", factor: "1" },
    min: { label: "minute (min)", factor: "60" }, h: { label: "hour (h)", factor: "3600" },
    d: { label: "day (d)", factor: "86400" }, wk: { label: "week (wk)", factor: "604800" },
    yr: { label: "year (365 days)", factor: "31536000" },
  },
  area: {
    mm2: { label: "square millimetre (mm²)", factor: "0.000001" }, cm2: { label: "square centimetre (cm²)", factor: "0.0001" },
    m2: { label: "square metre (m²)", factor: "1" }, ha: { label: "hectare (ha)", factor: "10000" },
    km2: { label: "square kilometre (km²)", factor: "1000000" }, in2: { label: "square inch (in²)", factor: "0.00064516" },
    ft2: { label: "square foot (ft²)", factor: "0.09290304" }, ac: { label: "acre (ac)", factor: "4046.8564224" },
  },
  volume: {
    ml: { label: "millilitre (mL)", factor: "0.001" }, l: { label: "litre (L)", factor: "1" },
    m3: { label: "cubic metre (m³)", factor: "1000" }, gal_us: { label: "US gallon", factor: "3.785411784" },
    gal_uk: { label: "UK gallon", factor: "4.54609" }, pt_us: { label: "US pint", factor: "0.473176473" },
    cup_us: { label: "US cup", factor: "0.2365882365" },
  },
  speed: {
    "m/s": { label: "metre per second (m/s)", factor: "1" }, "km/h": { label: "kilometre per hour (km/h)", factor: "0.2777777777777777777777777777777777777777777777777777777778" },
    mph: { label: "mile per hour (mph)", factor: "0.44704" }, kn: { label: "knot (kn)", factor: "0.5144444444444444444444444444444444444444444444444444444444" },
  },
  data: {
    b: { label: "bit (b)", factor: "1" }, B: { label: "byte (B)", factor: "8" },
    kB: { label: "kilobyte (kB, 1,000 B)", factor: "8000" }, MB: { label: "megabyte (MB, 1,000,000 B)", factor: "8000000" },
    GB: { label: "gigabyte (GB, 1,000,000,000 B)", factor: "8000000000" }, TB: { label: "terabyte (TB, 10¹² B)", factor: "8000000000000" },
    KiB: { label: "kibibyte (KiB, 1,024 B)", factor: "8192" }, MiB: { label: "mebibyte (MiB, 1,048,576 B)", factor: "8388608" },
    GiB: { label: "gibibyte (GiB, 2³⁰ B)", factor: "8589934592" }, TiB: { label: "tebibyte (TiB, 2⁴⁰ B)", factor: "8796093022208" },
  },
};

/** A standard numeric result for callers that need a JavaScript number. */
export function convert(category: Exclude<Category, "temperature">, value: number, from: string, to: string): number {
  const result = convertPrecise(category, String(value), from, to);
  return result.ok ? Number(result.value) : Number.NaN;
}

/** Decimal conversion result suitable for display without binary rounding drift. */
export function convertPrecise(
  category: Exclude<Category, "temperature">,
  value: string,
  from: string,
  to: string,
): { ok: true; value: string } | { ok: false; error: string } {
  const table = FACTORS[category];
  if (!table[from] || !table[to]) return { ok: false, error: "Choose valid units." };
  try {
    const input = bignumber(value.trim());
    if (!input.isFinite()) return { ok: false, error: "Enter a finite number." };
    const answer = input.times(bignumber(table[from].factor)).div(bignumber(table[to].factor));
    return { ok: true, value: answer.toPrecision(24) };
  } catch {
    return { ok: false, error: "Enter a valid number." };
  }
}

/** Temperature is affine, so it is handled separately through kelvin. */
export function convertTemperature(value: number, from: "C" | "F" | "K", to: "C" | "F" | "K"): number {
  const result = convertTemperaturePrecise(String(value), from, to);
  return result.ok ? Number(result.value) : Number.NaN;
}

/** Decimal temperature conversion, including its affine offset. */
export function convertTemperaturePrecise(value: string, from: "C" | "F" | "K", to: "C" | "F" | "K") {
  try {
    const input = bignumber(value.trim());
    if (!input.isFinite()) return { ok: false as const, error: "Enter a finite number." };
    let celsius = bignumber(0);
    if (from === "C") celsius = input;
    else if (from === "K") celsius = input.minus("273.15");
    else celsius = input.minus("32").times("5").div("9");
    const output = to === "C" ? celsius : to === "K" ? celsius.plus("273.15") : celsius.times("9").div("5").plus("32");
    if (to === "K" && output.isNegative()) return { ok: false as const, error: "A Kelvin temperature cannot be below absolute zero." };
    return { ok: true as const, value: output.toPrecision(24) };
  } catch {
    return { ok: false as const, error: "Enter a valid temperature." };
  }
}

export const TEMPERATURE_UNITS = { C: "Celsius (°C)", F: "Fahrenheit (°F)", K: "Kelvin (K)" } as const;
