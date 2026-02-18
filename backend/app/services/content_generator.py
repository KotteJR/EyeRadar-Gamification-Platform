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

# ─── Bilingual strings ────────────────────────────────────────────────────────

_STRINGS = {
    "blend_sounds": {"en": "Blend the sounds to make a word!", "el": "Ένωσε τους ήχους για να φτιάξεις μια λέξη!"},
    "blend_hint": {"en": "Say each sound slowly, then faster and faster.", "el": "Πες κάθε ήχο αργά, μετά πιο γρήγορα."},
    "what_is_this": {"en": "What is this?", "el": "Τι είναι αυτό;"},
    "which_rhymes": {"en": "Which word rhymes with", "el": "Ποια λέξη ομοιοκαταληκτεί με"},
    "rhyme_hint": {"en": "Words that rhyme sound the same at the end.", "el": "Οι λέξεις που ομοιοκαταληκτούν ακούγονται ίδια στο τέλος."},
    "find_picture": {"en": "Find the picture that matches", "el": "Βρες την εικόνα που ταιριάζει με"},
    "what_word_matches": {"en": "What word matches this picture?", "el": "Ποια λέξη ταιριάζει με αυτή την εικόνα;"},
    "name_pictures": {"en": "Name all the pictures as fast as you can!", "el": "Πες τα ονόματα όλων των εικόνων όσο πιο γρήγορα μπορείς!"},
    "which_seen": {"en": "Which images did you see earlier?", "el": "Ποιες εικόνες είδες πριν;"},
    "which_not_seen": {"en": "Which images did you NOT see?", "el": "Ποιες εικόνες ΔΕΝ είδες;"},
    "read_word": {"en": "Read this word aloud:", "el": "Διάβασε αυτή τη λέξη δυνατά:"},
    "listen_same": {"en": "Do these two words sound the same at the end?", "el": "Ακούγονται αυτές οι δύο λέξεις ίδιες στο τέλος;"},
    "which_sounds_same": {"en": "Which word sounds the same as", "el": "Ποια λέξη ακούγεται ίδια με"},
    "swap_sound": {"en": "Change the sound", "el": "Άλλαξε τον ήχο"},
    "to_make": {"en": "to make a new word!", "el": "για να φτιάξεις νέα λέξη!"},
    "correct_spelling": {"en": "Which is the correct spelling?", "el": "Ποια είναι η σωστή ορθογραφία;"},
    "memorize_sequence": {"en": "Memorize the sequence!", "el": "Απομνημόνευσε τη σειρά!"},
    "how_many_syllables": {"en": "How many syllables does this word have?", "el": "Πόσες συλλαβές έχει αυτή η λέξη;"},
    "spell_backward": {"en": "Spell this word backwards:", "el": "Γράψε αυτή τη λέξη ανάποδα:"},
    "yes": {"en": "Yes", "el": "Ναι"},
    "no": {"en": "No", "el": "Όχι"},
}


def _t(key: str, lang: str = "en") -> str:
    """Get translated string."""
    return _STRINGS.get(key, {}).get(lang, _STRINGS.get(key, {}).get("en", key))


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

# ─── Greek word banks ─────────────────────────────────────────────────────────

SIMPLE_WORDS_EL = ["γάτα", "σκύλος", "ήλιος", "σπίτι", "ψάρι", "λουλούδι",
                   "βιβλίο", "μήλο", "δέντρο", "πάπια", "νερό", "φως", "μάτι",
                   "χέρι", "πόδι", "μύτη", "αυτί", "στόμα", "πόρτα", "παιδί"]

MEDIUM_WORDS_EL = ["θάλασσα", "βουνό", "ποτάμι", "αστέρι", "φεγγάρι", "σύννεφο",
                   "πουλί", "λύκος", "αλεπού", "κουνέλι", "πεταλούδα", "δρόμος",
                   "σχολείο", "κήπος", "τραγούδι", "χρώμα", "βροχή", "χιόνι",
                   "φωτιά", "καρδιά"]

HARD_WORDS_EL = ["περιπέτεια", "δράκος", "κάστρο", "νησί", "δάσος", "πλανήτης",
                 "ελέφαντας", "κροκόδειλος", "καμηλοπάρδαλη", "χελώνα", "πίθηκος",
                 "γέφυρα", "κεραυνός", "ουράνιο τόξο", "ηλιοβασίλεμα", "ανατολή",
                 "πυροσβέστης", "αστυνομικός", "δάσκαλος", "γιατρός"]

ADVANCED_WORDS_EL = ["φαντασία", "ελευθερία", "δημοκρατία", "φιλοσοφία", "τεχνολογία",
                     "εκπαίδευση", "περιβάλλον", "πολιτισμός", "αρχιτεκτονική",
                     "αστρονομία", "βιβλιοθήκη", "πανεπιστήμιο", "ηλεκτρισμός",
                     "θερμοκρασία", "μαθηματικά", "γεωγραφία", "ιστορία",
                     "λογοτεχνία", "μουσική", "ζωγραφική"]

SIGHT_WORDS_EL = ["και", "στο", "είναι", "από", "για", "δεν", "θα", "με", "στη",
                  "αυτό", "που", "ένα", "μια", "τον", "την", "του", "της", "μου",
                  "σου", "μας", "σας", "εδώ", "εκεί", "πολύ", "τώρα", "πριν",
                  "μετά", "πάνω", "κάτω", "μέσα", "έξω", "αριστερά", "δεξιά",
                  "μπροστά", "πίσω", "ναι", "όχι", "πάλι", "ακόμα"]

RHYME_PAIRS_EL = [
    ("γάτα", "πάτα"), ("σπίτι", "κουτί"), ("ψάρι", "φανάρι"), ("μήλο", "ξύλο"),
    ("βουνό", "μικρό"), ("νερό", "καλό"), ("παιδί", "ψωμί"), ("αστέρι", "χέρι"),
    ("φεγγάρι", "λουλούδι δεν ταιριάζει"), ("βροχή", "αυγή"), ("καρδιά", "φωλιά"),
    ("δέντρο", "κέντρο"), ("θάλασσα", "τάλασσα"), ("πουλί", "σκουλί"),
    ("ποτάμι", "χαλάμι"), ("δρόμος", "νόμος"), ("κήπος", "τύπος"),
    ("σχολείο", "μουσείο"), ("τραπέζι", "παιχνίδι δεν ταιριάζει"), ("χιόνι", "κιόνι"),
]

GREEK_LETTERS = list("αβγδεζηθικλμνξοπρστυφχψω")
GREEK_VOWELS = list("αεηιουω")
GREEK_CONSONANTS = list("βγδζθκλμνξπρστφχψ")

STORY_PASSAGES_EL = {
    "easy": [
        {
            "text": "Ο μεγάλος σκύλος έτρεξε στο πάρκο. Έπαιξε με μια μπάλα. Μετά ήπιε λίγο νερό.",
            "questions": [
                {"q": "Πού πήγε ο σκύλος;", "options": ["Στο σχολείο", "Στο πάρκο", "Στη θάλασσα", "Στο σπίτι"], "answer": "Στο πάρκο"},
                {"q": "Με τι έπαιξε;", "options": ["Ξύλο", "Μπάλα", "Κόκαλο", "Παιχνίδι"], "answer": "Μπάλα"},
                {"q": "Τι ήπιε ο σκύλος;", "options": ["Γάλα", "Χυμό", "Νερό", "Τσάι"], "answer": "Νερό"},
            ]
        },
        {
            "text": "Η Μαρία έχει μια γάτα. Η γάτα είναι μαύρη και άσπρη. Της αρέσει να κοιμάται στο κρεβάτι.",
            "questions": [
                {"q": "Τι ζώο έχει η Μαρία;", "options": ["Σκύλο", "Γάτα", "Πουλί", "Ψάρι"], "answer": "Γάτα"},
                {"q": "Τι χρώμα είναι η γάτα;", "options": ["Καφέ", "Γκρι", "Μαύρη και άσπρη", "Πορτοκαλί"], "answer": "Μαύρη και άσπρη"},
                {"q": "Πού κοιμάται η γάτα;", "options": ["Στο πάτωμα", "Στο κρεβάτι", "Στο κουτί", "Στην καρέκλα"], "answer": "Στο κρεβάτι"},
            ]
        },
    ],
    "medium": [
        {
            "text": "Η Ελένη αγαπούσε τις βροχερές μέρες. Φορούσε τις κίτρινες γαλότσες της και πηδούσε σε κάθε λακκούβα. Η μαμά της είχε πάντα ζεστή σοκολάτα έτοιμη όταν γύριζε σπίτι.",
            "questions": [
                {"q": "Τι έκανε η Ελένη στη βροχή;", "options": ["Διάβαζε", "Πηδούσε σε λακκούβες", "Έβλεπε τηλεόραση", "Ζωγράφιζε"], "answer": "Πηδούσε σε λακκούβες"},
                {"q": "Τι χρώμα ήταν οι γαλότσες;", "options": ["Κόκκινες", "Μπλε", "Κίτρινες", "Πράσινες"], "answer": "Κίτρινες"},
                {"q": "Τι είχε η μαμά της;", "options": ["Τσάι", "Μπισκότα", "Ζεστή σοκολάτα", "Σούπα"], "answer": "Ζεστή σοκολάτα"},
            ]
        },
    ],
    "hard": [
        {
            "text": "Ο παλιός φάρος στεκόταν στον βράχο για πάνω από διακόσια χρόνια, οδηγώντας τα πλοία με ασφάλεια μέσα από τα επικίνδυνα νερά. Όταν η κυβέρνηση ανακοίνωσε σχέδια να τον αντικαταστήσει με σύγχρονο σύστημα πλοήγησης, οι κάτοικοι οργάνωσαν εκστρατεία για να τον σώσουν.",
            "questions": [
                {"q": "Πόσα χρόνια στεκόταν ο φάρος;", "options": ["50", "100", "Πάνω από 200", "500"], "answer": "Πάνω από 200"},
                {"q": "Γιατί ήθελε η κυβέρνηση να τον αντικαταστήσει;", "options": ["Ήταν επικίνδυνος", "Για σύγχρονη πλοήγηση", "Ήταν ακριβός", "Ήταν μικρός"], "answer": "Για σύγχρονη πλοήγηση"},
                {"q": "Τι έκαναν οι κάτοικοι;", "options": ["Συμφώνησαν", "Οργάνωσαν εκστρατεία", "Έφυγαν", "Έχτισαν νέο φάρο"], "answer": "Οργάνωσαν εκστρατεία"},
            ]
        },
    ],
}

PHRASES_BY_LEVEL_EL = {
    1: ["η μεγάλη γάτα", "μπορώ να τρέξω", "ένα κόκκινο καπέλο", "ο σκύλος μου", "πάω για ύπνο"],
    2: ["πήδα ψηλά", "κάτω από το κρεβάτι", "μια ηλιόλουστη μέρα", "το μικρό πουλί", "παίζω ένα παιχνίδι"],
    3: ["έτρεξε στο πάρκο", "ο βάτραχος πήδηξε μέσα", "μας αρέσει να παίζουμε", "βρήκαν ένα χαμένο κουτάβι"],
    4: ["η πολύχρωμη πεταλούδα κάθισε απαλά", "τρέχοντας μέσα στο ψηλό πράσινο γρασίδι", "τελείωσε γρήγορα τα μαθήματά της"],
    5: ["το μυστηριώδες παλιό σπίτι στη γωνία", "κανείς δεν περίμενε η έκπληξη να φτάσει νωρίς", "ισορροπώντας προσεκτικά πάνω στη στενή ξύλινη γέφυρα"],
}

LETTERS_COMMONLY_REVERSED_EL = ["β", "δ", "θ", "φ", "ψ", "ω", "η", "ν"]

PHONEME_BLENDS_EL = [
    (["γ", "ά", "τ", "α"], "γάτα"), (["σ", "κ", "ύ", "λ", "ο", "ς"], "σκύλος"),
    (["ή", "λ", "ι", "ο", "ς"], "ήλιος"), (["σ", "π", "ί", "τ", "ι"], "σπίτι"),
    (["ψ", "ά", "ρ", "ι"], "ψάρι"), (["μ", "ή", "λ", "ο"], "μήλο"),
    (["δ", "έ", "ν", "τ", "ρ", "ο"], "δέντρο"), (["ν", "ε", "ρ", "ό"], "νερό"),
    (["π", "α", "ι", "δ", "ί"], "παιδί"), (["β", "ι", "β", "λ", "ί", "ο"], "βιβλίο"),
    (["χ", "έ", "ρ", "ι"], "χέρι"), (["π", "ό", "δ", "ι"], "πόδι"),
]

PSEUDO_WORDS_EL = [
    "γλόρφι", "σνάλπι", "βρίμπα", "τρόμβλα", "φλάνκο", "κρίντλα", "σπούντα",
    "πλόνδλα", "γκλόρπα", "τβίσκα", "φράζλα", "σνάρμπλα", "κβίμπλα",
    "δρίντλα", "γκλόπα", "στρόμπλα", "φλίμπα", "μπρόντλα", "κλίπστα",
    "γρόμφα",
]


def get_word_bank(difficulty: int, lang: str = "en") -> List[str]:
    if lang == "el":
        if difficulty <= 2:
            return SIMPLE_WORDS_EL
        elif difficulty <= 4:
            return MEDIUM_WORDS_EL
        elif difficulty <= 7:
            return HARD_WORDS_EL
        else:
            return ADVANCED_WORDS_EL
    if difficulty <= 2:
        return SIMPLE_WORDS
    elif difficulty <= 4:
        return MEDIUM_WORDS
    elif difficulty <= 7:
        return HARD_WORDS
    else:
        return ADVANCED_WORDS

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


async def generate_exercise_items(
    game_id: str,
    difficulty_level: int,
    item_count: int,
    student_interests: List[str] | None = None,
    lang: str = "en",
) -> List[ExerciseItem]:
    """
    Generate exercise items — tries AI first, falls back to templates.
    Supports English (en) and Greek (el).

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
        "sound_matching": _gen_sound_matching,
        "word_sound_match": _gen_word_sound_match,
        "speed_namer": _gen_speed_namer,
        "flash_card_frenzy": _gen_flash_card,
        "object_blitz": _gen_object_blitz,
        "letter_stream": _gen_letter_stream,
        "ran_grid": _gen_rapid_naming,
        "memory_matrix": _gen_memory_matrix,
        "sequence_keeper": _gen_sequence_keeper,
        "backward_spell": _gen_backward_spell,
        "story_recall": _gen_story_recall,
        "dual_task_challenge": _gen_dual_task,
        "memory_recall": _gen_memory_recall,
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
        "decoding_read_aloud": _gen_read_aloud,
        "question_quest": _gen_question_quest,
        "main_idea_hunter": _gen_main_idea_hunter,
        "inference_detective": _gen_inference_detective,
        "vocabulary_builder": _gen_vocabulary_builder,
        "story_sequencer": _gen_story_sequencer,
        "word_image_match": _gen_word_image_match,
        "castle_challenge": _gen_castle_challenge,
    }

    # For Greek, skip AI generators (they produce English) and go straight to templates
    if lang != "el" and game_id in ai_generators:
        try:
            items = await ai_generators[game_id](difficulty_level, item_count)
            if items and len(items) >= item_count:
                logger.info("AI generated %d items for %s", len(items), game_id)
                return items[:item_count]
            elif items:
                logger.info("AI partial: %d/%d for %s, padding with templates",
                           len(items), item_count, game_id)
                remaining = item_count - len(items)
                template_gen = template_generators.get(game_id, _gen_default)
                template_items = template_gen(difficulty_level, remaining, lang=lang)
                for j, ti in enumerate(template_items):
                    ti.index = len(items) + j
                return items + template_items
        except Exception as exc:
            logger.warning("AI generation failed for %s: %s", game_id, exc)

    # Fall back to template generation
    generator = template_generators.get(game_id, _gen_default)
    return generator(difficulty_level, item_count, lang=lang)


# =============================================================================
# MULTIPLE CHOICE GENERATORS
# =============================================================================

def _gen_sound_safari(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Multiple choice: identify which word has a sound in a position."""
    items = []
    words = get_word_bank(difficulty, lang)
    if lang == "el":
        positions_labels = {"beginning": "αρχή", "ending": "τέλος", "middle": "μέση"}
        positions = ["beginning", "ending"] if difficulty <= 3 else ["beginning", "middle", "ending"]
    else:
        positions_labels = {"beginning": "beginning", "ending": "ending", "middle": "middle"}
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
        pos_label = positions_labels[position]
        q = f"Ποια λέξη έχει τον ήχο '{target_sound}' στην {pos_label};" if lang == "el" else f"Which word has the sound '{target_sound}' at the {position}?"
        h = f"Ο ήχος '{target_sound}' είναι στην {pos_label} της λέξης." if lang == "el" else f"The sound '{target_sound}' is at the {position} of the word."
        items.append(ExerciseItem(
            index=i,
            question=q,
            options=options,
            correct_answer=word,
            hint=h,
            item_type="multiple_choice",
        ))
    return items


def _gen_prosody_practice(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Multiple choice: identify the correct reading tone."""
    items = []
    if lang == "el":
        sentences = [
            ("Δεν μπορώ να το πιστέψω!", "ενθουσιασμός"), ("Πού πηγαίνεις;", "ερώτηση"),
            ("Κάτσε ήσυχα, σε παρακαλώ.", "ηρεμία"), ("Πρόσεχε το αυτοκίνητο!", "επείγον"),
            ("Μια φορά κι έναν καιρό, ζούσε ένας βασιλιάς.", "αφήγηση"),
            ("Χρόνια πολλά!", "εορταστικό"),
            ("Κερδίσαμε το πρωτάθλημα!", "ενθουσιασμός"),
            ("Μπορείς να με βοηθήσεις;", "ευγένεια"),
            ("Σταμάτα! Μην κουνιέσαι!", "εντολή"),
        ]
    else:
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


def _gen_question_quest(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Multiple choice: reading comprehension questions."""
    return _gen_story_recall_mc(difficulty, count)


def _gen_main_idea_hunter(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Multiple choice: identify the main idea of a passage."""
    items = []
    if lang == "el":
        passages = [
            ("Οι σκύλοι είναι υπέροχα κατοικίδια. Είναι πιστοί, φιλικοί και τους αρέσει να παίζουν. Πολλές οικογένειες χαίρονται που έχουν σκύλο.",
             "Οι σκύλοι είναι υπέροχα κατοικίδια"),
            ("Ο ωκεανός φιλοξενεί πολλά πλάσματα. Ψάρια, φάλαινες και δελφίνια ζουν στη θάλασσα. Τα κοραλλιογενή υφάλους προσφέρουν καταφύγιο.",
             "Ο ωκεανός έχει ποικίλη θαλάσσια ζωή"),
            ("Η άσκηση είναι σημαντική για την υγεία. Το τρέξιμο, η κολύμβηση και η ποδηλασία βοηθούν το σώμα. Ακόμα και ένας μικρός περίπατος κάνει τη διαφορά.",
             "Η άσκηση σε κρατάει υγιή"),
            ("Τα δέντρα μας δίνουν οξυγόνο και σκιά. Τα πουλιά χτίζουν φωλιές στα κλαδιά τους. Μερικά δέντρα ζουν χιλιάδες χρόνια.",
             "Τα δέντρα είναι σημαντικά"),
            ("Η μουσική αλλάζει τη διάθεσή μας. Ένα χαρούμενο τραγούδι μας κάνει να χαμογελάμε. Οι επιστήμονες λένε ότι η μουσική κάνει καλό στον εγκέφαλο.",
             "Η μουσική επηρεάζει τη διάθεση"),
        ]
    else:
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


def _gen_inference_detective(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
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


def _gen_story_recall_mc(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Multiple choice: standard story comprehension (passage always visible)."""
    if difficulty <= 3:
        level = "easy"
    elif difficulty <= 6:
        level = "medium"
    else:
        level = "hard"
    story_src = STORY_PASSAGES_EL if lang == "el" else STORY_PASSAGES
    passages = story_src.get(level, story_src["easy"])
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

def _gen_rhyme_time(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Speed round: match rhyming words against a timer."""
    items = []
    pairs_source = RHYME_PAIRS_EL if lang == "el" else RHYME_PAIRS
    pairs = pairs_source[: min(len(pairs_source), 5 + difficulty * 2)]
    time_limit = max(3, 10 - difficulty)
    for i in range(count):
        pair = random.choice(pairs)
        word = pair[0]
        correct = pair[1]
        distractors = random.sample(
            [p[1] for p in pairs if p != pair] + random.sample(get_word_bank(difficulty, lang), 2),
            min(3, len(pairs)),
        )
        options = [correct] + distractors[:3]
        random.shuffle(options)
        q = f"{_t('which_rhymes', lang)} '{word}';"  if lang == "el" else f"Which word rhymes with '{word}'?"
        h = _t("rhyme_hint", lang)
        items.append(ExerciseItem(
            index=i,
            question=q,
            options=options,
            correct_answer=correct,
            hint=h,
            item_type="speed_round",
            extra_data={
                "time_limit_seconds": time_limit,
                "target_word": word,
            },
        ))
    return items


def _gen_speed_namer(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Speed round: rapidly identify items with countdown timer."""
    items = []
    if lang == "el":
        sequences = {
            "letters": list("ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ"),
            "numbers": [str(n) for n in range(1, 21)],
            "colors": ["κόκκινο", "μπλε", "πράσινο", "κίτρινο", "πορτοκαλί", "μωβ", "ροζ", "καφέ"],
        }
    else:
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


def _gen_flash_card(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Speed round: rapid word recognition with decreasing time."""
    items = []
    words = get_word_bank(difficulty, lang)
    if lang == "el":
        meanings = {
            "γάτα": "ένα μικρό τριχωτό κατοικίδιο", "σκύλος": "ένα πιστό κατοικίδιο",
            "ήλιος": "ένα αστέρι που μας δίνει φως", "δέντρο": "ένα ψηλό φυτό με κλαδιά",
            "ψάρι": "ένα ζώο που ζει στο νερό", "αστέρι": "ένα λαμπρό φως στον ουρανό",
            "φεγγάρι": "λάμπει τη νύχτα στον ουρανό", "βροχή": "νερό που πέφτει από τα σύννεφα",
            "πουλί": "ένα ζώο με φτερά", "κάστρο": "ένα μεγάλο κτήριο με πύργους",
            "δράκος": "ένα μυθικό πλάσμα που βγάζει φωτιά", "δάσος": "μια περιοχή με πολλά δέντρα",
            "νησί": "γη που περιβάλλεται από νερό", "πίθηκος": "ένα έξυπνο πρωτεύον",
            "κουνέλι": "ένα τριχωτό ζώο με μακριά αυτιά",
        }
    else:
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
        time_limit = max(2, base_time - (i // 3))
        q = f"Τι σημαίνει '{word}';" if lang == "el" else f"What does '{word}' mean?"
        items.append(ExerciseItem(
            index=i,
            question=q,
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


def _gen_object_blitz(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Speed round: name objects quickly using images."""
    items = []
    pool = EXERCISE_IMAGES.copy()
    time_limit = max(2, 7 - difficulty)
    for i in range(count):
        correct_img = random.choice(pool)
        label = _get_img_label(correct_img, lang).lower()
        distractors = random.sample(
            [_get_img_label(img, lang).lower() for img in pool if img["id"] != correct_img["id"]],
            min(3, len(pool) - 1),
        )
        options = [label] + distractors
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=_t("what_is_this", lang),
            options=options,
            correct_answer=label,
            item_type="speed_round",
            extra_data={
                "time_limit_seconds": time_limit,
                "display_image": correct_img["url"],
                "display_image_label": _get_img_label(correct_img, lang),
            },
        ))
    return items


def _gen_sight_word_sprint(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Speed round: rapid sight word identification."""
    items = []
    word_source = SIGHT_WORDS_EL if lang == "el" else SIGHT_WORDS
    words = word_source[:min(len(word_source), 10 + difficulty * 3)]
    alphabet = "αβγδεζηθικλμνξοπρστυφχψω" if lang == "el" else "abcdefghijklmnopqrstuvwxyz"
    time_limit = max(2, 6 - difficulty // 2)
    for i in range(count):
        word = random.choice(words)
        distractors = []
        for _ in range(3):
            chars = list(word)
            if len(chars) > 1:
                idx = random.randint(0, len(chars) - 1)
                chars[idx] = random.choice(alphabet)
            distractors.append("".join(chars))
        options = [word] + distractors
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=_t("correct_spelling", lang),
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

def _gen_memory_matrix(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
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

def _gen_syllable_stomper(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Sequence tap: tap the correct number of beats for syllables."""
    items = []
    if lang == "el":
        syllable_map = {
            "γάτα": 2, "σκύλος": 2, "ήλιος": 3, "σπίτι": 2, "ψάρι": 2,
            "μήλο": 2, "δέντρο": 2, "νερό": 2, "παιδί": 2, "βιβλίο": 3,
            "ελέφαντας": 4, "πεταλούδα": 4, "περιπέτεια": 5, "σοκολάτα": 4,
            "μπανάνα": 3, "καμηλοπάρδαλη": 6, "καρπούζι": 3, "υπολογιστής": 5,
            "εγκυκλοπαίδεια": 7, "φαντασία": 4,
        }
    else:
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
            question=f"Πόσες συλλαβές έχει η λέξη '{word}'; Χτύπα τόσες φορές!" if lang == "el" else f"How many syllables (beats) does '{word}' have? Tap that many times!",
            options=[],
            correct_answer=str(correct_count),
            hint=f"Δοκίμασε να χτυπήσεις παλαμάκια: {word}" if lang == "el" else f"Try clapping for each beat: {word}",
            item_type="sequence_tap",
            extra_data={
                "word": word,
                "syllable_count": correct_count,
                "max_taps": max_taps,
                "tap_mode": "count",  # tap N times
            },
        ))
    return items


def _gen_sequence_keeper(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
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

def _gen_backward_spell(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Text input: spell words backwards."""
    items = []
    words = get_word_bank(difficulty, lang)
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

def _gen_story_sequencer(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
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

def _gen_phoneme_blender(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Word building: tap sounds in order to blend them into a word."""
    items = []
    if lang == "el":
        blends = PHONEME_BLENDS_EL
    else:
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
        shuffled_sounds = sounds.copy()
        random.shuffle(shuffled_sounds)
        words = get_word_bank(difficulty, lang)
        distractors = random.sample([w for w in words if w != word], min(3, len(words) - 1))
        options = [word] + distractors
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=_t("blend_sounds", lang),
            options=options,
            correct_answer=word,
            hint=_t("blend_hint", lang),
            item_type="word_building",
            extra_data={
                "sounds": shuffled_sounds,
                "target_word": word,
                "build_mode": "blend",
            },
        ))
    return items


def _gen_sound_swap(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
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
        words = get_word_bank(difficulty, lang)
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


def _gen_word_ladder(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
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

def _gen_story_recall(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Timed reading: read passage under time pressure, then answer from memory."""
    if difficulty <= 3:
        level = "easy"
    elif difficulty <= 6:
        level = "medium"
    else:
        level = "hard"
    story_source = STORY_PASSAGES_EL if lang == "el" else STORY_PASSAGES
    passages = story_source.get(level, story_source["easy"])
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


def _gen_phrase_flash(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Timed reading: phrase appears briefly, then answer with image-card options."""
    items = []
    phrase_source = PHRASES_BY_LEVEL_EL if lang == "el" else PHRASES_BY_LEVEL
    level = min(difficulty, max(phrase_source.keys()))
    level = max(level, min(phrase_source.keys()))
    phrases = phrase_source.get(level, phrase_source[1])
    flash_time = max(1, 4 - difficulty * 0.3)
    pool = EXERCISE_IMAGES.copy()

    image_phrases_en = [
        "the big cat", "a little dog", "the yellow sun", "a red apple",
        "my pet fish", "a tall tree", "the old book", "a pretty flower",
        "the fat duck", "the baby tiger", "a small house", "my grandmother",
    ]
    image_phrases_el = [
        "η μεγάλη γάτα", "ένας μικρός σκύλος", "ο κίτρινος ήλιος", "ένα κόκκινο μήλο",
        "το ψάρι μου", "ένα ψηλό δέντρο", "το παλιό βιβλίο", "ένα όμορφο λουλούδι",
        "η χοντρή πάπια", "η μικρή τίγρης", "ένα μικρό σπίτι", "η γιαγιά μου",
    ]
    image_word_map_en = {
        "cat": "cat", "dog": "dog", "sun": "sun", "apple": "apple",
        "fish": "fish", "tree": "tree", "book": "book", "flower": "flower",
        "duck": "duck", "tiger": "tiger", "house": "house", "grandmother": "grandmother",
    }
    image_word_map_el = {
        "γάτα": "cat", "σκύλος": "dog", "ήλιος": "sun", "μήλο": "apple",
        "ψάρι": "fish", "δέντρο": "tree", "βιβλίο": "book", "λουλούδι": "flower",
        "πάπια": "duck", "τίγρης": "tiger", "σπίτι": "house", "γιαγιά": "grandmother",
    }

    img_phrases = image_phrases_el if lang == "el" else image_phrases_en
    word_map = image_word_map_el if lang == "el" else image_word_map_en
    filler_words_en = ["the", "a", "my", "to", "it", "in", "go", "we", "up", "on"]
    filler_words_el = ["η", "ο", "ένα", "μια", "στο", "από", "και", "με", "για", "δεν"]
    fillers = filler_words_el if lang == "el" else filler_words_en

    for i in range(count):
        q_type = random.choice(["word_count", "first_word", "last_word", "which_image"])

        if q_type == "which_image":
            phrase = random.choice(img_phrases)
            matched_id = None
            for word_key, img_id in word_map.items():
                if word_key in phrase:
                    matched_id = img_id
                    break
            if not matched_id:
                matched_id = "cat"

            correct_img = next((im for im in pool if im["id"] == matched_id), pool[0])
            distractors = random.sample([im for im in pool if im["id"] != matched_id], 3)
            image_options = [correct_img] + distractors
            random.shuffle(image_options)
            localized_opts = [{**im, "label": _get_img_label(im, lang)} for im in image_options]

            q_text = "Ποια εικόνα ήταν στη φράση;" if lang == "el" else "Which image was in the phrase?"
            items.append(ExerciseItem(
                index=i,
                question=q_text,
                options=[im["id"] for im in image_options],
                correct_answer=matched_id,
                item_type="timed_reading",
                extra_data={
                    "passage": phrase,
                    "reading_time_seconds": flash_time,
                    "passage_visible_during_questions": False,
                    "answer_mode": "image_grid",
                    "image_options": localized_opts,
                },
            ))
        else:
            all_phrases = list(phrases) + img_phrases
            phrase = random.choice(all_phrases)
            words_in_phrase = phrase.split()
            word_count = len(words_in_phrase)

            if q_type == "word_count":
                q_text = "Πόσες λέξεις είχε η φράση;" if lang == "el" else "How many words were in the phrase?"
                correct = str(word_count)
                number_opts = sorted(set([max(1, word_count - 1), word_count, word_count + 1, word_count + 2]))
                opts = [str(n) for n in number_opts][:4]
                answer_mode = "number_cards"
            elif q_type == "first_word":
                q_text = "Ποια ήταν η πρώτη λέξη;" if lang == "el" else "What was the first word?"
                correct = words_in_phrase[0]
                word_distractors = random.sample([w for w in fillers if w != correct], min(3, len(fillers) - 1))
                opts = list(set([correct] + word_distractors))[:4]
                answer_mode = "word_cards"
            else:
                q_text = "Ποια ήταν η τελευταία λέξη;" if lang == "el" else "What was the last word?"
                correct = words_in_phrase[-1]
                word_distractors = random.sample(
                    [w for w in get_word_bank(min(difficulty, 2), lang) if w != correct], 3
                )
                opts = list(set([correct] + word_distractors))[:4]
                answer_mode = "word_cards"

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
                    "answer_mode": answer_mode,
                },
            ))
    return items


def _gen_repeated_reader(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Timed reading: passage stays visible, focus on comprehension."""
    if difficulty <= 3:
        level = "easy"
    elif difficulty <= 6:
        level = "medium"
    else:
        level = "hard"
    story_src = STORY_PASSAGES_EL if lang == "el" else STORY_PASSAGES
    passages = story_src.get(level, story_src["easy"])
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

def _gen_letter_stream(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Spot target: find target letter in a grid of letters."""
    items = []
    alphabet = list("ΑΒΓΔΕΖΗΘΙΚΛΜΝΞΟΠΡΣΤΥΦΧΨΩ") if lang == "el" else list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
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
            question=f"Βρες όλα τα '{target}' γράμματα στο πλέγμα!" if lang == "el" else f"Find all the '{target}' letters in the grid!",
            options=[],
            correct_answer=",".join(str(p) for p in sorted(target_positions)),
            hint=f"Υπάρχουν {len(target_positions)} '{target}' γράμματα κρυμμένα." if lang == "el" else f"There are {len(target_positions)} '{target}' letters hidden in the grid.",
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


def _gen_letter_detective(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Spot target: find the target letter in a visual grid."""
    items = []
    alpha = "αβγδεζηθικλμνξοπρστυφχψω" if lang == "el" else "abcdefghijklmnopqrstuvwxyz"
    for i in range(count):
        target = random.choice(alpha)
        grid_cols = min(4 + difficulty, 7)
        grid_rows = min(3 + difficulty // 2, 5)
        total = grid_cols * grid_rows
        letters = [random.choice(alpha) for _ in range(total)]
        letters = [l if l != target else random.choice([c for c in alpha if c != target]) for l in letters]
        target_pos = random.sample(range(total), min(1 + difficulty // 4, 3))
        for pos in target_pos:
            letters[pos] = target
        q = f"Πάτησε κάθε '{target}' που μπορείς να βρεις!" if lang == "el" else f"Tap every '{target}' you can find!"
        h = f"Κοίτα προσεκτικά — υπάρχουν {len(target_pos)} κρυμμένα." if lang == "el" else f"Look carefully — there are {len(target_pos)} hidden."
        items.append(ExerciseItem(
            index=i,
            question=q,
            options=[],
            correct_answer=",".join(str(p) for p in sorted(target_pos)),
            hint=h,
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


def _gen_mirror_image(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Spot target: find the correctly oriented letter among mirrored versions."""
    items = []
    if lang == "el":
        mirror_map = {"β": "δ", "δ": "β", "θ": "φ", "φ": "θ", "ψ": "ω", "ω": "ψ", "η": "ν", "ν": "η"}
        reversed_letters = LETTERS_COMMONLY_REVERSED_EL
    else:
        mirror_map = {"b": "d", "d": "b", "p": "q", "q": "p", "m": "w", "w": "m", "n": "u", "u": "n"}
        reversed_letters = LETTERS_COMMONLY_REVERSED
    for i in range(count):
        letter = random.choice(reversed_letters)
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

def _gen_visual_closure(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Fill blank: complete a word with missing letters."""
    items = []
    words = get_word_bank(difficulty, lang)
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
            question="Συμπλήρωσε τη λέξη:" if lang == "el" else "Complete the word:",
            options=[],
            correct_answer=word,
            hint=f"Η λέξη έχει {len(word)} γράμματα." if lang == "el" else f"The word has {len(word)} letters.",
            item_type="fill_blank",
            extra_data={
                "partial_word": partial,
                "partial_display": partial_str,
                "blank_positions": blank_indices,
                "missing_letters": missing_letters,
                "full_word": word,
                "available_letters": list(set(missing_letters + random.sample(list("αβγδεζηθικλμνξοπρστυφχψω" if lang == "el" else "abcdefghijklmnopqrstuvwxyz"), min(4, 24)))),
            },
        ))
    return items


def _gen_vocabulary_builder(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Fill blank: use context to determine word meaning (with options)."""
    items = []
    if lang == "el":
        vocab = [
            ("Ο τεράστιος ελέφαντας περπάτησε μέσα στο δάσος.", "τεράστιος", "πολύ μεγάλος",
             ["πολύ μικρός", "πολύ μεγάλος", "πολύ γρήγορος", "πολύ αργός"]),
            ("Ήταν έξαλλη όταν το έμαθε.", "έξαλλη", "πολύ θυμωμένη",
             ["πολύ χαρούμενη", "πολύ θυμωμένη", "πολύ λυπημένη", "πολύ κουρασμένη"]),
            ("Το δειλό γατάκι κρύφτηκε κάτω από το κρεβάτι.", "δειλό", "ντροπαλό και φοβισμένο",
             ["γενναίο", "ντροπαλό και φοβισμένο", "δυνατό", "γρήγορο"]),
            ("Ο ντεντέκτιβ εξέτασε τα παράξενα σημάδια στον τοίχο.", "παράξενα", "ασυνήθιστα",
             ["κανονικά", "όμορφα", "ασυνήθιστα", "επικίνδυνα"]),
            ("Ο γενναίος ιππότης έδειξε μεγάλο θάρρος.", "θάρρος", "γενναιότητα",
             ["φόβο", "γενναιότητα", "ταχύτητα", "σοφία"]),
            ("Ο καιρός ήταν τόσο φρικτός που όλοι έμειναν μέσα.", "φρικτός", "τρομερός",
             ["υπέροχος", "τρομερός", "εκπληκτικός", "ευχάριστος"]),
        ]
    else:
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
        q = f"Τι σημαίνει '{word}' σε αυτή την πρόταση;" if lang == "el" else f"What does '{word}' mean in this sentence?"
        h = "Χρησιμοποίησε το νόημα της πρότασης για βοήθεια." if lang == "el" else "Use the context of the sentence to help."
        items.append(ExerciseItem(
            index=i,
            question=q,
            options=options,
            correct_answer=meaning,
            hint=h,
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

def _gen_tracking_trail(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
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

def _gen_pattern_matcher(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
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

def _gen_dual_task(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
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
# CASTLE BOSS CHALLENGE GENERATOR
# =============================================================================

def _gen_castle_challenge(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Generate simple multiple-choice questions for the castle boss fight (3 needed)."""
    questions_en = [
        {"q": "Which word rhymes with 'cat'?", "opts": ["hat", "dog", "sun", "map"], "ans": "hat"},
        {"q": "What sound does the letter 'B' make?", "opts": ["/b/", "/d/", "/p/", "/g/"], "ans": "/b/"},
        {"q": "How many syllables in 'butterfly'?", "opts": ["3", "2", "4", "1"], "ans": "3"},
        {"q": "Which word starts with the same sound as 'snake'?", "opts": ["swim", "think", "jump", "play"], "ans": "swim"},
        {"q": "What is the opposite of 'hot'?", "opts": ["cold", "warm", "fast", "big"], "ans": "cold"},
        {"q": "Which word has the long 'a' sound?", "opts": ["cake", "cat", "cap", "car"], "ans": "cake"},
        {"q": "How many words are in 'The big dog ran fast'?", "opts": ["5", "4", "6", "3"], "ans": "5"},
        {"q": "Which word is a noun?", "opts": ["table", "run", "quickly", "soft"], "ans": "table"},
        {"q": "What comes next: A, C, E, __?", "opts": ["G", "F", "H", "D"], "ans": "G"},
    ]
    questions_el = [
        {"q": "Ποια λέξη ομοιοκαταληκτεί με 'γάτα';", "opts": ["πατάτα", "σκύλος", "μέρα", "βιβλίο"], "ans": "πατάτα"},
        {"q": "Πόσες συλλαβές έχει η λέξη 'πεταλούδα';", "opts": ["4", "3", "5", "2"], "ans": "4"},
        {"q": "Ποια λέξη αρχίζει με 'Σ';", "opts": ["σπίτι", "πόρτα", "δέντρο", "βιβλίο"], "ans": "σπίτι"},
        {"q": "Τι είναι το αντίθετο του 'μεγάλο';", "opts": ["μικρό", "ψηλό", "γρήγορο", "κρύο"], "ans": "μικρό"},
        {"q": "Πόσες λέξεις έχει η πρόταση 'Ο σκύλος τρέχει γρήγορα';", "opts": ["4", "3", "5", "2"], "ans": "4"},
        {"q": "Ποιο γράμμα ακολουθεί: Α, Γ, Ε, __;", "opts": ["Ζ", "Η", "Θ", "Δ"], "ans": "Ζ"},
    ]

    pool = questions_el if lang == "el" else questions_en
    random.shuffle(pool)

    items: List[ExerciseItem] = []
    for i in range(min(count, len(pool))):
        q = pool[i]
        items.append(ExerciseItem(
            index=i,
            item_type="castle_boss",
            question=q["q"],
            options=q["opts"],
            correct_answer=q["ans"],
            difficulty_level=difficulty,
            extra_data={"answer_mode": "word_cards"},
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
            question=f"Πόσες συλλαβές έχει η λέξη '{word}'; Χτύπα τόσες φορές!" if lang == "el" else f"How many syllables (beats) does '{word}' have? Tap that many times!",
            options=[],
            correct_answer=str(correct_count),
            hint=f"Δοκίμασε να χτυπήσεις παλαμάκια: {word}" if lang == "el" else f"Try clapping for each beat: {word}",
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
        shuffled_sounds = list(sounds)
        random.shuffle(shuffled_sounds)
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
                "sounds": shuffled_sounds,
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
            distractors += random.sample(get_word_bank(difficulty, lang), 3 - len(distractors))
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
# SOUND MATCHING GENERATOR  (item_type="sound_matching")
# =============================================================================

def _gen_sound_matching(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Sound matching: listen to two words, decide if they rhyme (yes/no)."""
    items = []
    pairs_source = RHYME_PAIRS_EL if lang == "el" else RHYME_PAIRS
    pairs = pairs_source[:min(len(pairs_source), 5 + difficulty * 2)]
    non_rhyme_words = (SIMPLE_WORDS_EL + MEDIUM_WORDS_EL) if lang == "el" else (SIMPLE_WORDS + MEDIUM_WORDS)
    for i in range(count):
        do_rhyme = random.choice([True, False])
        if do_rhyme:
            pair = random.choice(pairs)
            word1, word2 = pair[0], pair[1]
            correct = "yes"
        else:
            pair = random.choice(pairs)
            word1 = pair[0]
            word2 = random.choice([w for w in non_rhyme_words
                                   if w != pair[0] and w != pair[1]
                                   and w[-2:] != pair[1][-2:]])
            correct = "no"
        items.append(ExerciseItem(
            index=i,
            question=_t("listen_same", lang),
            options=[word1, word2],
            correct_answer=correct,
            hint="Άκουσε προσεκτικά τους τελικούς ήχους." if lang == "el" else "Listen carefully to the ending sounds.",
            item_type="sound_matching",
            extra_data={
                "word1": word1,
                "word2": word2,
                "lang": "el-GR" if lang == "el" else "en-US",
                "auto_play": True,
            },
        ))
    return items


# =============================================================================
# WORD-SOUND MATCH GENERATOR  (item_type="word_sound_match")
# =============================================================================

def _gen_word_sound_match(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Word-to-sound matching: pick the word that sounds like the target."""
    items = []
    pairs_source = RHYME_PAIRS_EL if lang == "el" else RHYME_PAIRS
    pairs = pairs_source[:min(len(pairs_source), 5 + difficulty * 2)]
    for i in range(count):
        pair = random.choice(pairs)
        target = pair[0]
        correct = pair[1]
        other_words = [p[1] for p in pairs if p != pair]
        distractors = random.sample(other_words, min(2, len(other_words)))
        if len(distractors) < 2:
            distractors += random.sample(get_word_bank(difficulty, lang), 2 - len(distractors))
        options = [correct] + distractors[:2]
        random.shuffle(options)
        items.append(ExerciseItem(
            index=i,
            question=f"{_t('which_sounds_same', lang)} '{target}';" if lang == "el" else f"Which word sounds like '{target}'?",
            options=options,
            correct_answer=correct,
            hint=f"Άκουσε τον τελευταίο ήχο της λέξης '{target}'." if lang == "el" else f"Listen to the ending sound of '{target}'.",
            item_type="word_sound_match",
            extra_data={
                "target_word": target,
                "lang": "el-GR" if lang == "el" else "en-US",
                "auto_play": True,
            },
        ))
    return items


# =============================================================================
# READ ALOUD GENERATOR  (item_type="read_aloud")
# =============================================================================

PSEUDO_WORDS = [
    "blorft", "snalp", "gribble", "tramble", "flonk",
    "criddle", "spunt", "blemish", "glorp", "twisk",
    "plondle", "frazzle", "snarble", "quibble", "drintle",
    "glopper", "strumble", "flimber", "brontled", "klipster",
]


def _gen_read_aloud(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Read aloud: show a word (or pseudo-word) for the child to read via STT."""
    items = []
    real_words = get_word_bank(difficulty, lang)
    pseudo_pool = PSEUDO_WORDS_EL if lang == "el" else PSEUDO_WORDS
    pseudo_ratio = min(0.3 + difficulty * 0.05, 0.5)
    for i in range(count):
        is_pseudo = random.random() < pseudo_ratio
        if is_pseudo:
            word = random.choice(pseudo_pool)
        else:
            word = random.choice(real_words)
        hint = "Προσπάθησε να το διαβάσεις γράμμα-γράμμα." if lang == "el" else "Sound it out letter by letter if you're unsure."
        items.append(ExerciseItem(
            index=i,
            question=_t("read_word", lang),
            options=[],
            correct_answer=word.lower(),
            hint=hint,
            item_type="read_aloud",
            extra_data={
                "word": word,
                "is_pseudo_word": is_pseudo,
                "lang": "el-GR" if lang == "el" else "en-US",
                "show_hint_audio": True,
                "max_attempts": 2,
            },
        ))
    return items


# =============================================================================
# WORD-IMAGE MATCH GENERATOR  (item_type="word_image_match")
# =============================================================================

EXERCISE_IMAGES = [
    {"id": "grandmother", "url": "/game-assets/exercise-images/grandmother.png", "label": "Grandmother", "label_el": "Γιαγιά"},
    {"id": "cat",         "url": "/game-assets/exercise-images/cat.png",         "label": "Cat",         "label_el": "Γάτα"},
    {"id": "dog",         "url": "/game-assets/exercise-images/dog.png",         "label": "Dog",         "label_el": "Σκύλος"},
    {"id": "tiger",       "url": "/game-assets/exercise-images/tiger.png",       "label": "Tiger",       "label_el": "Τίγρης"},
    {"id": "duck",        "url": "/game-assets/exercise-images/duck.png",        "label": "Duck",        "label_el": "Πάπια"},
    {"id": "apple",       "url": "/game-assets/exercise-images/apple.png",       "label": "Apple",       "label_el": "Μήλο"},
    {"id": "house",       "url": "/game-assets/exercise-images/house.png",       "label": "House",       "label_el": "Σπίτι"},
    {"id": "tree",        "url": "/game-assets/exercise-images/tree.png",        "label": "Tree",        "label_el": "Δέντρο"},
    {"id": "sun",         "url": "/game-assets/exercise-images/sun.png",         "label": "Sun",         "label_el": "Ήλιος"},
    {"id": "fish",        "url": "/game-assets/exercise-images/fish.png",        "label": "Fish",        "label_el": "Ψάρι"},
    {"id": "flower",      "url": "/game-assets/exercise-images/flower.png",      "label": "Flower",      "label_el": "Λουλούδι"},
    {"id": "book",        "url": "/game-assets/exercise-images/book.png",        "label": "Book",        "label_el": "Βιβλίο"},
]


def _get_img_label(img: Dict[str, Any], lang: str = "en") -> str:
    """Get image label in the specified language."""
    if lang == "el":
        return img.get("label_el", img["label"])
    return img["label"]


def _gen_word_image_match(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Word-image matching: pick the image for a word, or word for an image."""
    items = []
    pool = EXERCISE_IMAGES.copy()
    tts_lang = "el-GR" if lang == "el" else "en-US"
    for i in range(count):
        mode = random.choice(["word_to_image", "image_to_word"])
        correct_img = random.choice(pool)
        correct_label = _get_img_label(correct_img, lang)
        distractors = random.sample([img for img in pool if img["id"] != correct_img["id"]],
                                    min(3, len(pool) - 1))
        if mode == "word_to_image":
            image_options = [correct_img] + distractors
            random.shuffle(image_options)
            localized_options = [{**img, "label": _get_img_label(img, lang)} for img in image_options]
            q = f"{_t('find_picture', lang)}: {correct_label}"
            items.append(ExerciseItem(
                index=i,
                question=q,
                options=[img["id"] for img in image_options],
                correct_answer=correct_img["id"],
                item_type="word_image_match",
                extra_data={
                    "mode": "word_to_image",
                    "target_word": correct_label,
                    "image_options": localized_options,
                    "lang": tts_lang,
                },
            ))
        else:
            word_options = [correct_label] + [_get_img_label(d, lang) for d in distractors]
            random.shuffle(word_options)
            items.append(ExerciseItem(
                index=i,
                question=_t("what_word_matches", lang),
                options=word_options,
                correct_answer=correct_label,
                item_type="word_image_match",
                extra_data={
                    "mode": "image_to_word",
                    "target_image": correct_img["url"],
                    "word_options": word_options,
                    "lang": tts_lang,
                },
            ))
    return items


# =============================================================================
# RAPID NAMING (RAN) GENERATOR  (item_type="rapid_naming")
# =============================================================================

def _gen_rapid_naming(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """RAN grid: name images in a grid as fast as possible using STT."""
    items = []
    grid_cols = min(3 + difficulty // 3, 5)
    grid_rows = min(2 + difficulty // 3, 4)
    grid_size = grid_cols * grid_rows
    time_limit = max(15, 45 - difficulty * 3)
    pool = EXERCISE_IMAGES.copy()
    tts_lang = "el-GR" if lang == "el" else "en-US"
    for i in range(count):
        grid_images = [random.choice(pool) for _ in range(grid_size)]
        localized_grid = [{**img, "label": _get_img_label(img, lang)} for img in grid_images]
        expected_names = [_get_img_label(img, lang).lower() for img in grid_images]
        items.append(ExerciseItem(
            index=i,
            question=_t("name_pictures", lang),
            options=[],
            correct_answer=" ".join(expected_names),
            item_type="rapid_naming",
            extra_data={
                "images": localized_grid,
                "grid_cols": grid_cols,
                "grid_rows": grid_rows,
                "time_limit": time_limit,
                "lang": "el-GR" if lang == "el" else "en-US",
                "expected_names": expected_names,
            },
        ))
    return items


# =============================================================================
# MEMORY RECALL GENERATOR  (item_type="memory_recall")
# =============================================================================

def _gen_memory_recall(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Memory recall: select images that were (or weren't) seen earlier."""
    items = []
    pool = EXERCISE_IMAGES.copy()
    seen_count = min(3 + difficulty // 2, 6)
    distractor_count = min(2 + difficulty // 2, 5)
    cols = 3 if (seen_count + distractor_count) <= 9 else 4
    for i in range(count):
        mode = random.choice(["pick_seen", "pick_unseen"])
        random.shuffle(pool)
        seen_images = [{**img, "label": _get_img_label(img, lang)} for img in pool[:seen_count]]
        unseen_images = [{**img, "label": _get_img_label(img, lang)} for img in pool[seen_count:seen_count + distractor_count]]
        all_images = seen_images + unseen_images
        random.shuffle(all_images)
        seen_ids = sorted([img["id"] for img in seen_images])
        unseen_ids = sorted([img["id"] for img in unseen_images])
        if mode == "pick_seen":
            correct_answer = ",".join(seen_ids)
            pick_count = len(seen_ids)
            question = _t("which_seen", lang)
        else:
            correct_answer = ",".join(unseen_ids)
            pick_count = len(unseen_ids)
            question = _t("which_not_seen", lang)
        items.append(ExerciseItem(
            index=i,
            question=question,
            options=[],
            correct_answer=correct_answer,
            item_type="memory_recall",
            extra_data={
                "mode": mode,
                "seen_images": seen_images,
                "all_images": all_images,
                "pick_count": pick_count,
                "grid_cols": cols,
            },
        ))
    return items


# =============================================================================
# FALLBACK GENERATOR
# =============================================================================

def _gen_default(difficulty: int, count: int, lang: str = "en") -> List[ExerciseItem]:
    """Fallback generator for unknown game types."""
    words = get_word_bank(difficulty, lang)
    items = []
    for i in range(count):
        word = random.choice(words)
        items.append(ExerciseItem(
            index=i,
            question=f"Πόσα γράμματα έχει η λέξη '{word}';" if lang == "el" else f"How many letters are in the word '{word}'?",
            options=[str(len(word) - 1), str(len(word)), str(len(word) + 1), str(len(word) + 2)],
            correct_answer=str(len(word)),
            item_type="multiple_choice",
        ))
    return items
