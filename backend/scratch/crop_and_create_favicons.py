import os
from PIL import Image, ImageChops

logo_path = r"d:\nyc_algo\frontend\public\logo.png"
public_ico_path = r"d:\nyc_algo\frontend\public\favicon.ico"
public_png_path = r"d:\nyc_algo\frontend\public\icon.png"
app_png_path = r"d:\nyc_algo\frontend\src\app\icon.png"

def trim(im):
    bg = Image.new(im.mode, im.size, (255, 255, 255))
    diff = ImageChops.difference(im, bg)
    diff = ImageChops.add(diff, diff, 2.0, -100)
    bbox = diff.getbbox()
    if bbox:
        # Pad the bbox a little bit (10 pixels)
        padding = 10
        bbox = (
            max(0, bbox[0] - padding),
            max(0, bbox[1] - padding),
            min(im.size[0], bbox[2] + padding),
            min(im.size[1], bbox[3] + padding)
        )
        return im.crop(bbox)
    return im

def make_square(im):
    # Make the cropped image a perfect square by padding the shorter side
    size = max(im.size)
    new_im = Image.new('RGB', (size, size), (255, 255, 255))
    offset = ((size - im.size[0]) // 2, (size - im.size[1]) // 2)
    new_im.paste(im, offset)
    return new_im

try:
    if os.path.exists(logo_path):
        print(f"Loading image from {logo_path}...")
        img = Image.open(logo_path).convert("RGB")
        
        print("Cropping image to remove white space...")
        cropped_img = trim(img)
        
        print("Making image square...")
        square_img = make_square(cropped_img)
        
        # 1. Save as resized PNG (48x48)
        img_48 = square_img.resize((48, 48), Image.Resampling.LANCZOS)
        img_48.save(public_png_path, format="PNG")
        print(f"Saved 48x48 PNG to {public_png_path}")
        
        # 2. Save as standard ICO (containing 16x16, 32x32, 48x48 sizes)
        square_img.save(public_ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        print(f"Saved ICO favicon to {public_ico_path}")
        
        # 3. Save as resized PNG to src/app/icon.png
        img_48.save(app_png_path, format="PNG")
        print(f"Saved 48x48 PNG to {app_png_path}")
        
        print("Done!")
    else:
        print(f"Error: {logo_path} does not exist!")
except Exception as e:
    print(f"Error processing logo: {e}")
