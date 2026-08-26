import json
import re

raw_info = open("sos-fanta/info.json", "r", encoding="utf-8").read().strip()
info = json.loads(raw_info, strict=False)

raw_giocatori = open("sos-fanta/giocatori.json", "r", encoding="utf-8").read().strip()
giocatori = json.loads(raw_giocatori, strict=False)

info_data = info.get("data", [])
print(f"Loaded info items: {len(info_data)}")

def normalize(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower()).strip()

# Labels dictionary
TITOLARITA_LABELS = {
    1: "Non gioca mai",
    2: "Subentra raramente",
    3: "Nelle rotazioni",
    4: "Titolare con concorrenza",
    5: "Titolare inamovibile"
}

AFFIDABILITA_LABELS = {
    1: "Del tutto inaffidabile a livello di voti",
    2: "Profilo altamente incostante",
    3: "Alterna buone prestazioni ad altre deludenti",
    4: "Quasi sempre sufficiente",
    5: "Rendimento super costante"
}

INTEGRITA_LABELS = {
    1: "Molto fragile",
    2: "Ha avuto diversi infortuni",
    3: "Ogni tanto salta qualche partita",
    4: "Pochissimi infortuni",
    5: "È sempre integro"
}

player_indices_map = {}

for item in info_data:
    pid = item.get("player_id")
    g = giocatori.get(pid, {})
    name = (g.get("name") or "").replace("\n", " ").strip()
    role = g.get("role") or "C"
    
    tit = item.get("tit_index") if item.get("tit_index") is not None else (item.get("algo") or {}).get("tit_index", 3)
    aff = item.get("aff_index") if item.get("aff_index") is not None else (item.get("algo") or {}).get("aff_index", 3)
    inf = item.get("inf_index") if item.get("inf_index") is not None else (item.get("algo") or {}).get("inf_index", 3)
    xfmv = item.get("xfmv") if item.get("xfmv") is not None else (item.get("algo") or {}).get("xfmv", None)
    
    tit = int(tit) if tit is not None else 3
    aff = int(aff) if aff is not None else 3
    inf = int(inf) if inf is not None else 3
    
    indices_entry = {
        "playerId": pid,
        "name": name,
        "role": role,
        "titIndex": tit,
        "titDesc": TITOLARITA_LABELS.get(tit, "Nelle rotazioni"),
        "affIndex": aff,
        "affDesc": AFFIDABILITA_LABELS.get(aff, "Alterna buone prestazioni ad altre deludenti"),
        "infIndex": inf,
        "infDesc": INTEGRITA_LABELS.get(inf, "Ogni tanto salta qualche partita"),
        "xfmv": float(xfmv) if xfmv is not None else None
    }
    
    player_indices_map[pid] = indices_entry
    norm_name = normalize(name)
    if norm_name:
        player_indices_map[norm_name] = indices_entry
        player_indices_map[name.lower()] = indices_entry

with open("scripts/raw_player_indices.json", "w", encoding="utf-8") as f:
    json.dump(player_indices_map, f, ensure_ascii=False, indent=2)

print(f"Exported scripts/raw_player_indices.json with {len(player_indices_map)} keys")
