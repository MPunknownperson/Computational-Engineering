"use client";

import { CONTACT_TOPICS } from "@/lib/catalog";
import { TextClassifier, type Example } from "./classifier";
import { memo } from "./runtime";
import { SequenceModel, UNKNOWN, START, END } from "./sequence";
import { tokenize } from "./text";

/**
 * Natural-language help for the contact form (TensorFlow.js, on-device):
 * topic classification and predictive next-word input. The visitor's message
 * is never stored and never used for training; the models learn only from the
 * built-in phrases below.
 */
const TOPIC_SEEDS: Record<string, string[]> = {
  general: [
    "great site thank you", "a suggestion for a new feature", "I would like to see a dark mode", "I love the calculator",
    "feedback on the design", "can you add another tool", "just saying hello", "a question about the site",
    "it would be useful if you added more units", "thanks for making this free",
  ],
  bug: [
    "the result is wrong", "the button does not work", "the page crashes", "an error message appears",
    "it shows the wrong number when I convert", "the page will not load", "the layout is broken on my phone",
    "the calculator freezes", "something looks wrong", "nothing happens when I press convert", "the result is blank",
  ],
  data: [
    "the exchange rate looks outdated", "the currency rate is incorrect", "the crypto price differs from other sites",
    "the inflation figure seems wrong", "the data feed is not updating", "where does the data come from",
    "the economic statistic is old", "what is the source of the numbers", "the rate is different from my bank",
  ],
  privacy: [
    "please delete my saved formulas", "what data do you store about me", "remove my data", "I have a privacy question",
    "how do I clear my formulas", "do you share my information", "a question about cookies", "a data protection request",
    "I want to opt out of data sharing", "what happens to my voice recordings",
  ],
  accessibility: [
    "my screen reader cannot read the result", "keyboard navigation does not work", "the colour contrast is too low",
    "the text is too small to read", "I cannot use it with voice control", "an accessibility barrier on a page",
    "the focus indicator is missing", "zooming breaks the layout", "colour blind users cannot see the difference",
  ],
  legal: [
    "a legal notice", "a copyright complaint", "a question about the terms of service", "a takedown request",
    "a legal request", "a trademark matter", "a question about the liability disclaimer", "our lawyer is contacting you",
  ],
};

export interface TopicGuess { value: string; label: string; probability: number }

function topicModel(): Promise<TextClassifier | null> {
  return memo("topics", () => {
    const list: Example[] = [];
    for (const [label, phrases] of Object.entries(TOPIC_SEEDS)) for (const text of phrases) list.push({ text, label });
    return TextClassifier.create("topics", list);
  });
}

export async function guessTopic(message: string): Promise<TopicGuess | null> {
  if (message.trim().length < 18) return null;
  const model = await topicModel();
  if (!model) return null;
  const [first, second] = model.predict(message);
  if (first.probability < 0.55 || first.probability - (second?.probability ?? 0) < 0.15) return null;
  const topic = CONTACT_TOPICS.find((item) => item.value === first.label);
  return topic ? { value: topic.value, label: topic.label, probability: first.probability } : null;
}

/* --------------------------- predictive words --------------------------- */

const SENTENCES = [
  "the unit converter shows the wrong result when I enter a value",
  "the currency converter shows an exchange rate that looks outdated",
  "the result is hidden until I press convert and then nothing happens",
  "I entered a number and expected a different result",
  "I would like to see more units in the converter",
  "please add a dark mode to the calculator",
  "the page does not load on my phone",
  "the formula tool does not save my formula",
  "I tried to save a formula but I saw an error",
  "the scientific calculator gives a different answer from my calculator",
  "thank you for the calculator it is very useful",
  "how do I delete my saved formulas",
  "what data do you store about my formulas",
  "the screen reader does not read the result",
  "the text is too small and the contrast is too low",
  "where do the exchange rates come from",
  "the bitcoin price differs from another site",
  "the inflation figure on the economy page seems wrong",
  "I pressed the voice button but nothing happened",
  "voice input did not understand what I said",
  "I expected the converter to open with my usual units",
  "the button does not work when I use the keyboard",
  "I found a mistake on the guide page",
  "can you add a tool to convert time zones",
  "I am using a browser on my laptop and the layout is broken",
];

function wordModel(): Promise<SequenceModel | null> {
  return memo("words", () => SequenceModel.create("words", SENTENCES.map((sentence) => tokenize(sentence).filter((word) => word !== "#"))));
}

export async function suggestWords(message: string, limit = 3): Promise<string[]> {
  const model = await wordModel();
  if (!model) return [];
  const endsWithSpace = /\s$/.test(message) || message.length === 0;
  const words = tokenize(message).filter((word) => word !== "#");
  const partial = endsWithSpace ? "" : words.pop() ?? "";
  if (!endsWithSpace && !partial) return [];
  const probabilities = model.probabilities(words);
  return model.vocab
    .map((token, index) => ({ token, p: probabilities[index] }))
    .filter(({ token, p }) => ![START, END, UNKNOWN].includes(token) && p > 0.04 && token !== partial && token.startsWith(partial))
    .sort((a, b) => b.p - a.p)
    .slice(0, limit)
    .map(({ token }) => token);
}
