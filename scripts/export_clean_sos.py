import json

giocatori_raw = open("sos-fanta/giocatori.html", "r", encoding="utf-8").read().strip()
giocatori = json.loads(giocatori_raw, strict=False)

player_strat_raw = open("sos-fanta/player-strategia.html", "r", encoding="utf-8").read().strip()
player_strat = json.loads(player_strat_raw, strict=False)

target_strat_id = "16f4475f-bec4-463a-9ce2-0ad554345a1a"
filtered = [ps for ps in player_strat if ps.get("strategy_id") == target_strat_id]

result = []
for ps in filtered:
    pid = ps["player_id"]
    g = giocatori.get(pid, {})
    name = (g.get("name") or (ps.get("player") or {}).get("name") or "").replace("\n", " ").strip()
    role = (g.get("role") or (ps.get("player") or {}).get("role") or "C").upper()
    fascia = ps.get("fascia")
    price = ps.get("price")
    comment = (ps.get("comment") or "").replace("\n", " ").strip()
    result.append({
        "playerId": pid,
        "name": name,
        "role": role,
        "fascia": fascia,
        "price": price,
        "comment": comment
    })

with open("scripts/clean_sos_fanta.json", "w", encoding="utf-8") as f:
    json.dump(result, f, ensure_ascii=False, indent=2)

print("Saved scripts/clean_sos_fanta.json with", len(result), "players")
