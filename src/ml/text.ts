/**
 * Language-agnostic text features for the on-device classifiers.
 *
 * Words, word pairs and character trigrams are hashed into a fixed-size
 * vector. Character trigrams make the models tolerant of the small spelling
 * differences speech recognisers produce ("selsius", "kilo grams").
 */
export const TEXT_DIM = 384;

export function tokenize(text: string): string[] {
  const words = text
    .normalize("NFKD")
    .replace(/\p{M}+/gu, "")
    .toLowerCase()
    .match(/\p{L}+|\p{N}+/gu) ?? [];
  return words.map((word) => (/^\p{N}+$/u.test(word) ? "#" : word));
}

function bucket(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0) % TEXT_DIM;
}

export function featurize(text: string): Float32Array {
  const vector = new Float32Array(TEXT_DIM);
  const words = tokenize(text).slice(0, 40);
  words.forEach((word, index) => {
    vector[bucket(`w:${word}`)] += 1;
    if (index > 0) vector[bucket(`b:${words[index - 1]} ${word}`)] += 0.7;
    const padded = `^${word}$`;
    for (let at = 0; at <= padded.length - 3; at += 1) vector[bucket(`c:${padded.slice(at, at + 3)}`)] += 0.35;
  });
  let norm = 0;
  for (let index = 0; index < TEXT_DIM; index += 1) {
    vector[index] = Math.sqrt(vector[index]);
    norm += vector[index] * vector[index];
  }
  norm = Math.sqrt(norm) || 1;
  for (let index = 0; index < TEXT_DIM; index += 1) vector[index] /= norm;
  return vector;
}
