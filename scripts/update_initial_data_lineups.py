#!/usr/bin/env python3
"""
Updates initialData.js so that every team has its official starters placed in the exact tactical slots of its defaultFormation.
"""
import json, re

giocatori = json.loads(open("sos-fanta/giocatori.html", "r", encoding="utf-8").read(), strict=False)
squadre = json.loads(open("sos-fanta/squadre.html", "r", encoding="utf-8").read(), strict=False)
player_strat = json.loads(open("sos-fanta/player-strategia.html", "r", encoding="utf-8").read(), strict=False)

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

# Read initialData.js
with open("js/data/initialData.js", "r", encoding="utf-8") as f:
    js_text = f.read()

# Load all players in initialData to map by name/csvId/id
# We can do this programmatically or in node
print("InitialData loaded.")
