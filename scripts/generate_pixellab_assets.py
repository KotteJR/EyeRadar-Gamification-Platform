#!/usr/bin/env python3
"""
PixelLab Asset Generator for EyeRadar Dyslexia Learning Game

Generates all game assets using the PixelLab API v2:
- 5 Final boss characters with animations
- 1 Player character with animations
- 6 Sidescroller backgrounds
- 6 Platform tilesets

Usage:
    export PIXELLAB_API_TOKEN="your_token_here"
    python scripts/generate_pixellab_assets.py

Get your API token at: https://pixellab.ai/account
"""

import os
import sys
import json
import time
import base64
import requests
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

API_BASE = "https://api.pixellab.ai/v2"
TOKEN = os.environ.get("PIXELLAB_API_TOKEN", "")
ASSET_DIR = Path(__file__).parent.parent / "frontend" / "public" / "game-assets"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}


# ─── Boss Characters ─────────────────────────────────────────────────────────
BOSSES = {
    "dark-sorcerer": {
        "description": "evil sorcerer boss, tattered black robes, glowing red eyes, skull staff, dark aura, menacing pose, detailed villain, large character",
        "name": "Dark Sorcerer",
    },
    "giant-golem": {
        "description": "stone golem boss, cracked rocky body, glowing core chest, moss covered, ancient runes, towering creature, heavy armored",
        "name": "Giant Golem",
    },
    "shadow-beast": {
        "description": "shadow monster boss, wispy dark form, multiple glowing eyes, sharp claws, ethereal smoke body, nightmare creature",
        "name": "Shadow Beast",
    },
    "dragon": {
        "description": "pixel dragon boss, dark scales, fiery eyes, large wings folded, smoke from nostrils, intimidating, detailed scales",
        "name": "Dragon",
    },
    "corrupted-knight": {
        "description": "fallen knight boss, rusted dark armor, broken helmet showing skull, cursed sword, tattered cape, undead warrior",
        "name": "Corrupted Knight",
    },
}

PLAYER = {
    "description": "brave young hero character, blue tunic, red cap, friendly face, adventurer outfit, pixel art protagonist",
    "name": "Hero Student",
}

# ─── Animations to generate for each character ──────────────────────────────
BOSS_ANIMATIONS = [
    {"template_animation_id": "breathing-idle", "action_description": "idle breathing menacingly"},
    {"template_animation_id": "falling-back-death", "action_description": "defeated falling back death"},
    {"template_animation_id": "hit", "action_description": "getting hit taking damage"},
    {"template_animation_id": "fireball", "action_description": "casting attack spell"},
]

PLAYER_ANIMATIONS = [
    {"template_animation_id": "breathing-idle", "action_description": "idle standing heroically"},
    {"template_animation_id": "walking", "action_description": "walking forward bravely"},
    {"template_animation_id": "jumping", "action_description": "jumping up"},
    {"template_animation_id": "hit", "action_description": "getting hit flinching"},
]

# ─── Sidescroller Backgrounds ────────────────────────────────────────────────
BACKGROUNDS = {
    "grassland": "sidescroller background, rolling green hills, blue sky, fluffy clouds, distant mountains, golden hour, dreamy pastoral, soft colors, studio ghibli style, pixel art",
    "forest": "sidescroller forest background, tall trees, dappled sunlight, misty depth, mushrooms, magical woodland, soft greens, enchanted forest, pixel art",
    "mountain": "sidescroller mountain background, snow peaks, alpine meadows, crisp blue sky, distant valleys, majestic landscape, epic scale, pixel art",
    "sunset": "sidescroller sunset background, orange pink sky, silhouette hills, warm golden light, peaceful evening, dreamy clouds, studio ghibli, pixel art",
    "night": "sidescroller night background, starry sky, crescent moon, sleeping hills, soft blue tones, magical nighttime, aurora borealis, pixel art",
    "cloud_kingdom": "sidescroller sky background, floating clouds, heavenly light, soft pastels, dreamy atmosphere, above the clouds, magical kingdom, pixel art",
}

# ─── Sidescroller Tilesets ───────────────────────────────────────────────────
TILESETS = {
    "grassland": {"lower": "lush green grass earth", "transition": "wildflowers and soft grass"},
    "forest": {"lower": "dark forest soil with roots", "transition": "moss and ferns"},
    "mountain": {"lower": "grey mountain stone", "transition": "snow and ice crystals"},
    "sunset": {"lower": "warm orange sandstone", "transition": "golden wheat and dry grass"},
    "night": {"lower": "dark blue-grey stone", "transition": "glowing mushrooms and moonflowers"},
    "cloud_kingdom": {"lower": "fluffy white cloud material", "transition": "golden light and rainbow shimmer"},
}


def api_call(method, endpoint, data=None, params=None):
    """Make an API call with error handling."""
    url = f"{API_BASE}{endpoint}"
    try:
        if method == "GET":
            resp = requests.get(url, headers=HEADERS, params=params, timeout=60)
        elif method == "POST":
            resp = requests.post(url, headers=HEADERS, json=data, timeout=120)
        elif method == "DELETE":
            resp = requests.delete(url, headers=HEADERS, timeout=30)
        else:
            raise ValueError(f"Unknown method: {method}")

        if resp.status_code == 401:
            print("ERROR: Invalid API token. Get yours at https://pixellab.ai/account")
            sys.exit(1)
        if resp.status_code == 402:
            print("ERROR: Insufficient credits. Top up at https://pixellab.ai/account")
            sys.exit(1)

        resp.raise_for_status()
        return resp.json()
    except requests.exceptions.RequestException as e:
        print(f"  API Error: {e}")
        return None


def save_image_from_base64(b64_data, filepath):
    """Save a base64-encoded image to disk."""
    filepath = Path(filepath)
    filepath.parent.mkdir(parents=True, exist_ok=True)
    with open(filepath, "wb") as f:
        f.write(base64.b64decode(b64_data))
    print(f"  Saved: {filepath}")


def save_image_from_url(url, filepath):
    """Download and save an image from URL."""
    filepath = Path(filepath)
    filepath.parent.mkdir(parents=True, exist_ok=True)
    resp = requests.get(url, timeout=60)
    resp.raise_for_status()
    with open(filepath, "wb") as f:
        f.write(resp.content)
    print(f"  Saved: {filepath}")


def poll_job(job_id, max_wait=600, interval=10):
    """Poll a background job until completion."""
    elapsed = 0
    while elapsed < max_wait:
        result = api_call("GET", f"/background-jobs/{job_id}")
        if result and result.get("data", {}).get("status") == "completed":
            return result["data"]
        if result and result.get("data", {}).get("status") == "failed":
            print(f"  Job {job_id} failed: {result['data'].get('error', 'Unknown')}")
            return None
        time.sleep(interval)
        elapsed += interval
        print(f"  Waiting... ({elapsed}s)")
    print(f"  Timeout waiting for job {job_id}")
    return None


def poll_character(char_id, max_wait=600, interval=15):
    """Poll character creation until all rotations are ready."""
    elapsed = 0
    while elapsed < max_wait:
        result = api_call("GET", f"/characters/{char_id}")
        if not result:
            time.sleep(interval)
            elapsed += interval
            continue

        data = result.get("data", {})
        status = data.get("status", "")

        if status == "completed" or status == "ready":
            return data
        if status == "failed":
            print(f"  Character {char_id} failed")
            return None

        pending = data.get("pending_jobs", [])
        if not pending and data.get("rotations"):
            return data

        time.sleep(interval)
        elapsed += interval
        print(f"  Character processing... ({elapsed}s)")

    print(f"  Timeout waiting for character {char_id}")
    return None


# ─── Generation Functions ────────────────────────────────────────────────────

def generate_character(name, description, char_type="boss"):
    """Create a character with 4 directions using the v2 API."""
    print(f"\n{'='*50}")
    print(f"Creating {char_type}: {name}")
    print(f"{'='*50}")

    result = api_call("POST", "/create-character-with-4-directions", {
        "description": description,
        "image_size": {"width": 64, "height": 64},
        "text_guidance_scale": 10.0,
        "outline": "single color black outline",
        "shading": "basic shading",
        "detail": "highly detailed",
        "view": "side",
    })

    if not result:
        print(f"  Failed to create {name}")
        return None

    data = result.get("data", {})
    char_id = data.get("character_id") or data.get("id")

    if not char_id:
        job_id = data.get("job_id")
        if job_id:
            print(f"  Background job: {job_id}")
            job_result = poll_job(job_id)
            if job_result:
                char_id = job_result.get("character_id") or job_result.get("result", {}).get("character_id")

    if not char_id:
        print(f"  Could not get character ID for {name}")
        return None

    print(f"  Character ID: {char_id}")
    return char_id


def generate_animations(char_id, name, animations):
    """Queue animations for a character."""
    print(f"\n  Queuing animations for {name}...")

    for anim in animations:
        result = api_call("POST", "/animate-character", {
            "character_id": char_id,
            "template_animation_id": anim["template_animation_id"],
            "action_description": anim.get("action_description"),
            "animation_name": anim["template_animation_id"],
        })

        if result:
            print(f"    Queued: {anim['template_animation_id']}")
        else:
            print(f"    Failed: {anim['template_animation_id']}")


def download_character(char_id, name, output_dir):
    """Download character ZIP and extract key images."""
    print(f"\n  Downloading {name}...")

    # Try to get the ZIP
    zip_url = f"{API_BASE}/characters/{char_id}/zip"
    try:
        resp = requests.get(zip_url, headers=HEADERS, timeout=120)
        if resp.status_code == 200:
            zip_path = output_dir / f"{name}.zip"
            with open(zip_path, "wb") as f:
                f.write(resp.content)
            print(f"  Downloaded ZIP: {zip_path}")

            # Extract ZIP
            import zipfile
            with zipfile.ZipFile(zip_path, "r") as z:
                z.extractall(output_dir / name)
            print(f"  Extracted to: {output_dir / name}")
            return True
        elif resp.status_code == 423:
            print(f"  Character still processing, trying individual images...")
        else:
            print(f"  ZIP download failed: {resp.status_code}")
    except Exception as e:
        print(f"  ZIP download error: {e}")

    # Fallback: get character details and download individual images
    result = api_call("GET", f"/characters/{char_id}")
    if result and result.get("data"):
        data = result["data"]

        # Download rotation images
        rotations = data.get("rotations", [])
        for rot in rotations:
            direction = rot.get("direction", "south")
            image_data = rot.get("image", {})
            if image_data.get("base64"):
                save_image_from_base64(
                    image_data["base64"],
                    output_dir / f"{name}-{direction}.png"
                )
            elif image_data.get("url"):
                save_image_from_url(
                    image_data["url"],
                    output_dir / f"{name}-{direction}.png"
                )

        # Download preview if available
        preview = data.get("preview_image", {})
        if preview.get("base64"):
            save_image_from_base64(preview["base64"], output_dir / f"{name}.png")
        elif preview.get("url"):
            save_image_from_url(preview["url"], output_dir / f"{name}.png")

        return True

    return False


def generate_background(name, description):
    """Generate a sidescroller background image."""
    print(f"\n  Generating background: {name}")

    result = api_call("POST", "/create-image-pixflux", {
        "description": description,
        "image_size": {"width": 400, "height": 200},
        "text_guidance_scale": 10.0,
        "no_background": False,
        "outline": "no outline",
        "shading": "soft shading",
        "detail": "highly detailed",
    })

    if not result or not result.get("data"):
        print(f"  Failed to generate background: {name}")
        return False

    data = result["data"]
    images = data.get("images", [])

    if images and images[0].get("base64"):
        save_image_from_base64(
            images[0]["base64"],
            ASSET_DIR / "backgrounds" / f"{name}.png"
        )
        return True
    elif data.get("image", {}).get("base64"):
        save_image_from_base64(
            data["image"]["base64"],
            ASSET_DIR / "backgrounds" / f"{name}.png"
        )
        return True
    elif data.get("job_id"):
        print(f"  Background job: {data['job_id']}")
        job_result = poll_job(data["job_id"])
        if job_result and job_result.get("result", {}).get("images"):
            img = job_result["result"]["images"][0]
            if img.get("base64"):
                save_image_from_base64(
                    img["base64"],
                    ASSET_DIR / "backgrounds" / f"{name}.png"
                )
                return True

    print(f"  Could not save background: {name}")
    return False


def generate_tileset(name, config):
    """Generate a sidescroller tileset."""
    print(f"\n  Generating tileset: {name}")

    result = api_call("POST", "/create-tileset", {
        "lower_description": config["lower"],
        "upper_description": "transparent background",
        "transition_description": config["transition"],
        "transition_size": 0.25,
        "tile_size": {"width": 16, "height": 16},
        "text_guidance_scale": 8.0,
        "view": "low top-down",
    })

    if not result:
        print(f"  Failed to create tileset: {name}")
        return False

    data = result.get("data", {})
    job_id = data.get("job_id") or data.get("tileset_id")

    if job_id:
        print(f"  Tileset job: {job_id}")
        return job_id

    return None


# ─── Main Execution ──────────────────────────────────────────────────────────

def main():
    if not TOKEN:
        print("ERROR: PIXELLAB_API_TOKEN environment variable not set.")
        print("Get your token at: https://pixellab.ai/account")
        print("Then run: export PIXELLAB_API_TOKEN='your_token'")
        sys.exit(1)

    # Check balance
    balance = api_call("GET", "/balance")
    if balance:
        data = balance.get("data", {})
        print(f"Account Balance: {data.get('remaining_credits', '?')} credits, {data.get('remaining_generations', '?')} generations")

    print("\n" + "=" * 60)
    print("EYERADAR PIXELLAB ASSET GENERATOR")
    print("=" * 60)

    # ─── Phase 1: Create Characters ─────────────────────────
    print("\n--- PHASE 1: Creating Characters ---")
    character_ids = {}

    # Create bosses
    for boss_key, boss_config in BOSSES.items():
        char_id = generate_character(boss_config["name"], boss_config["description"], "boss")
        if char_id:
            character_ids[boss_key] = char_id

    # Create player
    player_id = generate_character(PLAYER["name"], PLAYER["description"], "player")
    if player_id:
        character_ids["player"] = player_id

    print(f"\nCreated {len(character_ids)} characters")

    # ─── Phase 2: Queue Animations ──────────────────────────
    print("\n--- PHASE 2: Queuing Animations ---")
    for boss_key, char_id in character_ids.items():
        if boss_key == "player":
            generate_animations(char_id, PLAYER["name"], PLAYER_ANIMATIONS)
        else:
            boss_name = BOSSES[boss_key]["name"]
            generate_animations(char_id, boss_name, BOSS_ANIMATIONS)

    # ─── Phase 3: Generate Backgrounds ──────────────────────
    print("\n--- PHASE 3: Generating Backgrounds ---")
    for bg_name, bg_desc in BACKGROUNDS.items():
        generate_background(bg_name, bg_desc)

    # ─── Phase 4: Wait for Characters & Download ────────────
    print("\n--- PHASE 4: Waiting for Characters to Complete ---")
    print("(This may take 5-15 minutes...)")

    time.sleep(30)  # Initial wait

    for char_key, char_id in character_ids.items():
        output_dir = ASSET_DIR / ("player" if char_key == "player" else "bosses")
        name = char_key

        print(f"\n  Polling {name}...")
        char_data = poll_character(char_id, max_wait=600)

        if char_data:
            download_character(char_id, name, output_dir)
        else:
            print(f"  Could not retrieve {name}")

    # ─── Phase 5: Generate Tilesets ─────────────────────────
    print("\n--- PHASE 5: Generating Tilesets ---")
    tileset_jobs = {}
    for ts_name, ts_config in TILESETS.items():
        job_id = generate_tileset(ts_name, ts_config)
        if job_id:
            tileset_jobs[ts_name] = job_id

    # ─── Done ────────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("GENERATION COMPLETE!")
    print("=" * 60)
    print(f"\nAssets saved to: {ASSET_DIR}")
    print(f"Characters created: {len(character_ids)}")
    print(f"Backgrounds generated: {len(BACKGROUNDS)}")
    print(f"Tilesets queued: {len(tileset_jobs)}")
    print("\nCharacter IDs (for reference):")
    for key, cid in character_ids.items():
        print(f"  {key}: {cid}")
    print("\nTileset Job IDs:")
    for key, jid in tileset_jobs.items():
        print(f"  {key}: {jid}")

    # Save IDs for later reference
    ids_file = ASSET_DIR / "generation_ids.json"
    with open(ids_file, "w") as f:
        json.dump({
            "characters": character_ids,
            "tilesets": tileset_jobs,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S"),
        }, f, indent=2)
    print(f"\nIDs saved to: {ids_file}")


if __name__ == "__main__":
    main()
