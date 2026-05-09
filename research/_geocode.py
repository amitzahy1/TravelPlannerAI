#!/usr/bin/env python3
"""
Geocode every restaurant/attraction entry in the research JSON files using
the free Photon API (komoot). Replaces approximate lat/lng with the
service's pin and adds a real googleMapsUrl pointing at those coords.

Usage: python3 research/_geocode.py
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path


def photon_search(name: str, city: str, country: str = "Thailand") -> dict | None:
    q = f"{name} {city} {country}"
    url = "https://photon.komoot.io/api?" + urllib.parse.urlencode({
        "q": q,
        "limit": 1,
        "lang": "en",
    })
    try:
        with urllib.request.urlopen(url, timeout=8) as r:
            data = json.loads(r.read().decode("utf-8"))
        feats = data.get("features") or []
        if not feats:
            return None
        f = feats[0]
        coords = f.get("geometry", {}).get("coordinates")
        props = f.get("properties", {})
        if not coords or len(coords) != 2:
            return None
        return {
            "lat": coords[1],
            "lng": coords[0],
            "verified_name": props.get("name"),
            "verified_city": props.get("city"),
            "verified_country": props.get("country"),
            "osm_id": f"{props.get('osm_type','')}:{props.get('osm_id','')}",
            "type": props.get("type"),
        }
    except Exception as e:
        print(f"  ! Photon error for {name!r}: {e}", file=sys.stderr)
        return None


def city_for_entry(entry: dict, default_city: str) -> str:
    loc = entry.get("location") or ""
    # Pull last 2 comma-separated segments — usually "<district>, <city>, <country>"
    if "," in loc:
        parts = [p.strip() for p in loc.split(",") if p.strip()]
        for cand in reversed(parts):
            if cand.lower() not in ("thailand",) and not cand.replace(" ", "").isdigit():
                return cand
    return default_city


def google_maps_url(lat: float, lng: float) -> str:
    return f"https://www.google.com/maps/?q={lat:.6f},{lng:.6f}"


def process_file(path: Path, default_city: str) -> None:
    print(f"\n=== {path} (default_city={default_city}) ===")
    data = json.loads(path.read_text(encoding="utf-8"))
    entries = data.get("restaurants") or data.get("attractions") or []
    key = "restaurants" if "restaurants" in data else "attractions"
    updated = 0
    skipped = 0
    for i, entry in enumerate(entries):
        name = entry.get("name") or entry.get("nameEnglish")
        if not name:
            skipped += 1
            continue
        city = city_for_entry(entry, default_city)
        result = photon_search(name, city)
        if result:
            entry["lat"] = round(result["lat"], 6)
            entry["lng"] = round(result["lng"], 6)
            entry["googleMapsUrl"] = google_maps_url(result["lat"], result["lng"])
            updated += 1
            print(f"  [{i+1}/{len(entries)}] {name} → {entry['lat']},{entry['lng']}")
        else:
            # Keep approximate coords if we had any; build URL from them
            if entry.get("lat") is not None and entry.get("lng") is not None:
                entry["googleMapsUrl"] = google_maps_url(entry["lat"], entry["lng"])
            else:
                entry.pop("googleMapsUrl", None)
            print(f"  [{i+1}/{len(entries)}] {name} → no match (kept approximate)")
            skipped += 1
        time.sleep(0.6)  # be gentle on Photon's free service
    data[key] = entries
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"  Updated: {updated} / {len(entries)}, skipped: {skipped}")


if __name__ == "__main__":
    here = Path(__file__).parent
    targets = [
        (here / "bangkok-restaurants.json", "Bangkok"),
        (here / "pattaya-restaurants.json", "Pattaya"),
        (here / "kohchang-restaurants.json", "Ko Chang"),
        (here / "bangkok-attractions.json", "Bangkok"),
        (here / "pattaya-attractions.json", "Pattaya"),
        (here / "kohchang-attractions.json", "Ko Chang"),
    ]
    for path, city in targets:
        if path.exists():
            process_file(path, city)
