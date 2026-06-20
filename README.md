# Risorse — A.M.B. Gruppo di Villa d'Ogna

Sito Jekyll pubblicato su GitHub Pages all'indirizzo `https://ambvilladogna.github.io/risorse/`.

Contiene quattro strumenti per i soci e i visitatori:

- **Chiavi dicotomiche** — chiavi di determinazione per *Boletales* (Klofac &
  Krisai-Greilhuber, 2018/2020) e *Russula* (Sarnari, 2005), una pagina HTML
  per ogni genere/sezione/sottosezione.
- **Biblioteca micologica** — catalogo di libri e riviste del gruppo, con
  ricerca, filtri per tag e import assistito da AI per le riviste.
- **Censimento specie fungine** — ricerca, calendario di comparsa e schede
  di dettaglio delle specie censite in Val Seriana.
- **Aggiornamenti Nomenclatura** — report periodici di disallineamento tra
  il censimento e Index Fungorum.

Questo documento descrive **com'è fatto il sito**, non la cronologia delle
modifiche (per quella, vedi `git log`).

---

## 1. Stack e build

- **Jekyll** nativo, build gestita direttamente da GitHub Pages — **non
  c'è alcun workflow GitHub Actions** in questo repo (niente `.github/`).
  Push su `main` → build automatica → deploy. Tempi deterministici, nessuna
  action esterna da tenere aggiornata con Dependabot.
- `Gemfile` usa la gem `github-pages`, che fissa le versioni di Jekyll e
  plugin alle stesse usate dall'infrastruttura GitHub Pages — è la garanzia
  che ciò che build in locale sia identico a ciò che viene pubblicato.
- `_config.yml`:
  - `baseurl: "/risorse"` — il sito vive sotto un sottopercorso. **Ogni link
    interno nei template usa `{{ site.baseurl }}/...`**, mai un path
    assoluto a mano, altrimenti si rompe in produzione (vedi §5).
  - Una *collection* Jekyll (`reportsAggiornamentiNomenclatura`) genera le
    pagine dei report da `_reportsAggiornamentiNomenclatura/*.html` con
    permalink `aggiornamentiNomenclatura/reports/:name.html`.

### Sviluppo locale

```bash
bundle install
bundle exec jekyll serve
```

Serve su `http://localhost:4000/risorse/` (rispetta il `baseurl`).

---

## 2. Come è organizzato l'HTML (layout system)

Il sito usa **link CSS/JS dichiarati nel front matter**, risolti
automaticamente da due include (`asset-css.html` / `asset-js.html`), invece
di scrivere `<link>`/`<script>` a mano in ogni pagina:

```yaml
---
layout: default
title: Biblioteca Micologica
css:
  - href: https://fonts.googleapis.com/css2?family=...   # URL esterno completo
  - biblioteca                                            # → /css/biblioteca.css
  - floatingNav                                           # → /css/floatingNav.css
scripts:
  body:
    - biblioteca                                          # → /js/biblioteca.js
---
```

Regola di risoluzione (in `_includes/asset-css.html` e `asset-js.html`):
una stringa semplice senza `/` diventa `/css/<nome>.css` o `/js/<nome>.js`
sotto `baseurl`; una stringa con `/` o un oggetto con `href`/`src` viene
usata così com'è (utile per URL esterni, tipo Google Fonts). Gli oggetti
supportano anche `integrity`, `crossorigin`, `defer`, `async`, `type`.

**Per aggiungere CSS/JS a una pagina nuova non serve toccare i layout**:
basta aggiungere la voce nel front matter della pagina.

### Gerarchia dei layout

```
_layouts/default.html        ← <head>, header, footer, shared/css, shared/js comuni a tutto il sito
  ├── _layouts/home.html                          (usa homeHeader invece di header)
  ├── _layouts/chiaviDicotomicheRussule.html       (+ pageHeaderChiaviRussule, floating-nav)
  ├── _layouts/chiaviDicotomicheBoletales.html     (+ pageHeaderChiaviBoletales, floating-nav)
  └── _layouts/reportAggiornamentiNomenclatura.html (+ floating-nav)
```

`shared/css/` (variables, reset, layout, components) e
`shared/js/common.js` sono caricati da **ogni** pagina via `default.html` —
contengono le fondamenta comuni (gestione header sticky, e soprattutto
`escapeHtml()`, vedi §4). I CSS specifici di sezione vivono in `css/` e
vengono caricati solo dove servono tramite il front matter.

### Pattern delle pagine "chiavi dicotomiche"

Ogni pagina sotto `chiaviDicotomiche/boletales/*.html` o
`chiaviDicotomiche/russule/*.html` segue lo stesso schema minimale:

```yaml
---
layout: chiaviDicotomicheRussule   # o chiaviDicotomicheBoletales
title: "Chiavi Russule"
css:
  - chiaviDicotomiche
  - floatingNav
---

<div class="hierarchy">...</div>
<br>

<section id="group-1">
  <table class="keys">...</table>
</section>
```

Il body contiene **solo** i blocchi `.hierarchy` e `<section>` con le
tabelle delle chiavi — tutto il resto (header di pagina, navigazione
flottante, struttura HTML) viene dal layout.

---

## 3. Separazione HTML / dati

Questo repo contiene **solo presentazione** (HTML, CSS, JS, immagini). I
dati di biblioteca e censimento **non sono in questo repo**: vengono
caricati a runtime via `fetch()` da path assoluti serviti altrove:

| Sezione | JS che fa fetch | Path richiesti |
|---|---|---|
| Biblioteca | `js/biblioteca.js` | `/biblioteca/data/books.json`, `/biblioteca/data/config.json` |
| Censimento (ricerca) | `js/fungiCensusSearch.js` | `/fungi-census/census.json` (o `/fungi-census/<area>.json`), `/fungi-census/searchCorpus*.json` |
| Censimento (calendario) | `js/fungiCensusCalendar.js` | `/fungi-census/speciesCalendar.json`, `/fungi-census/searchCorpus.json` |
| Censimento (scheda specie) | `js/fungiCensusSpeciesDetail.js` | `/fungi-census/species/<file>`, `/fungi-census/area/<area>.geojson` |

⚠️ **Nota**: questi `fetch()` usano path assoluti dalla root del dominio
(`/biblioteca/...`, `/fungi-census/...`), **non** `{{ site.baseurl }}`.
Funzionano perché il sito dati e questo sito Jekyll sono serviti sotto lo
stesso dominio/percorso effettivo. Se in futuro cambia il dominio o la
struttura di pubblicazione del sito dati, questi path vanno aggiornati a
mano in tutti e quattro i file JS sopra elencati.

I repository che generano questi JSON (libreria, censimento) sono separati
da questo — per dettagli su come si aggiornano i dati, guardare lì.

---

## 4. Sicurezza: escaping XSS

Tutti i dati che arrivano dai JSON esterni sono **testo non fidato** nel
momento in cui vengono iniettati in `innerHTML`. La difesa è centralizzata
in **una sola funzione**, `escapeHtml()`, definita in
`shared/js/common.js` (caricata da ogni pagina via `default.html`) e
riusata da tutti gli altri script — non esistono copie locali duplicate.

Regola pratica per chi tocca questi file in futuro:

- Se un valore proveniente da JSON/utente finisce in un template string poi
  assegnato a `innerHTML` → **deve** passare per `escapeHtml(valore)`.
- Se invece viene assegnato a `.textContent` (o usato come `data-*`
  attribute via `setAttribute` con valori controllati) non serve, perché il
  browser non lo interpreta come markup.
- Preferire `addEventListener` a `onclick="..."` inline nell'HTML generato
  da JS: un `onclick` inline che interpola dati esterni è un vettore XSS
  anche se il valore è "escapato" per il contesto HTML ma non per quello
  attributo-JS. Tutto il codice attuale (`biblioteca.js`,
  `fungiCensusSearch.js` e affini) è stato convertito a questo pattern.

---

## 5. Convenzioni / cose a cui fare attenzione

- **Link interni**: sempre `{{ site.baseurl }}/percorso`, mai `/percorso`
  a mano nei file `.html` di Jekyll (front matter, layout, include). Path
  assoluti "nudi" sono legittimi solo nei `fetch()` JS che puntano al sito
  dati esterno (vedi §3) e nei link relativi *interni a una sezione* tipo
  `href="index.html"` usati dentro le pagine delle chiavi dicotomiche
  (funzionano perché relativi alla cartella corrente).
- **Nomi file**: i file in `_includes/` e `_layouts/` usano camelCase
  descrittivo per sezione (`pageHeaderChiaviRussule.html`,
  `chiaviDicotomicheBoletales.html`). Stesso criterio per `css/*.css` e
  `js/*.js`, il cui nome è quello richiamato (senza estensione) nel front
  matter delle pagine.
- **`escapeHtml` è l'unica utility di sanitizzazione**: prima di scriverne
  una nuova in un file JS specifico, controllare se serve davvero o se
  basta richiamare quella di `common.js` (è globale, nessun modulo da
  importare).

---

## 6. Struttura cartelle (riferimento rapido)

```
_config.yml, Gemfile          configurazione Jekyll
_layouts/                     scheletri di pagina (vedi §2)
_includes/                    frammenti riusabili (header, footer, asset loader)
_reportsAggiornamentiNomenclatura/   sorgenti dei report (collection Jekyll)

index.html                    home
aggiornamentiNomenclatura/    landing + report generati
biblioteca/                   catalogo libri/riviste (UI; dati esterni, §3)
chiaviDicotomiche/
  boletales/                  una pagina per genere + index, classificazione, simboli
  russule/                    una pagina per sezione/sottosezione + index, classificazione
fungi-census/                 ricerca, calendario, scheda specie (UI; dati esterni, §3)

css/                          CSS specifici per sezione, caricati via front matter
js/                           JS specifici per sezione, caricati via front matter
shared/css/, shared/js/       fondamenta comuni a tutto il sito (sempre caricate)
img/                          immagini statiche (webp)
```
