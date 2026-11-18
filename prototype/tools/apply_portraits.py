"""Put the staged photos a person chose into the photo folder, with their credits.

Usage: apply_portraits.py PHOTOS_DIR STAGE_DIR ID:RANK [ID:RANK ...]

ID is the card number and RANK is the candidate number from find_portraits.py (STAGE_DIR/ID_RANK.jpg).
Each chosen photo replaces PHOTOS_DIR/ID.jpg and its entry in credits.json.
"""
import json
import shutil
import subprocess
import sys


def main(photos, stage, picks):
    found = json.load(open(stage + "/candidates.json", encoding="utf-8"))
    credits = json.load(open(photos + "/credits.json", encoding="utf-8"))
    for pick in picks:
        card, rank = pick.split(":")
        cand = next(c for c in found[card]["candidates"] if c["rank"] == int(rank))
        src, dst = "%s/%s_%s.jpg" % (stage, card, rank), "%s/%s.jpg" % (photos, card)
        if open(src, "rb").read(4) == b"\x89PNG":  # a PNG thumbnail: the cards load JPEG files
            subprocess.run(["sips", "-s", "format", "jpeg", src, "--out", dst], check=True, capture_output=True)
        else:
            shutil.copyfile(src, dst)
        credits[card] = {"credit": cand["credit"], "file": cand["file"].replace(" ", "_"), "w": cand["w"], "h": cand["h"]}
        print("%s %s <- %s | %s" % (card, found[card]["name"], cand["file"], cand["credit"]))
    with open(photos + "/credits.json", "w", encoding="utf-8") as f:
        json.dump(credits, f, ensure_ascii=False, indent=1)


main(sys.argv[1], sys.argv[2], sys.argv[3:])
