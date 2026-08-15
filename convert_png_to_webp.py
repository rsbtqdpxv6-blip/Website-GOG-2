import os
from PIL import Image

def replace_png_with_webp_lossless(root_directory):
    print("Starting 100% lossless conversion and replacement process...")
    
    # Walk through the root folder and all subfolders
    for dirpath, _, filenames in os.walk(root_directory):
        for filename in filenames:
            if filename.lower().endswith('.png'):
                # Get the full path to the original PNG file
                png_path = os.path.join(dirpath, filename)
                
                # Create the WebP path in the exact same subfolder
                base_name = os.path.splitext(filename)[0]
                webp_path = os.path.join(dirpath, f"{base_name}.webp")
                
                try:
                    # Open, convert, and save the image with lossless compression
                    with Image.open(png_path) as img:
                        img.save(webp_path, format="WEBP", lossless=True)
                    
                    # Delete the original PNG file to complete the replacement
                    os.remove(png_path)
                    print(f"Replaced (Lossless): {filename} -> {base_name}.webp")
                    
                except Exception as e:
                    print(f"Failed to process {png_path}: {e}")

    print("Finished! All PNGs have been replaced with lossless WebP files.")

if __name__ == "__main__":
    script_directory = os.path.dirname(os.path.abspath(__file__))
    replace_png_with_webp_lossless(script_directory)
