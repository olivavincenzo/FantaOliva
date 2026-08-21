#!/usr/bin/env python3
"""
Sync all 20 teams lineups in initialData.js and store with official starters from sos-fanta/squadre.html
"""
import json, re

# Load data
giocatori = json.loads(open("sos-fanta/giocatori.html", "r", encoding="utf-8").read(), strict=False)
squadre = json.loads(open("sos-fanta/squadre.html", "r", encoding="utf-8").read(), strict=False)
player_strat = json.loads(open("sos-fanta/player-strategia.html", "r", encoding="utf-8").read(), strict=False)

# Map player_id to name
strat_names = {}
for p in player_strat:
    pid = p.get("player_id")
    name = p.get("name")
    if pid and name:
        strat_names[pid] = name

def get_player_name(pid):
    if pid in giocatori and "name" in giocatori[pid]:
        return giocatori[pid]["name"]
    if pid in strat_names:
        return strat_names[pid]
    return pid

print("Loaded giocatori, squadre, player_strat.")

# Formation slot order mapping for starters
FORMATION_SLOT_MAP = {
    '3-5-2': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_9', 'pos_6', 'pos_7', 'pos_8', 'pos_10', 'pos_11'],
    '3-4-2-1': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_8', 'pos_6', 'pos_7', 'pos_9', 'pos_10', 'pos_11'],
    '3-4-3': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_8', 'pos_6', 'pos_7', 'pos_9', 'pos_10', 'pos_11'],
    '4-3-3': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_7', 'pos_6', 'pos_8', 'pos_9', 'pos_11', 'pos_10'],
    '4-2-3-1': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_6', 'pos_7', 'pos_8', 'pos_9', 'pos_10', 'pos_11'],
    '4-4-2': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_6', 'pos_7', 'pos_8', 'pos_9', 'pos_10', 'pos_11'],
    '4-3-1-2': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_7', 'pos_6', 'pos_8', 'pos_9', 'pos_10', 'pos_11'],
    '4-3-2-1': ['pos_1', 'pos_2', 'pos_3', 'pos_4', 'pos_5', 'pos_7', 'pos_6', 'pos_8', 'pos_9', 'pos_10', 'pos_11']
}

for sq in squadre:
    team_code = sq.get("team")
    mod = sq.get("module")
    starters = sq.get("starters", [])
    slot_order = FORMATION_SLOT_MAP.get(mod, [f"pos_{i+1}" for i in range(11)])
    
    print(f"\n--- {team_code} ({mod}) ---")
    for idx, s in enumerate(starters):
        slot = slot_order[idx]
        pid = s.get("player_id")
        name = get_player_name(pid)
        print(f"  {slot}: {name}")
