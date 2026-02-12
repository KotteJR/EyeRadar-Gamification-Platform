"""
AI-powered exercise content generation using local Ollama LLMs.

Model routing:
  - HEAVY (qwen3-vl:8b):  stories, comprehension, inference, vocabulary, prosody
  - LIGHT (qwen3-vl:4b):  word banks, rhymes, hints, syllables, phrases, feedback

Every public function returns `None` when the LLM is unavailable so the
caller can fall back to template-based generation.
"""

import logging
import random
from typing import Optional

from app.services import ollama_client as llm

logger = logging.getLogger(__name__)

# ─── System prompts ───────────────────────────────────────────────────────────

_SYSTEM_DYSLEXIA = (
    "You are an expert reading specialist creating exercises for children "
    "with dyslexia. Your content must be age-appropriate, encouraging, and "
    "engaging. Always respond in valid JSON only — no markdown, no extra text."
)

_SYSTEM_LIGHT = (
    "You are a helpful assistant that generates short educational content for "
    "children. Always respond in valid JSON only — no markdown, no extra text."
)

# ─── HEAVY model generators (8b) ─────────────────────────────────────────────


async def generate_story_passage(
    difficulty: int,
    topic_hint: str | None = None,
    num_questions: int = 3,
) -> Optional[dict]:
    """
    Generate a reading passage with comprehension questions.

    Returns:
        {
            "text": "The passage...",
            "questions": [
                {"q": "...", "options": [...], "answer": "..."},
                ...
            ]
        }
    """
    age_desc = "young child (ages 6-8)" if difficulty <= 3 else (
        "child (ages 8-10)" if difficulty <= 6 else "older student (ages 10-13)"
    )
    word_range = "30-50" if difficulty <= 3 else (
        "50-80" if difficulty <= 6 else "80-120"
    )
    topic = f" about {topic_hint}" if topic_hint else ""

    prompt = (
        f"Create a short reading passage{topic} for a {age_desc} at reading "
        f"difficulty level {difficulty}/10.\n\n"
        f"The passage should be {word_range} words.\n"
        f"Then create exactly {num_questions} multiple-choice comprehension questions, "
        f"each with 4 options and 1 correct answer.\n\n"
        f"Respond with this exact JSON structure:\n"
        f'{{"text": "passage here", '
        f'"questions": [{{"q": "question", "options": ["A","B","C","D"], "answer": "correct option"}}]}}'
    )

    data = await llm.heavy_json(prompt, system=_SYSTEM_DYSLEXIA, max_tokens=1500)
    if not data or "text" not in data or "questions" not in data:
        return None
    return data


async def generate_inference_scenarios(
    difficulty: int,
    count: int = 5,
) -> Optional[list[dict]]:
    """
    Generate inference / reading-between-the-lines scenarios.

    Returns list of:
        {"text": "scenario", "question": "...", "answer": "...",
         "options": ["A","B","C","D"]}
    """
    prompt = (
        f"Create {count} short inference scenarios for a dyslexia exercise "
        f"at difficulty {difficulty}/10.\n"
        f"Each scenario has a 1-3 sentence description with context clues, "
        f"a question asking the student to infer what is happening, "
        f"4 multiple-choice options, and the correct answer.\n\n"
        f"Respond with a JSON array of objects:\n"
        f'[{{"text": "...", "question": "...", "answer": "...", '
        f'"options": ["A","B","C","D"]}}]'
    )
    data = await llm.heavy_json(prompt, system=_SYSTEM_DYSLEXIA, max_tokens=2000)
    if not isinstance(data, list):
        return None
    # Validate structure
    valid = []
    for item in data:
        if all(k in item for k in ("text", "question", "answer", "options")):
            valid.append(item)
    return valid if valid else None


async def generate_vocabulary_items(
    difficulty: int,
    count: int = 5,
) -> Optional[list[dict]]:
    """
    Generate vocabulary-in-context items.

    Returns list of:
        {"sentence": "...", "word": "target", "meaning": "...",
         "options": ["A","B","C","D"]}
    """
    age = "6-8" if difficulty <= 3 else ("8-11" if difficulty <= 6 else "11-13")
    prompt = (
        f"Create {count} vocabulary-in-context exercises for ages {age} "
        f"(difficulty {difficulty}/10).\n"
        f"Each has: a sentence using a target word, the target word, "
        f"its meaning, and 4 options (one correct).\n\n"
        f"JSON array:\n"
        f'[{{"sentence": "...", "word": "...", "meaning": "...", '
        f'"options": ["opt1","opt2","opt3","opt4"]}}]'
    )
    data = await llm.heavy_json(prompt, system=_SYSTEM_DYSLEXIA, max_tokens=1500)
    if not isinstance(data, list):
        return None
    valid = [i for i in data if all(k in i for k in ("sentence", "word", "meaning", "options"))]
    return valid if valid else None


async def generate_main_idea_passages(
    difficulty: int,
    count: int = 3,
) -> Optional[list[dict]]:
    """
    Generate passages with main-idea identification.

    Returns list of:
        {"text": "passage", "main_idea": "...",
         "distractors": ["wrong1","wrong2","wrong3"]}
    """
    prompt = (
        f"Create {count} short paragraphs (3-5 sentences each) for a "
        f"main-idea identification exercise at difficulty {difficulty}/10.\n"
        f"For each, give the passage text, the correct main idea, "
        f"and 3 plausible but wrong distractors.\n\n"
        f"JSON array:\n"
        f'[{{"text": "...", "main_idea": "...", "distractors": ["w1","w2","w3"]}}]'
    )
    data = await llm.heavy_json(prompt, system=_SYSTEM_DYSLEXIA, max_tokens=2000)
    if not isinstance(data, list):
        return None
    valid = [i for i in data if all(k in i for k in ("text", "main_idea", "distractors"))]
    return valid if valid else None


async def generate_story_sequence(
    difficulty: int,
    count: int = 3,
) -> Optional[list[dict]]:
    """
    Generate story event sequences for ordering exercises.

    Returns list of:
        {"events": ["First event", "Second event", ...]}
    """
    num_steps = min(3 + difficulty // 3, 6)
    prompt = (
        f"Create {count} everyday activity sequences, each with exactly "
        f"{num_steps} steps in the correct chronological order.\n"
        f"Aimed at difficulty {difficulty}/10 for a child with dyslexia.\n"
        f"Each step should be a short, clear sentence.\n\n"
        f"JSON array:\n"
        f'[{{"events": ["step1", "step2", ...]}}]'
    )
    data = await llm.heavy_json(prompt, system=_SYSTEM_DYSLEXIA, max_tokens=1500)
    if not isinstance(data, list):
        return None
    valid = [i for i in data if "events" in i and isinstance(i["events"], list)]
    return valid if valid else None


async def generate_prosody_sentences(
    difficulty: int,
    count: int = 5,
) -> Optional[list[dict]]:
    """
    Generate sentences with appropriate reading tones.

    Returns list of:
        {"sentence": "...", "tone": "excited|questioning|calm|...",
         "distractor_tones": ["t1","t2","t3"]}
    """
    prompt = (
        f"Create {count} sentences for a prosody/reading-tone exercise "
        f"at difficulty {difficulty}/10.\n"
        f"Each sentence should clearly suggest a specific tone of voice.\n"
        f"Give the sentence, the correct tone, and 3 wrong tones.\n"
        f"Possible tones: excited, questioning, calm, urgent, storytelling, "
        f"celebratory, polite, commanding, sad, mysterious, sarcastic.\n\n"
        f"JSON array:\n"
        f'[{{"sentence": "...", "tone": "...", "distractor_tones": ["t1","t2","t3"]}}]'
    )
    data = await llm.heavy_json(prompt, system=_SYSTEM_DYSLEXIA, max_tokens=1500)
    if not isinstance(data, list):
        return None
    valid = [i for i in data if all(k in i for k in ("sentence", "tone", "distractor_tones"))]
    return valid if valid else None


# ─── LIGHT model generators (4b) ─────────────────────────────────────────────


async def generate_word_bank(
    difficulty: int,
    count: int = 20,
    category: str | None = None,
) -> Optional[list[str]]:
    """Generate a themed word bank appropriate for the difficulty."""
    age = "6-8" if difficulty <= 3 else ("8-11" if difficulty <= 6 else "11-13")
    cat = f" in the category '{category}'" if category else ""
    prompt = (
        f"Generate a list of {count} English words{cat} suitable for a "
        f"child aged {age} (reading difficulty {difficulty}/10).\n"
        f"Shorter words for lower difficulty, longer for higher.\n\n"
        f"Respond with a JSON array of strings:\n"
        f'["word1", "word2", ...]'
    )
    data = await llm.light_json(prompt, system=_SYSTEM_LIGHT, max_tokens=300)
    if isinstance(data, list) and all(isinstance(w, str) for w in data):
        return data
    return None


async def generate_rhyme_pairs(
    difficulty: int,
    count: int = 10,
) -> Optional[list[list[str]]]:
    """Generate rhyming word pairs."""
    prompt = (
        f"Generate {count} pairs of rhyming English words for a child at "
        f"reading difficulty {difficulty}/10.\n"
        f"Easy pairs for low difficulty, trickier pairs for high.\n\n"
        f"JSON array of 2-element arrays:\n"
        f'[["cat", "hat"], ["moon", "spoon"], ...]'
    )
    data = await llm.light_json(prompt, system=_SYSTEM_LIGHT, max_tokens=300)
    if isinstance(data, list):
        valid = [p for p in data if isinstance(p, list) and len(p) == 2]
        return valid if valid else None
    return None


async def generate_syllable_words(
    difficulty: int,
    count: int = 15,
) -> Optional[list[dict]]:
    """
    Generate words with syllable counts.

    Returns list of {"word": "...", "syllables": N}
    """
    max_syl = 2 if difficulty <= 3 else (3 if difficulty <= 6 else 5)
    prompt = (
        f"Generate {count} English words with their syllable counts "
        f"(max {max_syl} syllables) for difficulty {difficulty}/10.\n\n"
        f"JSON array:\n"
        f'[{{"word": "cat", "syllables": 1}}, {{"word": "banana", "syllables": 3}}]'
    )
    data = await llm.light_json(prompt, system=_SYSTEM_LIGHT, max_tokens=400)
    if isinstance(data, list):
        valid = [i for i in data if "word" in i and "syllables" in i]
        return valid if valid else None
    return None


async def generate_phrases(
    difficulty: int,
    count: int = 8,
) -> Optional[list[str]]:
    """Generate short phrases for timed reading."""
    word_count = "2-3" if difficulty <= 2 else ("3-5" if difficulty <= 4 else "5-8")
    prompt = (
        f"Generate {count} short English phrases ({word_count} words each) "
        f"for a timed reading exercise at difficulty {difficulty}/10.\n"
        f"Should be meaningful phrases a child would recognize.\n\n"
        f"JSON array of strings:\n"
        f'["the big cat", "run and jump", ...]'
    )
    data = await llm.light_json(prompt, system=_SYSTEM_LIGHT, max_tokens=300)
    if isinstance(data, list) and all(isinstance(p, str) for p in data):
        return data
    return None


async def generate_word_meanings(
    difficulty: int,
    count: int = 10,
) -> Optional[list[dict]]:
    """
    Generate words with their child-friendly meanings.

    Returns list of {"word": "...", "meaning": "..."}
    """
    prompt = (
        f"Generate {count} words with simple, child-friendly definitions "
        f"for difficulty {difficulty}/10.\n\n"
        f"JSON array:\n"
        f'[{{"word": "castle", "meaning": "a large building with towers"}}]'
    )
    data = await llm.light_json(prompt, system=_SYSTEM_LIGHT, max_tokens=500)
    if isinstance(data, list):
        valid = [i for i in data if "word" in i and "meaning" in i]
        return valid if valid else None
    return None


async def generate_hint(
    question: str,
    correct_answer: str,
    game_type: str,
) -> Optional[str]:
    """Generate an encouraging, helpful hint."""
    prompt = (
        f"Give a brief, encouraging hint for a child working on this exercise:\n"
        f"Question: {question}\n"
        f"The answer is: {correct_answer}\n"
        f"Game type: {game_type}\n\n"
        f"Respond with just a JSON object:\n"
        f'{{"hint": "your hint here"}}'
    )
    data = await llm.light_json(prompt, system=_SYSTEM_LIGHT, max_tokens=100)
    if isinstance(data, dict) and "hint" in data:
        return data["hint"]
    return None


async def generate_phoneme_blends(
    difficulty: int,
    count: int = 8,
) -> Optional[list[dict]]:
    """
    Generate phoneme-to-word blending exercises.

    Returns list of {"sounds": ["/c/", "/a/", "/t/"], "word": "cat"}
    """
    prompt = (
        f"Generate {count} phoneme blending exercises for difficulty "
        f"{difficulty}/10.\n"
        f"Each has an array of phonemes (written in /slashes/) and the "
        f"blended word.\n"
        f"Use 2-3 phonemes for low difficulty, 3-5 for high.\n\n"
        f"JSON array:\n"
        f'[{{"sounds": ["/c/", "/a/", "/t/"], "word": "cat"}}]'
    )
    data = await llm.light_json(prompt, system=_SYSTEM_LIGHT, max_tokens=500)
    if isinstance(data, list):
        valid = [i for i in data if "sounds" in i and "word" in i]
        return valid if valid else None
    return None


async def generate_sound_swap_items(
    difficulty: int,
    count: int = 8,
) -> Optional[list[dict]]:
    """
    Generate sound-swap word transformation exercises.

    Returns list of:
        {"original": "cat", "old_sound": "c", "new_sound": "b", "result": "bat"}
    """
    prompt = (
        f"Generate {count} sound-swap exercises for difficulty {difficulty}/10.\n"
        f"Each swaps one consonant to make a new word.\n\n"
        f"JSON array:\n"
        f'[{{"original": "cat", "old_sound": "c", "new_sound": "b", "result": "bat"}}]'
    )
    data = await llm.light_json(prompt, system=_SYSTEM_LIGHT, max_tokens=500)
    if isinstance(data, list):
        valid = [i for i in data if all(k in i for k in ("original", "old_sound", "new_sound", "result"))]
        return valid if valid else None
    return None


async def generate_word_ladder_pairs(
    difficulty: int,
    count: int = 10,
) -> Optional[list[dict]]:
    """
    Generate word ladder pairs (change one letter).

    Returns list of {"start": "cat", "target": "bat", "change_position": 0}
    """
    prompt = (
        f"Generate {count} word ladder pairs for difficulty {difficulty}/10.\n"
        f"Each pair: change exactly one letter in the start word to get the "
        f"target word. Include which position (0-indexed) changes.\n\n"
        f"JSON array:\n"
        f'[{{"start": "cat", "target": "bat", "change_position": 0}}]'
    )
    data = await llm.light_json(prompt, system=_SYSTEM_LIGHT, max_tokens=500)
    if isinstance(data, list):
        valid = [i for i in data if all(k in i for k in ("start", "target", "change_position"))]
        return valid if valid else None
    return None
