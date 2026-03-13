import os
import glob
try:
    from PIL import Image
    files = glob.glob(r'C:\Users\Misrilal Sah (IND)\.gemini\antigravity\brain\f23c3ecd-3965-48e3-8a99-363a17ca0ce0\media__*.png')
    files.sort(key=os.path.getmtime, reverse=True)
    if not files:
        print("No media files found.")
        exit(1)
    
    # Let's see all media files
    for f in files[:5]:
        img = Image.open(f)
        print(f"{os.path.basename(f)}: size={img.size}")
    
    # Process the most recent image which is the uploaded logo
    latest = files[0]
    img = Image.open(latest)
    img = img.convert("RGBA")
    
    sizes = [16, 32, 48, 128]
    dest_dir = r"c:\Users\Misrilal Sah (IND)\Desktop\timezone-currency-pro\assets\icons"
    os.makedirs(dest_dir, exist_ok=True)
    
    for s in sizes:
        resized = img.resize((s, s), Image.Resampling.LANCZOS)
        out_path = os.path.join(dest_dir, f"icon{s}.png")
        resized.save(out_path, format="PNG")
        print(f"Saved {out_path}")
        
    print("Done generating icons.")
except Exception as e:
    print(f"Error: {e}")
