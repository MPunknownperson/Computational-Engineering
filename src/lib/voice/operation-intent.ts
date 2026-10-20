import type { PackId } from "@/lib/i18n";

/**
 * Extensible linguistic association and code-generation layer.
 *
 * An association maps many ways of asking for the same operation to one typed
 * operation id. The compiler then emits a closed, math-only expression. The
 * generated expression is verified by the voice IR and evaluated by mathjs's
 * restricted AST policy; recognised text is never treated as JavaScript,
 * shell input, a URL, or a function name.
 */

export type OperationId =
  | "bill-split"
  | "tip"
  | "percent-of"
  | "percent-increase"
  | "percent-decrease"
  | "percent-change"
  | "average"
  | "median"
  | "sum"
  | "minimum"
  | "maximum"
  | "compound-interest"
  | "loan-payment"
  | "circle-area"
  | "fuel-cost"
  | "pace";

export type OperationFamily = "everyday" | "percentage" | "statistics" | "finance" | "geometry";

export interface NumericMention {
  value: number;
  start: number;
  end: number;
  raw: string;
}

export interface OperationIntent {
  id: OperationId;
  family: OperationFamily;
  /** Generated, executable code in the site's restricted maths language. */
  expression: string;
  /** Known preset, when an existing website tool represents the operation. */
  preset?: string;
  /** Typed inputs retained for backend tool dispatch and audit traces. */
  parameters: Record<string, number | number[]>;
  confidence: number;
  signals: string[];
  language: PackId | "universal";
}

interface AssociationDefinition {
  id: OperationId;
  family: OperationFamily;
  aliases: Partial<Record<PackId | "universal", string[]>>;
}

/**
 * Declarative vocabulary. Future operations are added here and in compile();
 * recognition, telemetry and backend dispatch require no UI changes.
 */
export const OPERATION_ASSOCIATIONS: readonly AssociationDefinition[] = [
  {
    id: "bill-split", family: "everyday", aliases: {
      universal: ["split the bill", "split the check", "bill split", "divide the bill", "share the bill"],
      es: ["dividir la cuenta", "repartir la cuenta", "dividir el total"],
      fr: ["partager l addition", "diviser l addition", "partager la note"],
      de: ["rechnung teilen", "rechnung aufteilen"],
      zh: ["分摊账单", "均摊账单", "分账"],
    },
  },
  {
    id: "tip", family: "everyday", aliases: {
      universal: ["calculate the tip", "work out the tip", "tip on", "gratuity on"],
      es: ["calcular la propina", "propina de"], fr: ["calculer le pourboire", "pourboire de"],
      de: ["trinkgeld berechnen", "trinkgeld fur"], zh: ["计算小费", "小费是"],
    },
  },
  {
    id: "percent-change", family: "percentage", aliases: {
      universal: ["percentage change", "percent change", "percentage difference", "rate of change"],
      es: ["cambio porcentual", "diferencia porcentual"], fr: ["variation en pourcentage", "difference en pourcentage"],
      de: ["prozentuale anderung", "prozentuale differenz"], zh: ["百分比变化", "百分比差异"],
    },
  },
  {
    id: "percent-increase", family: "percentage", aliases: {
      universal: ["increase by", "add percent", "raise by"], es: ["aumentar en", "incrementar en"],
      fr: ["augmenter de"], de: ["erhohen um"], zh: ["增加百分之", "提高百分之"],
    },
  },
  {
    id: "percent-decrease", family: "percentage", aliases: {
      universal: ["decrease by", "reduce by", "discount of", "take percent off"], es: ["reducir en", "descuento de"],
      fr: ["reduire de", "remise de"], de: ["reduzieren um", "rabatt von"], zh: ["减少百分之", "打折"],
    },
  },
  {
    id: "percent-of", family: "percentage", aliases: {
      universal: ["percent of", "percentage of", "% of"], es: ["por ciento de", "porcentaje de"],
      fr: ["pour cent de", "pourcentage de"], de: ["prozent von"], zh: ["百分之"],
    },
  },
  {
    id: "average", family: "statistics", aliases: {
      universal: ["average of", "find the average", "calculate average", "arithmetic mean", "mean of"],
      es: ["promedio de", "media de"], fr: ["moyenne de"], de: ["durchschnitt von", "mittelwert von"], zh: ["平均数", "平均值"],
    },
  },
  {
    id: "median", family: "statistics", aliases: {
      universal: ["median of", "find the median"], es: ["mediana de"], fr: ["mediane de"],
      de: ["median von"], zh: ["中位数"],
    },
  },
  {
    id: "sum", family: "statistics", aliases: {
      universal: ["sum of", "total of", "add these", "add up"], es: ["suma de", "sumar"],
      fr: ["somme de", "additionner"], de: ["summe von", "addiere"], zh: ["总和", "相加"],
    },
  },
  {
    id: "minimum", family: "statistics", aliases: {
      universal: ["minimum of", "smallest of", "lowest of"], es: ["minimo de", "menor de"],
      fr: ["minimum de", "plus petit de"], de: ["minimum von", "kleinste von"], zh: ["最小值"],
    },
  },
  {
    id: "maximum", family: "statistics", aliases: {
      universal: ["maximum of", "largest of", "highest of"], es: ["maximo de", "mayor de"],
      fr: ["maximum de", "plus grand de"], de: ["maximum von", "großte von"], zh: ["最大值"],
    },
  },
  {
    id: "compound-interest", family: "finance", aliases: {
      universal: ["compound interest", "future value", "compound growth", "investment growth"],
      es: ["interes compuesto", "valor futuro"], fr: ["interets composes", "valeur future"],
      de: ["zinseszins", "zukunftswert"], zh: ["复利", "未来价值"],
    },
  },
  {
    id: "loan-payment", family: "finance", aliases: {
      universal: ["monthly loan payment", "loan payment", "mortgage payment", "monthly repayment"],
      es: ["cuota mensual", "pago del prestamo"], fr: ["mensualite", "paiement du pret"],
      de: ["monatliche rate", "kreditrate"], zh: ["贷款月供", "月供"],
    },
  },
  {
    id: "circle-area", family: "geometry", aliases: {
      universal: ["area of a circle", "circle area"], es: ["area de un circulo"], fr: ["aire d un cercle"],
      de: ["flache eines kreises", "kreisflache"], zh: ["圆的面积", "圆面积"],
    },
  },
  {
    id: "fuel-cost", family: "everyday", aliases: {
      universal: ["fuel cost", "trip fuel cost", "cost of fuel for"], es: ["coste de combustible", "costo de gasolina"],
      fr: ["cout du carburant"], de: ["kraftstoffkosten", "benzinkosten"], zh: ["燃油成本", "油费"],
    },
  },
  {
    id: "pace", family: "everyday", aliases: {
      universal: ["running pace", "average pace", "pace per"], es: ["ritmo de carrera", "ritmo medio"],
      fr: ["allure moyenne", "allure de course"], de: ["lauftempo", "durchschnittstempo"], zh: ["平均配速", "跑步配速"],
    },
  },
] as const;

const SMALL: Record<string, number> = {
  zero: 0, oh: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
  ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16, seventeen: 17,
  eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50, sixty: 60, seventy: 70,
  eighty: 80, ninety: 90, couple: 2, dozen: 12,
  cero: 0, uno: 1, una: 1, un: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7,
  ocho: 8, nueve: 9, diez: 10, once: 11, doce: 12, trece: 13, catorce: 14, quince: 15, veinte: 20,
  treinta: 30, cuarenta: 40, cincuenta: 50, sesenta: 60, setenta: 70, ochenta: 80, noventa: 90,
  deux: 2, trois: 3, quatre: 4, cinq: 5, sept: 7, huit: 8, neuf: 9, dix: 10, onze: 11,
  douze: 12, treize: 13, quatorze: 14, quinze: 15, seize: 16, vingt: 20, trente: 30, quarante: 40,
  cinquante: 50, soixante: 60,
  eins: 1, ein: 1, eine: 1, zwei: 2, drei: 3, vier: 4, funf: 5, fuenf: 5, sechs: 6, sieben: 7,
  acht: 8, neun: 9, zehn: 10, elf: 11, zwolf: 12, zwoelf: 12, zwanzig: 20, dreissig: 30,
  vierzig: 40, funfzig: 50, fuenfzig: 50, sechzig: 60, siebzig: 70, achtzig: 80, neunzig: 90,
};
const SCALE: Record<string, number> = {
  hundred: 100, thousand: 1_000, million: 1_000_000, billion: 1_000_000_000,
  cien: 100, ciento: 100, mil: 1_000, millon: 1_000_000, millones: 1_000_000,
  cent: 100, cents: 100, mille: 1_000,
  hundert: 100, tausend: 1_000, millionen: 1_000_000,
};
const JOINERS = new Set(["and", "y", "et", "und"]);
const DECIMALS = new Set(["point", "dot", "decimal", "punto", "coma", "virgule", "komma", "点"]);
const NEGATIVE = new Set(["negative", "minus", "menos", "moins", "negativ"]);

interface Token { value: string; start: number; end: number }

export function normaliseAssociationText(input: string): string {
  return input
    .normalize("NFKC")
    .toLocaleLowerCase()
    .normalize("NFD")
    .replace(/(\p{Script=Latin})\p{M}+/gu, "$1")
    .normalize("NFC")
    // Apostrophes and underscores separate words. A hyphen only does so
    // between letters ("bill-split"); between numbers or beside a space it is
    // the subtraction operator and must survive ("2x - 8 = 0", "5-3").
    .replace(/[’'`´_]/g, " ")
    .replace(/(?<=\p{L})-(?=\p{L})/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function tokensOf(text: string): Token[] {
  const tokens: Token[] = [];
  for (const match of text.matchAll(/[-+]?\d+(?:[.,]\d+)?|[\p{L}]+|%/gu)) {
    tokens.push({ value: match[0], start: match.index ?? 0, end: (match.index ?? 0) + match[0].length });
  }
  return tokens;
}

function parseWordNumber(tokens: Token[], from: number): { value: number; used: number } | null {
  let index = from;
  let sign = 1;
  if (NEGATIVE.has(tokens[index]?.value)) { sign = -1; index += 1; }
  let total = 0;
  let current = 0;
  let usedNumeric = false;
  let used = index - from;
  let decimal = "";
  let decimalMode = false;

  for (; index < tokens.length; index += 1) {
    const word = tokens[index].value;
    if (DECIMALS.has(word) && usedNumeric && !decimalMode) {
      decimalMode = true;
      used = index - from + 1;
      continue;
    }
    if (JOINERS.has(word) && usedNumeric && !decimalMode) {
      const next = tokens[index + 1]?.value;
      if (next && (next in SMALL || next in SCALE)) { used = index - from + 1; continue; }
      break;
    }
    if (!(word in SMALL) && !(word in SCALE)) break;
    usedNumeric = true;
    used = index - from + 1;
    if (decimalMode) {
      const numeric = SMALL[word];
      if (numeric === undefined || numeric < 0 || numeric >= 100) break;
      decimal += numeric < 10 ? String(numeric) : String(numeric);
      continue;
    }
    if (word in SMALL) {
      current += SMALL[word];
      continue;
    }
    const scale = SCALE[word];
    if (scale === 100) current = (current || 1) * scale;
    else {
      total += (current || 1) * scale;
      current = 0;
    }
  }
  if (!usedNumeric) return null;
  const integer = total + current;
  return { value: sign * Number(`${integer}${decimal ? `.${decimal}` : ""}`), used };
}

function chineseMentions(text: string): NumericMention[] {
  const digits: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
  const result: NumericMention[] = [];
  for (const match of text.matchAll(/[零〇一二两三四五六七八九十百千万亿点]+/g)) {
    const raw = match[0];
    const [whole, fraction] = raw.split("点");
    let total = 0, current = 0, digit = 0;
    for (const char of whole) {
      if (char in digits) digit = digits[char];
      else if (char === "十" || char === "百" || char === "千") {
        current += (digit || 1) * (char === "十" ? 10 : char === "百" ? 100 : 1_000); digit = 0;
      } else if (char === "万" || char === "亿") {
        total += (current + digit || 1) * (char === "万" ? 10_000 : 100_000_000); current = 0; digit = 0;
      }
    }
    const decimal = fraction ? fraction.split("").map((char) => digits[char]).filter((value) => value !== undefined).join("") : "";
    const value = Number(`${total + current + digit}${decimal ? `.${decimal}` : ""}`);
    if (Number.isFinite(value)) result.push({ value, start: match.index ?? 0, end: (match.index ?? 0) + raw.length, raw });
  }
  return result;
}

/** Extract every explicit digit or spoken number run, preserving its position. */
export function extractNumericMentions(input: string): NumericMention[] {
  const text = normaliseAssociationText(input);
  const tokens = tokensOf(text);
  const mentions: NumericMention[] = [];
  for (let index = 0; index < tokens.length;) {
    const token = tokens[index];
    if (/^[-+]?\d/.test(token.value)) {
      const value = Number(token.value.replace(",", "."));
      if (Number.isFinite(value)) mentions.push({ value, start: token.start, end: token.end, raw: token.value });
      index += 1;
      continue;
    }
    const parsed = parseWordNumber(tokens, index);
    if (!parsed || parsed.used < 1) { index += 1; continue; }
    const last = tokens[index + parsed.used - 1];
    mentions.push({ value: parsed.value, start: token.start, end: last.end, raw: text.slice(token.start, last.end) });
    index += parsed.used;
  }
  const chinese = chineseMentions(text);
  return [...mentions, ...chinese]
    .filter((item) => Number.isFinite(item.value))
    .sort((a, b) => a.start - b.start)
    .filter((item, index, list) => index === 0 || item.start >= list[index - 1].end);
}

function hasAlias(text: string, definition: AssociationDefinition): { language: PackId | "universal"; alias: string } | null {
  if (
    definition.id === "bill-split" &&
    /\b(split|divide|share|separate|dividir|repartir|partager|diviser|teilen|aufteilen)\b|分摊|均摊|分账/i.test(text) &&
    /\b(bill|check|account|cuenta|addition|note|rechnung)\b|账单/i.test(text)
  ) return { language: "universal", alias: "split+bill" };
  for (const [language, aliases] of Object.entries(definition.aliases) as Array<[PackId | "universal", string[]]>) {
    for (const alias of aliases) {
      if (text.includes(normaliseAssociationText(alias))) return { language, alias };
    }
  }
  return null;
}

function nearestBefore(mentions: NumericMention[], index: number, maxGap = 32): NumericMention | null {
  const eligible = mentions.filter((item) => item.end <= index && index - item.end <= maxGap);
  return eligible.at(-1) ?? null;
}

function nearestAfter(mentions: NumericMention[], index: number, maxGap = 40): NumericMention | null {
  return mentions.find((item) => item.start >= index && item.start - index <= maxGap) ?? null;
}

function aroundKeyword(text: string, mentions: NumericMention[], pattern: RegExp): NumericMention | null {
  const match = pattern.exec(text);
  if (!match || match.index === undefined) return null;
  return nearestBefore(mentions, match.index, 28) ?? nearestAfter(mentions, match.index + match[0].length, 28);
}

function finiteRange(value: number | undefined, min: number, max: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
}

function codeNumber(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number(value.toPrecision(14)));
}

function compile(
  definition: AssociationDefinition,
  text: string,
  numbers: NumericMention[],
  language: PackId | "universal",
): OperationIntent | null {
  const values = numbers.map((item) => item.value);
  const base = { id: definition.id, family: definition.family, language, signals: [`association:${definition.id}`] };

  if (definition.id === "bill-split") {
    const tipMention = aroundKeyword(text, numbers, /(?:%|percent|percentage|tip|propina|pourboire|trinkgeld|小费)/i);
    const peopleMention = aroundKeyword(text, numbers, /\b(?:people|persons?|diners?|guests?|friends?|ways|personas?|personnes?|leute|personen)\b|人|位/i);
    const tipPercent = tipMention?.value ?? 0;
    const people = peopleMention?.value;
    const reserved = new Set([tipMention, peopleMention].filter(Boolean));
    const bill = numbers.find((item) => !reserved.has(item))?.value;
    if (!finiteRange(bill, 0, 1_000_000_000) || !finiteRange(people, 1, 10_000) || !Number.isInteger(people) || !finiteRange(tipPercent, 0, 500)) return null;
    return {
      ...base,
      expression: `(${codeNumber(bill)} * (1 + ${codeNumber(tipPercent)} / 100)) / ${codeNumber(people)}`,
      preset: "tip-split",
      parameters: { bill, people, tipPercent },
      confidence: tipMention ? 0.99 : 0.96,
      signals: [...base.signals, "slots:bill+people", tipMention ? "slot:tip" : "default:tip=0"],
    };
  }

  if (definition.id === "tip") {
    const percent = aroundKeyword(text, numbers, /(?:%|percent|percentage|tip|propina|pourboire|trinkgeld|小费)/i)?.value;
    const amount = values.find((value) => value !== percent);
    if (!finiteRange(amount, 0, 1_000_000_000) || !finiteRange(percent, 0, 500)) return null;
    return { ...base, expression: `${codeNumber(amount)} * ${codeNumber(percent)} / 100`, preset: "tip-split", parameters: { amount, percent }, confidence: 0.95, signals: [...base.signals, "slots:amount+percent"] };
  }

  if (["percent-of", "percent-increase", "percent-decrease"].includes(definition.id)) {
    const percentMention = aroundKeyword(text, numbers, /(?:%|percent|percentage|por ciento|pour cent|prozent|百分之)/i) ?? numbers[0];
    const amountMention = numbers.find((item) => item !== percentMention);
    const percent = percentMention?.value;
    const amount = amountMention?.value;
    if (!finiteRange(percent, -10_000, 10_000) || !finiteRange(amount, -1_000_000_000_000, 1_000_000_000_000)) return null;
    const expression = definition.id === "percent-of"
      ? `${codeNumber(amount)} * ${codeNumber(percent)} / 100`
      : definition.id === "percent-increase"
        ? `${codeNumber(amount)} * (1 + ${codeNumber(percent)} / 100)`
        : `${codeNumber(amount)} * (1 - ${codeNumber(percent)} / 100)`;
    return { ...base, expression, parameters: { amount, percent }, confidence: 0.96, signals: [...base.signals, "slots:amount+percent"] };
  }

  if (definition.id === "percent-change") {
    const [from, to] = values;
    if (!finiteRange(from, -1_000_000_000_000, 1_000_000_000_000) || from === 0 || !finiteRange(to, -1_000_000_000_000, 1_000_000_000_000)) return null;
    return { ...base, expression: `((${codeNumber(to)} - ${codeNumber(from)}) / abs(${codeNumber(from)})) * 100`, preset: "percentage-change", parameters: { from, to }, confidence: 0.95, signals: [...base.signals, "slots:from+to"] };
  }

  if (["average", "median", "sum", "minimum", "maximum"].includes(definition.id)) {
    if (values.length < (definition.id === "sum" ? 2 : 2) || values.length > 100) return null;
    const fn = definition.id === "average" ? "mean" : definition.id === "minimum" ? "min" : definition.id === "maximum" ? "max" : definition.id;
    return { ...base, expression: `${fn}([${values.map(codeNumber).join(",")}])`, parameters: { values }, confidence: 0.96, signals: [...base.signals, `values:${values.length}`] };
  }

  if (definition.id === "compound-interest") {
    const percentMention = aroundKeyword(text, numbers, /(?:%|percent|por ciento|pour cent|prozent|百分之)/i) ?? aroundKeyword(text, numbers, /(?:\brate\b|interest rate|tasa|taux|zinssatz|利率)/i);
    const yearMention = aroundKeyword(text, numbers, /\b(?:years?|anos?|ans?|jahre?)\b|年/i);
    const reserved = new Set([percentMention, yearMention].filter(Boolean));
    const principal = numbers.find((item) => !reserved.has(item))?.value;
    const ratePercent = percentMention?.value;
    const years = yearMention?.value;
    const monthly = /monthly|month|mensual|mois|monat|月/i.test(text);
    const compounds = monthly ? 12 : 1;
    if (!finiteRange(principal, 0, 1_000_000_000_000) || !finiteRange(ratePercent, -99.99, 1_000) || !finiteRange(years, 0, 1_000)) return null;
    return { ...base, expression: `${codeNumber(principal)} * (1 + (${codeNumber(ratePercent)} / 100) / ${compounds}) ^ (${compounds} * ${codeNumber(years)})`, preset: "compound-interest", parameters: { principal, ratePercent, years, compounds }, confidence: 0.94, signals: [...base.signals, "slots:principal+rate+years", monthly ? "compound:monthly" : "compound:annual"] };
  }

  if (definition.id === "loan-payment") {
    const percentMention = aroundKeyword(text, numbers, /(?:%|percent|por ciento|pour cent|prozent|百分之)/i) ?? aroundKeyword(text, numbers, /(?:\brate\b|interest rate|tasa|taux|zinssatz|利率)/i);
    const yearMention = aroundKeyword(text, numbers, /\b(?:years?|anos?|ans?|jahre?)\b|年/i);
    const reserved = new Set([percentMention, yearMention].filter(Boolean));
    const principal = numbers.find((item) => !reserved.has(item))?.value;
    const ratePercent = percentMention?.value;
    const years = yearMention?.value;
    if (!finiteRange(principal, 0.01, 1_000_000_000_000) || !finiteRange(ratePercent, 0.0001, 1_000) || !finiteRange(years, 0.01, 1_000)) return null;
    const rate = `(${codeNumber(ratePercent)} / 100 / 12)`;
    return { ...base, expression: `${codeNumber(principal)} * ${rate} / (1 - (1 + ${rate}) ^ (-12 * ${codeNumber(years)}))`, preset: "loan-payment", parameters: { principal, ratePercent, years }, confidence: 0.95, signals: [...base.signals, "slots:principal+rate+years"] };
  }

  if (definition.id === "circle-area") {
    const radius = values[0];
    if (!finiteRange(radius, 0, 1_000_000_000)) return null;
    return { ...base, expression: `pi * ${codeNumber(radius)} ^ 2`, preset: "circle-area", parameters: { radius }, confidence: 0.94, signals: [...base.signals, "slot:radius"] };
  }

  if (definition.id === "fuel-cost") {
    const distance = values[0];
    const consumption = values[1];
    const price = values.at(-1);
    if (!finiteRange(distance, 0, 10_000_000) || !finiteRange(consumption, 0, 10_000) || !finiteRange(price, 0, 1_000_000)) return null;
    return { ...base, expression: `${codeNumber(distance)} * ${codeNumber(consumption)} / 100 * ${codeNumber(price)}`, preset: "fuel-estimate", parameters: { distance, consumption, price }, confidence: 0.9, signals: [...base.signals, "slots:distance+consumption+price"] };
  }

  if (definition.id === "pace") {
    const [minutes, distance] = values;
    if (!finiteRange(minutes, 0, 1_000_000) || !finiteRange(distance, 0.000001, 1_000_000)) return null;
    return { ...base, expression: `${codeNumber(minutes)} / ${codeNumber(distance)}`, preset: "pace", parameters: { minutes, distance }, confidence: 0.88, signals: [...base.signals, "slots:minutes+distance"] };
  }

  return null;
}

/** Replace every spoken number run with a canonical decimal representation. */
export function canonicaliseSpokenNumbers(input: string): string {
  let text = normaliseAssociationText(input);
  const mentions = extractNumericMentions(text);
  for (const mention of [...mentions].sort((a, b) => b.start - a.start)) {
    text = `${text.slice(0, mention.start)}${codeNumber(mention.value)}${text.slice(mention.end)}`;
  }
  return text.replace(/\s+/g, " ").trim();
}

/** Associate a natural request with an operation and generate safe code for it. */
export function detectOperationIntent(input: string): OperationIntent | null {
  const text = normaliseAssociationText(input);
  if (!text) return null;
  const numbers = extractNumericMentions(text);
  for (const definition of OPERATION_ASSOCIATIONS) {
    const match = hasAlias(text, definition);
    if (!match) continue;
    const result = compile(definition, text, numbers, match.language);
    if (result) return { ...result, signals: [...result.signals, `phrase:${match.alias}`] };
  }
  return null;
}

export function isFinanceOperation(id: string | undefined): boolean {
  return id === "bill-split" || id === "tip" || id === "compound-interest" || id === "loan-payment" || id === "fuel-cost";
}

export function operationDestination(intent: Pick<OperationIntent, "id" | "preset">): string {
  if (intent.preset) return `/tools/formula?preset=${encodeURIComponent(intent.preset)}`;
  return "/tools/scientific";
}

export function describeOperationResult(operation: string, result: string): string {
  switch (operation) {
    case "bill-split": return `Bill split: ${result} per person`;
    case "tip": return `Tip: ${result}`;
    case "percent-of": return `Percentage result: ${result}`;
    case "percent-increase": return `After the increase: ${result}`;
    case "percent-decrease": return `After the decrease: ${result}`;
    case "percent-change": return `Percentage change: ${result}%`;
    case "average": return `Average: ${result}`;
    case "median": return `Median: ${result}`;
    case "sum": return `Total: ${result}`;
    case "minimum": return `Minimum: ${result}`;
    case "maximum": return `Maximum: ${result}`;
    case "compound-interest": return `Future value: ${result}`;
    case "loan-payment": return `Monthly payment: ${result}`;
    case "circle-area": return `Circle area: ${result}`;
    case "fuel-cost": return `Estimated fuel cost: ${result}`;
    case "pace": return `Average pace: ${result}`;
    default: return result;
  }
}
