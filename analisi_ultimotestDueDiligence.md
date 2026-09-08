# Analisi `ultimotestDueDiligence.json`

Report di due diligence (`business_opportunity`, utente demo `demo@allincheck.it`), soggetto: **Mattia Gigliotti**.

## Struttura del file

| Chiave | Contenuto |
|---|---|
| `user_info` | Profilo dell'utente richiedente |
| `input_data` | Dati della richiesta (target, contesto, modulo A) |
| `raw_data` | Dati grezzi raccolti (oggetto di questa analisi) |
| `llm_summaries` | Sintesi LLM prodotte dagli agenti (`osint_agent`, `family_agent`, `social_scraping_agent`, `strategic_agent`, `dd_intelligence_agent`, `dd_strategic_advice_agent`) |
| `user_provided_documents` | Vuoto |
| `intake_status` | `accepted` |

`raw_data` contiene 4 categorie di origine dati, riconoscibili da prefissi e campi di provenance interni.

---

## 1. `identity_and_contacts` → X-Ray + Trustfull

Due fornitori distinti.

### X-Ray (people search / aggregatore di data broker)

Tutti i campi prefissati `xray_`:

- `xray_query_pivot: "linkedin_url"` → la ricerca è partita dall'URL LinkedIn del soggetto (chiave di query usata su X-Ray).
- `xray_names`, `xray_addresses`, `xray_educations`, `xray_languages`, `xray_emails`, `xray_phones`, `xray_header_dob` → risultati del profilo aggregato X-Ray.
- `xray_summary` → riassunto LLM del profilo X-Ray (contiene anche i risk factor "Requires Attention" di X-Ray).
- Tracciabilità interna: ogni record ha `meta.found_by` che punta al record personale X-Ray
  `Gigliotti_Mattia_____b6df6627-15b5-4fc9-8e37-fa7bf1d512db` (+ URL LinkedIn).
- `sources[]` elenca i **data provider sottostanti aggregati da X-Ray** con `source_name`/`source_score`:

| source_name | score |
|---|---|
| `linkedin_parser` | 1 |
| `facebook_parser` | 1 |
| `pipl` | 0.8 |
| `callapp` | 0.6 |
| `eyecon` | 0.7 |
| `global_people_data_labs_2022_416m` | 0.25 |

### Trustfull (intelligence su numero di telefono)

Campi prefissati `trustfull_`:

- `trustfull_pivot: "discovered"` → soggetto **scoperto tramite numero di telefono** (ricerca phone-first).
- `trustfull_phone_network` → dati SIM reali: rete attuale **TIM**, **portato da Vodafone** (`is_ported: true`) → conferma che il numero è genuino/attivo.
- `trustfull_phone_first_seen: 2019-08-15` → prima comparsa del numero nelle banche dati Trustfull.
- `trustfull_demographic` → genere `M`, resto vuoto.
- `trustfull_identity_count: 0`.
- Arricchimenti su email/telefono:
  - `details.validation` → email verificata il `06.07.2026`, `is_free: true`.
  - `checkers` → esistenza account su servizi terzi (es. **Spotify**).
  - `messengers` → presenza account WhatsApp/Telegram sul numero.

---

## 2. `professional_history` → estratto dal profilo X-Ray/LinkedIn

- 13 record del tipo `jobsedu` (`subtype: "job"`), stessa struttura degli oggetti X-Ray.
- Tutti con `found_by` = stesso record X-Ray + profilo LinkedIn (fonte: "1 OSINT source", parser LinkedIn di X-Ray).
- **Dato non pulito**: duplicati generati dal parsing dello stesso ruolo con formati diversi:
  - "Investment Associate Intern at Roxbi Capital . Part-time" vs "(2025-2025)"
  - "M&A Tax Analyst" vs "Junior Tax Consultant" (stesso periodo 2019-2020)
  - "M&A Tax Associate" vs "Dottore commercialista" (stesso periodo 2022-2024)
- Nota di design: l'**educazione** (11 record: Bocconi, University of Florida, Liceo Fiorentino, ...) non sta qui ma in `identity_and_contacts.identity.xray_educations`.

---

## 3. `web_references` → due canali di ricerca web

### `main` — risultati SERP grezzi

Risultati "puri" da motore di ricerca sul nome completo: `{title, link, snippet, display_link}` → LinkedIn, directory LinkedIn, Facebook, Instagram. Nessuna logica di classificazione.

### `partial` — risultati arricchiti da agente di scraping

Ogni record ha:

- `category`: `business` / `social` / `hobby` / `finance`
- `confidence_score`: 0.5–0.9
- `result_date`, `trust_level`, `found_on`
- `details.query_prompt` → **rivela le query automatiche eseguite**:
  - `mattiagigliotti@gmail.com` (pivot: email)
  - `https://facebook.com/mattia.gigliotti.75` (pivot: profilo FB)
  - `"Mattia Gigliotti" "Milano"` (pivot: nome + luogo)
  - `"Mattia Gigliotti" "Growth Equity MBA Associate" "Fondo Italiano d'Investimento SGR"` (pivot: nome + ruolo + azienda)

Quindi: pivoting per email/URL/name+geo/name+ruolo con scoring euristico di pertinenza. Coerente con gli agenti in `llm_summaries` (`osint_agent`, `social_scraping_agent`, `dd_intelligence_agent`).

---

## 4. `cerved` → blocco vuoto (nessun dato restituito)

| Chiave | Valore |
|---|---|
| `stato_civile` | `{}` |
| `relazioni` | `[]` |
| `figli` | `[]` |
| `genitori` | `[]` |
| `matrimoni` | `[]` |
| `registri_pubblici` | `{}` |
| `cerved_data` | `{}` |

Lo schema esiste ma **in questo report non è arrivato nessun dato**. La struttura richiama l'offerta consumer Cerved (anagrafe/stato civile/registri pubblici, rapporti familiari). Possibili motivi:

- nessun match per il soggetto;
- modulo non abilitato/acquistato per l'account (`client_type: percorso_c`, utente demo);
- chiamata al fornitore fallita/omessa per persone fisiche.

---

## Sintesi

| Categoria | Provenienza | Stato |
|---|---|---|
| `identity_and_contacts` | X-Ray (aggregatore data broker: linkedin/facebook parser, pipl, callapp, eyecon, data labs) + Trustfull (phone intelligence: rete SIM, portabilità, primo seen) | Popolato |
| `professional_history` | Profilo X-Ray via parser LinkedIn (jobsedu) | Popolato, con duplicati da parsing |
| `web_references` | SERP organica (`main`) + agente di ricerca con query per pivot e confidence score (`partial`) | Popolato |
| `cerved` | Modulo Cerved consumer (anagrafe/registri pubblici) | Vuoto in questo campione |
