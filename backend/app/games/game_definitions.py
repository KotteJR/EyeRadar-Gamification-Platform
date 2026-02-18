"""
All 35 game definitions for the EyeRadar Dyslexia Exercise System.
Each game targets one of the 6 deficit areas and specifies a game_type
that determines the interactive mechanic used in the frontend.
"""

from app.models import GameDefinition, GameType, DeficitArea

GAMES: dict[str, GameDefinition] = {}


def _register(g: GameDefinition):
    GAMES[g.id] = g


# ─── Phonological Awareness (7 games) ────────────────────────────────────────

_register(GameDefinition(
    id="sound_safari",
    name="Sound Safari",
    description="Identify beginning, ending, or middle sounds in words. Match sounds to fun animals and objects!",
    deficit_area=DeficitArea.PHONOLOGICAL_AWARENESS,
    game_type=GameType.MULTIPLE_CHOICE,
    age_range_min=4, age_range_max=8,
    mechanics="Match sounds to animals/objects",
    instructions="Listen to the target sound, then pick the word that contains that sound in the correct position.",
    icon="🦁",
))

_register(GameDefinition(
    id="rhyme_time_race",
    name="Rhyme Time Race",
    description="Match rhyming word pairs before the timer runs out! Build phonological connections through fun speed challenges.",
    deficit_area=DeficitArea.PHONOLOGICAL_AWARENESS,
    game_type=GameType.SPEED_ROUND,
    age_range_min=5, age_range_max=10,
    mechanics="Speed matching with visual cards",
    instructions="Find the word that rhymes with the target word as fast as you can! Beat the clock!",
    icon="⏰",
))

_register(GameDefinition(
    id="syllable_stomper",
    name="Syllable Stomper",
    description="Count syllables in words using rhythm-based activities. Tap along to learn word patterns!",
    deficit_area=DeficitArea.PHONOLOGICAL_AWARENESS,
    game_type=GameType.SEQUENCE_TAP,
    age_range_min=4, age_range_max=9,
    mechanics="Kinesthetic input, rhythm-based",
    instructions="Look at the word and tap the correct number of beats (syllables). Tap the buttons in rhythm!",
    icon="🥁",
))

_register(GameDefinition(
    id="phoneme_blender",
    name="Phoneme Blender",
    description="Blend individual sounds together to build complete words. Master the building blocks of reading!",
    deficit_area=DeficitArea.PHONOLOGICAL_AWARENESS,
    game_type=GameType.WORD_BUILDING,
    age_range_min=6, age_range_max=12,
    mechanics="Drag sounds to build words",
    instructions="See the individual sounds. Tap them in the right order to blend them into a word!",
    icon="🧩",
))

_register(GameDefinition(
    id="sound_swap",
    name="Sound Swap",
    description="Replace sounds in words to create new words. A fun phoneme manipulation puzzle!",
    deficit_area=DeficitArea.PHONOLOGICAL_AWARENESS,
    game_type=GameType.WORD_BUILDING,
    age_range_min=7, age_range_max=13,
    mechanics="Manipulation puzzles",
    instructions="Change the specified sound in the word to make a new word. Tap the letters to swap!",
    icon="🔄",
))

_register(GameDefinition(
    id="sound_matching",
    name="Sound Matching",
    description="Listen to two words and decide if they rhyme or share the same ending sound. Train your ear for phonological patterns!",
    deficit_area=DeficitArea.PHONOLOGICAL_AWARENESS,
    game_type=GameType.SOUND_MATCHING,
    age_range_min=4, age_range_max=10,
    mechanics="Binary auditory discrimination with TTS",
    instructions="Listen to the two words. Do they sound the same at the end? Click Yes or No!",
    icon="👂",
))

_register(GameDefinition(
    id="word_sound_match",
    name="Word-to-Sound Matching",
    description="Find the word that sounds like the target! Pick the matching sound from three choices to sharpen phonological skills.",
    deficit_area=DeficitArea.PHONOLOGICAL_AWARENESS,
    game_type=GameType.WORD_SOUND_MATCH,
    age_range_min=5, age_range_max=11,
    mechanics="Auditory matching with TTS and choices",
    instructions="Look at the word on top and listen to it. Which of the three words below sounds the same? Tap to choose!",
    icon="🔊",
))

# ─── Rapid Automatized Naming (5 games) ──────────────────────────────────────

_register(GameDefinition(
    id="speed_namer",
    name="Speed Namer",
    description="Rapidly name sequences of letters, numbers, and colors to build automaticity.",
    deficit_area=DeficitArea.RAPID_NAMING,
    game_type=GameType.SPEED_ROUND,
    age_range_min=6, age_range_max=14,
    mechanics="Timed naming with voice or tap",
    instructions="Name each item as fast as you can! Select the correct answer before time runs out!",
    icon="⚡",
))

_register(GameDefinition(
    id="flash_card_frenzy",
    name="Flash Card Frenzy",
    description="Quick recognition of high-frequency words with progressively increasing speed.",
    deficit_area=DeficitArea.RAPID_NAMING,
    game_type=GameType.SPEED_ROUND,
    age_range_min=7, age_range_max=14,
    mechanics="Progressive speed increase",
    instructions="Read the word shown and quickly select its meaning. Speed increases as you go!",
    icon="🃏",
))

_register(GameDefinition(
    id="object_blitz",
    name="Object Blitz",
    description="Name common objects as fast as possible to strengthen visual-verbal connections.",
    deficit_area=DeficitArea.RAPID_NAMING,
    game_type=GameType.SPEED_ROUND,
    age_range_min=5, age_range_max=10,
    mechanics="Visual recognition speed",
    instructions="Look at the picture description and quickly select its name. Beat the clock!",
    icon="🎯",
))

_register(GameDefinition(
    id="letter_stream",
    name="Letter Stream",
    description="Identify target letters in a flowing stream of characters. Train your visual attention and naming speed!",
    deficit_area=DeficitArea.RAPID_NAMING,
    game_type=GameType.SPOT_TARGET,
    age_range_min=6, age_range_max=12,
    mechanics="Visual attention + naming",
    instructions="Watch the stream of letters and tap the target letter when you see it!",
    icon="🌊",
))

_register(GameDefinition(
    id="ran_grid",
    name="RAN Grid Challenge",
    description="Name a grid of images as fast and accurately as possible! Animals, colors, and objects test your rapid naming speed.",
    deficit_area=DeficitArea.RAPID_NAMING,
    game_type=GameType.RAPID_NAMING,
    age_range_min=5, age_range_max=12,
    mechanics="Grid-based rapid naming with voice recording",
    instructions="Press the microphone, then name every image in the grid from left to right, top to bottom, as fast as you can!",
    icon="🐾",
))

# ─── Working Memory (5 games) ────────────────────────────────────────────────

_register(GameDefinition(
    id="memory_matrix",
    name="Memory Matrix",
    description="Remember and recreate visual patterns on a grid. Strengthen your visual working memory!",
    deficit_area=DeficitArea.WORKING_MEMORY,
    game_type=GameType.GRID_MEMORY,
    age_range_min=6, age_range_max=14,
    mechanics="Grid-based visual memory",
    instructions="Watch the pattern light up on the grid, then tap the squares to recreate it from memory!",
    icon="🔲",
))

_register(GameDefinition(
    id="sequence_keeper",
    name="Sequence Keeper",
    description="Remember and repeat sequences of items. Build your sequential memory skills!",
    deficit_area=DeficitArea.WORKING_MEMORY,
    game_type=GameType.SEQUENCE_TAP,
    age_range_min=5, age_range_max=12,
    mechanics="Auditory/visual sequences",
    instructions="Watch the sequence appear, then tap the numbers in the same order to repeat it!",
    icon="🔢",
))

_register(GameDefinition(
    id="backward_spell",
    name="Backward Spell",
    description="Spell words backwards to exercise verbal working memory. A brain-bending challenge!",
    deficit_area=DeficitArea.WORKING_MEMORY,
    game_type=GameType.TEXT_INPUT,
    age_range_min=8, age_range_max=14,
    mechanics="Verbal working memory",
    instructions="Read the word, then type it backwards. Think carefully!",
    icon="🔙",
))

_register(GameDefinition(
    id="story_recall",
    name="Story Recall",
    description="Remember details from short passages. Practice comprehension and memory together!",
    deficit_area=DeficitArea.WORKING_MEMORY,
    game_type=GameType.TIMED_READING,
    age_range_min=7, age_range_max=14,
    mechanics="Comprehension + memory",
    instructions="Read the short story carefully — it will disappear! Then answer questions from memory.",
    icon="📖",
))

_register(GameDefinition(
    id="dual_task_challenge",
    name="Dual Task Challenge",
    description="Process information while remembering other details. Train your central executive function!",
    deficit_area=DeficitArea.WORKING_MEMORY,
    game_type=GameType.DUAL_TASK,
    age_range_min=9, age_range_max=14,
    mechanics="Central executive training",
    instructions="Remember the word shown, then solve the math problem. You'll be asked about both!",
    icon="🧠",
))

_register(GameDefinition(
    id="memory_recall",
    name="Memory Recall",
    description="After playing exercises you'll see images — can you remember which ones appeared earlier? Test your visual memory!",
    deficit_area=DeficitArea.WORKING_MEMORY,
    game_type=GameType.MEMORY_RECALL,
    age_range_min=5, age_range_max=12,
    mechanics="Image recognition memory",
    instructions="You'll see a grid of images. Some were shown to you before, some are new. Pick the ones you remember seeing (or the new ones, depending on the challenge)!",
    icon="🧩",
))

# ─── Visual Processing (5 games) ─────────────────────────────────────────────

_register(GameDefinition(
    id="letter_detective",
    name="Letter Detective",
    description="Find hidden letters among visual distractors. Sharpen your visual discrimination!",
    deficit_area=DeficitArea.VISUAL_PROCESSING,
    game_type=GameType.SPOT_TARGET,
    age_range_min=5, age_range_max=10,
    mechanics="Visual discrimination",
    instructions="Find and tap the target letter hidden in the grid of letters!",
    icon="🔍",
))

_register(GameDefinition(
    id="tracking_trail",
    name="Tracking Trail",
    description="Follow moving targets along a path. Exercise your eye tracking skills!",
    deficit_area=DeficitArea.VISUAL_PROCESSING,
    game_type=GameType.TRACKING,
    age_range_min=6, age_range_max=12,
    mechanics="Eye tracking exercises",
    instructions="Follow the trail of directions and remember where you end up!",
    icon="👁️",
))

_register(GameDefinition(
    id="pattern_matcher",
    name="Pattern Matcher",
    description="Match visual patterns quickly and accurately. Build visual memory and discrimination!",
    deficit_area=DeficitArea.VISUAL_PROCESSING,
    game_type=GameType.PATTERN_MATCH,
    age_range_min=5, age_range_max=12,
    mechanics="Visual memory + discrimination",
    instructions="Study the pattern shown, then pick the exact match from the options. Look carefully for differences!",
    icon="🎨",
))

_register(GameDefinition(
    id="mirror_image",
    name="Mirror Image",
    description="Identify reversed or rotated letters. Master letter orientation to avoid common reversals!",
    deficit_area=DeficitArea.VISUAL_PROCESSING,
    game_type=GameType.SPOT_TARGET,
    age_range_min=6, age_range_max=10,
    mechanics="Orientation training",
    instructions="Look at the letters shown. Tap the one that is written correctly (not mirrored)!",
    icon="🪞",
))

_register(GameDefinition(
    id="visual_closure",
    name="Visual Closure",
    description="Complete partial images and words. Strengthen your visual completion skills!",
    deficit_area=DeficitArea.VISUAL_PROCESSING,
    game_type=GameType.FILL_BLANK,
    age_range_min=7, age_range_max=12,
    mechanics="Gestalt completion",
    instructions="Look at the partial word with missing letters and figure out the complete word!",
    icon="✨",
))

# ─── Reading Fluency (6 games) ───────────────────────────────────────────────

_register(GameDefinition(
    id="phrase_flash",
    name="Phrase Flash",
    description="Read phrases quickly before they disappear! Build reading speed and confidence!",
    deficit_area=DeficitArea.READING_FLUENCY,
    game_type=GameType.TIMED_READING,
    age_range_min=7, age_range_max=14,
    mechanics="Timed phrase reading",
    instructions="A phrase will flash on screen briefly. Read it and then answer the question about it!",
    icon="💨",
))

_register(GameDefinition(
    id="word_ladder",
    name="Word Ladder",
    description="Build word chains by changing one letter at a time. Practice decoding and fluency!",
    deficit_area=DeficitArea.READING_FLUENCY,
    game_type=GameType.WORD_BUILDING,
    age_range_min=8, age_range_max=14,
    mechanics="Decoding + fluency",
    instructions="Change one letter in the word to make a new word. Build a chain from start to finish!",
    icon="🪜",
))

_register(GameDefinition(
    id="repeated_reader",
    name="Repeated Reader",
    description="Practice reading passages multiple times for fluency gains. Track your improvement!",
    deficit_area=DeficitArea.READING_FLUENCY,
    game_type=GameType.TIMED_READING,
    age_range_min=6, age_range_max=14,
    mechanics="Repeated reading protocol",
    instructions="Read the passage, then answer comprehension questions. Try to improve your speed!",
    icon="🔁",
))

_register(GameDefinition(
    id="sight_word_sprint",
    name="Sight Word Sprint",
    description="Rapid recognition of high-frequency sight words. Build automatic word recognition!",
    deficit_area=DeficitArea.READING_FLUENCY,
    game_type=GameType.SPEED_ROUND,
    age_range_min=6, age_range_max=12,
    mechanics="Automaticity building",
    instructions="Spot the correctly spelled sight word as fast as you can! Speed matters!",
    icon="🏃",
))

_register(GameDefinition(
    id="prosody_practice",
    name="Prosody Practice",
    description="Read with expression and rhythm. Learn to make reading sound natural and engaging!",
    deficit_area=DeficitArea.READING_FLUENCY,
    game_type=GameType.MULTIPLE_CHOICE,
    age_range_min=8, age_range_max=14,
    mechanics="Audio modeling + practice",
    instructions="Read the sentence with the correct expression based on the punctuation and meaning.",
    icon="🎵",
))

_register(GameDefinition(
    id="decoding_read_aloud",
    name="Decoding Challenge",
    description="Read words and pseudo-words aloud to practice decoding skills! Includes made-up words to test letter-sound knowledge.",
    deficit_area=DeficitArea.READING_FLUENCY,
    game_type=GameType.READ_ALOUD,
    age_range_min=5, age_range_max=12,
    mechanics="Voice-based decoding practice with STT",
    instructions="A word appears on screen. Press the microphone button, say the word out loud, then click to move on. Some words are made up — try your best to sound them out!",
    icon="🎤",
))

# ─── Reading Comprehension (6 games) ─────────────────────────────────────────

_register(GameDefinition(
    id="question_quest",
    name="Question Quest",
    description="Answer questions about reading passages. Build your comprehension skills step by step!",
    deficit_area=DeficitArea.COMPREHENSION,
    game_type=GameType.MULTIPLE_CHOICE,
    age_range_min=7, age_range_max=14,
    mechanics="Multiple choice + free response",
    instructions="Read the passage carefully, then answer the questions that follow.",
    icon="❓",
))

_register(GameDefinition(
    id="main_idea_hunter",
    name="Main Idea Hunter",
    description="Identify the central theme of passages. Learn to see the big picture in what you read!",
    deficit_area=DeficitArea.COMPREHENSION,
    game_type=GameType.MULTIPLE_CHOICE,
    age_range_min=8, age_range_max=14,
    mechanics="Summarization training",
    instructions="Read the passage and identify the main idea from the options given.",
    icon="🎯",
))

_register(GameDefinition(
    id="inference_detective",
    name="Inference Detective",
    description="Draw conclusions from text clues. Become a master at reading between the lines!",
    deficit_area=DeficitArea.COMPREHENSION,
    game_type=GameType.MULTIPLE_CHOICE,
    age_range_min=9, age_range_max=14,
    mechanics="Critical thinking",
    instructions="Read the passage and use clues from the text to answer what isn't directly stated.",
    icon="🕵️",
))

_register(GameDefinition(
    id="vocabulary_builder",
    name="Vocabulary Builder",
    description="Learn new words in context. Use clues from the sentence to figure out word meanings!",
    deficit_area=DeficitArea.COMPREHENSION,
    game_type=GameType.FILL_BLANK,
    age_range_min=7, age_range_max=14,
    mechanics="Contextual vocabulary",
    instructions="Read the sentence and use context clues to determine the meaning of the highlighted word.",
    icon="📚",
))

_register(GameDefinition(
    id="story_sequencer",
    name="Story Sequencer",
    description="Put story events in the correct order. Master narrative comprehension!",
    deficit_area=DeficitArea.COMPREHENSION,
    game_type=GameType.SORTING,
    age_range_min=6, age_range_max=12,
    mechanics="Narrative comprehension",
    instructions="Read the story events and arrange them in the correct order by tapping them first to last.",
    icon="📋",
))

_register(GameDefinition(
    id="word_image_match",
    name="Word-Image Match",
    description="Match words to their pictures and pictures to their words! Build vocabulary and reading comprehension through visual connections.",
    deficit_area=DeficitArea.COMPREHENSION,
    game_type=GameType.WORD_IMAGE_MATCH,
    age_range_min=4, age_range_max=10,
    mechanics="Bidirectional word-image association",
    instructions="See the word? Pick the matching picture! See the picture? Pick the matching word! Connect what you read with what you see.",
    icon="🖼️",
))


# ─── Castle Boss Challenge ──────────────────────────────────────────────────

_register(GameDefinition(
    id="castle_challenge",
    name="Castle Boss Challenge",
    description="Battle fearsome castle bosses! Defeat three bosses and answer questions between each fight. A reward level that tests your skills!",
    deficit_area=DeficitArea.PHONOLOGICAL_AWARENESS,
    game_type=GameType.CASTLE_BOSS,
    age_range_min=5, age_range_max=14,
    mechanics="Side-scrolling boss fight with quiz questions",
    instructions="Use arrow keys to move and jump. Press X to shoot spells at the boss. Defeat the boss, then answer a question to advance!",
    icon="🏰",
))


def get_all_games() -> list[GameDefinition]:
    return list(GAMES.values())


def get_game(game_id: str) -> GameDefinition | None:
    return GAMES.get(game_id)


def get_games_by_area(area: DeficitArea) -> list[GameDefinition]:
    return [g for g in GAMES.values() if g.deficit_area == area]


def get_games_for_student(age: int, deficit_areas: list[str] | None = None) -> list[GameDefinition]:
    """Get games suitable for a student's age and deficit areas."""
    result = []
    for g in GAMES.values():
        if g.age_range_min <= age <= g.age_range_max:
            if deficit_areas is None or g.deficit_area.value in deficit_areas:
                result.append(g)
    return result
