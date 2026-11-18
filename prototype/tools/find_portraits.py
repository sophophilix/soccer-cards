"""Find a calmer photo for each card whose current photo was taken during a match.

Usage: find_portraits.py PROTOTYPE_HTML PHOTOS_DIR STAGE_DIR

Reads the player list from the prototype and the current credits from PHOTOS_DIR. For each player whose
photo looks like a match shot, searches Wikimedia Commons, keeps only freely licensed photos that name the
player, scores them (portraits, press events and award nights up; matches, crowds and artwork down) and
saves the best few to STAGE_DIR with a candidates.json. Nothing in PHOTOS_DIR changes: a person looks at
the staged photos and then runs apply_portraits.py.
"""
import ast
import html
import json
import re
import sys
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request

UA = {"User-Agent": "soccer-cards-prototype/0.1 (hobby project)"}
ALLOWED = ("CC0", "CC BY", "Public domain", "PD")  # CC BY covers CC BY-SA. Anything else is skipped.
KEEP = 3  # staged candidates per player

# The name to search for, and the text a file's title or categories must contain, when the card name
# alone could mean someone else.
IDENTITY = {
    "Rodri": ("Rodri footballer", "rodri (footballer, born 1996)"),
    "Pedri": ("Pedri footballer", "pedri gonzalez"),
    "Gabriel": ("Gabriel Magalhães", "gabriel magalhaes"),
    "Vitinha": ("Vitinha footballer", "vitinha (footballer, born february 2000)"),
    "Marquinhos": ("Marquinhos", "marquinhos (footballer, born 1994)"),
    "Raphinha": ("Raphinha", "raphinha"),
    "Alisson": ("Alisson Becker", "alisson becker"),
    "Heung-min Son": ("Son Heung-min", "son heung-min"),
    "Ronaldo Nazário": ("Ronaldo Nazário", "ronaldo (brazilian footballer)"),
}

MATCH = re.compile(
    r"\bvs?\b|\bv\.|\d\s*[-–:]\s*\d|match|final|playing|in action|game|goal|celebrat|dribbl|tackl|"
    r"free kick|penalty|corner|warm|fußball|world cup 20|euro 20|copa america 20|club world cup|"
    r"usmnt|uswnt|nycfc|-\d{2,3}(\b|_|\s|\()", re.I)
CALM = re.compile(
    r"portrait|press|conference|interview|award|ceremony|gala|ballon|presentation|signing|unveil|"
    r"smil|headshot|red carpet|premiere|visit|meeting|reception|festival|training|open day", re.I)
NOT_A_PHOTO_OF_THEM = re.compile(
    r"statue|mural|graffiti|wax|drawing|painting|caricature|sticker|jersey|shirt|boots|autograph|"
    r"signature|fans|stadium|squad|team photo|line-?up|logo|map|chart|banner|tifo|poster|stamp|"
    r"with |and | & |family|wife|children|president|minister", re.I)


def fold(text):
    text = unicodedata.normalize("NFKD", text or "")
    return "".join(c for c in text if not unicodedata.combining(c)).lower().replace("_", " ")


def get(url, raw=False):
    req = urllib.request.Request(url, headers=UA)
    for attempt in range(4):
        try:
            with urllib.request.urlopen(req, timeout=30) as res:
                data = res.read()
            break
        except urllib.error.HTTPError as exc:
            if exc.code != 429 or attempt == 3:
                raise
            time.sleep(40)
    return data if raw else json.loads(data)


def clean(text):
    text = re.sub(r"<[^>]+>", "", text or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def players(path):
    """Card names in card order, read from the prototype's RAW table."""
    names = []
    for line in open(path, encoding="utf-8"):
        if line.startswith("    ['"):
            row = ast.literal_eval(line.strip().rstrip(","))
            names.append((row[0] + " " + row[1]).strip())
    return names


def search(query, limit):
    params = dict(action="query", format="json", generator="search", gsrnamespace="6", gsrlimit=str(limit),
                  gsrsearch=query + " filetype:bitmap", prop="imageinfo", iiprop="extmetadata|size|url",
                  iiurlwidth="330")
    data = get("https://commons.wikimedia.org/w/api.php?" + urllib.parse.urlencode(params))
    return list(data.get("query", {}).get("pages", {}).values())


def score(page, must):
    """A number (higher is calmer) and the facts behind it, or None when the file can't be used."""
    info = page.get("imageinfo", [{}])[0]
    meta = info.get("extmetadata", {})
    title = page["title"][5:]
    cats = meta.get("Categories", {}).get("value", "")
    lic = clean(meta.get("LicenseShortName", {}).get("value"))
    if not lic.startswith(ALLOWED) or "NC" in lic or "ND" in lic or "review needed" in cats.lower():
        return None
    if not re.search(r"\.jpe?g$|\.png$", title, re.I) or min(info.get("width", 0), info.get("height", 0)) < 300:
        return None
    about = fold(title) + " | " + fold(cats)
    if must not in about or NOT_A_PHOTO_OF_THEM.search(title):
        return None
    words = title + " " + cats + " " + clean(meta.get("ImageDescription", {}).get("value"))[:300]
    points = 0
    points -= 6 if MATCH.search(title) else 0
    points -= 3 if MATCH.search(words) else 0
    points += 4 if CALM.search(words) else 0
    points += 2 if must in fold(title) else 0
    ratio = info["height"] / info["width"]
    points += 2 if 1.1 <= ratio <= 1.7 else -2 if ratio < 0.8 else 0
    points += 1 if "cropped" in title.lower() else 0
    return points, {"file": title, "thumb": info.get("thumburl"), "w": info.get("thumbwidth"),
                    "h": info.get("thumbheight"),
                    "credit": "%s, %s" % (clean(meta.get("Artist", {}).get("value"))[:60] or "Unknown author", lic)}


def main(proto, photos, stage):
    credits = json.load(open(photos + "/credits.json", encoding="utf-8"))
    found = {}
    for i, name in enumerate(players(proto), start=1):
        current = credits.get(str(i), {}).get("file", "")
        if current and not MATCH.search(current.replace("_", " ")):
            continue  # the card already has a calm photo
        query, must = IDENTITY.get(name, (name, fold(name)))
        try:
            pages = search('"%s"' % query if " " in query else query, 50) + search(query + " portrait", 20)
        except Exception as exc:  # report and carry on; the card keeps the photo it has
            print("%2d ERROR %s: %s" % (i, name, exc))
            continue
        best = {}
        for page in pages:
            got = score(page, must)
            if got and got[0] > 0 and got[1]["thumb"] and got[1]["file"] != current.replace("_", " "):
                best[got[1]["file"]] = got
        ranked = sorted(best.values(), key=lambda g: -g[0])[:KEEP]
        found[i] = {"name": name, "current": current, "candidates": []}
        for rank, (points, cand) in enumerate(ranked, start=1):
            try:
                with open("%s/%d_%d.jpg" % (stage, i, rank), "wb") as f:
                    f.write(get(cand.pop("thumb"), raw=True))
            except Exception as exc:
                print("%2d ERROR download %s: %s" % (i, cand["file"], exc))
                continue
            cand["points"] = points
            cand["rank"] = rank
            found[i]["candidates"].append(cand)
            time.sleep(3)
        print("%2d %s: %d candidates %s" % (i, name, len(found[i]["candidates"]),
                                            [c["file"][:40] for c in found[i]["candidates"]]))
        with open(stage + "/candidates.json", "w", encoding="utf-8") as f:
            json.dump(found, f, ensure_ascii=False, indent=1)
        time.sleep(2)
    print("players searched: %d, with a candidate: %d" % (len(found), sum(1 for v in found.values() if v["candidates"])))


main(*sys.argv[1:4])
