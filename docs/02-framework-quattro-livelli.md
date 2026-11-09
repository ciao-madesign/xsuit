# 02 — Framework UX/UI occidentale–cinese: i quattro livelli

> Documento fondativo. Quattro report autonomi, struttura comune: principi, differenze documentate, implicazioni, errori da evitare, metriche, raccomandazioni.
> Principio: **core funzionale comune**, adattando separatamente presentazione, organizzazione, interazioni e integrazioni. Le differenze sono tendenze da verificare con utenti reali.

## Livello 1 — Visual Design

Non "minimalismo occidentale vs disordine cinese", ma diversi livelli di densità, gerarchia e informazione simultanea. Evidenza: studio 2026 su 200 homepage (vedi doc 01) — circoscritta a siti istituzionali.

| Elemento | USA/UE | Cina continentale |
|---|---|---|
| Densità visiva | Moderata, gerarchie e spaziature marcate | Più elevata, più blocchi simultanei |
| Homepage | Pochi punti di ingresso dominanti | Più categorie, scorciatoie, feed, promozioni |
| Colori | Palette contenute, più desaturate | Colori vivaci, contrasti evidenti |
| Tipografia | Gerarchie da dimensione, peso, spazio | Gerarchie più articolate, più elementi grafici |
| Componenti | Card, menu, tab, modali, CTA | Card, feed, banner, shortcut, QR, badge, moduli promozionali |
| Animazioni | Subordinate al contenuto | Ruolo più evidente |
| QR code | Funzionale, poco centrale | Ingresso frequente a servizi e contenuti |

**Griglie.** USA/UE: header → hero → CTA prioritarie → sezioni secondarie → footer; limita la competizione visiva. Cina: più aree autonome (header con ricerca/account → categorie e shortcut → banner → feed → servizi a blocchi → promozioni); la gerarchia è *distribuita* tra moduli, non assente.

**Colore e tipografia.** Localizzare, non tradurre. Il rosso è frequente nel campione cinese ma non va usato automaticamente come colore principale; il blu è comune a entrambi. Tipografia: supporto completo cinese semplificato, font fallback affidabili, lunghezze/densità del testo diverse, dimensioni e interlinee adeguate, layout non dipendenti da testi di lunghezza fissa.

**Componenti da prevedere:** header (selettivo / ricerca+account+categorie+shortcut), card (sintetiche / dense), banner (limitati / frequenti), feed (separato / centrale), badge (stati / stati+offerte+ranking), QR code (specifico / ingresso a servizi), CTA (poche / più azioni).

**Raccomandazioni.** Un solo design system con parametri configurabili, non due indipendenti. Token configurabili: densità griglia, spaziatura, dimensioni/rapporto card, numero colonne, gerarchia tipografica, palette e saturazione, prominenza CTA, comportamento banner/feed, breakpoint e navigazione mobile. La versione "cinese" non è la occidentale compressa su mobile.

**Errori:** aumentare la densità indiscriminatamente; stereotipo rosso+oro; eliminare spazio bianco senza motivo; tradurre senza verificare la griglia; confondere quantità di componenti e qualità; trascurare accessibilità, contrasto, focus, semantica.

**Metriche:** visual hierarchy recognition, time to first action, CTA discoverability, content density, visual clutter, readability, responsive consistency.

## Livello 2 — Information Architecture

Differenza da approfondire: il modello mentale con cui l'utente raggiunge un servizio. USA/UE: da funzione/categoria/obiettivo. Cina: anche via ricerca, feed, raccomandazioni, account, QR, altri servizi. Tendenze, non tutti gli utenti.

**Modelli.** Occidentale: per funzione (Homepage → Ricerca / Categorie / Account). Cinese: più punti di ingresso (Homepage/Super-app → Ricerca, Servizi, Feed, QR, Community, Marketplace); lo stesso servizio raggiungibile da più contesti.

**Homepage e navigazione.**
- USA/UE: menu stabile, categorie per funzione, percorsi prevedibili, ricerca per contenuto noto, breadcrumb e link contestuali, separazione tra editoriale/servizi/account.
- Cina: homepage che combina navigazione, feed, servizi; accesso rapido alle funzioni frequenti; categorie e promozioni simultanee; più contenuti raccomandati; link tra servizi; ricerca sia per trovare sia per scoprire.
- La letteratura distingue aree indipendenti vs organizzazione attorno a un punto focale: modello storico da verificare sulle piattaforme attuali.

**Ricerca: due funzioni.** *Known-item* (so cosa cerco) ed *exploratory* (voglio scoprire). Non progettare un unico sistema per tutti i casi. In Cina considerare anche la ricerca interna a WeChat, Douyin, Xiaohongshu, Taobao, Baidu: ecosistemi, non motori web alternativi.

**Architettura consigliata a tre livelli.**
1. *Core taxonomy*: categorie, entità, contenuti, relazioni — indipendenti dal mercato.
2. *Access layer*: menu, ricerca, feed, raccomandazioni, link contestuali, QR, servizi esterni.
3. *Presentation layer*: navigazione focalizzata vs esplorativa, homepage modulare, feed personalizzati, scorciatoie.

**Errori:** stessa homepage in entrambi i mercati; ricerca nascosta in categorie profonde; confondere tassonomia e menu; categorie basate solo sulla traduzione; non distinguere ricerca interna/esterna; feed come unico modo di trovare informazioni; personalizzazione che nasconde contenuti importanti.

**Metriche:** findability, navigation depth, search success rate, search refinement rate, direct access rate, content discovery, information scent.

## Livello 3 — Interaction Design

Le differenze emergono nei **flussi completi**, non nei singoli pulsanti.

**Onboarding.** USA/UE: presentazione → registrazione/accesso → preferenze → permessi → funzione principale; spesso progressivo. Cina: può partire da un account già autenticato in un ecosistema, da un QR o da un servizio integrato (es. Mini Program in WeChat senza installare app).

**Autenticazione.**

| Metodo | USA/UE | Cina |
|---|---|---|
| Email e password | Molto diffuso | Disponibile, non sempre prioritario |
| Social login | Google, Apple, altri | WeChat e piattaforme locali |
| Telefono | Frequente | Molto rilevante |
| SMS OTP | Comune | Comune |
| QR login | In alcuni servizi | Importante nei flussi desktop/mobile |
| Passkey | In crescita | Da valutare per piattaforma |

Non assumere che ogni utente cinese voglia/possa usare WeChat.

**Checkout.** Occidente: ricerca/selezione → scheda e recensioni → carrello → indirizzo/spedizione → pagamento → conferma. Cina: feed/ricerca/creator/marketplace → contenuto/recensione/live → selezione → acquisto integrato o checkout rapido → wallet locale → conferma e post-vendita. Il secondo è tipico di social/live commerce ma non obbligatorio.

**Permessi, privacy, consenso** (non sacrificare per replicare flussi locali): UE — GDPR, trasparenza, finalità, base giuridica, linee guida EDPB sui dark pattern. Cina — necessità e limitazione della raccolta; rifiutare dati non necessari non deve bloccare le funzioni di base. USA — leggi federali/statali, FTC, obblighi settoriali.

**Raccomandazioni.** Flussi configurabili per onboarding, registrazione, login/recupero, autorizzazioni, selezione/acquisto, pagamento, conferma, resi/rimborsi, preferenze, cancellazione account. Il backend mantiene stato coerente indipendentemente da metodo di accesso/pagamento (stesso oggetto transazionale).

**Errori:** account esterno obbligatorio; presumere WeChat Pay per tutti; checkout occidentale non adattato; permessi chiesti troppo presto; consenso difficile da rifiutare/revocare; pagamenti interrotti non gestiti; confondere autenticazione, autorizzazione, pagamento.

**Metriche:** onboarding completion, login success rate, authentication time, checkout completion, payment failure rate, abandonment rate, permission acceptance, recovery success.

## Livello 4 — Digital Ecosystem Integration

Rapporto con servizi esterni: motori di ricerca, social, marketplace, pagamenti, autenticazione, API, servizi locali. È il livello che mostra perché la sola traduzione non basta.

**Occidente:** Google (ricerca, mappe, account, ads), Bing (ricerca, Copilot), YouTube, Instagram, Amazon, Apple (account, wallet), Microsoft. Esistono ecosistemi integrati, ma ricerca/comunicazione/acquisto/pagamento/account restano spesso distribuiti.

**Cina:** WeChat/Weixin (messaging, pagamenti, Official Accounts, Mini Programs, ricerca), Alipay, Baidu, Douyin, Xiaohongshu/RedNote, Taobao. Differenza chiave: una piattaforma come punto di accesso a più servizi.

**Mini Programs:** vedi doc 01 (vantaggi e limiti).

**Moduli di integrazione:**

| Modulo | USA/UE | Cina |
|---|---|---|
| Search | Google/Bing, SEO | Baidu, ricerca interna piattaforme |
| Identity | Email, Google, Apple, passkey | Telefono, WeChat, account locali |
| Payments | Carte, PayPal, Apple/Google Pay | Alipay, WeChat Pay |
| Social | Meta, YouTube, Reddit | WeChat, Douyin, Xiaohongshu |
| Commerce | Amazon, marketplace locali | Taobao, Tmall, JD.com |
| Analytics | Strumenti conformi | Strumenti locali e conformità locale |
| Hosting/CDN | Provider globali | Infrastruttura compatibile con requisiti locali |
| Content | CMS e API comuni | Canali e formati locali |

Non tutte necessarie: dipende da settore, prodotto, modello commerciale.

**Verifiche tecniche/normative per la Cina:** disponibilità per operatori stranieri; registrazione e verifica aziendale; approvazione app; dati personali; trasferimento internazionale; hosting locale; account sviluppatore e pagamenti. PIPL e norme CAC da considerare insieme al GDPR.

**Errori:** Baidu = copia di Google; WeChat solo messaggistica; wallet senza flusso di autorizzazione; API globali non disponibili in Cina; trasferire dati senza valutare i requisiti; dipendere da una sola piattaforma; confondere presenza social e integrazione tecnica.

**Metriche:** integration coverage, API reliability, authentication interoperability, payment success rate, platform dependency, acquisition channel coverage, data residency compliance, integration maintenance cost.

## Sintesi: collegare i quattro livelli

| Livello | Condiviso | Localizzabile |
|---|---|---|
| Visual Design | Design token, accessibilità, componenti base | Griglie, densità, colori, gerarchie, composizione |
| Information Architecture | Tassonomia, contenuti, relazioni, metadati | Menu, homepage, categorie, feed, ricerca |
| Interaction Design | Business logic, stati, validazioni, sicurezza | Onboarding, login, checkout, pagamenti, navigazione |
| Ecosystem Integration | API interne, modello dati, orchestrazione | Provider, piattaforme, servizi, API e infrastruttura locali |

**Priorità di implementazione:** (1) core indipendente dal mercato; (2) design system configurabile; (3) separare tassonomia e navigazione; (4) flussi configurabili; (5) adapter per provider locali; (6) test con utenti dei rispettivi mercati.

**Nota metodologica:** le evidenze più solide riguardano le differenze visuali. Per IA, Interaction ed Ecosystem Integration le conclusioni derivano in parte da analisi di piattaforme e documentazione ufficiale, non da esperimenti controllati. USA e UE non sono omogenei; anche la Cina varia per settore, età, dispositivo, piattaforma. La validazione definitiva richiede test separati per mercato e categoria di prodotto.
