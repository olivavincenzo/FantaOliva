#!/usr/bin/env python3
"""
Build initialData.js directly from Fantalab APIs and SOS Fanta data.
Eliminates any reliance on static CSV files.
"""

import os
import json
import re

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
SOS_DIR = os.path.join(PROJECT_ROOT, "sos-fanta")
OUTPUT_FILE = os.path.join(PROJECT_ROOT, "js/data/initialData.js")

TEAM_METADATA = {
    "JUV": {"id": "juventus", "name": "Juventus", "city": "Torino", "stadium": "Allianz Stadium", "primaryColor": "#ffffff", "secondaryColor": "#000000", "accentColor": "#ffd700"},
    "LAZ": {"id": "lazio", "name": "Lazio", "city": "Roma", "stadium": "Stadio Olimpico", "primaryColor": "#87ceeb", "secondaryColor": "#ffffff", "accentColor": "#002b49"},
    "BOL": {"id": "bologna", "name": "Bologna", "city": "Bologna", "stadium": "Renato Dall'Ara", "primaryColor": "#990000", "secondaryColor": "#001f3f", "accentColor": "#ffcc00"},
    "VEN": {"id": "venezia", "name": "Venezia", "city": "Venezia", "stadium": "Pier Luigi Penzo", "primaryColor": "#ff8800", "secondaryColor": "#006633", "accentColor": "#000000"},
    "COM": {"id": "como", "name": "Como", "city": "Como", "stadium": "Giuseppe Sinigaglia", "primaryColor": "#0047ab", "secondaryColor": "#ffffff", "accentColor": "#002244"},
    "ROM": {"id": "roma", "name": "Roma", "city": "Roma", "stadium": "Stadio Olimpico", "primaryColor": "#8e1822", "secondaryColor": "#f0bc42", "accentColor": "#ffffff"},
    "LEC": {"id": "lecce", "name": "Lecce", "city": "Lecce", "stadium": "Via del Mare", "primaryColor": "#ffd700", "secondaryColor": "#cc0000", "accentColor": "#001f3f"},
    "CAG": {"id": "cagliari", "name": "Cagliari", "city": "Cagliari", "stadium": "Unipol Domus", "primaryColor": "#b22222", "secondaryColor": "#002366", "accentColor": "#ffd700"},
    "GEN": {"id": "genoa", "name": "Genoa", "city": "Genova", "stadium": "Luigi Ferraris", "primaryColor": "#a00000", "secondaryColor": "#001a40", "accentColor": "#ffffff"},
    "SAS": {"id": "sassuolo", "name": "Sassuolo", "city": "Sassuolo", "stadium": "Mapei Stadium", "primaryColor": "#00a859", "secondaryColor": "#000000", "accentColor": "#ffffff"},
    "INT": {"id": "inter", "name": "Inter", "city": "Milano", "stadium": "San Siro (Giuseppe Meazza)", "primaryColor": "#00529f", "secondaryColor": "#000000", "accentColor": "#0099ff"},
    "MIL": {"id": "milan", "name": "Milan", "city": "Milano", "stadium": "San Siro (Giuseppe Meazza)", "primaryColor": "#e30613", "secondaryColor": "#000000", "accentColor": "#ffffff"},
    "NAP": {"id": "napoli", "name": "Napoli", "city": "Napoli", "stadium": "Diego Armando Maradona", "primaryColor": "#0080ff", "secondaryColor": "#ffffff", "accentColor": "#002d62"},
    "MON": {"id": "monza", "name": "Monza", "city": "Monza", "stadium": "U-Power Stadium", "primaryColor": "#dc143c", "secondaryColor": "#ffffff", "accentColor": "#8b0000"},
    "TOR": {"id": "torino", "name": "Torino", "city": "Torino", "stadium": "Olimpico Grande Torino", "primaryColor": "#8b0000", "secondaryColor": "#ffffff", "accentColor": "#ffd700"},
    "ATA": {"id": "atalanta", "name": "Atalanta", "city": "Bergamo", "stadium": "Gewiss Stadium", "primaryColor": "#1e3d7a", "secondaryColor": "#0d1b34", "accentColor": "#00d2ff"},
    "FIO": {"id": "fiorentina", "name": "Fiorentina", "city": "Firenze", "stadium": "Artemio Franchi", "primaryColor": "#5a2d82", "secondaryColor": "#ffffff", "accentColor": "#ff0033"},
    "FRO": {"id": "frosinone", "name": "Frosinone", "city": "Frosinone", "stadium": "Benito Stirpe", "primaryColor": "#ffd700", "secondaryColor": "#0055a5", "accentColor": "#ffffff"},
    "PAR": {"id": "parma", "name": "Parma", "city": "Parma", "stadium": "Ennio Tardini", "primaryColor": "#ffd700", "secondaryColor": "#003399", "accentColor": "#000000"},
    "UDI": {"id": "udinese", "name": "Udinese", "city": "Udine", "stadium": "Bluenergy Stadium", "primaryColor": "#000000", "secondaryColor": "#ffffff", "accentColor": "#ffd700"}
}

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

def normalize(s):
    return re.sub(r"[^a-z0-9]", "", (s or "").lower()).strip()

def map_pitch_role(classic_role, mantra_roles):
    m_str = ";".join(mantra_roles) if isinstance(mantra_roles, list) else (mantra_roles or "")
    if classic_role == "P" or "Por" in m_str:
        return "POR"
    if classic_role == "D":
        if "Dd" in m_str:
            return "TD"
        if "Ds" in m_str:
            return "TS"
        return "DC"
    if classic_role == "C":
        if "M" in m_str or "C" in m_str:
            return "CC"
        if "T" in m_str:
            return "TRQ"
        if "W" in m_str:
            return "ALA"
        return "CC"
    if classic_role == "A":
        if "Pc" in m_str:
            return "PC"
        if "A" in m_str:
            return "ATT"
        return "ATT"
    return "CC"

def build():
    # 1. Load data
    players_list_file = os.path.join(SOS_DIR, "players_list.json")
    if not os.path.exists(players_list_file):
        print(f"Error: {players_list_file} not found. Run sync_sos_data.py first.")
        return

    with open(players_list_file, "r", encoding="utf-8") as f:
        pl_data = json.load(f)
    raw_players = pl_data.get("players", []) if isinstance(pl_data, dict) else pl_data

    prices_file = os.path.join(SOS_DIR, "prices.json")
    prices_map = {}
    if os.path.exists(prices_file):
        with open(prices_file, "r", encoding="utf-8") as f:
            pr_data = json.load(f)
            for pr in pr_data:
                prices_map[pr.get("player_id")] = pr

    ratings_file = os.path.join(SOS_DIR, "info.json")
    ratings_map = {}
    if os.path.exists(ratings_file):
        with open(ratings_file, "r", encoding="utf-8") as f:
            rat_data = json.load(f)
            for item in rat_data.get("data", []):
                ratings_map[item.get("player_id")] = item

    history_file = os.path.join(SOS_DIR, "giocatori.json")
    history_map = {}
    if os.path.exists(history_file):
        with open(history_file, "r", encoding="utf-8") as f:
            history_map = json.load(f)

    squadre_file = os.path.join(SOS_DIR, "squadre.json")
    squadre_data = []
    if os.path.exists(squadre_file):
        with open(squadre_file, "r", encoding="utf-8") as f:
            squadre_data = json.load(f)

    strat_file = os.path.join(SOS_DIR, "player-strategia.json")
    strat_map = {}
    if os.path.exists(strat_file):
        with open(strat_file, "r", encoding="utf-8") as f:
            for s in json.load(f):
                strat_map[s.get("player_id")] = s

    # 2. Build full player objects
    catalog_players = []
    player_by_id = {}
    player_by_fantalab_id = {}
    team_players_map = {k: [] for k in TEAM_METADATA.keys()}

    for p in raw_players:
        pid_fantalab = p.get("player_id") or p.get("fantalab_id")
        fanta_id = str(p.get("fantacalcio_id") or "")
        name = (p.get("name") or "").strip()
        full_name = (p.get("full_name") or name).strip()
        team_short = (p.get("team_short") or "SVI").upper()
        team_info = TEAM_METADATA.get(team_short, {"id": team_short.lower(), "name": p.get("team_name") or team_short})
        team_id = team_info["id"]
        team_name = team_info["name"]
        
        classic_role = p.get("role") or "C"
        mantra_roles = p.get("mantra_roles") or []
        mantra_str = ";".join(mantra_roles)
        pitch_role = map_pitch_role(classic_role, mantra_roles)
        
        photo_url = p.get("player_image") or ""
        
        # Unique app player ID
        app_id = f"{team_id}_{normalize(name)}_{fanta_id}" if fanta_id else f"{team_id}_{normalize(name)}_{pid_fantalab[:8]}"
        
        # Ratings and Prices
        rat = ratings_map.get(pid_fantalab, {})
        pr = prices_map.get(pid_fantalab, {})
        strat_entry = strat_map.get(pid_fantalab, {})
        
        qt_i = rat.get("quotazione_start") or 1
        qt_a = pr.get("price") or qt_i
        fvm = round(qt_a * 3.2) if qt_a > 1 else 1
        
        # Historical stats (season 25/26 preferred)
        hist = history_map.get(pid_fantalab, {})
        stats_list = hist.get("stats", [])
        s25 = next((s for s in reversed(stats_list) if s.get("season") == "s_25_26"), {})
        if not s25 and stats_list:
            s25 = stats_list[-1]
            
        presenze = s25.get("presenze", 0) or 0
        mv = s25.get("mv") or 6.0
        fmv = s25.get("fmv") or 6.0
        gf = s25.get("gf", 0) or 0
        gs = s25.get("gs", 0) or 0
        rp = s25.get("rp", 0) or 0
        r_plus = s25.get("r_plus", 0) or 0
        r_minus = s25.get("r_minus", 0) or 0
        assist = s25.get("assist", 0) or 0
        amm = s25.get("amm", 0) or 0
        esp = s25.get("esp", 0) or 0
        au = s25.get("autogol", 0) or 0
        starts = s25.get("starts_eleven", 0) or 0
        
        titolarita_perc = min(100, round((starts / 38) * 100)) if starts > 0 else (min(100, round((presenze / 38) * 100)) if presenze > 0 else 50)
        appetibilita = min(99, max(20, round(float(fmv) * 12 + float(rat.get("xfmv", fmv) or fmv) * 2)))

        player_obj = {
            "id": app_id,
            "csvId": fanta_id,
            "fantalabId": pid_fantalab,
            "name": name,
            "displayName": name,
            "fullName": full_name,
            "teamName": team_name,
            "teamId": team_id,
            "teamShort": team_short,
            "role": pitch_role,
            "classicRole": classic_role,
            "mantraRole": mantra_str,
            "fantaRole": classic_role,
            "photoUrl": photo_url,
            "playerImage": photo_url,
            "appetibilita": appetibilita,
            "status": "tit_sicuro" if titolarita_perc >= 75 else ("in_ballottaggio" if titolarita_perc >= 40 else "panchina"),
            "isAvailable": True,
            "isPenaltyTaker": False,
            "isFreeKickTaker": False,
            "isCornerTaker": False,
            "rigorista": False,
            "punizioni": False,
            "corner": False,
            "positionNotes": "",
            "fantaComment": strat_entry.get("comment", ""),
            "quotazioni": {
                "qtA": qt_a,
                "qtI": qt_i,
                "diff": qt_a - qt_i,
                "qtAM": qt_a,
                "qtIM": qt_i,
                "diffM": qt_a - qt_i,
                "fvm": fvm,
                "fvmM": fvm,
                "classic_8_mod_median": rat.get("classic_8_mod_median", 0),
                "classic_10_mod_median": rat.get("classic_10_mod_median", 0),
                "classic_12_mod_median": rat.get("classic_12_mod_median", 0)
            },
            "stats": {
                "titolarita": titolarita_perc,
                "fantamedia": float(fmv) if fmv else 6.0,
                "mediaVoto": float(mv) if mv else 6.0,
                "pv": presenze,
                "presenze": presenze,
                "gol": gf,
                "gf": gf,
                "gs": gs,
                "golSubiti": gs,
                "rp": rp,
                "rc": 0,
                "rPlus": r_plus,
                "rMinus": r_minus,
                "rigoriSegnati": r_plus,
                "rigoriSbagliati": r_minus,
                "assist": assist,
                "ass": assist,
                "ammonizioni": amm,
                "amm": amm,
                "espulsioni": esp,
                "esp": esp,
                "au": au
            },
            "substitutes": []
        }
        
        catalog_players.append(player_obj)
        player_by_id[app_id] = player_obj
        player_by_fantalab_id[pid_fantalab] = player_obj
        if fanta_id:
            player_by_fantalab_id[fanta_id] = player_obj
        if team_short in team_players_map:
            team_players_map[team_short].append(player_obj)

    print(f"Loaded {len(catalog_players)} total players into catalog.")

    # 3. Build INITIAL_TEAMS with starters and tactical slots
    initial_teams = []
    
    # Map teams from squadre.html
    squadre_by_code = {sq.get("team"): sq for sq in squadre_data}
    
    for code, meta in TEAM_METADATA.items():
        sq = squadre_by_code.get(code, {})
        team_id = meta["id"]
        team_name = meta["name"]
        mod = sq.get("module") or "4-3-3"
        coach = sq.get("coach") or ""
        
        # Specialists
        rig_ids = [r.get("player_id") for r in sq.get("rig", []) if r.get("player_id")]
        pun_ids = [r.get("player_id") for r in sq.get("pun", []) if r.get("player_id")]
        cor_ids = [r.get("player_id") for r in sq.get("corner", []) if r.get("player_id")]
        
        # Starters & Bench
        starters_list = sq.get("starters", [])
        slot_order = FORMATION_SLOT_MAP.get(mod, [f"pos_{i+1}" for i in range(11)])
        
        lineup_dict = {}
        starter_app_ids = set()
        
        # Place starters into lineup
        for idx, st in enumerate(starters_list[:11]):
            slot_id = slot_order[idx] if idx < len(slot_order) else f"pos_{idx+1}"
            pid = st.get("player_id")
            p_obj = player_by_fantalab_id.get(pid)
            if not p_obj:
                # search in team players
                for tp in team_players_map.get(code, []):
                    if normalize(tp["name"]) == normalize(st.get("name")):
                        p_obj = tp
                        break
            if p_obj:
                starter_app_ids.add(p_obj["id"])
                p_copy = dict(p_obj)
                p_copy["slotId"] = slot_id
                p_copy["status"] = "tit_sicuro"
                if pid in rig_ids:
                    p_copy["rigorista"] = True
                    p_copy["isPenaltyTaker"] = True
                if pid in pun_ids:
                    p_copy["punizioni"] = True
                    p_copy["isFreeKickTaker"] = True
                if pid in cor_ids:
                    p_copy["corner"] = True
                    p_copy["isCornerTaker"] = True
                lineup_dict[slot_id] = p_copy

        # Bench: all other players of this team
        bench_list = []
        for tp in team_players_map.get(code, []):
            if tp["id"] not in starter_app_ids:
                p_copy = dict(tp)
                p_copy["slotId"] = None
                p_copy["status"] = "panchina"
                if tp.get("fantalabId") in rig_ids:
                    p_copy["rigorista"] = True
                    p_copy["isPenaltyTaker"] = True
                if tp.get("fantalabId") in pun_ids:
                    p_copy["punizioni"] = True
                    p_copy["isFreeKickTaker"] = True
                if tp.get("fantalabId") in cor_ids:
                    p_copy["corner"] = True
                    p_copy["isCornerTaker"] = True
                bench_list.append(p_copy)

        # Build substitutes references
        for slot_id, p_starter in lineup_dict.items():
            s_role = p_starter.get("classicRole")
            subs = [b["id"] for b in bench_list if b.get("classicRole") == s_role][:3]
            p_starter["substitutes"] = subs

        team_obj = {
            "id": team_id,
            "name": team_name,
            "shortName": code,
            "city": meta["city"],
            "stadium": meta["stadium"],
            "coach": coach,
            "primaryColor": meta["primaryColor"],
            "secondaryColor": meta["secondaryColor"],
            "accentColor": meta["accentColor"],
            "defaultFormation": mod,
            "lineup": lineup_dict,
            "bench": bench_list
        }
        initial_teams.append(team_obj)

    print(f"Generated {len(initial_teams)} teams with official lineups.")

    # 4. Write initialData.js
    header = """/**
 * Database iniziale completo di tutte le 20 squadre di Serie A (Stagione 2026/2027),
 * compilato automaticamente da API Fantalab e SOS Fanta con foto HD, ruoli Mantra e statistiche.
 */

// Helper per generare SVG badge stilizzati per ciascuna squadra con contrasto nitido
export function getTeamBadgeSvg(code, primaryColor, secondaryColor, accentColor = "#ffffff", uniqueSuffix = "") {
  const safeCode = (code || "FC").toUpperCase();
  const safeId = safeCode.toLowerCase().replace(/[^a-z0-9]/g, "") + "_" + (uniqueSuffix || Math.random().toString(36).substring(2, 6));
  
  const isLight = primaryColor.toLowerCase() === "#ffffff" || primaryColor.toLowerCase() === "#f9d616" || primaryColor.toLowerCase() === "#ffcc00" || primaryColor.toLowerCase() === "#f0bc42";
  const textColor = isLight ? "#0a0e17" : "#ffffff";
  const strokeAttr = isLight ? 'stroke="#ffffff" stroke-width="0.6"' : 'stroke="#000000" stroke-width="0.8"';

  return `<svg viewBox="0 0 100 100" class="team-crest-svg" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="grad_${safeId}" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${primaryColor}" />
          <stop offset="100%" stop-color="${secondaryColor}" />
        </linearGradient>
        <filter id="shadow_${safeId}" x="-10%" y="-10%" width="120%" height="120%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000000" flood-opacity="0.6"/>
        </filter>
      </defs>
      <path d="M50,5 L88,18 C88,58 50,92 50,92 C50,92 12,58 12,18 Z" 
            fill="url(#grad_${safeId})" stroke="${accentColor}" stroke-width="3" filter="url(#shadow_${safeId})"/>
      <path d="M50,11 L81,22 C81,53 50,83 50,83 C50,83 19,53 19,22 Z" 
            fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="1.2" stroke-dasharray="2 1.5"/>
      <text x="50" y="58" font-family="Rajdhani, Outfit, sans-serif" font-weight="900" font-size="24" 
            fill="${textColor}" text-anchor="middle" letter-spacing="1" 
            style="filter: drop-shadow(0 2px 4px rgba(0,0,0,0.8));" ${strokeAttr}>${safeCode}</text>
      <circle cx="50" cy="22" r="3" fill="${accentColor}" stroke="#ffffff" stroke-width="0.8"/>
    </svg>`.trim();
}

"""

    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.write(header)
        f.write("export const INITIAL_TEAMS = " + json.dumps(initial_teams, ensure_ascii=False, indent=2) + ";\n\n")
        f.write("export const CSV_PLAYER_CATALOG = " + json.dumps(catalog_players, ensure_ascii=False, indent=2) + ";\n")

    print(f"Successfully written {OUTPUT_FILE} with {len(catalog_players)} players!")

if __name__ == "__main__":
    build()
