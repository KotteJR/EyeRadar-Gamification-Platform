const BASE_PATH = "/game-assets/exercise-images";

export interface ExerciseImage {
  id: string;
  url: string;
  label: string;
  label_el: string;
}

/**
 * Available pixel-art images for word-image matching,
 * rapid naming, and memory recall exercises.
 *
 * Each image has both an English and Greek label.
 * The `id` is used for answer matching.
 */
export const EXERCISE_IMAGES: ExerciseImage[] = [
  { id: "grandmother", url: `${BASE_PATH}/grandmother.png`, label: "Grandmother", label_el: "γιαγιά" },
  { id: "cat",         url: `${BASE_PATH}/cat.png`,         label: "Cat",         label_el: "γάτα" },
  { id: "dog",         url: `${BASE_PATH}/dog.png`,         label: "Dog",         label_el: "σκύλος" },
  { id: "tiger",       url: `${BASE_PATH}/tiger.png`,       label: "Tiger",       label_el: "τίγρης" },
  { id: "duck",        url: `${BASE_PATH}/duck.png`,        label: "Duck",        label_el: "πάπια" },
  { id: "apple",       url: `${BASE_PATH}/apple.png`,       label: "Apple",       label_el: "μήλο" },
  { id: "house",       url: `${BASE_PATH}/house.png`,       label: "House",       label_el: "σπίτι" },
  { id: "tree",        url: `${BASE_PATH}/tree.png`,        label: "Tree",        label_el: "δέντρο" },
  { id: "sun",         url: `${BASE_PATH}/sun.png`,         label: "Sun",         label_el: "ήλιος" },
  { id: "fish",        url: `${BASE_PATH}/fish.png`,        label: "Fish",        label_el: "ψάρι" },
  { id: "flower",      url: `${BASE_PATH}/flower.png`,      label: "Flower",      label_el: "λουλούδι" },
  { id: "book",        url: `${BASE_PATH}/book.png`,        label: "Book",        label_el: "βιβλίο" },
];

export function getExerciseImage(id: string): ExerciseImage | undefined {
  return EXERCISE_IMAGES.find((img) => img.id === id);
}

export function getImageLabel(img: ExerciseImage, lang: string = "en"): string {
  return lang === "el" ? img.label_el : img.label;
}

export function getRandomImages(count: number, exclude?: string[]): ExerciseImage[] {
  const pool = exclude
    ? EXERCISE_IMAGES.filter((img) => !exclude.includes(img.id))
    : [...EXERCISE_IMAGES];

  const shuffled = pool.sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}
