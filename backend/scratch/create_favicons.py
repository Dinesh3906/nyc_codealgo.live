import os
from PIL import Image

logo_path = r"d:\nyc_algo\frontend\public\logo.png"
public_ico_path = r"d:\nyc_algo\frontend\public\favicon.ico"
public_png_path = r"d:\nyc_algo\frontend\public\icon.png"
app_png_path = r"d:\nyc_algo\frontend\src\app\icon.png"

try:
    if os.path.exists(logo_path):
        print(f"Loading image from {logo_path}...")
        img = Image.open(logo_path)
        
        # 1. Save as resized PNG (48x48)
        img_48 = img.resize((48, 48), Image.Resampling.LANCZOS)
        img_48.save(public_png_path, format="PNG")
        print(f"Saved 48x48 PNG to {public_png_path}")
        
        # 2. Save as standard ICO (containing 16x16, 32x32, 48x48 sizes)
        img.save(public_ico_path, format="ICO", sizes=[(16, 16), (32, 32), (48, 48)])
        print(f"Saved ICO favicon to {public_ico_path}")
        
        # 3. Save as resized PNG to src/app/icon.png
        img_48.save(app_png_path, format="PNG")
        print(f"Saved 48x48 PNG to {app_png_path}")
        
    else:
        print(f"Error: {logo_path} does not exist!")
except Exception as e:
    print(f"Error resizing logo: {e}")
