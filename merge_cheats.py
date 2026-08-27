"""Build per-system EmulatorJS cheat databases from .cht files."""

import json
import re
import sys
from pathlib import Path


ASSIGNMENT_RE = re.compile(
    r"^\s*(?P<key>cheats|cheat(?P<index>\d+)_(?P<field>desc|code))\s*=\s*(?P<value>.*?)\s*$"
)


def parse_value(raw_value):
    """Parse quoted .cht values while also accepting bare values."""
    if not raw_value.startswith(("\"", "'")):
        return raw_value.strip()
    try:
        return json.loads(raw_value) if raw_value.startswith('"') else raw_value[1:-1]
    except json.JSONDecodeError:
        return raw_value.strip('"\'')


def parse_cheat_file(path):
    values = {}
    try:
        contents = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        contents = path.read_text(encoding="cp1252")

    for line in contents.splitlines():
        match = ASSIGNMENT_RE.match(line)
        if match:
            key = match.group("key")
            values[key if key == "cheats" else (match.group("index"), match.group("field"))] = parse_value(match.group("value"))

    cheat_count = int(values.get("cheats", 0))
    return [
        {
            "desc": str(values.get((str(index), "desc"), "")),
            "code": str(values.get((str(index), "code"), "")),
        }
        for index in range(cheat_count)
        if str(values.get((str(index), "desc"), "")).strip()
        and str(values.get((str(index), "code"), "")).strip()
    ]


def merge_cheats(cheats_directory):
    merged = {}
    duplicate_titles = []
    cheat_files = (
        path for path in cheats_directory.rglob("*")
        if path.is_file() and path.suffix.lower() == ".cht"
    )
    for path in sorted(cheat_files, key=lambda item: str(item).lower()):
        title = path.stem
        if title in merged:
            duplicate_titles.append(title)
            merged[title].extend(parse_cheat_file(path))
        else:
            merged[title] = parse_cheat_file(path)
    return merged, duplicate_titles


def write_lazy_cheat_files(output_directory, system, merged):
    """Write a small title index and bounded payloads for browser-side loading."""
    chunk_directory = output_directory / "cheats"
    chunk_directory.mkdir(parents=True, exist_ok=True)
    for old_chunk in chunk_directory.glob(f"{system}-*.json"):
        old_chunk.unlink()

    index = {}
    chunk = {}
    chunk_size = 0
    chunk_number = 1

    def flush_chunk():
        nonlocal chunk, chunk_size, chunk_number
        if not chunk:
            return
        filename = f"{system}-{chunk_number:03d}.json"
        (chunk_directory / filename).write_text(
            json.dumps(chunk, ensure_ascii=False, separators=(",", ":")) + "\n",
            encoding="utf-8",
        )
        for title in chunk:
            normalized_title = re.sub(r"[^a-z0-9]", "", title.lower())
            index[normalized_title] = filename
            base_title = re.sub(r"\([^)]*\)|\[[^\]]*\]", "", title.lower())
            base_title = re.sub(r"[^a-z0-9]", "", base_title)
            index.setdefault(base_title, filename)
        chunk = {}
        chunk_size = 0
        chunk_number += 1

    for title, cheats in merged.items():
        entry_size = len(json.dumps({title: cheats}, ensure_ascii=False))
        if chunk and chunk_size + entry_size > 512 * 1024:
            flush_chunk()
        chunk[title] = cheats
        chunk_size += entry_size
    flush_chunk()
    (output_directory / f"{system}-index.json").write_text(
        json.dumps(index, ensure_ascii=False, separators=(",", ":")) + "\n",
        encoding="utf-8",
    )


def main():
    root_directory = Path(__file__).resolve().parent
    cheats_root = root_directory / "assets" / "cheats"
    roms_root = root_directory / "assets" / "roms"

    for cheats_directory in sorted(path for path in cheats_root.iterdir() if path.is_dir()):
        if not any(
            path.is_file() and path.suffix.lower() == ".cht"
            for path in cheats_directory.rglob("*")
        ):
            continue

        system = cheats_directory.name
        output_path = roms_root / system / f"{system}.json"
        output_path.parent.mkdir(parents=True, exist_ok=True)
        merged, duplicate_titles = merge_cheats(cheats_directory)
        output_path.write_text(
            json.dumps(merged, indent=2, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )
        write_lazy_cheat_files(output_path.parent, system, merged)
        emulator_cheats_directory = root_directory / "emulatorjs" / "cheats"
        emulator_cheats_directory.mkdir(parents=True, exist_ok=True)
        emulator_cheats = dict(merged)
        if system == "nes" and "Super Mario Bros." not in emulator_cheats:
            emulator_cheats["Super Mario Bros."] = emulator_cheats.get("Super Mario Bros. (World)", [])
        (emulator_cheats_directory / f"{system}.json").write_text(
            json.dumps(emulator_cheats, ensure_ascii=False) + "\n",
            encoding="utf-8",
        )

        cheat_count = sum(len(cheats) for cheats in merged.values())
        print(f"Merged {len(merged)} titles and {cheat_count} cheats into {output_path}.")
        if duplicate_titles:
            print(
                f"Warning: {len(duplicate_titles)} duplicate title key(s) were merged.",
                file=sys.stderr,
            )


if __name__ == "__main__":
    main()