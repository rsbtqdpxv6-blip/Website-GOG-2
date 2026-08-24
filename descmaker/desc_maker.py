import os
import re

def split_dat_descriptions():
    # Find any .dat or .xml file in the current directory
    dat_xml = [f for f in os.listdir('.') if f.lower().endswith(('.dat', '.xml'))]
    
    if not dat_xml:
        return # Exit silently if no DAT or XML file is found
        
    dat_file = dat_xml[0]
    output_dir = "desc"

    # Create the desc folder if it doesn't exist
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)

    try:
        with open(dat_file, "r", encoding="utf-8") as f:
            content = f.read()

        # Find every <game> block in the file
        # Matches <game name="XYZ"> ... </game>
        game_blocks = re.findall(r'<game name="(.*?)">(.*?)</game>', content, re.DOTALL)

        for game_name, game_body in game_blocks:
            # Clean up the game name so it is a valid Windows filename
            clean_name = re.sub(r'[\\/*?:"<>|]', "", game_name).strip()
            
            if not clean_name:
                continue

            # Extract the text between <description> and </description>
            desc_match = re.search(r'<description>(.*?)</description>', game_body, re.DOTALL)
            
            if desc_match:
                description = desc_match.group(1).strip()
                
                # Only write the file if the description isn't blank
                if description:
                    txt_filename = os.path.join(output_dir, f"{clean_name}.txt")
                    
                    with open(txt_filename, "w", encoding="utf-8") as out_f:
                        out_f.write(description)
                        
    except Exception:
        pass # Fail silently if file is locked or unreadable

if __name__ == "__main__":
    split_dat_descriptions()
