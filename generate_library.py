import os
import json
import re

# ==============================================================================
#                  GLOBAL ARCADE CONFIGURATION & SYSTEM OPTIONS
# ==============================================================================
ASSETS_DIR_NAME  = "assets"
ROMS_DIR_NAME    = "roms"
BOXART_DIR_NAME  = "boxart"
FANART_SUFFIX    = "f"  
SUPPORTED_EXTS   = [".jpg", ".png", ".jpeg", ".webp"]

# Fallback asset if an image is completely missing from your pack
DEFAULT_BOXART   = f"{ASSETS_DIR_NAME}/icons/default_boxart.png"

CORE_MAP = {
    "nes": "fceumm",
    "snes": "snes9x",         
    "gba": "mgba",           
    "gbc": "gambatte",
    "gb": "gambatte",
    "genesis": "genesis_plus_gx",
    "megadrive": "genesis_plus_gx",
    "ps1": "pcsx_rearmed",
    "n64": "mupen64plus_next",
    "flash": "ruffle",      
    "html5": "native_html",
    "dos": "dosbox",         # Maps straight to your local EmulatorJS DosBox core setup
    "secret": "dynamic"      # Dynamic core assignment handled per file below
}

# Auto-detect engine selection for files inside your custom Secret Favorites folder
EXTENSION_CORE_MAP = {
    ".nes": "fceumm",
    ".sfc": "snes9x",
    ".smc": "snes9x",
    ".gba": "mgba",
    ".gbc": "gambatte",
    ".gb": "gambatte",
    ".md": "genesis_plus_gx",
    ".smd": "genesis_plus_gx",
    ".gen": "genesis_plus_gx",
    ".bin": "genesis_plus_gx",
    ".zip": "mupen64plus_next",
    ".exe": "dosbox",        # Automatically routes loose .exe entries inside Secret to DosBox
    ".swf": "ruffle",
    ".wad": "prboom"        # Automatically routes loose .wad entries inside Secret to HTML5
}

TITLE_MAP = {
    "nes": "Nintendo Entertainment System", 
    "snes": "Super Nintendo", 
    "gba": "Game Boy Advance",
    "gbc": "Game Boy Color",
    "gb": "Game Boy",
    "genesis": "Sega Genesis",
    "megadrive": "Sega Mega Drive",
    "ps1": "Sony PlayStation",
    "n64": "Nintendo 64",
    "flash": "Adobe Flash Player",
    "html5": "HTML5 Web Games",
    "dos": "MS-DOS Classic PC Games",
    "doom": "Doom",
    "secret": "My Secret Favorites"
}

def clean_display_title(filename):
    """Strips brackets, parentheticals, and file extensions cleanly."""
    name, _ = os.path.splitext(filename)
    name = re.sub(r'\[.*?\]|\(.*?\)', '', name) 
    return name.strip()

def tokenize(text):
    """Reduces a title down to a clean list of lower-case alphanumeric words."""
    cleaned = re.sub(r'\[.*?\]|\(.*?\)', '', text).lower()
    cleaned = re.sub(r'[^a-z0-9\s]', ' ', cleaned)
    return [word for word in cleaned.split() if word]

def find_progressive_boxart_match(rom_filename, boxart_files):
    """Scans local boxart files and performs progressive word-by-word matching."""
    rom_tokens = tokenize(rom_filename)
    if not rom_tokens:
        return None

    best_match = None
    max_matching_words = 0

    for boxart_file in boxart_files:
        box_name, _ = os.path.splitext(boxart_file)
        box_tokens = tokenize(box_name)
        if not box_tokens:
            continue

        current_match_count = 0
        min_length = min(len(rom_tokens), len(box_tokens))
        
        for i in range(min_length):
            if rom_tokens[i] == box_tokens[i]:
                current_match_count += 1
            else:
                break 

        if current_match_count >= 2:
            if current_match_count > max_matching_words:
                max_matching_words = current_match_count
                best_match = boxart_file
            elif current_match_count == max_matching_words and best_match:
                if abs(len(rom_tokens) - len(box_tokens)) < abs(len(rom_tokens) - len(tokenize(best_match))):
                    best_match = boxart_file

    return best_match

def generate_arcade_json():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    roms_base = os.path.join(root_dir, ASSETS_DIR_NAME, ROMS_DIR_NAME)
    library = []
    
    if not os.path.exists(roms_base):
        print(f"❌ Error: Missing main folder layout path at: {roms_base}")
        return

    for system_folder in sorted(os.listdir(roms_base)):
        system_path = os.path.join(roms_base, system_folder)
        
        if os.path.isdir(system_path):
            system_slug = system_folder.lower().strip()
            system_title = TITLE_MAP.get(system_slug, system_folder.upper())
            system_core = CORE_MAP.get(system_slug, system_slug)
            
            console_node = {
                "system": system_slug,
                "title": system_title,
                "core": system_core,
                "games": []
            }
            
            boxart_dir = os.path.join(system_path, BOXART_DIR_NAME)
            os.makedirs(boxart_dir, exist_ok=True)
            
            available_art_files = []
            if os.path.exists(boxart_dir):
                available_art_files = [f for f in os.listdir(boxart_dir) if f.lower().endswith(('.png', '.jpg', '.jpeg'))]

            # --- TARGET A: LOOSE FOLDER WEB SYSTEMS SCANS (HTML5 & DOS ENGINE FOLDERS) ---
            if system_slug in ["html5", "dos"]:
                for game_folder in sorted(os.listdir(system_path)):
                    game_folder_path = os.path.join(system_path, game_folder)
                    if os.path.isdir(game_folder_path) and game_folder != BOXART_DIR_NAME:
                        boxart_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_folder}/{BOXART_DIR_NAME}/{game_folder}.png"
                        
                        # Find the core launcher executable for local DOS folders
                        launch_target = "index.html"
                        if system_slug == "dos":
                            # Default scanner finds the first .exe file inside the game's folder
                            executables = [f for f in os.listdir(game_folder_path) if f.lower().endswith('.exe')]
                            launch_target = executables[0] if executables else "DOSBOX.EXE"

                        game_entry = {
                            "id": f"{system_slug}_{game_folder.lower()}",
                            "title": game_folder.replace('-', ' ').replace('_', ' ').title(),
                            "core": system_core,
                            "boxart": boxart_path if os.path.exists(os.path.join(boxart_dir, f"{game_folder}.png")) else DEFAULT_BOXART,
                            "rom_path": f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_folder}/{game_folder}/{launch_target}"
                        }
                        console_node["games"].append(game_entry)
            
            # --- TARGET B: CONSOLE ROMS, FLASH, & MIXED SECRET FAVORITES SCANS ---
            else:
                for file in sorted(os.listdir(system_path)):
                    file_path = os.path.join(system_path, file)
                    if os.path.isfile(file_path) and not file.startswith('.'):
                        raw_game_title, ext = os.path.splitext(file)
                        clean_title = clean_display_title(file)
                        
                        # Handle multi-core dynamic allocation inside your Secret Favorites tab folder
                        resolved_core = system_core
                        if system_slug == "secret":
                            resolved_core = EXTENSION_CORE_MAP.get(ext.lower(), "snes9x")

                        boxart_filename = f"{raw_game_title}.png"
                        local_boxart_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_folder}/{BOXART_DIR_NAME}/{boxart_filename}"
                        
                        if not os.path.exists(os.path.join(boxart_dir, boxart_filename)):
                            matched_art_file = find_progressive_boxart_match(raw_game_title, available_art_files)
                            if matched_art_file:
                                local_boxart_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_folder}/{BOXART_DIR_NAME}/{matched_art_file}"
                            else:
                                local_boxart_path = DEFAULT_BOXART

                        game_entry = {
                            "id": f"{system_slug}_{raw_game_title.lower().replace(' ', '_').replace('-', '_')}",
                            "title": clean_title,
                            "core": resolved_core,
                            "boxart": local_boxart_path,
                            "rom_path": f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_folder}/{file}"
                        }
                        
                        for ext_img in SUPPORTED_EXTS:
                            fanart_file = f"{raw_game_title}{FANART_SUFFIX}{ext_img}"
                            if os.path.exists(os.path.join(boxart_dir, fanart_file)):
                                game_entry["fanart"] = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_folder}/{BOXART_DIR_NAME}/{fanart_file}"
                                break 

                        console_node["games"].append(game_entry)
            
            if len(console_node["games"]) > 0: 
                library.append(console_node)
                print(f"✅ Indexed System: {system_title} -> Linked {len(console_node['games'])} games.")

    with open(os.path.join(root_dir, "library.json"), "w", encoding="utf-8") as f:
        json.dump(library, f, indent=2, ensure_ascii=False)
    print("\n🎉 Done! All local titles, DOS folders, and mixed Secret Cores compiled successfully!")

if __name__ == "__main__":
    generate_arcade_json()
