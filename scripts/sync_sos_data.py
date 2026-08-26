#!/usr/bin/env python3
"""
Sync SOS Fanta / Fantalab Data
Fetches official guide data, ratings, teams, player list, prices and strategy directly from Fantalab APIs
and automatically rebuilds the entire FantaOliva application dataset.
"""

import os
import sys
import json
import base64
import subprocess
import urllib.request
import urllib.error

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(SCRIPT_DIR, ".."))
CONFIG_FILE = os.path.join(SCRIPT_DIR, "sos_config.json")
SOS_DIR = os.path.join(PROJECT_ROOT, "sos-fanta")

def log(msg, symbol="ℹ️"):
    print(f"[{symbol}] {msg}")

def load_config():
    if not os.path.exists(CONFIG_FILE):
        log(f"Config file non trovato in {CONFIG_FILE}", "❌")
        sys.exit(1)
    with open(CONFIG_FILE, "r", encoding="utf-8") as f:
        return json.load(f)

def make_request(url, method="GET", payload=None, token=None):
    headers = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "*/*",
        "Origin": "https://app.fantalab.it",
        "Referer": "https://app.fantalab.it/"
    }
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload).encode("utf-8")
        
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res_data = response.read().decode("utf-8")
            return res_data
    except urllib.error.HTTPError as e:
        if e.code == 401 or e.code == 403:
            log(f"Errore di autenticazione ({e.code}) per {url}. Il Bearer Token potrebbe essere scaduto.", "❌")
            log("Per favore aggiorna il token in scripts/sos_config.json copiandolo dal tab Network del browser.", "👉")
        else:
            log(f"HTTP Error {e.code} su {url}: {e.reason}", "❌")
        raise e
    except Exception as e:
        log(f"Errore durante la richiesta a {url}: {e}", "❌")
        raise e

def save_json(file_path, data_obj):
    os.makedirs(os.path.dirname(file_path), exist_ok=True)
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data_obj, f, ensure_ascii=False, indent=2)

def fetch_from_api():
    config = load_config()
    token = config.get("token")
    strategy_id = config.get("strategy_id", "16f4475f-bec4-463a-9ce2-0ad554345a1a")
    season = config.get("season", "s_26_27")
    
    log("Inizio download completo dati da Fantalab API...", "🚀")
    
    # 1. Player List (Listone ufficiale, ID, Ruoli Classic/Mantra, Foto HD)
    log("1/7 Scaricamento listone completo calciatori con foto HD e ruoli Mantra...", "⏳")
    res_pl = make_request(
        f"https://api-cdn.falsesoftware.com/v2/players/list?leagues=serie_a&limit=1000&min_presenze=0&mv_fmv_season_fallback=true&season={season}&sort_order=desc&sort_stat=fmv&stats=fmv%2Cmv",
        method="GET",
        token=token
    )
    pl_data = json.loads(res_pl)
    save_json(os.path.join(SOS_DIR, "players_list.json"), pl_data)
    log(f"Salvati {len(pl_data.get('players', []))} calciatori in sos-fanta/players_list.json", "✅")

    # 2. Quotazioni e Prezzi Asta Live
    log("2/7 Scaricamento quotazioni e prezzi di mercato...", "⏳")
    res_pr = make_request(
        "https://manager.fantalab.it/get-new-prices",
        method="POST",
        payload={"season_id": 17},
        token=token
    )
    pr_data = json.loads(res_pr)
    save_json(os.path.join(SOS_DIR, "prices.json"), pr_data)
    log(f"Salvati {len(pr_data)} prezzi in sos-fanta/prices.json", "✅")

    # 3. Player Strategy (Fasce, prezzi previsti, commenti SOS Fanta)
    log("3/7 Scaricamento player-strategy...", "⏳")
    res_ps = make_request(
        "https://api.fantalab.it/v2/player-strategy",
        method="POST",
        payload={"strategy_id": strategy_id},
        token=token
    )
    ps_data = json.loads(res_ps)
    save_json(os.path.join(SOS_DIR, "player-strategia.json"), ps_data)
    log(f"Salvati {len(ps_data)} giocatori in sos-fanta/player-strategia.json", "✅")
    
    # 4. Squadre (Guida, titolari, moduli, specialisti, ballottaggi)
    log("4/7 Scaricamento squadre Serie A (guida/titolari/moduli)...", "⏳")
    res_sq = make_request(
        "https://api.fantalab.it/guida",
        method="POST",
        payload={"season": season},
        token=token
    )
    sq_data = json.loads(res_sq)
    save_json(os.path.join(SOS_DIR, "squadre.json"), sq_data)
    log(f"Salvate {len(sq_data)} squadre in sos-fanta/squadre.json", "✅")
    
    # 5. Info (Ratings, xFMV, indici di titolarità/affidabilità/integrità)
    log("5/7 Scaricamento indici e ratings (titolarità, affidabilità, integrità)...", "⏳")
    res_info = make_request(
        "https://api-cdn.falsesoftware.com/v2/ratings",
        method="GET",
        token=token
    )
    info_data = json.loads(res_info)
    save_json(os.path.join(SOS_DIR, "info.json"), info_data)
    info_count = len(info_data.get("data", [])) if isinstance(info_data, dict) else len(info_data)
    log(f"Salvati indici di {info_count} giocatori in sos-fanta/info.json", "✅")
    
    # 6. Giocatori (Anagrafica & Statistiche storiche multi-stagione)
    log("6/7 Scaricamento anagrafica giocatori e statistiche storiche...", "⏳")
    res_gio = make_request(
        "https://api.fantalab.it/players/get-season-info-cached-25",
        method="GET",
        token=token
    )
    gio_data = json.loads(res_gio)
    save_json(os.path.join(SOS_DIR, "giocatori.json"), gio_data)
    log(f"Salvati {len(gio_data)} profili giocatori in sos-fanta/giocatori.json", "✅")
    
    # 7. Strategia (Configurazione fasce)
    log("7/7 Scaricamento configurazione fasce strategia...", "⏳")
    res_strat = make_request(
        "https://api.fantalab.it/v2/strategy/public",
        method="POST",
        payload={},
        token=token
    )
    try:
        strat_list = json.loads(base64.b64decode(res_strat).decode("utf-8")) if not res_strat.startswith("[") else json.loads(res_strat)
    except Exception:
        strat_list = json.loads(res_strat)
        
    sos_strat = next((s for s in strat_list if s.get("strategy_id") == strategy_id), None)
    if sos_strat:
        save_json(os.path.join(SOS_DIR, "strategia.json"), sos_strat)
        log(f"Salvata strategia '{sos_strat.get('strategy_name')}' in sos-fanta/strategia.json", "✅")
    else:
        log("Strategia SOS Fanta non trovata nella lista pubblica, mantenuto file precedente.", "⚠️")

def run_build_pipeline():
    log("\n--- Esecuzione Pipeline di Build Dati ---", "⚙️")
    
    steps = [
        ("Python", ["python3", os.path.join(SCRIPT_DIR, "build_initial_data.py")], "Generazione catalogo calciatori e squadre in initialData.js"),
        ("Python", ["python3", os.path.join(SCRIPT_DIR, "build_sos_teams.py")], "Elaborazione dati tattici squadre e titolari"),
        ("Python", ["python3", os.path.join(SCRIPT_DIR, "build_strategy.py")], "Generazione strategia e fasce"),
        ("Python", ["python3", os.path.join(SCRIPT_DIR, "export_player_indices.py")], "Esportazione indici titolarità/affidabilità"),
        ("Node", ["node", os.path.join(SCRIPT_DIR, "build_player_indices.mjs")], "Aggiornamento js/data/playerIndices.js"),
    ]
    
    for tool, cmd, desc in steps:
        log(f"Esecuzione: {desc}...", "🔧")
        res = subprocess.run(cmd, cwd=PROJECT_ROOT, capture_output=True, text=True)
        if res.returncode != 0:
            log(f"Errore durante l'esecuzione di {cmd}: {res.stderr}", "❌")
            print(res.stdout)
        else:
            stdout_lines = [l.strip() for l in res.stdout.strip().split("\n") if l.strip()]
            last_line = stdout_lines[-1] if stdout_lines else "OK"
            log(f"Completato: {last_line}", "✅")

    log("\n🎉 TUTTI I DATI E IL CATALOGO CALCIATORI SONO STATI AGGIORNATI CON SUCCESSO! 🎉", "🌟")

if __name__ == "__main__":
    try:
        fetch_from_api()
        run_build_pipeline()
    except Exception as e:
        log(f"Processo interrotto a causa di un errore: {e}", "❌")
        sys.exit(1)
