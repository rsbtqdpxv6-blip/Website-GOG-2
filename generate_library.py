#EVERYTHINGS IN ASSETS FOLDER, SO IF YOU WANT TO CHANGE ANYTHING, GO THERE. (I will add more stuff to the assets folder later, but for now, this is all you need to know)
import os
import json
import re

#configure dir names, i wouldnt change these if i were you. (have to fix a lotta code)
ASSETS_DIR_NAME  = "assets"
ROMS_DIR_NAME    = "roms"
BOXART_DIR_NAME  = "boxart"
FANART_SUFFIX    = "f"  #unused for now, but I will add it later. (it is for fanart, so if you want to add fanart, just add a f to the end of the boxart name and it will work)
SUPPORTED_EXTS   = [".jpg", ".png", ".jpeg", ".webp"]
EBOOK_EXTS       = [".pdf", ".epub"]

# Fallback asset if an image is completely missing from your pack
# Prefer WebP when present, otherwise fall back to SVG or PNG
icons_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), ASSETS_DIR_NAME, 'icons')
preferred_defaults = [
    f"{ASSETS_DIR_NAME}/icons/default_boxart.webp",
    f"{ASSETS_DIR_NAME}/icons/default_boxart.svg",
    f"{ASSETS_DIR_NAME}/icons/default_boxart.png"
]
DEFAULT_BOXART = preferred_defaults[0]
for candidate in preferred_defaults:
    if os.path.exists(os.path.join(os.path.dirname(os.path.abspath(__file__)), candidate)):
        DEFAULT_BOXART = candidate
        break

CORE_MAP = {
    "nes": "fceumm",
    "a26": "stella2014",
    "a52": "a5200",
    "a78": "prosystem",
    "snes": "snes9x",         
    "gba": "mgba",           
    "gbc": "gambatte",
    "gb": "gambatte",
    "genesis": "genesis_plus_gx_wide_wide",
    "megadrive": "genesis_plus_gx_wide_wide",
    "sms": "segaMD",
    "ps1": "pcsx_rearmed",
    "n64": "mupen64plus_next",
    "flash": "ruffle",      
    "html5": "native_html",
    "dos": "dosbox",         # Custom local EmulatorJS DosBox core setup
    "secret": "dynamic",     # Dynamic core assignment handled per file below
    
    # Accurate EmulatorJS Additions
    "gamegear": "segaGG",
    "sega32x": "sega32x",
    "segacd": "segaCD",
    "mame": "mame2003",       # Standard EmulatorJS MAME engine
    "nds": "desmume",
    "psp": "ppsspp",          # Requires SharedArrayBuffer/HTTPS environment
    "saturn": "yabause",
    "virtualboy": "virtualboy",
    "c64": "vice_c64",
    "tg16": "pce",
    "books": "ebooks"
}

#stuff for Favorites folder, ROM hacks folder and secret folder.
EXTENSION_CORE_MAP = {
    ".a26": "stella2014",  # Atari 2600
    ".a52": "a5200",  # Atari 5200
    ".a78": "prosystem",  # Atari 7800
    ".nes": "fceumm",
    ".sfc": "snes9x",
    ".smc": "snes9x",
    ".gba": "mgba",
    ".gbc": "gambatte",
    ".gb": "gambatte",
    ".md": "genesis_plus_gx_wide",
    ".smd": "genesis_plus_gx_wide",
    ".gen": "genesis_plus_gx_wide",
    ".bin": "genesis_plus_gx_wide",
    ".sms": "segaMD",
    ".gg": "segaGG",
    ".32x": "sega32x",
    ".7z": "mupen64plus_next", #my code dosent support multiple extensions for the same core, so I had to convert all the n64 roms to 7z. I will go on a rant about this below.
    ".z64": "mupen64plus_next",
    ".n64": "mupen64plus_next",
    ".exe": "dosbox",        # Automatically routes loose .exe entries inside Secret to DosBox
    ".swf": "ruffle",
    ".wad": "prboom",        # Automatically routes loose .wad entries inside Secret to HTML5
    
    # Accurate Extension Additions
    ".nds": "desmume",
    ".pbp": "ppsspp",        # PSP EBOOT executables
    ".iso": "pcsx_rearmed",  # Disc image fallback (handled dynamically per core if needed)
    ".d64": "vice_c64",
    ".pce": "pce",
    # Zip Rule Priority handling
    # Since .zip applies to N64, Arcade, MAME, and SegaCD, your router must inspect the
    # system key first. If checking by extension alone, MAME is set as the catch-all: (had to freaking convert all the zip n64 files to 7z because of this, and it was a pain in the ass.)
    ".zip": "mame2003"         
}

TITLE_MAP = {
    "nes": "Nintendo Entertainment System", 
    "a26": "Atari 2600",
    "a52": "Atari 5200",
    "a78": "Atari 7800",
    "snes": "Super Nintendo", 
    "gba": "Game Boy Advance",
    "gbc": "Game Boy Color",
    "gb": "Game Boy",
    "genesis": "Sega Genesis",
    "sms": "Sega Master System",
    "megadrive": "Sega Mega Drive",
    "ps1": "Sony PlayStation",
    "n64": "Nintendo 64",
    "flash": "Adobe Flash Player",
    "html5": "HTML5 Web Games",
    "dos": "MS-DOS Classic PC Games",
    "doom": "Doom",
    "secret": "Wesley's Favorites",
    
    #Additions I ADDED!!
    "gamegear": "Sega Game Gear",
    "sega32x": "Sega 32X",
    "segacd": "Sega CD",
    "mame": "MAME Arcade",
    "nds": "Nintendo DS",
    "psp": "Sony PlayStation Portable",
    "saturn": "Sega Saturn",
    "virtualboy": "Nintendo Virtual Boy",
    "tg16": "TurboGrafx-16",
    "c64": "Commodore 64",
    "books": "Ebooks"
}

BACKGROUND_MAP = {
    "doom": "#5a0f14",
    "flash": "#8a5a00",
    "gamegear": "#174a7e",
    "gb": "#4f6f52",
    "gba": "#4b3f72",
    "gbc": "#266b63",
    "html5": "#1d4e89",
    "megadrive": "#7b2d26",
    "n64": "#315c3a",
    "nes": "#FF474C",
    "a26": "#370890",
    "a52": "#0C12C4",
    "a78": "#00EAFF",
    "secret": "#6b3f8c",
    "sms": "#9a3412",
    "snes": "#6b4c9a",
    "tg16": "#4f6472",
    "books": "#6a4f3b"
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


def normalize_name(value):
    """Normalize titles for safe matching against desc filenames."""
    text = (value or '').strip()
    text = re.sub(r'\[.*?\]|\(.*?\)', ' ', text)
    text = text.replace('_', ' ')
    text = re.sub(r'[^a-zA-Z0-9\s]', ' ', text)
    text = re.sub(r'\s+', ' ', text)
    return text.strip().lower()


def load_description_for_game(system_slug, game_title):
    """Load any matching description from a <system>/desc/<game>.txt file."""
    if not system_slug:
        return None

    desc_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), ASSETS_DIR_NAME, ROMS_DIR_NAME, system_slug, 'desc')
    if not os.path.isdir(desc_dir):
        return None

    target = normalize_name(game_title)
    if not target:
        return None

    candidates = []
    for entry in sorted(os.listdir(desc_dir)):
        if not entry.lower().endswith('.txt'):
            continue
        file_base = os.path.splitext(entry)[0]
        normalized = normalize_name(file_base)
        if not normalized:
            continue
        candidates.append((entry, normalized))

    for entry, normalized in candidates:
        if normalized == target:
            text_file = os.path.join(desc_dir, entry)
            try:
                with open(text_file, 'r', encoding='utf-8') as handle:
                    text = handle.read().strip()
                if text:
                    return text
            except Exception:
                return None

    # fuzzy fallback: allow the file name to be a close token match
    for entry, normalized in candidates:
        if target in normalized or normalized in target:
            text_file = os.path.join(desc_dir, entry)
            try:
                with open(text_file, 'r', encoding='utf-8') as handle:
                    text = handle.read().strip()
                if text:
                    return text
            except Exception:
                continue

    return None


def allocate_game_id(next_game_id):
    """Return the next sequential ID and advance the shared generator counter."""
    game_id = next_game_id[0]
    next_game_id[0] += 1
    return game_id


def is_boxart_directory_name(name):
    """Returns True for any directory named boxart, regardless of casing."""
    return (name or '').lower() == BOXART_DIR_NAME


def is_desc_directory_name(name):
    """Returns True for the helper description directory, regardless of casing."""
    return (name or '').lower() == 'desc'


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
    next_game_id = [1]
    
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
                "background": BACKGROUND_MAP.get(system_slug, "#1b1e24"),
                "games": []
            }
            
            boxart_dir = os.path.join(system_path, BOXART_DIR_NAME)
            os.makedirs(boxart_dir, exist_ok=True)
            
            available_art_files = []
            if os.path.exists(boxart_dir):
                # include all supported image extensions (including .webp)
                available_art_files = [f for f in os.listdir(boxart_dir) if f.lower().endswith(tuple(SUPPORTED_EXTS))]

            # --- TARGET A: EBOOK FILE SCANS ---
            if system_slug == "books":
                for root, dirs, files in os.walk(system_path):
                    dirs[:] = [d for d in dirs if not is_boxart_directory_name(d) and not is_desc_directory_name(d)]
                    if is_boxart_directory_name(os.path.basename(root)) or is_desc_directory_name(os.path.basename(root)):
                        continue
                    rel_root = os.path.relpath(root, system_path)
                    rel_prefix = '' if rel_root == '.' else rel_root.replace(os.sep, '/')
                    for file in sorted(files, key=lambda value: value.casefold()):
                        raw_title, ext = os.path.splitext(file)
                        if ext.lower() not in EBOOK_EXTS or file.startswith('.'):
                            continue
                        relative_path = f"{rel_prefix}/{file}" if rel_prefix else file
                        game_entry = {
                            "id": f"books_{raw_title.lower().replace(' ', '_').replace('-', '_')}",
                            "title": clean_display_title(file),
                            "core": system_core,
                            "boxart": DEFAULT_BOXART,
                            "rom_path": f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{relative_path}",
                            "game_id": allocate_game_id(next_game_id)
                        }
                        console_node["games"].append(game_entry)

            # --- TARGET B: LOOSE FOLDER WEB SYSTEMS SCANS (HTML5 & DOS ENGINE FOLDERS) ---
            elif system_slug in ["html5", "dos"]:
                for game_folder in sorted(os.listdir(system_path), key=str.casefold):
                    game_folder_path = os.path.join(system_path, game_folder)
                    if os.path.isdir(game_folder_path) and not is_boxart_directory_name(game_folder) and not is_desc_directory_name(game_folder):
                        # prefer any supported boxart extension for folder-level art
                        boxart_path = DEFAULT_BOXART
                        found_local_art = False

                        # 1) Check inside the game's own folder for art (e.g. GameFolder/GameFolder.webp or boxart.webp)
                        for ext in SUPPORTED_EXTS:
                            candidate = os.path.join(game_folder_path, f"{game_folder}{ext}")
                            if os.path.exists(candidate):
                                boxart_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{game_folder}/{game_folder}{ext}"
                                found_local_art = True
                                break

                        if not found_local_art:
                            for base in ["boxart", "cover", "folder"]:
                                for ext in SUPPORTED_EXTS:
                                    candidate = os.path.join(game_folder_path, f"{base}{ext}")
                                    if os.path.exists(candidate):
                                        boxart_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{game_folder}/{base}{ext}"
                                        found_local_art = True
                                        break
                                if found_local_art:
                                    break

                        # 2) If no art inside the folder, check the system-level boxart directory for matching names
                        if not found_local_art and os.path.exists(boxart_dir):
                            for ext in SUPPORTED_EXTS:
                                candidate = os.path.join(boxart_dir, f"{game_folder}{ext}")
                                if os.path.exists(candidate):
                                    boxart_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{BOXART_DIR_NAME}/{game_folder}{ext}"
                                    found_local_art = True
                                    break
                        
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
                            "boxart": boxart_path,
                            "rom_path": f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{game_folder}/{launch_target}"
                        }
                        desc_text = load_description_for_game(system_slug, game_folder)
                        if desc_text:
                            game_entry["description"] = desc_text
                        game_entry["game_id"] = allocate_game_id(next_game_id)
                        console_node["games"].append(game_entry)
            
            # --- TARGET C: CONSOLE ROMS, FLASH, & MIXED SECRET FAVORITES SCANS ---
            else:
                # Walk the system folder recursively so nested directories and files are indexed.
                for root, dirs, files in os.walk(system_path):
                    dirs[:] = [d for d in dirs if not is_boxart_directory_name(d) and not is_desc_directory_name(d)]

                    # skip the system-level boxart directory (and any casing variant)
                    if os.path.abspath(root) == os.path.abspath(boxart_dir) or is_boxart_directory_name(os.path.basename(root)) or is_desc_directory_name(os.path.basename(root)):
                        continue

                    rel_root = os.path.relpath(root, system_path)
                    rel_prefix = '' if rel_root == '.' else rel_root.replace(os.sep, '/')

                    for file in sorted(files, key=lambda value: (clean_display_title(value).casefold(), value.casefold())):
                        if file.startswith('.'): 
                            continue

                        file_path = os.path.join(root, file)
                        if not os.path.isfile(file_path):
                            continue

                        raw_game_title, ext = os.path.splitext(file)
                        clean_title = clean_display_title(file)

                        # Handle multi-core dynamic allocation inside your Secret Favorites tab folder
                        resolved_core = system_core
                        if system_slug == "secret":
                            resolved_core = EXTENSION_CORE_MAP.get(ext.lower(), "snes9x")

                        # Build web-relative rom path including nested folders
                        if rel_prefix:
                            rom_rel_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{rel_prefix}/{file}"
                        else:
                            rom_rel_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{file}"

                        # Prefer boxart inside the same folder as the game file
                        local_boxart_path = DEFAULT_BOXART
                        found_local_art = False
                        for ext_img in SUPPORTED_EXTS:
                            candidate = os.path.join(root, f"{raw_game_title}{ext_img}")
                            if os.path.exists(candidate):
                                if rel_prefix:
                                    local_boxart_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{rel_prefix}/{raw_game_title}{ext_img}"
                                else:
                                    local_boxart_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{raw_game_title}{ext_img}"
                                found_local_art = True
                                break

                        if not found_local_art:
                            # check for common boxart names and supported extensions
                            candidate_names = []
                            for ext in SUPPORTED_EXTS:
                                candidate_names.append(f"{raw_game_title}{ext}")
                            for base in ["boxart", "cover", "folder"]:
                                for ext in SUPPORTED_EXTS:
                                    candidate_names.append(f"{base}{ext}")

                            for candidate_name in candidate_names:
                                if os.path.exists(os.path.join(root, candidate_name)):
                                    if rel_prefix:
                                        local_boxart_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{rel_prefix}/{candidate_name}"
                                    else:
                                        local_boxart_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{candidate_name}"
                                    found_local_art = True
                                    break

                        if not found_local_art:
                            # fallback to system boxart directory or progressive matching
                            # check system-level boxart directory for matching files across supported extensions
                            found_sys_box = False
                            for ext in SUPPORTED_EXTS:
                                sys_box_candidate = os.path.join(boxart_dir, f"{raw_game_title}{ext}")
                                if os.path.exists(sys_box_candidate):
                                    local_boxart_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{BOXART_DIR_NAME}/{raw_game_title}{ext}"
                                    found_sys_box = True
                                    break
                            if not found_sys_box:
                                matched_art_file = find_progressive_boxart_match(raw_game_title, available_art_files)
                                if matched_art_file:
                                    local_boxart_path = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{BOXART_DIR_NAME}/{matched_art_file}"
                                else:
                                    local_boxart_path = DEFAULT_BOXART

                        game_entry = {
                            "id": f"{system_slug}_{raw_game_title.lower().replace(' ', '_').replace('-', '_')}",
                            "title": clean_title,
                            "core": resolved_core,
                            "boxart": local_boxart_path,
                            "rom_path": rom_rel_path
                        }
                        desc_text = load_description_for_game(system_slug, clean_title)
                        if desc_text:
                            game_entry["description"] = desc_text
                        game_entry["game_id"] = allocate_game_id(next_game_id)

                        # Fanart check: prefer fanart in same folder as the game
                        for ext_img in SUPPORTED_EXTS:
                            fanart_file = f"{raw_game_title}{FANART_SUFFIX}{ext_img}"
                            if os.path.exists(os.path.join(root, fanart_file)):
                                if rel_prefix:
                                    game_entry["fanart"] = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{rel_prefix}/{fanart_file}"
                                else:
                                    game_entry["fanart"] = f"{ASSETS_DIR_NAME}/{ROMS_DIR_NAME}/{system_slug}/{fanart_file}"
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
