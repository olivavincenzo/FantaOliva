import json
import re

raw_squadre = open("sos-fanta/squadre.json", "r", encoding="utf-8").read().strip()
squadre = json.loads(raw_squadre, strict=False)

raw_giocatori = open("sos-fanta/giocatori.json", "r", encoding="utf-8").read().strip()
giocatori = json.loads(raw_giocatori, strict=False)

fallback_names = {
    "841ead71-8c30-4357-a513-9fbef459f3bb": {"name": "Rrahmani A.", "role": "A"},
    "92bcdaf9-6420-4fb2-b3f5-ab7faca6f35f": {"name": "Viery", "role": "D"},
    "bfba87ce-190b-4eab-a120-44416eb074c5": {"name": "Mitaj", "role": "D"},
    "e0a55f90-4742-4082-9921-d9ab29b25e18": {"name": "Kaiki Bruno", "role": "D"},
    "eb01cf4b-a689-4016-8c30-0e7b058d0210": {"name": "Romero D.", "role": "A"}
}
for k, v in fallback_names.items():
    if k not in giocatori or not giocatori[k].get("name"):
        giocatori[k] = v

team_names = {
    "JUV": {"name": "Juventus", "city": "Torino", "stadium": "Allianz Stadium", "primaryColor": "#ffffff", "secondaryColor": "#000000", "accentColor": "#ffd700"},
    "LAZ": {"name": "Lazio", "city": "Roma", "stadium": "Stadio Olimpico", "primaryColor": "#87ceeb", "secondaryColor": "#ffffff", "accentColor": "#002b49"},
    "BOL": {"name": "Bologna", "city": "Bologna", "stadium": "Renato Dall'Ara", "primaryColor": "#990000", "secondaryColor": "#001f3f", "accentColor": "#ffcc00"},
    "VEN": {"name": "Venezia", "city": "Venezia", "stadium": "Pier Luigi Penzo", "primaryColor": "#ff8800", "secondaryColor": "#006633", "accentColor": "#000000"},
    "COM": {"name": "Como", "city": "Como", "stadium": "Giuseppe Sinigaglia", "primaryColor": "#0047ab", "secondaryColor": "#ffffff", "accentColor": "#002244"},
    "ROM": {"name": "Roma", "city": "Roma", "stadium": "Stadio Olimpico", "primaryColor": "#8e1822", "secondaryColor": "#f0bc42", "accentColor": "#ffffff"},
    "LEC": {"name": "Lecce", "city": "Lecce", "stadium": "Via del Mare", "primaryColor": "#ffd700", "secondaryColor": "#cc0000", "accentColor": "#001f3f"},
    "CAG": {"name": "Cagliari", "city": "Cagliari", "stadium": "Unipol Domus", "primaryColor": "#b22222", "secondaryColor": "#002366", "accentColor": "#ffd700"},
    "GEN": {"name": "Genoa", "city": "Genova", "stadium": "Luigi Ferraris", "primaryColor": "#a00000", "secondaryColor": "#001a40", "accentColor": "#ffffff"},
    "SAS": {"name": "Sassuolo", "city": "Sassuolo", "stadium": "Mapei Stadium", "primaryColor": "#00a859", "secondaryColor": "#000000", "accentColor": "#ffffff"},
    "INT": {"name": "Inter", "city": "Milano", "stadium": "San Siro (Giuseppe Meazza)", "primaryColor": "#00529f", "secondaryColor": "#000000", "accentColor": "#0099ff"},
    "MIL": {"name": "Milan", "city": "Milano", "stadium": "San Siro (Giuseppe Meazza)", "primaryColor": "#e30613", "secondaryColor": "#000000", "accentColor": "#ffffff"},
    "NAP": {"name": "Napoli", "city": "Napoli", "stadium": "Diego Armando Maradona", "primaryColor": "#0080ff", "secondaryColor": "#ffffff", "accentColor": "#002d62"},
    "MON": {"name": "Monza", "city": "Monza", "stadium": "U-Power Stadium", "primaryColor": "#dc143c", "secondaryColor": "#ffffff", "accentColor": "#8b0000"},
    "TOR": {"name": "Torino", "city": "Torino", "stadium": "Olimpico Grande Torino", "primaryColor": "#8b0000", "secondaryColor": "#ffffff", "accentColor": "#ffd700"},
    "ATA": {"name": "Atalanta", "city": "Bergamo", "stadium": "Gewiss Stadium", "primaryColor": "#1e3d7a", "secondaryColor": "#0d1b34", "accentColor": "#00d2ff"},
    "FIO": {"name": "Fiorentina", "city": "Firenze", "stadium": "Artemio Franchi", "primaryColor": "#5a2d82", "secondaryColor": "#ffffff", "accentColor": "#ff0033"},
    "FRO": {"name": "Frosinone", "city": "Frosinone", "stadium": "Benito Stirpe", "primaryColor": "#ffd700", "secondaryColor": "#0055a5", "accentColor": "#ffffff"},
    "PAR": {"name": "Parma", "city": "Parma", "stadium": "Ennio Tardini", "primaryColor": "#ffd700", "secondaryColor": "#003399", "accentColor": "#000000"},
    "UDI": {"name": "Udinese", "city": "Udine", "stadium": "Bluenergy Stadium", "primaryColor": "#000000", "secondaryColor": "#ffffff", "accentColor": "#ffd700"}
}

sos_teams_data = {}

for t in squadre:
    code = t.get("team")
    info = team_names.get(code, {"name": code, "city": "", "stadium": "", "primaryColor": "#1e3d7a", "secondaryColor": "#0d1b34", "accentColor": "#ffffff"})
    
    coach = t.get("coach") or ""
    module = t.get("module") or "4-3-3"
    att = t.get("attack") or (t.get("coachRating") or {}).get("attack") or 3.0
    defense = t.get("defense") or (t.get("coachRating") or {}).get("defense") or 3.0
    coach_img = (t.get("coachRating") or {}).get("coachImage") or ""
    comment = t.get("comment") or ""
    sos_fanta_comment = t.get("sosFantaComment") or ""
    
    # Process starters
    starters = []
    for s in t.get("starters", []):
        pid = s.get("player_id")
        g = giocatori.get(pid, {})
        starters.append({
            "playerId": pid,
            "csvId": s.get("id"),
            "name": g.get("name") or "",
            "role": g.get("role") or ""
        })
        
    # Process rig, pun, corner
    def map_specialists(field_name):
        res = []
        for r in t.get(field_name, []):
            pid = r.get("player_id")
            g = giocatori.get(pid, {})
            name = g.get("name") or ""
            res.append({
                "playerId": pid,
                "name": name,
                "role": g.get("role") or ""
            })
        return res

    rig = map_specialists("rig")
    pun = map_specialists("pun")
    corner = map_specialists("corner")
    
    # Process KeyPoints
    key_points = []
    for kp in t.get("keyPoints", []):
        key_points.append({
            "text": kp.get("text") or "",
            "tone": kp.get("tone") or "neutral"
        })
        
    # Process KeyRoles
    key_roles = []
    for kr in t.get("keyRoles", []):
        key_roles.append({
            "role": kr.get("role") or "",
            "tone": kr.get("tone") or "neutral"
        })

    # Process Ballottaggi
    ballottaggi = []
    for b in t.get("ballottaggi", []):
        duel_players = []
        for p in b.get("players", []):
            pid = p.get("player_id")
            g = giocatori.get(pid, {})
            duel_players.append({
                "playerId": pid,
                "name": g.get("name") or "",
                "role": g.get("role") or "",
                "perc": p.get("perc") or 50
            })
        if len(duel_players) >= 2:
            ballottaggi.append(duel_players)
            
    # Focus players: up, down, young, hidden
    def map_focus(field_name):
        res = []
        for item in t.get(field_name, []):
            pid = item.get("player_id")
            g = giocatori.get(pid, {})
            points = [p.get("text", "") for p in item.get("points", [])]
            res.append({
                "playerId": pid,
                "name": g.get("name") or "",
                "points": points
            })
        return res

    team_entry = {
        "code": code,
        "name": info["name"],
        "city": info["city"],
        "stadium": info["stadium"],
        "primaryColor": info["primaryColor"],
        "secondaryColor": info["secondaryColor"],
        "accentColor": info["accentColor"],
        "coach": coach,
        "coachImage": coach_img,
        "defaultFormation": module,
        "module": module,
        "attackRating": float(att),
        "defenseRating": float(defense),
        "comment": comment,
        "sosFantaComment": sos_fanta_comment,
        "keyPoints": key_points,
        "keyRoles": key_roles,
        "starters": starters,
        "rig": rig,
        "pun": pun,
        "corner": corner,
        "ballottaggi": ballottaggi,
        "up": map_focus("up"),
        "down": map_focus("down"),
        "young": map_focus("young"),
        "hidden": map_focus("hidden")
    }
    
    sos_teams_data[code] = team_entry
    sos_teams_data[info["name"].lower()] = team_entry
    # Common alias
    if code == "JUV":
        sos_teams_data["juventus"] = team_entry
    elif code == "INT":
        sos_teams_data["inter"] = team_entry
    elif code == "MIL":
        sos_teams_data["milan"] = team_entry
    elif code == "ROM":
        sos_teams_data["roma"] = team_entry
    elif code == "NAP":
        sos_teams_data["napoli"] = team_entry
    elif code == "LAZ":
        sos_teams_data["lazio"] = team_entry
    elif code == "ATA":
        sos_teams_data["atalanta"] = team_entry
    elif code == "FIO":
        sos_teams_data["fiorentina"] = team_entry
    elif code == "TOR":
        sos_teams_data["torino"] = team_entry
    elif code == "BOL":
        sos_teams_data["bologna"] = team_entry
    elif code == "GEN":
        sos_teams_data["genoa"] = team_entry
    elif code == "COM":
        sos_teams_data["como"] = team_entry
    elif code == "CAG":
        sos_teams_data["cagliari"] = team_entry
    elif code == "LEC":
        sos_teams_data["lecce"] = team_entry
    elif code == "SAS":
        sos_teams_data["sassuolo"] = team_entry
    elif code == "MON":
        sos_teams_data["monza"] = team_entry
    elif code == "PAR":
        sos_teams_data["parma"] = team_entry
    elif code == "UDI":
        sos_teams_data["udinese"] = team_entry
    elif code == "VEN":
        sos_teams_data["venezia"] = team_entry
    elif code == "FRO":
        sos_teams_data["frosinone"] = team_entry

with open("js/data/sosTeamsData.js", "w", encoding="utf-8") as f:
    f.write("/**\n * Dati Ufficiali Squadre Serie A 2026/27 da SOS Fanta\n */\n\n")
    f.write("export const SOS_TEAMS_DATA = " + json.dumps(sos_teams_data, ensure_ascii=False, indent=2) + ";\n")

print(f"Generated js/data/sosTeamsData.js with {len(sos_teams_data)} keys successfully!")
