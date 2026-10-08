import type { PackId } from "@/lib/i18n";
import type { IconName } from "@/components/Icons";

/**
 * Voice learning paths.
 *
 * Most language-learning sites (Duolingo's skill tree, Babbel's scenario
 * units, Busuu's CEFR "at this level you can…" goals) teach a language other
 * than the one the course is written in — so the course that actually
 * explains the site's own command language, in the visitor's own words, is
 * easy to forget to write for the language the site itself is written in.
 * This file gives every supported language pack — English included — the
 * same five-unit path: say a number, name a currency, ask for a formula,
 * read reference data, then chain a follow-up without repeating yourself.
 */

export interface LearningPhrase {
  /** What to say out loud. */
  speech: string;
  /** A short gloss of what the phrase means / does. */
  meaning: string;
  /** The destination it opens, in plain words (not executed on this page). */
  opens: string;
}

export interface LearningUnit {
  id: string;
  title: string;
  /** A CEFR-style "can-do" goal for finishing the unit. */
  canDo: string;
  icon: IconName;
  phrases: LearningPhrase[];
}

export interface LearningPath {
  lang: PackId;
  units: LearningUnit[];
}

export const LEARNING_PATHS: Record<PackId, LearningPath> = {
  en: {
    lang: "en",
    units: [
      {
        id: "first-words",
        title: "First words",
        canDo: "Say an amount and a unit, and the matching converter opens by itself.",
        icon: "node",
        phrases: [
          { speech: "70 kilos", meaning: "a bare amount and unit", opens: "Unit converter · 70 kg → lb (a sensible default target)" },
          { speech: "five miles to kilometers", meaning: "name both units", opens: "Unit converter · 5 mi → km" },
          { speech: "20 Celsius to Fahrenheit", meaning: "a temperature reading", opens: "Unit converter · 20 °C → °F" },
        ],
      },
      {
        id: "money-in-any-currency",
        title: "Money, in any currency",
        canDo: "Convert between two currencies, or just name one and get a sensible pair.",
        icon: "coin",
        phrases: [
          { speech: "Convert 120 US dollars to euros", meaning: "amount + two currencies", opens: "Currency converter · 120 USD → EUR" },
          { speech: "30 euros", meaning: "one currency alone", opens: "Currency converter · 30 EUR → USD" },
          { speech: "bitcoin price", meaning: "a digital-asset topic", opens: "Digital-asset prices · Bitcoin" },
        ],
      },
      {
        id: "formulas-and-everyday-math",
        title: "Formulas & everyday math",
        canDo: "Ask for a loan payment, a bill split or a quadratic equation by name.",
        icon: "function",
        phrases: [
          { speech: "loan payment", meaning: "a finance topic", opens: "Formula tool · loan-payment preset" },
          { speech: "split the bill", meaning: "a tip-splitting topic", opens: "Formula tool · tip-split preset" },
          { speech: "quadratic equation", meaning: "a maths topic", opens: "Formula tool · quadratic-root preset" },
        ],
      },
      {
        id: "reference-data",
        title: "Reference data",
        canDo: "Check inflation, GDP and other public indicators, and open the scientific tools.",
        icon: "chart",
        phrases: [
          { speech: "US inflation", meaning: "an economic indicator", opens: "Economic indicators · USA, inflation" },
          { speech: "scientific calculator", meaning: "a tool name", opens: "Scientific calculator" },
          { speech: "matrix determinant", meaning: "a scientific topic", opens: "Scientific calculator · determinant preset" },
        ],
      },
      {
        id: "fluent-control",
        title: "Fluent control",
        canDo: "Chain a follow-up amount or ask to repeat the last command — no need to restate everything.",
        icon: "refresh",
        phrases: [
          { speech: "Convert 120 dollars to euros", meaning: "set a direction once", opens: "Currency converter · 120 USD → EUR" },
          { speech: "and 80", meaning: "a bare follow-up amount", opens: "Currency converter · 80 USD → EUR (same direction, reused)" },
          { speech: "again", meaning: "repeat the last command", opens: "Replays whatever you asked for last" },
        ],
      },
    ],
  },
  es: {
    lang: "es",
    units: [
      {
        id: "primeras-palabras",
        title: "Primeras palabras",
        canDo: "Di una cantidad y una unidad, y se abre el convertidor adecuado.",
        icon: "node",
        phrases: [
          { speech: "70 kilos", meaning: "una cantidad y una unidad", opens: "Conversor de unidades · 70 kg → lb (destino predeterminado)" },
          { speech: "5 millas a kilómetros", meaning: "nombra las dos unidades", opens: "Conversor de unidades · 5 mi → km" },
          { speech: "20 grados Celsius a Fahrenheit", meaning: "una temperatura", opens: "Conversor de unidades · 20 °C → °F" },
        ],
      },
      {
        id: "dinero-en-cualquier-moneda",
        title: "Dinero, en cualquier moneda",
        canDo: "Convierte entre dos monedas, o nombra solo una y obtén un par razonable.",
        icon: "coin",
        phrases: [
          { speech: "Convierte 120 dólares a euros", meaning: "cantidad + dos monedas", opens: "Conversor de divisas · 120 USD → EUR" },
          { speech: "30 euros", meaning: "una sola moneda", opens: "Conversor de divisas · 30 EUR → USD" },
          { speech: "precio del bitcoin", meaning: "un tema de activos digitales", opens: "Precios de criptoactivos · Bitcoin" },
        ],
      },
      {
        id: "formulas-del-dia-a-dia",
        title: "Fórmulas del día a día",
        canDo: "Pide la cuota de un préstamo, dividir una cuenta o una ecuación cuadrática.",
        icon: "function",
        phrases: [
          { speech: "la cuota mensual del préstamo", meaning: "un tema financiero", opens: "Herramienta de fórmulas · preajuste de préstamo" },
          { speech: "dividir la cuenta", meaning: "repartir una cuenta", opens: "Herramienta de fórmulas · preajuste de propina" },
          { speech: "ecuación cuadrática", meaning: "un tema matemático", opens: "Herramienta de fórmulas · raíz positiva" },
        ],
      },
      {
        id: "datos-de-referencia",
        title: "Datos de referencia",
        canDo: "Consulta la inflación, el PIB y otros indicadores públicos, y abre las herramientas científicas.",
        icon: "chart",
        phrases: [
          { speech: "inflación en España", meaning: "un indicador económico", opens: "Indicadores económicos · España, inflación" },
          { speech: "calculadora científica", meaning: "el nombre de una herramienta", opens: "Calculadora científica" },
          { speech: "determinante de la matriz", meaning: "un tema científico", opens: "Calculadora científica · preajuste de determinante" },
        ],
      },
      {
        id: "control-fluido",
        title: "Control fluido",
        canDo: "Encadena una cantidad de seguimiento o pide repetir la última orden, sin repetirlo todo.",
        icon: "refresh",
        phrases: [
          { speech: "Convierte 120 dólares a euros", meaning: "fija una dirección", opens: "Conversor de divisas · 120 USD → EUR" },
          { speech: "y 80", meaning: "solo la nueva cantidad", opens: "Conversor de divisas · 80 USD → EUR (misma dirección)" },
          { speech: "otra vez", meaning: "repite la última orden", opens: "Repite lo último que pediste" },
        ],
      },
    ],
  },
  fr: {
    lang: "fr",
    units: [
      {
        id: "premiers-mots",
        title: "Premiers mots",
        canDo: "Dites un montant et une unité : le convertisseur qui convient s'ouvre tout seul.",
        icon: "node",
        phrases: [
          { speech: "70 kilos", meaning: "un montant et une unité", opens: "Convertisseur d'unités · 70 kg → lb (cible par défaut)" },
          { speech: "5 miles en kilomètres", meaning: "nommez les deux unités", opens: "Convertisseur d'unités · 5 mi → km" },
          { speech: "20 degrés Celsius en Fahrenheit", meaning: "une température", opens: "Convertisseur d'unités · 20 °C → °F" },
        ],
      },
      {
        id: "argent-dans-toute-devise",
        title: "L'argent, dans toute devise",
        canDo: "Convertissez entre deux devises, ou n'en nommez qu'une pour obtenir une paire raisonnable.",
        icon: "coin",
        phrases: [
          { speech: "Convertir 120 dollars en euros", meaning: "montant + deux devises", opens: "Convertisseur de devises · 120 USD → EUR" },
          { speech: "30 euros", meaning: "une seule devise", opens: "Convertisseur de devises · 30 EUR → USD" },
          { speech: "cours du bitcoin", meaning: "un sujet d'actif numérique", opens: "Cours des cryptoactifs · Bitcoin" },
        ],
      },
      {
        id: "formules-du-quotidien",
        title: "Formules du quotidien",
        canDo: "Demandez une mensualité de prêt, un partage d'addition ou une équation du second degré.",
        icon: "function",
        phrases: [
          { speech: "la mensualité du prêt", meaning: "un sujet financier", opens: "Outil de formules · préréglage de prêt" },
          { speech: "partager l'addition", meaning: "répartir une note", opens: "Outil de formules · préréglage de pourboire" },
          { speech: "équation du second degré", meaning: "un sujet mathématique", opens: "Outil de formules · racine positive" },
        ],
      },
      {
        id: "donnees-de-reference",
        title: "Données de référence",
        canDo: "Consultez l'inflation, le PIB et d'autres indicateurs publics, et ouvrez les outils scientifiques.",
        icon: "chart",
        phrases: [
          { speech: "inflation en France", meaning: "un indicateur économique", opens: "Indicateurs économiques · France, inflation" },
          { speech: "calculatrice scientifique", meaning: "le nom d'un outil", opens: "Calculatrice scientifique" },
          { speech: "déterminant de la matrice", meaning: "un sujet scientifique", opens: "Calculatrice scientifique · préréglage déterminant" },
        ],
      },
      {
        id: "maitrise-fluide",
        title: "Maîtrise fluide",
        canDo: "Enchaînez un montant de suivi ou demandez de répéter la dernière commande, sans tout répéter.",
        icon: "refresh",
        phrases: [
          { speech: "Convertir 120 dollars en euros", meaning: "fixez une direction", opens: "Convertisseur de devises · 120 USD → EUR" },
          { speech: "et 80", meaning: "juste le nouveau montant", opens: "Convertisseur de devises · 80 USD → EUR (même direction)" },
          { speech: "encore", meaning: "répète la dernière commande", opens: "Rejoue la dernière demande" },
        ],
      },
    ],
  },
  de: {
    lang: "de",
    units: [
      {
        id: "erste-worte",
        title: "Erste Wörter",
        canDo: "Sagen Sie eine Menge und eine Einheit — der passende Rechner öffnet sich von selbst.",
        icon: "node",
        phrases: [
          { speech: "70 Kilo", meaning: "Menge und Einheit", opens: "Einheitenrechner · 70 kg → lb (Standardziel)" },
          { speech: "5 Meilen in Kilometer", meaning: "beide Einheiten nennen", opens: "Einheitenrechner · 5 mi → km" },
          { speech: "20 Grad Celsius in Fahrenheit", meaning: "eine Temperatur", opens: "Einheitenrechner · 20 °C → °F" },
        ],
      },
      {
        id: "geld-in-jeder-waehrung",
        title: "Geld, in jeder Währung",
        canDo: "Rechnen Sie zwischen zwei Währungen um, oder nennen Sie nur eine für ein sinnvolles Paar.",
        icon: "coin",
        phrases: [
          { speech: "Rechne 120 Dollar in Euro um", meaning: "Menge + zwei Währungen", opens: "Währungsrechner · 120 USD → EUR" },
          { speech: "30 Euro", meaning: "nur eine Währung", opens: "Währungsrechner · 30 EUR → USD" },
          { speech: "Bitcoin-Kurs", meaning: "ein Krypto-Thema", opens: "Kurse digitaler Vermögenswerte · Bitcoin" },
        ],
      },
      {
        id: "alltagsformeln",
        title: "Alltagsformeln",
        canDo: "Fragen Sie nach einer Kreditrate, einer Rechnungsteilung oder einer quadratischen Gleichung.",
        icon: "function",
        phrases: [
          { speech: "die monatliche Rate des Kredits", meaning: "ein Finanzthema", opens: "Formelwerkzeug · Kreditvorlage" },
          { speech: "Rechnung teilen", meaning: "eine Rechnung aufteilen", opens: "Formelwerkzeug · Trinkgeldvorlage" },
          { speech: "quadratische Gleichung", meaning: "ein Mathe-Thema", opens: "Formelwerkzeug · positive Wurzel" },
        ],
      },
      {
        id: "referenzdaten",
        title: "Referenzdaten",
        canDo: "Prüfen Sie Inflation, BIP und andere öffentliche Indikatoren und öffnen Sie die wissenschaftlichen Werkzeuge.",
        icon: "chart",
        phrases: [
          { speech: "Inflation in Deutschland", meaning: "ein Wirtschaftsindikator", opens: "Wirtschaftsindikatoren · Deutschland, Inflation" },
          { speech: "wissenschaftlicher Rechner", meaning: "ein Werkzeugname", opens: "Wissenschaftlicher Rechner" },
          { speech: "Determinante der Matrix", meaning: "ein wissenschaftliches Thema", opens: "Wissenschaftlicher Rechner · Determinante" },
        ],
      },
      {
        id: "flüssige-kontrolle",
        title: "Flüssige Kontrolle",
        canDo: "Hängen Sie einen Folgebetrag an oder lassen Sie den letzten Befehl wiederholen — ohne alles neu zu sagen.",
        icon: "refresh",
        phrases: [
          { speech: "Rechne 120 Dollar in Euro um", meaning: "eine Richtung festlegen", opens: "Währungsrechner · 120 USD → EUR" },
          { speech: "und 80", meaning: "nur der neue Betrag", opens: "Währungsrechner · 80 USD → EUR (gleiche Richtung)" },
          { speech: "nochmal", meaning: "letzten Befehl wiederholen", opens: "Wiederholt die letzte Anfrage" },
        ],
      },
    ],
  },
  zh: {
    lang: "zh",
    units: [
      {
        id: "first-words-zh",
        title: "入门词汇",
        canDo: "说出数量和单位，匹配的换算工具会自动打开。",
        icon: "node",
        phrases: [
          { speech: "70公斤", meaning: "数量加单位", opens: "单位换算 · 70 kg → lb（默认目标）" },
          { speech: "5英里换成公里", meaning: "说出两个单位", opens: "单位换算 · 5 mi → km" },
          { speech: "20摄氏度换成华氏度", meaning: "一个温度读数", opens: "单位换算 · 20 °C → °F" },
        ],
      },
      {
        id: "money-zh",
        title: "任何货币的金额",
        canDo: "在两种货币之间换算，或只说一种即可得到合理的另一种。",
        icon: "coin",
        phrases: [
          { speech: "把120美元换成欧元", meaning: "数量 + 两种货币", opens: "汇率换算 · 120 USD → EUR" },
          { speech: "30欧元", meaning: "只说一种货币", opens: "汇率换算 · 30 EUR → USD" },
          { speech: "比特币价格", meaning: "一个数字资产话题", opens: "数字资产价格 · 比特币" },
        ],
      },
      {
        id: "formulas-zh",
        title: "日常公式",
        canDo: "直接说出房贷月供、分摊账单或二次方程。",
        icon: "function",
        phrases: [
          { speech: "房贷月供", meaning: "一个理财话题", opens: "公式工具 · 贷款预设" },
          { speech: "分摊账单", meaning: "平摊一笔账单", opens: "公式工具 · 小费预设" },
          { speech: "一元二次方程", meaning: "一个数学话题", opens: "公式工具 · 正根预设" },
        ],
      },
      {
        id: "reference-zh",
        title: "参考数据",
        canDo: "查询通货膨胀、GDP 等公开指标，并打开科学计算工具。",
        icon: "chart",
        phrases: [
          { speech: "中国通货膨胀", meaning: "一个经济指标", opens: "经济指标 · 中国，通货膨胀" },
          { speech: "科学计算器", meaning: "一个工具名称", opens: "科学计算器" },
          { speech: "矩阵的行列式", meaning: "一个科学话题", opens: "科学计算器 · 行列式预设" },
        ],
      },
      {
        id: "fluent-zh",
        title: "流畅操作",
        canDo: "接着说一个后续金额，或者要求重复上一个命令，不必重新说一遍。",
        icon: "refresh",
        phrases: [
          { speech: "把120美元换成欧元", meaning: "先设定方向", opens: "汇率换算 · 120 USD → EUR" },
          { speech: "还有80", meaning: "只说新的数量", opens: "汇率换算 · 80 USD → EUR（沿用方向）" },
          { speech: "再来一次", meaning: "重复上一个命令", opens: "重新执行你刚才的请求" },
        ],
      },
    ],
  },
};

export const LEARNING_PATH_ORDER: PackId[] = ["en", "es", "fr", "de", "zh"];
