"""Fetch each player's Wikipedia lead photo and its licence credit. Usage: fetch_photos.py OUT_DIR"""
import html
import json
import re
import sys
import time
import os
import urllib.error
import urllib.parse
import urllib.request

UA = {"User-Agent": "soccer-cards-prototype/0.1 (hobby project)"}
TITLES = [
    "Lionel Messi", "Cristiano Ronaldo", "Kylian Mbappé", "Erling Haaland", "Mohamed Salah", "Harry Kane",
    "Jude Bellingham", "Lamine Yamal", "Vinícius Júnior", "Virgil van Dijk", "Rodri (footballer, born 1996)",
    "Bukayo Saka", "Pedri", "Jamal Musiala", "Kevin De Bruyne", "Ousmane Dembélé", "Declan Rice", "Phil Foden",
    "Cole Palmer", "Martin Ødegaard", "William Saliba", "Raphinha", "Achraf Hakimi", "Bruno Fernandes",
    "Rúben Dias", "Florian Wirtz", "Joshua Kimmich", "Son Heung-min", "Joško Gvardiol", "Federico Valverde",
    "Alexis Mac Allister", "Julián Álvarez", "Lautaro Martínez", "Victor Osimhen", "Cody Gakpo", "Nicolò Barella",
]

# Players after the first 36 are read from a JSON list of names in card order (argv[2]).
# Wikipedia page titles that differ from the name on the card:
OVERRIDES = {
    "Gabriel": "Gabriel Magalhães", "Vitinha": "Vitinha (footballer, born February 2000)",
    "Ronaldo Nazário": "Ronaldo (Brazilian footballer)", "Alisson": "Alisson Becker",
    "Robert Sánchez": "Robert Sánchez (footballer)",
}
ALLOWED = ("CC0", "CC BY", "Public domain", "PD")  # CC BY covers CC BY-SA. Anything else gets the avatar.
if len(sys.argv) > 2:
    names = json.load(open(sys.argv[2], encoding="utf-8"))
    TITLES += [OVERRIDES.get(n, n) for n in names[len(TITLES):]]


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


def api(host, **params):
    params.update(format="json", redirects="1")
    return get("https://%s/w/api.php?%s" % (host, urllib.parse.urlencode(params)))


def clean(text):
    text = re.sub(r"<[^>]+>", "", text or "")
    return re.sub(r"\s+", " ", html.unescape(text)).strip()


def main(out):
    credits = {}
    if os.path.exists(out + "/credits.json"):
        credits = {int(k): v for k, v in json.load(open(out + "/credits.json")).items()}
    for i, title in enumerate(TITLES, start=1):
        if i in credits:
            continue
        try:
            page = next(iter(api("en.wikipedia.org", action="query", titles=title, prop="pageimages|pageprops",
                                 piprop="thumbnail|name", pithumbsize="330")["query"]["pages"].values()))
            if "disambiguation" in page.get("pageprops", {}) or "thumbnail" not in page:
                print("%2d MISSING %s (%s)" % (i, title, page.get("title")))
                continue
            name = page["pageimage"]
            info = next(iter(api("commons.wikimedia.org", action="query", titles="File:" + name, prop="imageinfo",
                                 iiprop="extmetadata")["query"]["pages"].values()))
            meta = info.get("imageinfo", [{}])[0].get("extmetadata", {})
            artist = clean(meta.get("Artist", {}).get("value"))[:60]
            lic = clean(meta.get("LicenseShortName", {}).get("value"))
            if not lic.startswith(ALLOWED) or "NC" in lic or "ND" in lic:
                print("%2d NO-LICENCE %s %s (%s)" % (i, title, name, lic or "none"))
                continue
            with open("%s/%d.jpg" % (out, i), "wb") as f:
                f.write(get(page["thumbnail"]["source"], raw=True))
            credits[i] = {"credit": "%s, %s" % (artist or "Unknown author", lic), "file": name,
                          "w": page["thumbnail"]["width"], "h": page["thumbnail"]["height"]}
            print("%2d ok %s | %s | %s | %dx%d" % (i, page["title"], artist, lic, page["thumbnail"]["width"], page["thumbnail"]["height"]))
        except Exception as exc:  # report and carry on; the card falls back to the avatar
            print("%2d ERROR %s: %s" % (i, title, exc))
        time.sleep(4)
    with open(out + "/credits.json", "w") as f:
        json.dump(credits, f, ensure_ascii=False, indent=1)
    print("photos: %d of %d" % (len(credits), len(TITLES)))


main(sys.argv[1])
