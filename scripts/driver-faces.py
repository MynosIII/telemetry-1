"""
Square face crops of the local driver portraits, for avatars and small round
portraits, so the whole face shows instead of whatever a centre crop leaves.

    pip install "opencv-python-headless<5" pillow
    python3 scripts/driver-faces.py

Reads lib/driver-photos.json, writes public/drivers/faces/<id>.webp and
lib/driver-faces.json ({ driverId: "/drivers/faces/<id>.webp" }). Portraits
hosted elsewhere (Wikimedia) are skipped and keep using the original photo.
A face that is not detected falls back to a crop of the upper centre.
"""
import json, os, sys
import cv2
import numpy
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SIZE = 192
OUT = os.path.join(ROOT, "public/drivers/faces")
os.makedirs(OUT, exist_ok=True)

photos = json.load(open(os.path.join(ROOT, "lib/driver-photos.json")))
cascades = [cv2.CascadeClassifier(cv2.data.haarcascades + name) for name in
            ("haarcascade_frontalface_default.xml", "haarcascade_frontalface_alt2.xml", "haarcascade_profileface.xml")]

def find_face(gray):
    h, w = gray.shape
    min_side = max(16, int(min(w, h) * 0.12))
    # Strict pass first; old, grainy photos need a looser one.
    for neighbours in (6, 3):
        for cascade in cascades:
            faces = cascade.detectMultiScale(gray, scaleFactor=1.05, minNeighbors=neighbours, minSize=(min_side, min_side))
            if len(faces):
                # Largest face, preferring ones in the upper two thirds.
                return max(faces, key=lambda f: f[2] * f[3] * (1.0 if f[1] + f[3] / 2 < h * 0.7 else 0.4))
    return None

# Drivers with no free head shot use a photo of them racing: crop the car
# from the middle of the frame instead of looking for a face.
CAR_SHOTS = {"alex-blignaut", "art-cross", "landi", "purley"}

# Detections that landed on something else (an ear, a crowd); crop these by position.
NO_DETECTION = {"cal-niday", "raikkonen", "abecassis", "bailey", "barbazza", "bueno", "bussinello", "firman", "fischer",
                "fisichella", "follmer", "garde", "jimmy-bryan", "loof", "munaron", "pace", "parkes", "pironi", "rol",
                "scarfiotti", "schiller", "serafini", "wacker", "ward", "zunino"}

faces, missed = {}, []
for driver_id, entry in sorted(photos.items()):
    url = entry["url"]
    if not url.startswith("/"):
        continue
    path = os.path.join(ROOT, "public", url.lstrip("/"))
    if not os.path.exists(path):
        continue
    img = Image.open(path).convert("RGBA")
    background = Image.new("RGBA", img.size, (22, 22, 22, 255))
    img = Image.alpha_composite(background, img).convert("RGB")
    w, h = img.size
    gray = cv2.cvtColor(numpy.array(img), cv2.COLOR_RGB2GRAY)
    face = None if driver_id in NO_DETECTION | CAR_SHOTS else find_face(gray)
    # A landscape photo with no face found is almost always a car on track: crop its middle.
    if driver_id in CAR_SHOTS or (face is None and w > h * 1.1):
        cx, cy, side = w / 2, h / 2, min(w, h)
    elif face is not None:
        fx, fy, fw, fh = (int(v) for v in face)
        cx, cy = fx + fw / 2, fy + fh * 0.5
        side = max(fw, fh) * 2.5  # room for hair, chin and some shoulders
    else:
        missed.append(driver_id)
        cx, cy = w / 2, min(h * 0.36, w * 0.55)
        side = min(w, h) * (0.9 if h > w else 0.75)
    # Tight head shots leave no room around the face: pad them with the
    # photo's own edge colour (up to a quarter more) rather than cut the head.
    side = min(side, min(w, h) * 1.25, max(w, h))
    left = min(max(cx - side / 2, min(0, w - side) / 2), max(w - side, (w - side) / 2))
    top = min(max(cy - side / 2, min(0, h - side) / 2), max(h - side, 0))
    if side > w or side > h or top < 0:
        edge = numpy.concatenate([numpy.array(img)[:, :3].reshape(-1, 3), numpy.array(img)[:, -3:].reshape(-1, 3)])
        fill = tuple(int(v) for v in numpy.median(edge, axis=0))
        canvas = Image.new("RGB", (round(side) + 2, round(side) + 2), fill)
        canvas.paste(img, (round(-left), round(-top)))
        crop = canvas.crop((0, 0, round(side), round(side)))
    else:
        crop = img.crop((round(left), round(top), round(left + side), round(top + side)))
    crop = crop.resize((SIZE, SIZE), Image.LANCZOS)
    name = f"{driver_id}.webp"
    crop.save(os.path.join(OUT, name), "WEBP", quality=82)
    faces[driver_id] = f"/drivers/faces/{name}"

with open(os.path.join(ROOT, "lib/driver-faces.json"), "w") as f:
    json.dump(faces, f, indent=1, sort_keys=True)
    f.write("\n")
print(f"{len(faces)} faces, {len(missed)} without a detected face: {', '.join(missed)}", file=sys.stderr)
