"""
Exercise content generation with AI enhancement.

Tries local Ollama LLMs first (heavy=qwen3-vl:8b, light=qwen3-vl:4b),
falls back to template-based generation when unavailable.

Each generator produces items with `extra_data` for interactive game types.
"""

import logging
import random
from typing import List, Dict, Any
from app.models import ExerciseItem
from app.services import ai_content as ai

logger = logging.getLogger(__name__)


# ─── Word banks by difficulty ─────────────────────────────────────────────────

SIMPLE_WORDS = ["cat", "dog", "sun", "hat", "bed", "cup", "red", "big", "run", "fun",
                "map", "top", "pig", "net", "box", "fox", "hen", "jam", "log", "nut"]

MEDIUM_WORDS = ["tree", "jump", "star", "fish", "bird", "frog", "lamp", "milk",
                "nest", "ring", "ship", "wind", "cake", "game", "home", "lake",
                "moon", "rain", "snow", "wolf"]

HARD_WORDS = ["bridge", "castle", "dragon", "forest", "garden", "island", "jungle",
              "kitten", "monkey", "planet", "rabbit", "stream", "turtle", "winter",
              "basket", "butter", "candle", "dinner", "finger", "hammer"]

ADVANCED_WORDS = ["adventure", "beautiful", "celebrate", "dangerous", "elephant",
                  "furniture", "generous", "happiness", "important", "knowledge",
                  "landscape", "mountain", "necessary", "operation", "passenger",
                  "question", "remember", "strength", "together", "umbrella"]

SIGHT_WORDS = ["the", "and", "was", "for", "are", "but", "not", "you", "all", "can",
               "her", "one", "our", "out", "day", "had", "has", "his", "how", "its",
               "may", "new", "now", "old", "see", "way", "who", "did", "get", "let",
               "say", "she", "too", "use", "man", "boy", "own", "any", "big"]

RHYME_PAIRS = [
    ("cat", "hat"), ("dog", "log"), ("sun", "fun"), ("bed", "red"),
    ("map", "cap"), ("pig", "wig"), ("net", "pet"), ("fox", "box"),
    ("cake", "lake"), ("moon", "spoon"), ("rain", "train"), ("star", "car"),
    ("tree", "bee"), ("fish", "dish"), ("ring", "king"), ("boat", "coat"),
    ("light", "night"), ("bear", "chair"), ("house", "mouse"), ("snake", "cake"),
]

STORY_PASSAGES = {
    "easy": [
        {
            "text": "The big red dog ran to the park. He played with a ball. Then he drank some water.",
            "questions": [
                {"q": "What color was the dog?", "options": ["Red", "Blue", "Green", "Yellow"], "answer": "Red"},
                {"q": "Where did the dog go?", "options": ["The store", "The park", "The beach", "School"], "answer": "The park"},
                {"q": "What did the dog play with?", "options": ["A stick", "A ball", "A toy", "A bone"], "answer": "A ball"},
            ]
        },
        {
            "text": "Sam has a pet cat. The cat is black and white. It likes to sleep on the bed.",
            "questions": [
                {"q": "What pet does Sam have?", "options": ["A dog", "A cat", "A bird", "A fish"], "answer": "A cat"},
                {"q": "What color is the cat?", "options": ["Orange", "Brown", "Black and white", "Gray"], "answer": "Black and white"},
                {"q": "Where does the cat like to sleep?", "options": ["On the floor", "On the bed", "In a box", "On a chair"], "answer": "On the bed"},
            ]
        },
    ],
    "medium": [
        {
            "text": "Maya loved rainy days. She would put on her yellow boots and splash in every puddle she could find. Her mother always had hot chocolate ready when she came inside. It was their special tradition.",
            "questions": [
                {"q": "What did Maya do on rainy days?", "options": ["Read books", "Splashed in puddles", "Watched TV", "Drew pictures"], "answer": "Splashed in puddles"},
                {"q": "What color were Maya's boots?", "options": ["Red", "Blue", "Yellow", "Green"], "answer": "Yellow"},
                {"q": "What did Maya's mother have ready?", "options": ["Tea", "Cookies", "Hot chocolate", "Soup"], "answer": "Hot chocolate"},
            ]
        },
        {
            "text": "The old lighthouse keeper climbed the stairs every evening to light the great lamp. Ships far out at sea depended on that light to find their way safely to the harbor. He never missed a single night in forty years.",
            "questions": [
                {"q": "What did the keeper do every evening?", "options": ["Read a book", "Light the lamp", "Cook dinner", "Go fishing"], "answer": "Light the lamp"},
                {"q": "Who depended on the light?", "options": ["Birds", "Ships at sea", "Airplanes", "Trains"], "answer": "Ships at sea"},
                {"q": "How long did he keep the light burning?", "options": ["Ten years", "Twenty years", "Forty years", "One year"], "answer": "Forty years"},
            ]
        },
    ],
    "hard": [
        {
            "text": "The ancient lighthouse had stood on the cliff for over two hundred years, guiding ships safely through the treacherous waters below. When the government announced plans to replace it with a modern navigation system, the townspeople organized a campaign to save it. They argued that the lighthouse was not just a tool for navigation — it was a symbol of their community's history and resilience.",
            "questions": [
                {"q": "How long had the lighthouse been standing?", "options": ["50 years", "100 years", "Over 200 years", "500 years"], "answer": "Over 200 years"},
                {"q": "Why did the government want to replace it?", "options": ["It was dangerous", "To use modern navigation", "It was too expensive", "It was too small"], "answer": "To use modern navigation"},
                {"q": "What did the townspeople do?", "options": ["Agreed with the government", "Organized a campaign to save it", "Moved away", "Built a new lighthouse"], "answer": "Organized a campaign to save it"},
                {"q": "What can you infer about the townspeople?", "options": ["They don't care about history", "They value their community heritage", "They dislike technology", "They want a new lighthouse"], "answer": "They value their community heritage"},
            ]
        },
    ],
}

PHRASES_BY_LEVEL = {
    1: ["the big cat", "I can run", "a red hat", "my pet dog", "go to bed"],
    2: ["jump up high", "under the bed", "a sunny day", "the little bird", "play a game"],
    3: ["she ran to the park", "the frog jumped in", "we like to play games", "they found a lost puppy"],
    4: ["the colorful butterfly landed softly", "running through the tall green grass", "she quickly finished her homework"],
    5: ["the mysterious old house at the corner", "nobody expected the surprise to arrive early", "carefully balancing on the narrow wooden bridge"],
}

LETTERS_COMMONLY_REVERSED = ["b", "d", "p", "q", "m", "w", "n", "u"]


def get_word_bank(difficulty: int) -> List[str]:
    if difficulty <= 2:
        return SIMPLE_WORDS
    elif difficulty <= 4:
        return MEDIUM_WORDS
    elif difficulty <= 7:
        return HARD_WORDS
    else:
        return ADVANCED_WORDS


async def generate_exercise_items(
    game_id: str,
    difficulty_level: int,
    item_count: int,
    student_interests: List[str] | None = None,
) -> List[ExerciseItem]:
    """
    Generate exercise items — tries AI first, falls back to templates.

    AI-enhanced generators (use local Ollama LLMs):
      Heavy (qwen3-vl:8b): stories, comprehension, inference, vocabulary, prosody
      Light (qwen3-vl:4b): word banks, rhymes, hints, syllables, phrases

    Template generators are always available as fallback.
    """
    # Mapping of game_id -> (AI generator, template fallback)
    # AI generators return None when LLM is unavailable
    ai_generators = {
        # Heavy model games (story / comprehension / inference)
        "story_recall": _gen_story_recall_ai,
        "question_quest": _gen_question_quest_ai,
        "repeated_reader": _gen_repeated_reader_ai,
        "main_idea_hunter": _gen_main_idea_hunter_ai,
        "inference_detective": _gen_inference_detective_ai,
        "vocabulary_builder": _gen_vocabulary_builder_ai,
        "story_sequencer": _gen_story_sequencer_ai,
        "prosody_practice": _gen_prosody_practice_ai,
        # Light model games (words / sounds / phrases)
        "sound_safari": _gen_sound_safari_ai,
        "rhyme_time_race": _gen_rhyme_time_ai,
        "syllable_stomper": _gen_syllable_stomper_ai,
        "phoneme_blender": _gen_phoneme_blender_ai,
        "sound_swap": _gen_sound_swap_ai,
        "flash_card_frenzy": _gen_flash_card_ai,
        "phrase_flash": _gen_phrase_flash_ai,
        "word_ladder": _gen_word_ladder_ai,
    }

    template_generators = {
        "sound_safari": _gen_sound_safari,
        "rhyme_time_race": _gen_rhyme_time,
        "syllable_stomper": _gen_syllable_stomper,
        "phoneme_blender": _gen_phoneme_blender,
        "sound_swap": _gen_sound_swap,
        "speed_namer": _gen_speed_namer,
        "flash_card_frenzy": _gen_flash_card,
        "object_blitz": _gen_object_blitz,
        "letter_stream": _gen_letter_stream,
        "memory_matrix": _gen_memory_matrix,
        "sequence_keeper": _gen_sequence_keeper,
        "backward_spell": _gen_backward_spell,
        "story_recall": _gen_story_recall,
        "dual_task_challenge": _gen_dual_task,
        "letter_detective": _gen_letter_detective,
        "tracking_trail": _gen_tracking_trail,
        "pattern_matcher": _gen_pattern_matcher,
        "mirror_image": _gen_mirror_image,
        "visual_closure": _gen_visual_closure,
        "phrase_flash": _gen_phrase_flash,
        "word_ladder": _gen_word_ladder,
        "repeated_reader": _gen_repeated_reader,
        "sight_word_sprint": _gen_sight_word_sprint,
        "prosody_practice": _gen_prosody_practice,
        "question_quest": _gen_question_quest,
        "main_idea_hunter": _gen_main_idea_hunter,
        "inference_detective": _gen_inference_detective,
        "vocabulary_builder": _gen_vocabulary_builder,
        "story_sequencer": _gen_story_sequencer,
    }

    # Try AI generation first
    if game_id in ai_generators:
        try:
            items = await ai_generators[game_id](difficulty_level, item_count)
            if items and len(items) >= item_count:
                logger.info("AI generated %d items for %s", len(items), game_id)
                return items[:item_count]
            elif items:
                # Partial AI success — pad with templates
                logger.info("AI partial: %d/%d for %s, padding with templates",
                           len(items), item_count, game_id)
                remaining = item_count - len(items)
                template_gen = template_generators.get(game_id, _gen_default)
                template_items = template_gen(difficulty_level, remaining)
                # Re-index template items
                for j, ti in enumerate(template_items):
                    ti.index = len(items) + j
                return items + template_items
        except Exception as exc:
            logger.warning("AI generation failed for %s: %s", game_id, exc)

    # Fall back to template generation
    generator = template_generators.get(game_id, _gen_default)
    return generator(difficulty_level, item_count)


# =============================================================================
# MULTIPLE CHOICE GENERATORS
# =============================================================================

def _gen_sound_safari(difficulty: int, count: int) -> List[ExerciseItem]:
    """Multiple choice: identify which word has a sound in a position."""
    items = []
    words = get_word_bank(difficulty)
    positions = ["beginning", "ending"] if difficulty <= 3 else ["beginning", "middle", "ending"]
    for i in range(count):
        word = random.choice(words)
        position = random.choice(positions)
        if position == "beginning":
            target_sound = word[0]
        elif position == "ending":
            target_sound = word[-1]
        else:
            target_sound = word[len(word) // 2] if len(word) > 2 else word[0]

        distractors = random.sample([w for w in words if w != word], min(3, len(words) - 1))
        options = [word] + distractors
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Which word has the sound '{target_sound}' at the {position}?",
            options=options,
            correct_answer=word,
            hint=f"The sound '{target_sound}' is at the {position} of the word.",
            item_type="multiple_choice",
        ))
    return items


def _gen_prosody_practice(difficulty: int, count: int) -> List[ExerciseItem]:
    """Multiple choice: identify the correct reading tone."""
    items = []
    sentences = [
        ("I can't believe it!", "excited"), ("Where are you going?", "questioning"),
        ("Please sit down quietly.", "calm"), ("Watch out for that car!", "urgent"),
        ("Once upon a time, there lived a king.", "storytelling"),
        ("Happy birthday to you!", "celebratory"),
        ("We won the championship!", "excited"),
        ("Could you please help me?", "polite"),
        ("Stop right there! Don't move!", "commanding"),
    ]
    for i in range(count):
        sentence, tone = random.choice(sentences)
        distractors = list(set(t for _, t in sentences if t != tone))[:3]
        options = [tone] + distractors
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"What tone should you use to read: '{sentence}'",
            options=options,
            correct_answer=tone,
            hint="Think about the punctuation and meaning.",
            item_type="multiple_choice",
        ))
    return items


def _gen_question_quest(difficulty: int, count: int) -> List[ExerciseItem]:
    """Multiple choice: reading comprehension questions."""
    return _gen_story_recall_mc(difficulty, count)


def _gen_main_idea_hunter(difficulty: int, count: int) -> List[ExerciseItem]:
    """Multiple choice: identify the main idea of a passage."""
    items = []
    passages = [
        ("Dogs make wonderful pets. They are loyal, friendly, and love to play. Many families enjoy having a dog.",
         "Dogs make great pets"),
        ("The ocean is home to many creatures. Fish, whales, and dolphins all live in the sea. Coral reefs provide shelter for thousands of species.",
         "The ocean has diverse marine life"),
        ("Exercise is important for health. Running, swimming, and biking help keep your body strong. Even a short walk each day can make a difference.",
         "Exercise keeps you healthy"),
        ("Trees provide us with oxygen and shade. Birds build nests in their branches. Some trees live for thousands of years, standing tall through storms and seasons.",
         "Trees are important and resilient"),
        ("Music can change the way we feel. A happy song can make us smile, and a slow melody can help us relax. Scientists say listening to music is good for our brains.",
         "Music affects our mood and health"),
    ]
    for i in range(count):
        text, main_idea = random.choice(passages)
        distractors = [mi for _, mi in passages if mi != main_idea][:3]
        if len(distractors) < 3:
            distractors.extend(["The weather is changing", "Food is delicious", "School is fun"][:3 - len(distractors)])
        options = [main_idea] + distractors[:3]
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Read: '{text}'\n\nWhat is the main idea?",
            options=options,
            correct_answer=main_idea,
            item_type="multiple_choice",
        ))
    return items


def _gen_inference_detective(difficulty: int, count: int) -> List[ExerciseItem]:
    """Multiple choice: make inferences from text clues."""
    items = []
    scenarios = [
        ("Sarah put on her boots, grabbed her umbrella, and looked at the dark clouds.",
         "What is likely about to happen?", "It's going to rain",
         ["She's going to school", "It's going to rain", "She's going shopping", "It's her birthday"]),
        ("The puppy wagged its tail and barked happily when it heard the car in the driveway.",
         "How does the puppy feel?", "Excited",
         ["Scared", "Excited", "Tired", "Hungry"]),
        ("Tom studied all night for his test. The next day, he answered every question with confidence.",
         "How did Tom probably do on the test?", "He did well",
         ["He failed", "He did well", "He forgot everything", "He was absent"]),
        ("The girl looked at the empty cookie jar and then at her little brother, who had crumbs all over his face.",
         "What probably happened?", "Her brother ate the cookies",
         ["She ate the cookies", "Her brother ate the cookies", "The dog ate them", "Mom hid them"]),
        ("The flowers in the garden were drooping, the soil was cracked, and the grass had turned brown.",
         "What has been missing?", "Rain or water",
         ["Sunlight", "Rain or water", "Fertilizer", "Seeds"]),
    ]
    for i in range(count):
        text, question, answer, options = random.choice(scenarios)
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Read: '{text}'\n\n{question}",
            options=options,
            correct_answer=answer,
            item_type="multiple_choice",
        ))
    return items


def _gen_story_recall_mc(difficulty: int, count: int) -> List[ExerciseItem]:
    """Multiple choice: standard story comprehension (passage always visible)."""
    if difficulty <= 3:
        level = "easy"
    elif difficulty <= 6:
        level = "medium"
    else:
        level = "hard"
    passages = STORY_PASSAGES.get(level, STORY_PASSAGES["easy"])
    passage = random.choice(passages)
    items = []
    for i, q in enumerate(passage["questions"][:count]):
        items.append(ExerciseItem(
            index=i,
            question=f"[Passage: {passage['text']}]\n\n{q['q']}",
            options=q["options"],
            correct_answer=q["answer"],
            item_type="multiple_choice",
        ))
    return items


# =============================================================================
# SPEED ROUND GENERATORS
# =============================================================================

def _gen_rhyme_time(difficulty: int, count: int) -> List[ExerciseItem]:
    """Speed round: match rhyming words against a timer."""
    items = []
    pairs = RHYME_PAIRS[: min(len(RHYME_PAIRS), 5 + difficulty * 2)]
    time_limit = max(3, 10 - difficulty)  # seconds to answer
    for i in range(count):
        pair = random.choice(pairs)
        word = pair[0]
        correct = pair[1]
        distractors = random.sample(
            [p[1] for p in pairs if p != pair] + random.sample(get_word_bank(difficulty), 2),
            min(3, len(pairs)),
        )
        options = [correct] + distractors[:3]
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Which word rhymes with '{word}'?",
            options=options,
            correct_answer=correct,
            hint=f"Think about the ending sound of '{word}'.",
            item_type="speed_round",
            extra_data={
                "time_limit_seconds": time_limit,
                "target_word": word,
            },
        ))
    return items


def _gen_speed_namer(difficulty: int, count: int) -> List[ExerciseItem]:
    """Speed round: rapidly identify items with countdown timer."""
    items = []
    sequences = {
        "letters": list("ABCDEFGHIJKLMNOPQRSTUVWXYZ"),
        "numbers": [str(n) for n in range(1, 21)],
        "colors": ["red", "blue", "green", "yellow", "orange", "purple", "pink", "brown"],
    }
    time_limit = max(2, 8 - difficulty)
    seq_type = random.choice(list(sequences.keys()))
    pool = sequences[seq_type]
    for i in range(count):
        target = random.choice(pool)
        distractors = random.sample([x for x in pool if x != target], min(3, len(pool) - 1))
        options = [target] + distractors
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Quickly identify: {target}",
            options=options,
            correct_answer=target,
            item_type="speed_round",
            extra_data={
                "time_limit_seconds": time_limit,
                "display_item": target,
                "category": seq_type,
            },
        ))
    return items


def _gen_flash_card(difficulty: int, count: int) -> List[ExerciseItem]:
    """Speed round: rapid word recognition with decreasing time."""
    items = []
    words = get_word_bank(difficulty)
    meanings = {
        "cat": "a small furry pet", "dog": "a loyal pet animal", "sun": "a star that gives us light",
        "tree": "a tall plant with branches", "fish": "an animal that lives in water",
        "star": "a bright light in the sky", "moon": "shines at night in the sky",
        "rain": "water falling from clouds", "bird": "an animal with wings",
        "castle": "a large building with towers", "dragon": "a mythical fire-breathing creature",
        "forest": "an area with many trees", "island": "land surrounded by water",
        "monkey": "a clever primate", "rabbit": "a furry animal with long ears",
    }
    base_time = max(3, 10 - difficulty)
    for i in range(count):
        word = random.choice(list(meanings.keys()))
        correct = meanings[word]
        distractors = random.sample([v for k, v in meanings.items() if k != word], min(3, len(meanings) - 2))
        options = [correct] + distractors
        random.shuffle(options)
        # Time decreases as you progress through the round
        time_limit = max(2, base_time - (i // 3))
        items.append(ExerciseItem(
            index=i,
            question=f"What does '{word}' mean?",
            options=options,
            correct_answer=correct,
            item_type="speed_round",
            extra_data={
                "time_limit_seconds": time_limit,
                "display_item": word,
                "progressive_speed": True,
            },
        ))
    return items


def _gen_object_blitz(difficulty: int, count: int) -> List[ExerciseItem]:
    """Speed round: name objects quickly."""
    items = []
    objects_with_emoji = [
        ("apple", "🍎"), ("house", "🏠"), ("car", "🚗"), ("book", "📕"),
        ("chair", "🪑"), ("clock", "🕐"), ("flower", "🌸"), ("guitar", "🎸"),
        ("key", "🔑"), ("lamp", "💡"), ("pencil", "✏️"), ("phone", "📱"),
        ("star", "⭐"), ("sun", "☀️"), ("tree", "🌳"), ("umbrella", "☂️"),
        ("ball", "⚽"), ("cake", "🎂"), ("fish", "🐟"), ("moon", "🌙"),
    ]
    time_limit = max(2, 7 - difficulty)
    for i in range(count):
        correct_name, emoji = random.choice(objects_with_emoji)
        distractors = random.sample([o[0] for o in objects_with_emoji if o[0] != correct_name], 3)
        options = [correct_name] + distractors
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"What is this? {emoji}",
            options=options,
            correct_answer=correct_name,
            item_type="speed_round",
            extra_data={
                "time_limit_seconds": time_limit,
                "display_emoji": emoji,
            },
        ))
    return items


def _gen_sight_word_sprint(difficulty: int, count: int) -> List[ExerciseItem]:
    """Speed round: rapid sight word identification."""
    items = []
    words = SIGHT_WORDS[:min(len(SIGHT_WORDS), 10 + difficulty * 3)]
    time_limit = max(2, 6 - difficulty // 2)
    for i in range(count):
        word = random.choice(words)
        distractors = []
        for _ in range(3):
            chars = list(word)
            if len(chars) > 1:
                idx = random.randint(0, len(chars) - 1)
                chars[idx] = random.choice("abcdefghijklmnopqrstuvwxyz")
            distractors.append("".join(chars))
        options = [word] + distractors
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Which is the correct spelling?",
            options=options,
            correct_answer=word,
            item_type="speed_round",
            extra_data={
                "time_limit_seconds": time_limit,
                "display_item": word,
            },
        ))
    return items


# =============================================================================
# GRID MEMORY GENERATOR
# =============================================================================

def _gen_memory_matrix(difficulty: int, count: int) -> List[ExerciseItem]:
    """Grid memory: show pattern on grid, player recreates from memory."""
    items = []
    grid_size = min(3 + difficulty // 3, 6)
    show_duration = max(1.5, 5 - difficulty * 0.3)  # seconds to study pattern
    for i in range(count):
        cells_to_remember = min(2 + difficulty // 2, grid_size * grid_size // 2)
        total_cells = grid_size * grid_size
        pattern = sorted(random.sample(range(total_cells), cells_to_remember))
        pattern_str = ",".join(str(p) for p in pattern)
        items.append(ExerciseItem(
            index=i,
            question=f"Remember the pattern!",
            options=[],
            correct_answer=pattern_str,
            hint=f"There are {cells_to_remember} squares to remember.",
            item_type="grid_memory",
            extra_data={
                "grid_size": grid_size,
                "pattern": pattern,
                "cells_to_remember": cells_to_remember,
                "show_duration_seconds": show_duration,
            },
        ))
    return items


# =============================================================================
# SEQUENCE TAP GENERATORS
# =============================================================================

def _gen_syllable_stomper(difficulty: int, count: int) -> List[ExerciseItem]:
    """Sequence tap: tap the correct number of beats for syllables."""
    items = []
    syllable_map = {
        "cat": 1, "dog": 1, "sun": 1, "hat": 1, "bed": 1,
        "tiger": 2, "monkey": 2, "basket": 2, "garden": 2, "table": 2,
        "elephant": 3, "beautiful": 3, "adventure": 3, "chocolate": 3, "banana": 3,
        "caterpillar": 4, "watermelon": 4, "calculator": 4,
        "encyclopedia": 6, "imagination": 5,
    }
    words = list(syllable_map.keys())
    if difficulty <= 3:
        words = [w for w in words if syllable_map[w] <= 2]
    elif difficulty <= 6:
        words = [w for w in words if syllable_map[w] <= 3]

    for i in range(count):
        word = random.choice(words)
        correct_count = syllable_map[word]
        max_taps = min(correct_count + 2, 6)
        items.append(ExerciseItem(
            index=i,
            question=f"How many syllables (beats) does '{word}' have? Tap that many times!",
            options=[],
            correct_answer=str(correct_count),
            hint=f"Try clapping for each beat: {word}",
            item_type="sequence_tap",
            extra_data={
                "word": word,
                "syllable_count": correct_count,
                "max_taps": max_taps,
                "tap_mode": "count",  # tap N times
            },
        ))
    return items


def _gen_sequence_keeper(difficulty: int, count: int) -> List[ExerciseItem]:
    """Sequence tap: remember and repeat a number sequence by tapping."""
    items = []
    seq_length = min(3 + difficulty // 2, 8)
    show_duration = max(2, seq_length * 0.8)  # time to study
    for i in range(count):
        sequence = [random.randint(1, 9) for _ in range(seq_length)]
        correct = ",".join(str(s) for s in sequence)
        items.append(ExerciseItem(
            index=i,
            question=f"Watch the sequence, then tap the numbers in the same order!",
            options=[],
            correct_answer=correct,
            item_type="sequence_tap",
            extra_data={
                "sequence": sequence,
                "show_duration_seconds": show_duration,
                "tap_mode": "repeat",  # tap same sequence
                "available_numbers": list(range(1, 10)),
            },
        ))
    return items


# =============================================================================
# TEXT INPUT GENERATOR
# =============================================================================

def _gen_backward_spell(difficulty: int, count: int) -> List[ExerciseItem]:
    """Text input: spell words backwards."""
    items = []
    words = get_word_bank(difficulty)
    for i in range(count):
        word = random.choice(words)
        correct = word[::-1]
        items.append(ExerciseItem(
            index=i,
            question=f"Spell '{word}' backwards:",
            options=[],
            correct_answer=correct,
            hint=f"The word has {len(word)} letters. Start from the last letter!",
            item_type="text_input",
            extra_data={
                "original_word": word,
                "letter_count": len(word),
            },
        ))
    return items


# =============================================================================
# SORTING GENERATOR
# =============================================================================

def _gen_story_sequencer(difficulty: int, count: int) -> List[ExerciseItem]:
    """Sorting: arrange story events in the correct order by tapping."""
    items = []
    sequences = [
        ["Wake up in the morning", "Eat breakfast", "Go to school", "Come home"],
        ["Plant a seed", "Water it every day", "Watch it grow", "Pick the flower"],
        ["Mix the ingredients", "Pour into a pan", "Put in the oven", "Eat the cake"],
        ["Get dressed", "Brush your teeth", "Pack your bag", "Walk to the bus stop"],
        ["Open the book", "Read the first chapter", "Answer the questions", "Close the book"],
        ["Find a recipe", "Buy the ingredients", "Cook the meal", "Serve the food"],
        ["Hear the alarm", "Get out of bed", "Take a shower", "Get dressed for school"],
    ]
    for i in range(count):
        correct_seq = random.choice(sequences)
        num_items = min(len(correct_seq), 3 + difficulty // 3)
        correct_seq = correct_seq[:num_items]
        shuffled = correct_seq.copy()
        random.shuffle(shuffled)
        # Make sure it's actually shuffled
        attempts = 0
        while shuffled == correct_seq and attempts < 10:
            random.shuffle(shuffled)
            attempts += 1
        correct_answer = "|".join(correct_seq)
        items.append(ExerciseItem(
            index=i,
            question="Put these events in the correct order:",
            options=[],
            correct_answer=correct_answer,
            hint="Think about what would happen first, second, third...",
            item_type="sorting",
            extra_data={
                "events": shuffled,
                "correct_order": correct_seq,
                "num_events": len(correct_seq),
            },
        ))
    return items


# =============================================================================
# WORD BUILDING GENERATORS
# =============================================================================

def _gen_phoneme_blender(difficulty: int, count: int) -> List[ExerciseItem]:
    """Word building: tap sounds in order to blend them into a word."""
    items = []
    blends = [
        (["/c/", "/a/", "/t/"], "cat"), (["/d/", "/o/", "/g/"], "dog"),
        (["/s/", "/u/", "/n/"], "sun"), (["/b/", "/e/", "/d/"], "bed"),
        (["/f/", "/i/", "/sh/"], "fish"), (["/sh/", "/i/", "/p/"], "ship"),
        (["/t/", "/r/", "/ee/"], "tree"), (["/s/", "/t/", "/ar/"], "star"),
        (["/b/", "/r/", "/i/", "/dge/"], "bridge"), (["/s/", "/t/", "/r/", "/ea/", "/m/"], "stream"),
        (["/m/", "/oo/", "/n/"], "moon"), (["/r/", "/ai/", "/n/"], "rain"),
    ]
    subset = blends[:min(len(blends), 3 + difficulty)]
    for i in range(count):
        sounds, word = random.choice(subset)
        words = get_word_bank(difficulty)
        distractors = random.sample([w for w in words if w != word], min(3, len(words) - 1))
        options = [word] + distractors
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question="Blend the sounds to make a word!",
            options=options,
            correct_answer=word,
            hint="Say each sound slowly, then faster and faster.",
            item_type="word_building",
            extra_data={
                "sounds": sounds,
                "target_word": word,
                "build_mode": "blend",
            },
        ))
    return items


def _gen_sound_swap(difficulty: int, count: int) -> List[ExerciseItem]:
    """Word building: swap a sound to make a new word."""
    items = []
    swaps = [
        ("cat", "c", "b", "bat"), ("cat", "c", "h", "hat"), ("dog", "d", "l", "log"),
        ("man", "m", "c", "can"), ("pin", "p", "b", "bin"), ("red", "r", "b", "bed"),
        ("fun", "f", "s", "sun"), ("net", "n", "p", "pet"), ("big", "b", "d", "dig"),
        ("cap", "c", "m", "map"), ("hit", "h", "s", "sit"), ("mop", "m", "t", "top"),
    ]
    for i in range(count):
        original, old_sound, new_sound, answer = random.choice(swaps)
        words = get_word_bank(difficulty)
        distractors = random.sample([w for w in words if w != answer], min(3, len(words) - 1))
        options = [answer] + distractors
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Change '{old_sound}' to '{new_sound}' in the word below:",
            options=options,
            correct_answer=answer,
            hint=f"Take '{original}', remove '{old_sound}', add '{new_sound}'.",
            item_type="word_building",
            extra_data={
                "original_word": original,
                "old_sound": old_sound,
                "new_sound": new_sound,
                "letters": list(original),
                "swap_position": original.index(old_sound) if old_sound in original else 0,
                "build_mode": "swap",
            },
        ))
    return items


def _gen_word_ladder(difficulty: int, count: int) -> List[ExerciseItem]:
    """Word building: change one letter to build a word chain."""
    items = []
    ladders = [
        ("cat", "bat"), ("bat", "bad"), ("bad", "bed"), ("bed", "red"),
        ("hot", "hat"), ("hat", "mat"), ("mat", "map"), ("map", "mop"),
        ("dog", "dig"), ("dig", "big"), ("big", "bag"), ("bag", "bat"),
        ("top", "tap"), ("tap", "tip"), ("tip", "tin"), ("tin", "bin"),
    ]
    for i in range(count):
        start, target = random.choice(ladders)
        distractors = random.sample([w for _, w in ladders if w != target] + ["cap", "tap", "zip"], 3)
        options = [target] + distractors[:3]
        random.shuffle(options)
        # Figure out which letter changed
        change_pos = 0
        for j in range(min(len(start), len(target))):
            if start[j] != target[j]:
                change_pos = j
                break
        items.append(ExerciseItem(
            index=i,
            question=f"Change one letter in '{start}' to make a new word:",
            options=options,
            correct_answer=target,
            hint=f"Look at each letter position and think about what could change.",
            item_type="word_building",
            extra_data={
                "start_word": start,
                "target_word": target,
                "letters": list(start),
                "change_position": change_pos,
                "build_mode": "ladder",
            },
        ))
    return items


# =============================================================================
# TIMED READING GENERATORS
# =============================================================================

def _gen_story_recall(difficulty: int, count: int) -> List[ExerciseItem]:
    """Timed reading: read passage under time pressure, then answer from memory."""
    if difficulty <= 3:
        level = "easy"
    elif difficulty <= 6:
        level = "medium"
    else:
        level = "hard"
    passages = STORY_PASSAGES.get(level, STORY_PASSAGES["easy"])
    passage = random.choice(passages)
    text = passage["text"]
    # Reading time based on word count and difficulty
    word_count = len(text.split())
    reading_time = max(5, int(word_count * 0.5) - difficulty)
    items = []
    for i, q in enumerate(passage["questions"][:count]):
        items.append(ExerciseItem(
            index=i,
            question=q["q"],
            options=q["options"],
            correct_answer=q["answer"],
            item_type="timed_reading",
            extra_data={
                "passage": text,
                "reading_time_seconds": reading_time,
                "word_count": word_count,
                "passage_visible_during_questions": False,  # memory challenge
            },
        ))
    return items


def _gen_phrase_flash(difficulty: int, count: int) -> List[ExerciseItem]:
    """Timed reading: phrase appears briefly, then answer about it."""
    items = []
    level = min(difficulty, max(PHRASES_BY_LEVEL.keys()))
    level = max(level, min(PHRASES_BY_LEVEL.keys()))
    phrases = PHRASES_BY_LEVEL.get(level, PHRASES_BY_LEVEL[1])
    flash_time = max(1, 4 - difficulty * 0.3)  # seconds to read phrase
    for i in range(count):
        phrase = random.choice(phrases)
        words_in_phrase = phrase.split()
        word_count = len(words_in_phrase)
        # Ask various questions about the phrase
        question_types = [
            (f"How many words were in the phrase?", str(word_count),
             [str(word_count - 1), str(word_count), str(word_count + 1), str(word_count + 2)]),
            (f"What was the first word?", words_in_phrase[0],
             [words_in_phrase[0]] + random.sample(["the", "a", "my", "to", "it", "in", "go", "we"], 3)),
            (f"What was the last word?", words_in_phrase[-1],
             [words_in_phrase[-1]] + random.sample(get_word_bank(min(difficulty, 2)), 3)),
        ]
        q_text, correct, opts = random.choice(question_types)
        opts = list(set(opts))[:4]
        if correct not in opts:
            opts[0] = correct
        random.shuffle(opts)
        items.append(ExerciseItem(
            index=i,
            question=q_text,
            options=opts,
            correct_answer=correct,
            item_type="timed_reading",
            extra_data={
                "passage": phrase,
                "reading_time_seconds": flash_time,
                "word_count": word_count,
                "passage_visible_during_questions": False,
            },
        ))
    return items


def _gen_repeated_reader(difficulty: int, count: int) -> List[ExerciseItem]:
    """Timed reading: passage stays visible, focus on comprehension."""
    if difficulty <= 3:
        level = "easy"
    elif difficulty <= 6:
        level = "medium"
    else:
        level = "hard"
    passages = STORY_PASSAGES.get(level, STORY_PASSAGES["easy"])
    passage = random.choice(passages)
    text = passage["text"]
    items = []
    for i, q in enumerate(passage["questions"][:count]):
        items.append(ExerciseItem(
            index=i,
            question=q["q"],
            options=q["options"],
            correct_answer=q["answer"],
            item_type="timed_reading",
            extra_data={
                "passage": text,
                "reading_time_seconds": 30,
                "word_count": len(text.split()),
                "passage_visible_during_questions": True,  # not memory, fluency focus
            },
        ))
    return items


# =============================================================================
# SPOT TARGET GENERATORS
# =============================================================================

def _gen_letter_stream(difficulty: int, count: int) -> List[ExerciseItem]:
    """Spot target: find target letter in a grid of letters."""
    items = []
    alphabet = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
    for i in range(count):
        target = random.choice(alphabet)
        # Create a grid layout
        grid_cols = min(4 + difficulty, 8)
        grid_rows = min(3 + difficulty // 2, 5)
        total = grid_cols * grid_rows
        grid = [random.choice([c for c in alphabet if c != target]) for _ in range(total)]
        target_positions = random.sample(range(total), min(1 + difficulty // 3, 3))
        for pos in target_positions:
            grid[pos] = target
        items.append(ExerciseItem(
            index=i,
            question=f"Find all the '{target}' letters in the grid!",
            options=[],
            correct_answer=",".join(str(p) for p in sorted(target_positions)),
            hint=f"There are {len(target_positions)} '{target}' letters hidden in the grid.",
            item_type="spot_target",
            extra_data={
                "target": target,
                "grid": grid,
                "grid_cols": grid_cols,
                "grid_rows": grid_rows,
                "target_positions": sorted(target_positions),
                "target_count": len(target_positions),
            },
        ))
    return items


def _gen_letter_detective(difficulty: int, count: int) -> List[ExerciseItem]:
    """Spot target: find the target letter in a visual grid."""
    items = []
    for i in range(count):
        target = random.choice("abcdefghijklmnopqrstuvwxyz")
        grid_cols = min(4 + difficulty, 7)
        grid_rows = min(3 + difficulty // 2, 5)
        total = grid_cols * grid_rows
        letters = [random.choice("abcdefghijklmnopqrstuvwxyz") for _ in range(total)]
        # Ensure target is NOT accidentally in the grid
        letters = [l if l != target else random.choice([c for c in "abcdefghijklmnopqrstuvwxyz" if c != target]) for l in letters]
        # Place target at specific positions
        target_pos = random.sample(range(total), min(1 + difficulty // 4, 3))
        for pos in target_pos:
            letters[pos] = target
        items.append(ExerciseItem(
            index=i,
            question=f"Tap every '{target}' you can find!",
            options=[],
            correct_answer=",".join(str(p) for p in sorted(target_pos)),
            hint=f"Look carefully — there are {len(target_pos)} hidden.",
            item_type="spot_target",
            extra_data={
                "target": target,
                "grid": letters,
                "grid_cols": grid_cols,
                "grid_rows": grid_rows,
                "target_positions": sorted(target_pos),
                "target_count": len(target_pos),
            },
        ))
    return items


def _gen_mirror_image(difficulty: int, count: int) -> List[ExerciseItem]:
    """Spot target: find the correctly oriented letter among mirrored versions."""
    items = []
    mirror_map = {"b": "d", "d": "b", "p": "q", "q": "p", "m": "w", "w": "m", "n": "u", "u": "n"}
    for i in range(count):
        letter = random.choice(LETTERS_COMMONLY_REVERSED)
        mirrored = mirror_map.get(letter, letter)
        # Create a grid of mirrored letters with one correct one
        grid_size = min(3 + difficulty // 2, 5)
        total = grid_size * grid_size
        grid = [mirrored] * total
        correct_pos = random.sample(range(total), min(1 + difficulty // 4, 3))
        for pos in correct_pos:
            grid[pos] = letter
        items.append(ExerciseItem(
            index=i,
            question=f"Find the correct letter '{letter}' (not the mirror '{mirrored}')!",
            options=[],
            correct_answer=",".join(str(p) for p in sorted(correct_pos)),
            hint=f"Think about which direction '{letter}' faces.",
            item_type="spot_target",
            extra_data={
                "target": letter,
                "mirror": mirrored,
                "grid": grid,
                "grid_cols": grid_size,
                "grid_rows": grid_size,
                "target_positions": sorted(correct_pos),
                "target_count": len(correct_pos),
            },
        ))
    return items


# =============================================================================
# FILL BLANK GENERATORS
# =============================================================================

def _gen_visual_closure(difficulty: int, count: int) -> List[ExerciseItem]:
    """Fill blank: complete a word with missing letters."""
    items = []
    words = get_word_bank(difficulty)
    for i in range(count):
        word = random.choice(words)
        partial = list(word)
        num_blanks = max(1, len(word) // 3)
        if difficulty >= 5:
            num_blanks = max(1, len(word) // 2)
        blank_indices = sorted(random.sample(range(len(word)), min(num_blanks, len(word))))
        missing_letters = [word[idx] for idx in blank_indices]
        for idx in blank_indices:
            partial[idx] = "_"
        partial_str = " ".join(partial)  # space between for readability
        items.append(ExerciseItem(
            index=i,
            question=f"Complete the word:",
            options=[],
            correct_answer=word,
            hint=f"The word has {len(word)} letters.",
            item_type="fill_blank",
            extra_data={
                "partial_word": partial,
                "partial_display": partial_str,
                "blank_positions": blank_indices,
                "missing_letters": missing_letters,
                "full_word": word,
                "available_letters": list(set(missing_letters + random.sample(list("abcdefghijklmnopqrstuvwxyz"), min(4, 26)))),
            },
        ))
    return items


def _gen_vocabulary_builder(difficulty: int, count: int) -> List[ExerciseItem]:
    """Fill blank: use context to determine word meaning (with options)."""
    items = []
    vocab = [
        ("The gigantic elephant walked through the forest.", "gigantic", "very large",
         ["very small", "very large", "very fast", "very slow"]),
        ("She was furious when she found out about the surprise.", "furious", "very angry",
         ["very happy", "very angry", "very sad", "very tired"]),
        ("The timid kitten hid under the bed.", "timid", "shy and nervous",
         ["brave and bold", "shy and nervous", "loud and proud", "fast and strong"]),
        ("The detective examined the peculiar marks on the wall.", "peculiar", "strange or unusual",
         ["normal", "beautiful", "strange or unusual", "dangerous"]),
        ("The brave knight showed great courage against the dragon.", "courage", "bravery",
         ["fear", "bravery", "speed", "wisdom"]),
        ("The weather was so dreadful that everyone stayed inside.", "dreadful", "terrible",
         ["wonderful", "terrible", "surprising", "pleasant"]),
    ]
    for i in range(count):
        sentence, word, meaning, options = random.choice(vocab)
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"What does '{word}' mean in this sentence?",
            options=options,
            correct_answer=meaning,
            hint="Use the context of the sentence to help.",
            item_type="fill_blank",
            extra_data={
                "sentence": sentence,
                "target_word": word,
                "word_highlighted": True,
            },
        ))
    return items


# =============================================================================
# TRACKING GENERATOR
# =============================================================================

def _gen_tracking_trail(difficulty: int, count: int) -> List[ExerciseItem]:
    """Tracking: follow a visual path and determine the endpoint."""
    items = []
    for i in range(count):
        steps = 3 + difficulty
        directions = [random.choice(["up", "down", "left", "right"]) for _ in range(steps)]
        # Calculate actual endpoint from start (0, 0)
        x, y = 0, 0
        path_positions = [(x, y)]
        for d in directions:
            if d == "up":
                y -= 1
            elif d == "down":
                y += 1
            elif d == "left":
                x -= 1
            elif d == "right":
                x += 1
            path_positions.append((x, y))

        final = directions[-1]
        items.append(ExerciseItem(
            index=i,
            question="Follow the trail! What was the LAST direction?",
            options=["up", "down", "left", "right"],
            correct_answer=final,
            item_type="tracking",
            extra_data={
                "directions": directions,
                "path_positions": path_positions,
                "step_count": steps,
                "direction_emojis": {
                    "up": "⬆️", "down": "⬇️", "left": "⬅️", "right": "➡️"
                },
            },
        ))
    return items


# =============================================================================
# PATTERN MATCH GENERATOR
# =============================================================================

def _gen_pattern_matcher(difficulty: int, count: int) -> List[ExerciseItem]:
    """Pattern match: find the exact match from similar-looking options."""
    items = []
    shape_emojis = {
        "circle": "🔴", "square": "🟦", "triangle": "🔺",
        "diamond": "🔷", "star": "⭐", "heart": "❤️",
    }
    shapes = list(shape_emojis.keys())
    for i in range(count):
        pattern_length = min(3 + difficulty // 2, 6)
        available = shapes[:min(len(shapes), 2 + difficulty)]
        pattern = [random.choice(available) for _ in range(pattern_length)]
        pattern_display = " ".join(shape_emojis[s] for s in pattern)
        correct_display = pattern_display

        # Generate wrong options by changing 1-2 shapes
        wrong_options = []
        for _ in range(3):
            wrong = pattern.copy()
            num_changes = random.randint(1, min(2, len(wrong)))
            for _ in range(num_changes):
                idx = random.randint(0, len(wrong) - 1)
                wrong[idx] = random.choice([s for s in available if s != wrong[idx]])
            wrong_display = " ".join(shape_emojis[s] for s in wrong)
            if wrong_display != correct_display:
                wrong_options.append(wrong_display)

        # Ensure we have enough options
        while len(wrong_options) < 3:
            wrong = pattern.copy()
            idx = random.randint(0, len(wrong) - 1)
            wrong[idx] = random.choice([s for s in available if s != wrong[idx]])
            wd = " ".join(shape_emojis[s] for s in wrong)
            if wd != correct_display and wd not in wrong_options:
                wrong_options.append(wd)

        options = [correct_display] + wrong_options[:3]
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question="Study this pattern, then find the exact match!",
            options=options,
            correct_answer=correct_display,
            item_type="pattern_match",
            extra_data={
                "target_pattern": pattern_display,
                "pattern_shapes": pattern,
                "study_time_seconds": max(2, 5 - difficulty * 0.3),
            },
        ))
    return items


# =============================================================================
# DUAL TASK GENERATOR
# =============================================================================

def _gen_dual_task(difficulty: int, count: int) -> List[ExerciseItem]:
    """Dual task: remember a word while solving a math problem."""
    items = []
    for i in range(count):
        # The word to remember
        word = random.choice(get_word_bank(min(difficulty, 4)))
        # The math problem
        num1 = random.randint(1, 5 * difficulty)
        num2 = random.randint(1, 5 * difficulty)
        operation = random.choice(["+", "-"]) if difficulty > 3 else "+"
        if operation == "+":
            math_answer = num1 + num2
        else:
            if num1 < num2:
                num1, num2 = num2, num1
            math_answer = num1 - num2

        # Create math options
        math_distractors = list(set([
            math_answer + d for d in [-2, -1, 1, 2, 3]
            if math_answer + d > 0 and math_answer + d != math_answer
        ]))[:3]
        math_options = [str(math_answer)] + [str(d) for d in math_distractors]
        random.shuffle(math_options)

        # Create word recall options
        word_bank = get_word_bank(min(difficulty, 4))
        word_distractors = random.sample([w for w in word_bank if w != word], 3)
        word_options = [word] + word_distractors
        random.shuffle(word_options)

        items.append(ExerciseItem(
            index=i,
            question=f"Solve: {num1} {operation} {num2} = ?",
            options=math_options,
            correct_answer=str(math_answer),
            item_type="dual_task",
            extra_data={
                "remember_word": word,
                "math_problem": f"{num1} {operation} {num2}",
                "math_answer": str(math_answer),
                "word_options": word_options,
                "correct_word": word,
                "phase": "math_first",  # show word -> do math -> recall word
            },
        ))
    return items


# =============================================================================
# AI-ENHANCED GENERATORS  (async — return None when LLM unavailable)
# =============================================================================

# ── Heavy model (8b) AI generators ──────────────────────────────────────────

async def _gen_story_recall_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI timed-reading story recall (heavy model)."""
    data = await ai.generate_story_passage(difficulty, num_questions=count)
    if not data:
        return None
    text = data["text"]
    word_count = len(text.split())
    reading_time = max(5, int(word_count * 0.5) - difficulty)
    items = []
    for i, q in enumerate(data["questions"][:count]):
        items.append(ExerciseItem(
            index=i,
            question=q["q"],
            options=q.get("options", []),
            correct_answer=q["answer"],
            item_type="timed_reading",
            extra_data={
                "passage": text,
                "reading_time_seconds": reading_time,
                "word_count": word_count,
                "passage_visible_during_questions": False,
                "ai_generated": True,
            },
        ))
    return items if items else None


async def _gen_question_quest_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI comprehension questions (heavy model)."""
    data = await ai.generate_story_passage(difficulty, num_questions=count)
    if not data:
        return None
    text = data["text"]
    items = []
    for i, q in enumerate(data["questions"][:count]):
        items.append(ExerciseItem(
            index=i,
            question=f"[Passage: {text}]\n\n{q['q']}",
            options=q.get("options", []),
            correct_answer=q["answer"],
            item_type="multiple_choice",
            extra_data={"ai_generated": True},
        ))
    return items if items else None


async def _gen_repeated_reader_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI reading fluency with visible passage (heavy model)."""
    data = await ai.generate_story_passage(difficulty, num_questions=count)
    if not data:
        return None
    text = data["text"]
    items = []
    for i, q in enumerate(data["questions"][:count]):
        items.append(ExerciseItem(
            index=i,
            question=q["q"],
            options=q.get("options", []),
            correct_answer=q["answer"],
            item_type="timed_reading",
            extra_data={
                "passage": text,
                "reading_time_seconds": 30,
                "word_count": len(text.split()),
                "passage_visible_during_questions": True,
                "ai_generated": True,
            },
        ))
    return items if items else None


async def _gen_main_idea_hunter_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI main-idea identification (heavy model)."""
    data = await ai.generate_main_idea_passages(difficulty, count=count)
    if not data:
        return None
    items = []
    for i, p in enumerate(data[:count]):
        options = [p["main_idea"]] + p.get("distractors", [])[:3]
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Read: '{p['text']}'\n\nWhat is the main idea?",
            options=options,
            correct_answer=p["main_idea"],
            item_type="multiple_choice",
            extra_data={"ai_generated": True},
        ))
    return items if items else None


async def _gen_inference_detective_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI inference scenarios (heavy model)."""
    data = await ai.generate_inference_scenarios(difficulty, count=count)
    if not data:
        return None
    items = []
    for i, s in enumerate(data[:count]):
        options = s.get("options", [])
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Read: '{s['text']}'\n\n{s['question']}",
            options=options,
            correct_answer=s["answer"],
            item_type="multiple_choice",
            extra_data={"ai_generated": True},
        ))
    return items if items else None


async def _gen_vocabulary_builder_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI vocabulary in context (heavy model)."""
    data = await ai.generate_vocabulary_items(difficulty, count=count)
    if not data:
        return None
    items = []
    for i, v in enumerate(data[:count]):
        options = v.get("options", [])
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"What does '{v['word']}' mean in this sentence?",
            options=options,
            correct_answer=v["meaning"],
            hint="Use the context of the sentence to help.",
            item_type="fill_blank",
            extra_data={
                "sentence": v["sentence"],
                "target_word": v["word"],
                "word_highlighted": True,
                "ai_generated": True,
            },
        ))
    return items if items else None


async def _gen_story_sequencer_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI story event ordering (heavy model)."""
    data = await ai.generate_story_sequence(difficulty, count=count)
    if not data:
        return None
    items = []
    for i, s in enumerate(data[:count]):
        correct_seq = s["events"]
        shuffled = correct_seq.copy()
        random.shuffle(shuffled)
        attempts = 0
        while shuffled == correct_seq and attempts < 10:
            random.shuffle(shuffled)
            attempts += 1
        items.append(ExerciseItem(
            index=i,
            question="Put these events in the correct order:",
            options=[],
            correct_answer="|".join(correct_seq),
            hint="Think about what would happen first, second, third...",
            item_type="sorting",
            extra_data={
                "events": shuffled,
                "correct_order": correct_seq,
                "num_events": len(correct_seq),
                "ai_generated": True,
            },
        ))
    return items if items else None


async def _gen_prosody_practice_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI prosody / reading tone (heavy model)."""
    data = await ai.generate_prosody_sentences(difficulty, count=count)
    if not data:
        return None
    items = []
    for i, p in enumerate(data[:count]):
        options = [p["tone"]] + p.get("distractor_tones", [])[:3]
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"What tone should you use to read: '{p['sentence']}'",
            options=options,
            correct_answer=p["tone"],
            hint="Think about the punctuation and meaning.",
            item_type="multiple_choice",
            extra_data={"ai_generated": True},
        ))
    return items if items else None


# ── Light model (4b) AI generators ─────────────────────────────────────────

async def _gen_sound_safari_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI word bank for sound identification (light model)."""
    words = await ai.generate_word_bank(difficulty, count=20, category="common objects")
    if not words or len(words) < 4:
        return None
    positions = ["beginning", "ending"] if difficulty <= 3 else ["beginning", "middle", "ending"]
    items = []
    for i in range(count):
        word = random.choice(words)
        position = random.choice(positions)
        if position == "beginning":
            target_sound = word[0]
        elif position == "ending":
            target_sound = word[-1]
        else:
            target_sound = word[len(word) // 2] if len(word) > 2 else word[0]
        distractors = random.sample([w for w in words if w != word], min(3, len(words) - 1))
        options = [word] + distractors
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Which word has the sound '{target_sound}' at the {position}?",
            options=options,
            correct_answer=word,
            hint=f"The sound '{target_sound}' is at the {position} of the word.",
            item_type="multiple_choice",
            extra_data={"ai_generated": True},
        ))
    return items


async def _gen_rhyme_time_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI rhyming pairs (light model)."""
    pairs = await ai.generate_rhyme_pairs(difficulty, count=max(count, 8))
    if not pairs or len(pairs) < 2:
        return None
    time_limit = max(3, 10 - difficulty)
    items = []
    for i in range(min(count, len(pairs))):
        pair = pairs[i]
        word, correct = pair[0], pair[1]
        all_answers = [p[1] for p in pairs if p != pair]
        distractors = random.sample(all_answers, min(3, len(all_answers))) if all_answers else ["no", "match", "here"]
        options = [correct] + distractors[:3]
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Which word rhymes with '{word}'?",
            options=options,
            correct_answer=correct,
            hint=f"Think about the ending sound of '{word}'.",
            item_type="speed_round",
            extra_data={
                "time_limit_seconds": time_limit,
                "target_word": word,
                "ai_generated": True,
            },
        ))
    return items if items else None


async def _gen_syllable_stomper_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI syllable counting (light model)."""
    data = await ai.generate_syllable_words(difficulty, count=max(count, 10))
    if not data or len(data) < 2:
        return None
    items = []
    for i in range(min(count, len(data))):
        entry = data[i]
        word = entry["word"]
        correct_count = entry["syllables"]
        max_taps = min(correct_count + 2, 6)
        items.append(ExerciseItem(
            index=i,
            question=f"How many syllables (beats) does '{word}' have? Tap that many times!",
            options=[],
            correct_answer=str(correct_count),
            hint=f"Try clapping for each beat: {word}",
            item_type="sequence_tap",
            extra_data={
                "word": word,
                "syllable_count": correct_count,
                "max_taps": max_taps,
                "tap_mode": "count",
                "ai_generated": True,
            },
        ))
    return items if items else None


async def _gen_phoneme_blender_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI phoneme blending (light model)."""
    data = await ai.generate_phoneme_blends(difficulty, count=max(count, 8))
    if not data or len(data) < 2:
        return None
    all_words = [d["word"] for d in data]
    items = []
    for i in range(min(count, len(data))):
        entry = data[i]
        sounds = entry["sounds"]
        word = entry["word"]
        distractors = random.sample([w for w in all_words if w != word], min(3, len(all_words) - 1))
        options = [word] + distractors
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question="Blend the sounds to make a word!",
            options=options,
            correct_answer=word,
            hint="Say each sound slowly, then faster and faster.",
            item_type="word_building",
            extra_data={
                "sounds": sounds,
                "target_word": word,
                "build_mode": "blend",
                "ai_generated": True,
            },
        ))
    return items if items else None


async def _gen_sound_swap_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI sound swap exercises (light model)."""
    data = await ai.generate_sound_swap_items(difficulty, count=max(count, 8))
    if not data or len(data) < 2:
        return None
    all_results = [d["result"] for d in data]
    items = []
    for i in range(min(count, len(data))):
        entry = data[i]
        original = entry["original"]
        old_sound = entry["old_sound"]
        new_sound = entry["new_sound"]
        answer = entry["result"]
        distractors = random.sample([w for w in all_results if w != answer],
                                    min(3, len(all_results) - 1))
        if len(distractors) < 3:
            distractors += random.sample(get_word_bank(difficulty), 3 - len(distractors))
        options = [answer] + distractors[:3]
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Change '{old_sound}' to '{new_sound}' in the word below:",
            options=options,
            correct_answer=answer,
            hint=f"Take '{original}', remove '{old_sound}', add '{new_sound}'.",
            item_type="word_building",
            extra_data={
                "original_word": original,
                "old_sound": old_sound,
                "new_sound": new_sound,
                "letters": list(original),
                "swap_position": original.index(old_sound) if old_sound in original else 0,
                "build_mode": "swap",
                "ai_generated": True,
            },
        ))
    return items if items else None


async def _gen_flash_card_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI flash card word meanings (light model)."""
    data = await ai.generate_word_meanings(difficulty, count=max(count, 8))
    if not data or len(data) < 4:
        return None
    base_time = max(3, 10 - difficulty)
    items = []
    all_meanings = [d["meaning"] for d in data]
    for i in range(min(count, len(data))):
        entry = data[i]
        word = entry["word"]
        correct = entry["meaning"]
        distractors = random.sample([m for m in all_meanings if m != correct],
                                    min(3, len(all_meanings) - 1))
        options = [correct] + distractors
        random.shuffle(options)
        time_limit = max(2, base_time - (i // 3))
        items.append(ExerciseItem(
            index=i,
            question=f"What does '{word}' mean?",
            options=options,
            correct_answer=correct,
            item_type="speed_round",
            extra_data={
                "time_limit_seconds": time_limit,
                "display_item": word,
                "progressive_speed": True,
                "ai_generated": True,
            },
        ))
    return items if items else None


async def _gen_phrase_flash_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI phrase flash timed reading (light model)."""
    phrases = await ai.generate_phrases(difficulty, count=max(count, 8))
    if not phrases or len(phrases) < 2:
        return None
    flash_time = max(1, 4 - difficulty * 0.3)
    items = []
    for i in range(min(count, len(phrases))):
        phrase = phrases[i]
        words_in_phrase = phrase.split()
        word_count = len(words_in_phrase)
        question_types = [
            (f"How many words were in the phrase?", str(word_count),
             [str(word_count - 1), str(word_count), str(word_count + 1), str(word_count + 2)]),
            (f"What was the first word?", words_in_phrase[0],
             [words_in_phrase[0]] + random.sample(["the", "a", "my", "to", "it", "in"], 3)),
            (f"What was the last word?", words_in_phrase[-1],
             [words_in_phrase[-1]] + random.sample(["up", "go", "it", "run", "day", "big"], 3)),
        ]
        q_text, correct, opts = random.choice(question_types)
        opts = list(set(opts))[:4]
        if correct not in opts:
            opts[0] = correct
        random.shuffle(opts)
        items.append(ExerciseItem(
            index=i,
            question=q_text,
            options=opts,
            correct_answer=correct,
            item_type="timed_reading",
            extra_data={
                "passage": phrase,
                "reading_time_seconds": flash_time,
                "word_count": word_count,
                "passage_visible_during_questions": False,
                "ai_generated": True,
            },
        ))
    return items if items else None


async def _gen_word_ladder_ai(difficulty: int, count: int) -> List[ExerciseItem] | None:
    """AI word ladder pairs (light model)."""
    data = await ai.generate_word_ladder_pairs(difficulty, count=max(count, 8))
    if not data or len(data) < 2:
        return None
    all_targets = [d["target"] for d in data]
    items = []
    for i in range(min(count, len(data))):
        entry = data[i]
        start = entry["start"]
        target = entry["target"]
        change_pos = entry.get("change_position", 0)
        distractors = random.sample([t for t in all_targets if t != target],
                                    min(3, len(all_targets) - 1))
        if len(distractors) < 3:
            distractors += random.sample(["cap", "tap", "zip", "hop"], 3 - len(distractors))
        options = [target] + distractors[:3]
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"Change one letter in '{start}' to make a new word:",
            options=options,
            correct_answer=target,
            hint="Look at each letter position and think about what could change.",
            item_type="word_building",
            extra_data={
                "start_word": start,
                "target_word": target,
                "letters": list(start),
                "change_position": change_pos,
                "build_mode": "ladder",
                "ai_generated": True,
            },
        ))
    return items if items else None


# =============================================================================
# FALLBACK GENERATOR
# =============================================================================

def _gen_default(difficulty: int, count: int) -> List[ExerciseItem]:
    """Fallback generator for unknown game types."""
    words = get_word_bank(difficulty)
    items = []
    for i in range(count):
        word = random.choice(words)
        items.append(ExerciseItem(
            index=i,
            question=f"How many letters are in the word '{word}'?",
            options=[str(len(word) - 1), str(len(word)), str(len(word) + 1), str(len(word) + 2)],
            correct_answer=str(len(word)),
            item_type="multiple_choice",
        ))
    return items
