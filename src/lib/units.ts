// Curated unit conversion data. Conversions go through a canonical SI base
// value per unit: value_in_base = value * factor[category][unit].
export type Category = "length" | "mass" | "time" | "temperature" | "area" | "volume" | "speed" | "data";

export const CATEGORIES: Record<Category, string> = {
  length: "Length",
  mass: "Mass",
  time: "Time",
  temperature: "Temperature",
  area: "Area",
  volume: "Volume",
  speed: "Speed",
  data: "Digital data",
};

// factors relative to the canonical base unit of the category
export const FACTORS: Record<Exclude<Category, "temperature">, Record<string, { label: string; factor: number }>> = {
  length: {
    mm: { label: "millimetre (mm)", factor: 0.001 },
    cm: { label: "centimetre (cm)", factor: 0.01 },
    m:  { label: "metre (m)",       factor: 1 },
    km: { label: "kilometre (km)",  factor: 1000 },
    in: { label: "inch (in)",       factor: 0.0254 },
    ft: { label: "foot (ft)",       factor: 0.3048 },
    yd: { label: "yard (yd)",       factor: 0.9144 },
    mi: { label: "mile (mi)",       factor: 1609.344 },
    nmi:{ label: "nautical mile",   factor: 1852 },
  },
  mass: {
    mg: { label: "milligram (mg)", factor: 1e-6 },
    g:  { label: "gram (g)",       factor: 0.001 },
    kg: { label: "kilogram (kg)",  factor: 1 },
    t:  { label: "tonne (t)",      factor: 1000 },
    oz: { label: "ounce (oz)",     factor: 0.0283495 },
    lb: { label: "pound (lb)",     factor: 0.453592 },
  },
  time: {
    ms: { label: "millisecond (ms)", factor: 0.001 },
    s:  { label: "second (s)",       factor: 1 },
    min:{ label: "minute",           factor: 60 },
    h:  { label: "hour",             factor: 3600 },
    d:  { label: "day",              factor: 86400 },
    wk: { label: "week",             factor: 604800 },
    yr: { label: "year (365 d)",     factor: 31536000 },
  },
  area: {
    "mm2": { label: "mm²",  factor: 1e-6 },
    "cm2": { label: "cm²",  factor: 1e-4 },
    "m2":  { label: "m²",   factor: 1 },
    ha:    { label: "hectare", factor: 10000 },
    "km2": { label: "km²",  factor: 1e6 },
    "in2": { label: "in²",  factor: 0.00064516 },
    "ft2": { label: "ft²",  factor: 0.092903 },
    ac:   { label: "acre",  factor: 4046.8564224 },
  },
  volume: {
    ml: { label: "millilitre (mL)", factor: 0.001 },
    l:  { label: "litre (L)",       factor: 1 },
    m3: { label: "cubic metre",     factor: 1000 },
    gal_us: { label: "US gallon",   factor: 3.78541 },
    gal_uk: { label: "UK gallon",   factor: 4.54609 },
    pt:  { label: "US pint",        factor: 0.473176 },
    cup: { label: "US cup",         factor: 0.24 },
  },
  speed: {
    "m/s":  { label: "m/s",     factor: 1 },
    "km/h": { label: "km/h",    factor: 1 / 3.6 },
    mph:    { label: "mph",     factor: 0.44704 },
    kn:     { label: "knot",    factor: 0.514444 },
  },
  data: {
    b:  { label: "bit",     factor: 1 },
    B:  { label: "byte",    factor: 8 },
    KB: { label: "kilobyte",factor: 8 * 1024 },
    MB: { label: "megabyte",factor: 8 * 1024 ** 2 },
    GB: { label: "gigabyte",factor: 8 * 1024 ** 3 },
    TB: { label: "terabyte",factor: 8 * 1024 ** 4 },
  },
};

export function convert(
  category: Exclude<Category, "temperature">,
  value: number,
  from: string,
  to: string,
): number {
  const table = FACTORS[category];
  const a = table[from].factor;
  const b = table[to].factor;
  return (value * a) / b;
}

// Temperature is affine — handle separately.
export function convertTemperature(value: number, from: "C" | "F" | "K", to: "C" | "F" | "K"): number {
  let k: number;
  if (from === "K") k = value;
  else if (from === "C") k = value + 273.15;
  else k = (value - 32) * (5 / 9) + 273.15;

  if (to === "K") return k;
  if (to === "C") return k - 273.15;
  return (k - 273.15) * (9 / 5) + 32;
}

export const TEMPERATURE_UNITS = {
  C: "Celsius (°C)",
  F: "Fahrenheit (°F)",
  K: "Kelvin (K)",
} as const;
