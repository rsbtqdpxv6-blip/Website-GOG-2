#super fancy stuff right? (ONLY RUN THIS AFTER MISSING BOXART IS FIXED, OTHERWISE IT WILL DELETE ALL YOUR UNMATCHED BOXART, AND YOU WILL HAVE TO RE-SCRAPE YOUR LIBRARY AGAIN)
import os
import json

def purge_unmatched_boxart():
    root_dir = os.path.dirname(os.path.abspath(__file__))
    library_json_path = os.path.join(root_dir, "library.json")
    
    print("==========================================================")
    print("        ARCADE UNMATCHED BOXART AUTOMATED CLEANUP         ")
    print("==========================================================\n")

    # 1. Verify our database file exists
    if not os.path.exists(library_json_path):
        print("❌ Error: 'library.json' not found. Run your scraper script first!")
        return

    # 2. Read the active game database to compile a list of valid art assets
    try:
        with open(library_json_path, "r", encoding="utf-8") as f:
            library_data = json.load(f)
    except Exception as e:
        print(f"❌ Error parsing database file: {e}")
        return

    # Handle both wrapped bundle objects and clean raw arrays gracefully
    systems_list = library_data if isinstance(library_data, list) else library_data.get("systems", [])

    valid_boxart_paths = set()
    for system in systems_list:
        for game in system.get("games", []):
            boxart_path = game.get("boxart", "")
            if boxart_path:
                # Standardize paths to match your hard drive OS format cleanly
                normalized_path = os.path.normpath(os.path.join(root_dir, boxart_path))
                valid_boxart_paths.add(normalized_path)

    # 3. Scan physical folders to locate and isolate unmatched files
    roms_base_path = os.path.join(root_dir, "assets", "roms")
    if not os.path.exists(roms_base_path):
        print("❌ Error: Core 'assets/roms/' directory structure missing.")
        return

    deleted_count = 0
    scanned_folders_count = 0

    for system_folder in os.listdir(roms_base_path):
        system_path = os.path.join(roms_base_path, system_folder)
        boxart_dir = os.path.join(system_path, "boxart")
        
        if os.path.isdir(system_path) and os.path.exists(boxart_dir):
            scanned_folders_count += 1
            
            # Scan every physical graphic asset currently sitting in this folder
            for art_file in os.listdir(boxart_dir):
                art_file_lower = art_file.lower()
                
                # Check for standard image formatting extensions
                if art_file_lower.endswith(('.png', '.jpg', '.jpeg', '.webp')):
                    # Skip tracking elements used as game backdrops
                    if art_file_lower.endswith('f.png') or art_file_lower.endswith('f.jpg') or art_file_lower.endswith('f.jpeg'):
                        continue
                        
                    physical_file_path = os.path.normpath(os.path.join(boxart_dir, art_file))
                    
                    # If this physical image path isn't logged inside our JSON dictionary grid, purge it!
                    if physical_file_path not in valid_boxart_paths:
                        try:
                            os.remove(physical_file_path)
                            print(f"🗑️ Deleted Unmatched Art: assets/roms/{system_folder}/boxart/{art_file}")
                            deleted_count += 1
                        except Exception as delete_error:
                            print(f"⚠️ Failed to remove {art_file}: {delete_error}")

    print("\n==========================================================")
    if deleted_count > 0:
        print(f"🎉 Cleanup Successful! Forcefully removed {deleted_count} ghost boxart files.")
    else:
        print("✅ Your artwork pack is perfectly matched! No ghost files detected.")
    print("==========================================================")

if __name__ == "__main__":
    purge_unmatched_boxart()
