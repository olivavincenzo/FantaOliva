import json
import re

# 1. Load sos-fanta files
giocatori_raw = open("sos-fanta/giocatori.html", "r", encoding="utf-8").read().strip()
giocatori = json.loads(giocatori_raw, strict=False)

player_strat_raw = open("sos-fanta/player-strategia.html", "r", encoding="utf-8").read().strip()
player_strat = json.loads(player_strat_raw, strict=False)

target_strat_id = "16f4475f-bec4-463a-9ce2-0ad554345a1a"
filtered = [ps for ps in player_strat if ps.get("strategy_id") == target_strat_id]
print(f"Filtered strategy players: {len(filtered)}")

FASCE_NAMES = {
    1: "SUPER TOP",
    2: "TOP",
    3: "SEMITOP",
    4: "SOTTO AI SEMITOP",
    5: "FASCIA ALTA",
    6: "JOLLY 1ª FASCIA",
    7: "POSSIBILI SORPRESE",
    8: "FASCIA MEDIA",
    9: "INFORTUNATI",
    10: "SCOMMESSE",
    11: "SOPRA AI LOW COST",
    12: "JOLLY 2ª FASCIA",
    13: "LOW COST 1ª FASCIA",
    14: "LOW COST 2ª FASCIA",
    15: "LEGHE NUMEROSE",
    16: "JOLLY 3ª FASCIA",
    17: "JOLLY 4ª FASCIA",
    18: "A RISCHIO",
    19: "DA EVITARE",
    20: "MERCATO"
}

FASCE_COLORS = {
    1: "#f59e0b",
    2: "#38bdf8",
    3: "#a855f7",
    4: "#818cf8",
    5: "#4ade80",
    6: "#fb923c",
    7: "#34d399",
    8: "#22d3ee",
    9: "#f43f5e",
    10: "#ec4899",
    11: "#a3e635",
    12: "#f97316",
    13: "#94a3b8",
    14: "#64748b",
    15: "#a1a1aa",
    16: "#d97706",
    17: "#b45309",
    18: "#e11d48",
    19: "#ef4444",
    20: "#71717a"
}

tiers_by_role = {"P": [], "D": [], "C": [], "A": []}
used_fasce_by_role = {"P": set(), "D": set(), "C": set(), "A": set()}

for ps in filtered:
    pid = ps["player_id"]
    g = giocatori.get(pid, {})
    role = (g.get("role") or (ps.get("player") or {}).get("role") or "C").upper()
    fascia = ps.get("fascia")
    if role in used_fasce_by_role and fascia:
        used_fasce_by_role[role].add(fascia)

for r in ["P", "D", "C", "A"]:
    sorted_fasce = sorted(list(used_fasce_by_role[r]))
    tiers_by_role[r] = [
        {
            "id": f"tier_{r.lower()}_{f_num}",
            "name": FASCE_NAMES.get(f_num, f"Fascia {f_num}"),
            "color": FASCE_COLORS.get(f_num, "#38bdf8")
        }
        for f_num in sorted_fasce
    ]

# Extract initialData.js players
initial_data_content = open("js/data/initialData.js", "r", encoding="utf-8").read()

# Let extract team players and catalog players from initialData.js using regex or json
def normalize(s):
    return re.sub(r'[^a-z0-9]', '', (s or "").lower()).strip()

assignments = {}
comments = {}
prices = {}

for ps in filtered:
    pid = ps["player_id"]
    g = giocatori.get(pid, {})
    raw_name = (g.get("name") or (ps.get("player") or {}).get("name") or "").replace("\n", " ").strip()
    role = (g.get("role") or (ps.get("player") or {}).get("role") or "C").upper()
    fascia = ps.get("fascia")
    if not fascia:
        continue
    tier_id = f"tier_{role.lower()}_{fascia}"
    norm_name = normalize(raw_name)
    if not norm_name:
        continue

    assignments[raw_name.lower()] = tier_id
    assignments[norm_name] = tier_id
    if ps.get("comment"):
        comments[norm_name] = ps["comment"].replace("\n", " ").strip()
    if ps.get("price"):
        prices[norm_name] = ps["price"]

# Also match with player IDs and names found in initialData.js
# Let find all { id: '...', name: '...', role: '...', csvId: ... } in initialData.js
player_blocks = re.findall(r"\{\s*id:\s*'([^']+)',\s*name:\s*'([^']+)'(?:,\s*role:\s*'([^']+)')?(?:,\s*csvId:\s*([0-9]+))?", initial_data_content)
matched_count = 0
for pid, pname, prole, pcsv in player_blocks:
    norm_p = normalize(pname)
    # Check if norm_p matches any mapped assignment
    matched_tier = None
    if norm_p in assignments:
        matched_tier = assignments[norm_p]
    else:
        # fuzzy containment if length >= 4
        for k in assignments:
            if len(k) >= 4 and (k == norm_p or (len(norm_p) >= 4 and (k in norm_p or norm_p in k))):
                matched_tier = assignments[k]
                break
    if matched_tier:
        assignments[pid] = matched_tier
        assignments[pname.lower().strip()] = matched_tier
        assignments[norm_p] = matched_tier
        if pcsv:
            assignments[str(pcsv)] = matched_tier
        matched_count += 1

print(f"Matched initialData items: {matched_count}")
print(f"Total assignments keys: {len(assignments)}")

strategy1 = {
    "id": "strat_1",
    "name": "Guida all'Asta 2026/27",
    "createdAt": 1724300000000,
    "tiersByRole": tiers_by_role,
    "assignments": assignments
}

with open("js/data/sosStrategy1.js", "w", encoding="utf-8") as f:
    f.write("// Strategia 1 SOS Fanta - Guida all'Asta 2026/27\n")
    f.write("export const SOS_STRATEGY_1 = " + json.dumps(strategy1, ensure_ascii=False, indent=2) + ";\n")

print("Successfully written js/data/sosStrategy1.js!")
