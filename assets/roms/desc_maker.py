import re
from pathlib import Path
import xml.etree.ElementTree as ET

def split_dat_descriptions():
    script_dir = Path(__file__).resolve().parent
    if (script_dir / 'assets' / 'roms').is_dir():
        root_dir = script_dir
    elif script_dir.name.lower() == 'roms':
        root_dir = script_dir
    elif script_dir.parent.name.lower() == 'roms':
        root_dir = script_dir.parent
    else:
        root_dir = script_dir.parent
    dat_xml = sorted(
        path for path in root_dir.rglob('*')
        if path.is_file() and path.suffix.lower() in {'.dat', '.xml'}
    )

    if not dat_xml:
        return

    rom_locations = {}
    for path in root_dir.rglob('*'):
        if not path.is_file() or path.suffix.lower() in {'.dat', '.xml', '.txt'}:
            continue
        if 'desc' in {part.lower() for part in path.relative_to(root_dir).parts}:
            continue
        rom_locations.setdefault(path.name.casefold(), path.parent)

    def local_name(tag):
        return tag.rsplit('}', 1)[-1]

    def clean_filename(name):
        return re.sub(r'[\\/*?:"<>|]', '', name).strip()

    def description_output_dir(dat_file, game):
        rom = next(
            (element for element in game.iter() if local_name(element.tag) == 'rom'),
            None
        )
        rom_name = rom.attrib.get('name', '').casefold() if rom is not None else ''
        rom_parent = rom_locations.get(rom_name)
        if rom_parent is not None:
            return rom_parent / 'desc'

        if dat_file.parent != root_dir:
            return dat_file.parent / 'desc'
        return None

    for dat_file in dat_xml:
        try:
            tree = ET.parse(dat_file)
        except (OSError, ET.ParseError):
            continue

        for game in tree.iter():
            if local_name(game.tag) != 'game':
                continue

            game_name = clean_filename(game.attrib.get('name', ''))
            if not game_name:
                continue

            description = next(
                (element.text.strip() for element in game.iter()
                 if local_name(element.tag) == 'description' and element.text and element.text.strip()),
                ''
            )
            if description:
                output_dir = description_output_dir(dat_file, game)
                if output_dir is None:
                    continue
                output_dir.mkdir(exist_ok=True)
                (output_dir / f'{game_name}.txt').write_text(description, encoding='utf-8')


if __name__ == "__main__":
    split_dat_descriptions()
