#!/usr/bin/env python3
"""
Generate pixel art card face icons for memory card game using PixelLab API.

Usage:
    export PIXELLAB_API_TOKEN="your_token_here"
    python scripts/generate_memory_card_icons.py
"""

import os
import sys
import json
import time
import base64
import requests
from pathlib import Path

API_BASE = "https://api.pixellab.ai/v2"
TOKEN = os.environ.get("PIXELLAB_API_TOKEN", "")
OUTPUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "game-assets" / "memory" / "cards" / "faces"

HEADERS = {
    "Authorization": f"Bearer {TOKEN}",
    "Content-Type": "application/json",
}

# Icons to generate
ICONS = [
    {
        "name": "axe",
        "description": "pixel art battle axe icon, steel head, wooden handle, centered, game item, 16-bit style, medieval fantasy"
    },
    {
        "name": "helmet",
        "description": "pixel art knight helmet icon, steel visor, plume feather, centered, game item, 16-bit style, medieval fantasy"
    },
    {
        "name": "bow",
        "description": "pixel art wooden bow icon, with arrow, elven style curved, centered, game item, 16-bit style, medieval fantasy"
    },
    {
        "name": "potion-red",
        "description": "pixel art red potion bottle icon, bubbling health potion, cork stopper, centered, game item, 16-bit style"
    },
    {
        "name": "potion-blue",
        "description": "pixel art blue potion bottle icon, mana potion, glowing liquid, centered, game item, 16-bit style"
    },
    {
        "name": "wand",
        "description": "pixel art magic wand icon, star tip, sparkles, wooden handle, centered, game item, 16-bit style"
    },
    {
        "name": "scroll",
        "description": "pixel art scroll icon, rolled parchment, red wax seal, centered, game item, 16-bit style"
    },
    {
        "name": "spellbook",
        "description": "pixel art spellbook icon, leather bound, glowing pages, mystical, centered, game item, 16-bit style"
    },
    {
        "name": "gem-red",
        "description": "pixel art ruby gem icon, red sparkling facets, centered, treasure item, 16-bit style"
    },
    {
        "name": "gem-blue",
        "description": "pixel art sapphire gem icon, blue sparkling, centered, treasure item, 16-bit style"
    },
    {
        "name": "gem-green",
        "description": "pixel art emerald gem icon, green sparkling, centered, treasure item, 16-bit style"
    },
    {
        "name": "coin",
        "description": "pixel art gold coin icon, shiny, stamped design, centered, treasure item, 16-bit style"
    },
    {
        "name": "crown",
        "description": "pixel art royal crown icon, golden with jewels, centered, treasure item, 16-bit style"
    },
    {
        "name": "ring",
        "description": "pixel art magic ring icon, gold band, glowing gem, centered, game item, 16-bit style"
    },
    {
        "name": "key",
        "description": "pixel art ornate key icon, golden, medieval skeleton key, centered, game item, 16-bit style"
    },
    {
        "name": "dragon",
        "description": "pixel art dragon head icon, red scales, fierce eyes, breathing small flame, centered, 16-bit style"
    },
    {
        "name": "phoenix",
        "description": "pixel art phoenix bird icon, fiery orange wings spread, rebirth flame, centered, 16-bit style"
    },
    {
        "name": "unicorn",
        "description": "pixel art unicorn head icon, white, golden spiral horn, majestic, centered, 16-bit style"
    },
]


def api_call(method, endpoint, data=None):
    """Make an API call to PixelLab."""
    url = f"{API_BASE}{endpoint}"
    try:
        if method == "GET":
            response = requests.get(url, headers=HEADERS, timeout=30)
        else:
            response = requests.post(url, headers=HEADERS, json=data, timeout=30)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        print(f"  API Error: {e}")
        if hasattr(e, 'response') and e.response is not None:
            try:
                error_data = e.response.json()
                print(f"  Error details: {json.dumps(error_data, indent=2)}")
            except:
                print(f"  Response: {e.response.text}")
        return None


def poll_job(job_id, max_wait=300):
    """Poll a job until completion."""
    start_time = time.time()
    while time.time() - start_time < max_wait:
        result = api_call("GET", f"/jobs/{job_id}")
        if not result:
            return None
        
        data = result.get("data", {})
        status = data.get("status", "unknown")
        
        if status == "completed":
            return data
        elif status == "failed":
            print(f"  Job failed: {data.get('error', 'Unknown error')}")
            return None
        
        time.sleep(5)
    
    print(f"  Job timed out after {max_wait} seconds")
    return None


def save_image_from_base64(base64_data, filepath):
    """Save base64 image data to file."""
    try:
        image_data = base64.b64decode(base64_data)
        filepath.parent.mkdir(parents=True, exist_ok=True)
        with open(filepath, "wb") as f:
            f.write(image_data)
        return True
    except Exception as e:
        print(f"  Error saving image: {e}")
        return False


def generate_icon(icon_config):
    """Generate a single icon."""
    name = icon_config["name"]
    description = icon_config["description"]
    
    print(f"\n{'='*60}")
    print(f"Generating: {name}")
    print(f"{'='*60}")
    print(f"Description: {description}")
    
    # Create map object
    result = api_call("POST", "/create-map-object", {
        "description": description,
        "width": 48,
        "height": 48,
        "view": "side",
        "detail": "medium detail",
        "shading": "medium shading",
        "outline": "single color outline",
    })
    
    if not result:
        print(f"  Failed to create {name}")
        return False
    
    data = result.get("data", {})
    object_id = data.get("object_id") or data.get("id")
    job_id = data.get("job_id")
    
    if job_id:
        print(f"  Job ID: {job_id}")
        print("  Polling for completion...")
        job_result = poll_job(job_id)
        if not job_result:
            print(f"  Failed to complete job for {name}")
            return False
        object_id = job_result.get("object_id") or job_result.get("result", {}).get("object_id")
    
    if not object_id:
        print(f"  Could not get object ID for {name}")
        return False
    
    print(f"  Object ID: {object_id}")
    
    # Get the completed object
    print("  Fetching completed object...")
    get_result = api_call("GET", f"/map-objects/{object_id}")
    if not get_result:
        print(f"  Failed to fetch object for {name}")
        return False
    
    obj_data = get_result.get("data", {})
    
    # Try to get image from various possible locations
    image_base64 = None
    download_url = None
    
    if obj_data.get("image", {}).get("base64"):
        image_base64 = obj_data["image"]["base64"]
    elif obj_data.get("base64"):
        image_base64 = obj_data["base64"]
    elif obj_data.get("download_url"):
        download_url = obj_data["download_url"]
    elif obj_data.get("image", {}).get("download_url"):
        download_url = obj_data["image"]["download_url"]
    
    if image_base64:
        output_path = OUTPUT_DIR / f"{name}.png"
        if save_image_from_base64(image_base64, output_path):
            print(f"  ✓ Saved to {output_path}")
            return True
        else:
            print(f"  ✗ Failed to save {name}")
            return False
    elif download_url:
        print(f"  Download URL: {download_url}")
        output_path = OUTPUT_DIR / f"{name}.png"
        try:
            OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
            response = requests.get(download_url, timeout=30)
            response.raise_for_status()
            with open(output_path, "wb") as f:
                f.write(response.content)
            print(f"  ✓ Downloaded to {output_path}")
            return True
        except Exception as e:
            print(f"  ✗ Failed to download {name}: {e}")
            return False
    else:
        print(f"  ✗ No image data found for {name}")
        print(f"  Object data keys: {list(obj_data.keys())}")
        return False


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
    print("MEMORY CARD ICON GENERATOR")
    print("=" * 60)
    
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    
    successful = []
    failed = []
    
    for icon_config in ICONS:
        if generate_icon(icon_config):
            successful.append(icon_config["name"])
        else:
            failed.append(icon_config["name"])
        
        # Wait 20 seconds between generations to avoid rate limiting
        print("\n  Waiting 20 seconds before next generation...")
        time.sleep(20)
    
    print("\n" + "=" * 60)
    print("GENERATION COMPLETE")
    print("=" * 60)
    print(f"\nSuccessfully generated ({len(successful)}):")
    for name in successful:
        print(f"  ✓ {name}")
    
    if failed:
        print(f"\nFailed ({len(failed)}):")
        for name in failed:
            print(f"  ✗ {name}")
    else:
        print("\nAll icons generated successfully!")


if __name__ == "__main__":
    main()
