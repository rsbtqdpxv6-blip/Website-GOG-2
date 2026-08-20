#Needs Python, Pillow, and CairoSVG. Converts PNG and SVG artwork to lossless WebP.
import os
import io
import shutil
import subprocess
import tempfile
import ctypes
from PIL import Image

try:
    import cairosvg
    cairosvg_import_error = None
except Exception as error:
    cairosvg = None
    cairosvg_import_error = error


def load_cairo_runtime():
    """Load a Windows Cairo DLL from CAIRO_DLL_PATH when CairoSVG needs it."""
    dll_path = os.environ.get('CAIRO_DLL_PATH')
    if dll_path and os.path.isfile(dll_path):
        ctypes.CDLL(dll_path)


def render_svg_to_png(source_path):
    """Rasterize SVG with CairoSVG or a locally installed CLI renderer."""
    if cairosvg is not None:
        try:
            load_cairo_runtime()
            return cairosvg.svg2png(url=source_path)
        except OSError as error:
            cairo_error = error
        else:
            cairo_error = None
    else:
        cairo_error = None

    if shutil.which('resvg'):
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as output:
            output_path = output.name
        try:
            subprocess.run(['resvg', source_path, output_path], check=True, capture_output=True)
            with open(output_path, 'rb') as rendered:
                return rendered.read()
        finally:
            if os.path.exists(output_path):
                os.remove(output_path)

    inkscape_command = shutil.which('inkscape')
    if inkscape_command is None:
        common_inkscape_path = r'C:\Program Files\Inkscape\bin\inkscape.exe'
        if os.path.isfile(common_inkscape_path):
            inkscape_command = common_inkscape_path

    if inkscape_command:
        with tempfile.NamedTemporaryFile(suffix='.png', delete=False) as output:
            output_path = output.name
        try:
            subprocess.run([inkscape_command, source_path, '--export-type=png', f'--export-filename={output_path}'], check=True, capture_output=True)
            with open(output_path, 'rb') as rendered:
                return rendered.read()
        finally:
            if os.path.exists(output_path):
                os.remove(output_path)

    if cairosvg is not None and cairo_error is not None:
        raise RuntimeError(
            "CairoSVG is installed, but its native Cairo DLL is missing. Install a Windows "
            "Cairo runtime and set CAIRO_DLL_PATH to cairo-2.dll, or install resvg/Inkscape."
        ) from cairo_error
    if cairosvg_import_error is not None:
        raise RuntimeError(
            "The CairoSVG Python package is installed, but its native Cairo DLL is missing. "
            "Install a Windows Cairo runtime, or install resvg/Inkscape and add it to PATH."
        ) from cairosvg_import_error
    raise RuntimeError("No working SVG renderer found. Install CairoSVG plus its Windows Cairo runtime, or install resvg/Inkscape and add it to PATH.")


def replace_images_with_webp_lossless(root_directory):
    print("Starting lossless PNG and SVG conversion and replacement process...")

    for dirpath, _, filenames in os.walk(root_directory):
        for filename in filenames:
            extension = os.path.splitext(filename)[1].lower()
            if extension not in {'.png', '.svg'}:
                continue

            source_path = os.path.join(dirpath, filename)
            base_name = os.path.splitext(filename)[0]
            webp_path = os.path.join(dirpath, f"{base_name}.webp")

            try:
                if extension == '.svg':
                    png_bytes = render_svg_to_png(source_path)
                    with Image.open(io.BytesIO(png_bytes)) as img:
                        img.save(webp_path, format="WEBP", lossless=True)
                else:
                    with Image.open(source_path) as img:
                        img.save(webp_path, format="WEBP", lossless=True)

                os.remove(source_path)
                print(f"Replaced (Lossless): {filename} -> {base_name}.webp")
            except Exception as error:
                print(f"Failed to process {source_path}: {error}")

    print("Finished! All PNGs and SVGs have been replaced with lossless WebP files.")


replace_png_with_webp_lossless = replace_images_with_webp_lossless

if __name__ == "__main__":
    script_directory = os.path.dirname(os.path.abspath(__file__))
    replace_images_with_webp_lossless(script_directory)
