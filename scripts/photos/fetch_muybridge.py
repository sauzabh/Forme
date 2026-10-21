"""
Download a curated set of public-domain Muybridge figure photos (Animal
Locomotion, 1887, University of Pennsylvania scans on Wikimedia Commons).

Only single-frame files of adult men/women are kept; anything mentioning
children or animals is skipped. Every file's license is checked to be
public domain, and every download is verified to be a JPEG.

Usage: python3 -I fetch_muybridge.py <download_dir> <manifest_json>
"""
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

API = "https://commons.wikimedia.org/w/api.php"
UA = "FiguraStudio/0.1 (figure-drawing reference app; local build script)"

QUERIES = [
    "walking", "running", "throwing", "jumping", "sitting down", "lifting",
    "kneeling", "turning around", "stooping", "ascending stairs", "descending stairs",
    "carrying", "lying down", "rising", "boxing", "wrestling", "dancing", "climbing",
    "bending", "picking up", "pouring", "spinning", "fencing", "batting", "kicking",
    "shovelling", "hammer", "crawling", "stepping", "dressing", "drinking",
]
EXCLUDE = re.compile(r"\b(child|children|boy|girl|infant|baby|dog|horse|mule|cat|goat|ox|cow|pig|bird|deer|elephant|camel|lion|tiger|buffalo|sheep|baboon|kangaroo|emu|ostrich|elk|raccoon|sloth|tapir)\b", re.I)
HUMAN = re.compile(r"\b(man|woman|men|women)\b", re.I)
FRAME = re.compile(r"\(rbm-QP301M8-1887-(\d+)([a-z]?)~(\d+)\)\.jpe?g$", re.I)
PER_SERIES = 3
TARGET_NUDE = 100
TARGET_CLOTHED = 60


def fetch(url, timeout=60):
    """GET with polite retries: honours Wikimedia's 429 Retry-After."""
    for attempt in range(10):
        req = urllib.request.Request(url, headers={"User-Agent": UA})
        try:
            with urllib.request.urlopen(req, timeout=timeout) as r:
                return r.read()
        except urllib.error.HTTPError as e:
            if e.code not in (429, 503) or attempt == 9:
                raise
            wait = int(e.headers.get("Retry-After") or 0) or 5 * (attempt + 1)
            print(f"  rate limited, waiting {wait}s")
            time.sleep(wait)


def api(params):
    params = {**params, "format": "json"}
    return json.loads(fetch(API + "?" + urllib.parse.urlencode(params), timeout=30))


def search(query, offset=0):
    d = api({"action": "query", "list": "search", "srnamespace": 6, "srlimit": 50, "sroffset": offset,
             "srsearch": f"rbm-QP301M8-1887 {query}"})
    return [x["title"] for x in d["query"]["search"]]


def main(download_dir, manifest_path):
    os.makedirs(download_dir, exist_ok=True)
    titles = []
    for q in QUERIES:
        for offset in (0, 50):
            try:
                titles += search(q, offset)
            except Exception as e:  # keep going on a bad page
                print("search failed", q, e)
            time.sleep(0.6)

    # Filter to adult single frames and spread choices across series.
    per_series, picked, seen = {}, [], set()
    for t in titles:
        if t in seen:
            continue
        seen.add(t)
        name = t[len("File:"):]
        m = FRAME.search(name)
        if not m or EXCLUDE.search(name) or not HUMAN.search(name):
            continue
        series = f"{m.group(1)}{m.group(2)}"
        frame = int(m.group(3))
        per_series.setdefault(series, []).append((frame, t))
    nude, clothed = [], []
    for series, frames in sorted(per_series.items()):
        frames.sort()
        step = max(1, len(frames) // PER_SERIES)
        for frame, t in frames[::step][:PER_SERIES]:
            (nude if re.search(r"\bnude\b", t, re.I) else clothed).append((series, t))
    chosen = nude[:TARGET_NUDE] + clothed[:TARGET_CLOTHED]
    print(f"candidates: {len(per_series)} series, {len(nude)} nude, {len(clothed)} clothed; downloading {len(chosen)}")

    manifest = []
    for i in range(0, len(chosen), 40):
        batch = chosen[i:i + 40]
        try:
            info = api({"action": "query", "titles": "|".join(t for _, t in batch), "prop": "imageinfo",
                        "iiprop": "url|size|mime|extmetadata", "iiextmetadatafilter": "LicenseShortName"})
        except Exception as e:
            print("skip batch (metadata failed)", e)
            continue
        pages = {p["title"]: p for p in info["query"]["pages"].values()}
        for series, t in batch:
            p = pages.get(t)
            if not p or "imageinfo" not in p:
                continue
            ii = p["imageinfo"][0]
            lic = ii.get("extmetadata", {}).get("LicenseShortName", {}).get("value", "")
            if "public domain" not in lic.lower() or ii.get("mime") != "image/jpeg" or ii.get("size", 0) > 2_000_000:
                print("skip (license/type/size)", t, lic, ii.get("mime"), ii.get("size"))
                continue
            name = t[len("File:"):]
            action = re.sub(r"\s*\(rbm-.*$", "", name)
            m = FRAME.search(name)
            file_id = f"muybridge-{m.group(1)}{m.group(2)}-{int(m.group(3)):02d}".lower()
            out = os.path.join(download_dir, file_id + ".jpg")
            out_exists = os.path.exists(out) and os.path.getsize(out) > 0
            if out_exists:
                with open(out, "rb") as f:
                    data = f.read()
            else:
                try:
                    data = fetch(ii["url"])
                except Exception as e:  # one bad file shouldn't stop the run
                    print("skip (download failed)", t, e)
                    continue
                time.sleep(1.0)
            if not data.startswith(b"\xff\xd8\xff"):
                print("skip (not a JPEG)", t)
                continue
            with open(out, "wb") as f:
                f.write(data)
            manifest.append({
                "id": file_id,
                "file": f"/photos/{file_id}.jpg",
                "action": action,
                "plate": int(m.group(1)),
                "nude": bool(re.search(r"\bnude\b", action, re.I)),
                "width": ii["width"],
                "height": ii["height"],
                "source": ii["descriptionurl"],
                "license": lic,
            })
        time.sleep(1)

    manifest.sort(key=lambda x: x["id"])
    with open(manifest_path, "w") as f:
        json.dump(manifest, f, indent=1)
    total = sum(os.path.getsize(os.path.join(download_dir, x["id"] + ".jpg")) for x in manifest)
    print(f"saved {len(manifest)} photos ({total / 1e6:.1f} MB); nude={sum(x['nude'] for x in manifest)}")


if __name__ == "__main__":
    main(sys.argv[1], sys.argv[2])
