# 03 — Specifica: Cross-Market UX Localization Extension (V1.0)

> Specifica iniziale ricevuta dal committente, riportata integralmente nei contenuti. Le valutazioni e gli aggiustamenti proposti stanno nel doc 04.

**Tipologia:** browser extension · **Categoria:** UX Adaptation / Web Localization · **Architettura:** modulare, local-first, multi-market · **Prima release:** due profili di mercato · **Obiettivo:** adattamento dinamico e reversibile dell'esperienza di navigazione web.

**Scelta terminologica:** il progetto non associa uno stile grafico a una nazionalità. Si parla di *mercato di destinazione* e di *configurazioni UX adattate* a contesti culturali, linguistici, tecnologici e commerciali.

## 1. Visione

### 1.1 Obiettivo
Adattare dinamicamente UX/UI di una pagina web alle convenzioni di mercati diversi, modificando non solo l'aspetto ma: organizzazione e gerarchia delle informazioni; disposizione e comportamento dei componenti; navigazione e accesso alle funzioni; percorsi di interazione; ricerca e discovery; presentazione di contenuti e raccomandazioni; punti di accesso a servizi esterni; localizzazione linguistica e tecnologica. Si distingue dai temi grafici perché interviene su struttura e comportamento.

### 1.2 Visione a lungo termine
Motore universale di adattamento UX, multi-browser. V1: Profilo A (convenzioni occidentali), Profilo B (convenzioni del mercato cinese continentale). Futuri: India, Giappone, mercati arabi/mediorientali, altri. I profili non sono stereotipi nazionali ma configurazioni basate su evidenze, ricerche, test e caratteristiche reali dei servizi locali.

### 1.3 Principi
1. Neutralità culturale. 2. Adattamento funzionale. 3. Reversibilità. 4. Trasparenza (l'utente sa cosa viene modificato). 5. Privacy (analisi locale). 6. Compatibilità (preservare le funzioni originali). 7. Modularità (un profilo per mercato). 8. Evidence-based design. 9. Accessibilità (nessuna trasformazione la compromette). 10. Non invasività (sapere quando non modificare).

## 2. Ambito

**Incluso:** analisi struttura pagine; riconoscimento semantico componenti; identificazione tipologia pagina; selezione profilo; trasformazioni visuali; riorganizzazione contenuti e navigazione; componenti e percorsi alternativi; adattamento di comportamenti interattivi; regole per sito; ripristino originale; segnalazione trasformazioni non supportate.

**Escluso dalla V1:** traduzione automatica completa; sostituzione di autenticazione o pagamenti originali; automazione di acquisti/transazioni; bypass di restrizioni geografiche; aggiramento di paywall/protezioni; modifica delle politiche di accesso; simulazione di servizi non disponibili; raccolta centralizzata della navigazione; modifica di dati o contenuti del sito. L'architettura deve consentire integrazioni future, se tecnicamente e legalmente possibili.

## 3. Modello di adattamento (4 livelli coordinati)

- **L1 Visual Design:** griglie/layout, densità, spaziature, dimensioni, colori, tipografia, gerarchia, card, banner, menu, badge, icone, feed, elementi promozionali, responsive.
- **L2 Information Architecture:** gerarchia categorie, menu, homepage, accesso a ricerca e contenuti, raggruppamenti, breadcrumb, navigazione contestuale, correlati, shortcut, feed, discovery.
- **L3 Interaction Design:** onboarding, navigazione, accesso alle funzioni, ricerca, filtri, selezione, card, menu contestuali, percorsi di acquisto, modali, notifiche, shortcut, feedback. Le nuove interazioni devono collegarsi a funzioni realmente disponibili nel sito, senza simulare operazioni non supportate.
- **L4 Digital Ecosystem Integration:** motori di ricerca, social, marketplace, video, autenticazione, pagamenti, raccomandazione, API, servizi locali, distribuzione. Può: rendere più visibili link a servizi locali, proporre alternative compatibili, aggiungere shortcut, integrare connettori autorizzati, indicare servizi non disponibili. **Non** sostituisce API, account, pagamenti o servizi originali.

## 4. Profili di mercato

**Struttura:** ogni mercato = un *Market Profile* indipendente con: id, nome neutrale, descrizione, lingua e varianti, impostazioni visuali, regole IA, regole Interaction, integrazioni disponibili, regole di compatibilità, livello di affidabilità, riferimenti alle evidenze. Nessuna assunzione rigida sui singoli utenti.

**Iniziali:** A — Western-oriented; B — China-oriented (descrivono il contesto di progettazione, non gli utenti).

**Futuri:** altri mercati asiatici, Asia meridionale, Medio Oriente, lingue RTL, configurazioni regionali/linguistiche, profili ibridi. Aggiungere un profilo non deve richiedere modifiche al motore.

**Hybrid:** composizione *esplicita* di regole (non una media automatica): es. densità di un profilo + gerarchia di un altro + navigazione personalizzata + flussi specifici + integrazioni selezionate.

## 5. Architettura software

- **A. Extension Core:** attivazione, permessi, configurazioni, comunicazione tra moduli, stato pagina, sessioni, UI dell'estensione.
- **B. Page Analyzer** (locale): URL/dominio, DOM, elementi semantici, componenti interattivi, gerarchia, media, menu, ricerca, form, card, CTA, contenuti dinamici, viewport.
- **C. Semantic Mapper** (cuore del progetto): riconosce la *funzione* degli elementi indipendentemente dall'HTML. Mappa: Header, Navigation, Search, Product Card, Content Card, Primary/Secondary CTA, Filter, Recommendation, Account Area, Footer. Ordine di preferenza dei segnali: semantica HTML → ARIA → ruoli/proprietà accessibili → testi e struttura → pattern DOM noti → regole per dominio. Non affidarsi solo a selettori CSS fragili.
- **D. Page Classification Engine:** homepage, ricerca, prodotto, marketplace, articolo, editoriale, social feed, video, dashboard, servizio, form, autenticazione.
- **E. UX Transformation Engine:** riceve struttura semantica, tipo pagina, profilo, livello di adattamento, preferenze; produce un *piano di trasformazione* applicato in modo controllato e reversibile.
- **F. Interaction Controller:** collega nuovi componenti agli elementi originali, gestisce eventi e stato, navigazione alternativa, sincronizzazione, controllo delle azioni non supportate.
- **G. Site Adapter Manager:** adapter per dominio (riconoscimento, mapping, trasformazioni, eccezioni, componenti dinamici, verifiche di compatibilità), isolati dal motore generale.
- **H. Safety & Rollback Manager:** modifiche applicate, conflitti DOM, errori JS, perdita di funzioni, stato originale, ripristino.

## 6. Modalità di trasformazione

- **Visual:** solo presentazione (colori, tipografia, spaziature, dimensioni, griglie, densità, layout, componenti grafici). Non tocca la struttura funzionale.
- **Structural:** presentazione + organizzazione (spostamento sezioni, riordino card, raggruppamenti, navigazione, shortcut, nuova gerarchia, visualizzazioni alternative).
- **Deep:** tutto il precedente + percorsi alternativi, nuovi punti di accesso, componenti interattivi aggiuntivi, adattamento dei flussi, link a servizi esterni compatibili. Non autorizza la sostituzione di sicurezza, autenticazione o pagamento.

## 7. Motore di trasformazione

**Processo:** analizzare → identificare componenti → classificare pagina → caricare profilo → individuare trasformazioni applicabili → verificare dipendenze → generare *Transformation Plan* → applicare → monitorare stabilità → consentire rollback. Non si applica un semplice CSS predefinito.

**Transformation Rule** — campi: id, profilo, livello, tipo di pagina, componenti interessati, condizioni di applicabilità, azione, dipendenze, priorità, reversibilità, rischio, fallback. Indipendenti dal sito quando possibile.

**Priorità (dalla più alta):** 1 sicurezza, 2 accessibilità, 3 regole del sito, 4 regole del tipo di pagina, 5 regole del profilo, 6 preferenze utente. In conflitto prevale la regola più specifica, se non viola sicurezza e accessibilità.

**Confidenza:** Alta (semantica chiara), Media (pattern), Bassa (incerta). Le trasformazioni strutturali/interattive richiedono confidenza adeguata; se incerto → solo visual non distruttivo o nessun intervento.

## 8. Pagine dinamiche

Gestire: aggiornamenti dinamici, SPA, caricamento progressivo, infinite scroll, feed, modali, AJAX, componenti ricostruiti dai framework. Usare MutationObserver e rilevamento della navigazione. Trasformazioni **idempotenti** (stessa regola non riapplicata allo stesso elemento) e senza cicli in cui le proprie modifiche generano nuovi eventi.

## 9. Interazioni

**Principio:** le nuove interazioni usano, quando possibile, le funzioni originali. Es.: una nuova card prodotto creata dall'estensione, ma il pulsante d'acquisto richiama un'azione originale verificata, non simula un acquisto.

**Supportate in V1:** apertura/chiusura pannelli, espansione sezioni, shortcut, navigazione interna, filtri esistenti, ricerca originale, riordino contenuti, mostra/nascondi sezioni, link contestuali.

**Protette (mai modificate autonomamente):** password, dati di pagamento, autorizzazioni, consensi, autenticazione, conferme d'acquisto, transazioni, cancellazione account, controlli di sicurezza.

## 10. Digital Ecosystem Integration

Distinguere: collegamento informativo; link a servizio esterno; integrazione via API; autenticazione esterna; integrazione commerciale; integrazione transazionale.

**Connettore** indipendente, dichiara: servizio, mercato, funzioni, requisiti di autenticazione, permessi, API, limitazioni, stato di disponibilità.

**Regole:** nessun connettore attivato senza consenso; nessuna raccolta di credenziali, trasferimento di dati personali o transazioni senza autorizzazione esplicita; un link a un servizio locale non va presentato come integrazione funzionante se il servizio non è disponibile.

## 11. UI dell'estensione

- **Popup:** ON/OFF, selezione mercato, profondità, stato di compatibilità, ripristino, impostazioni.
- **Profilo:** A, B, Hybrid, Originale (nomi personalizzabili nelle versioni distribuite).
- **Stato pagina:** pagina analizzata, componenti riconosciuti, trasformazioni applicate/non disponibili, compatibilità, problemi.
- **Controllo:** disattivare tutto, ripristinare, disabilitare singole regole, escludere un dominio, scegliere il livello, preferenze per dominio.

## 12. Architettura tecnica

JS/TS, HTML/CSS, WebExtensions API, Manifest V3 (Chromium), compatibilità Firefox, Safari in seguito. Framework frontend da valutare (non necessario per il prototipo). Componenti: Background Service Worker, Content Scripts, Popup UI, Options Page, Storage Manager, Transformation Engine, Site Adapter Manager.

**Elaborazione locale**, nessun server centrale di analisi; la distribuzione di profili/regole è separata dall'analisi delle pagine. **Storage locale** per: profilo, preferenze, domini esclusi, configurazioni, stato trasformazioni, adapter. Non memorizzare contenuti sensibili.

## 13. Privacy e sicurezza (requisito strutturale)

Elaborazione locale; permessi minimi; attivazione esplicita; nessuna raccolta cronologia; nessun invio di contenuti; nessuna raccolta di password; nessuna lettura di dati di pagamento; nessuna modifica automatica dei consensi; nessun codice remoto non verificato; adapter isolati; ripristino immediato. Comunicazioni esterne solo per aggiornamenti autorizzati e integrazioni attivate esplicitamente. Rispetto delle policy degli store e delle norme.

## 14. Compatibilità

**Browser, in ordine:** Chrome, Edge, Brave, Firefox, Opera, Safari desktop (verificare le API realmente usate, non dedurre dal motore). **Pagine non supportate:** pagine interne del browser, store delle estensioni, pagine protette, alcuni PDF viewer, interfacce isolate, componenti cross-origin. In questi casi comunicare il limite senza modifiche non sicure.

## 15. MVP V1

**Obiettivo:** dimostrare che si può trasformare una pagina esistente da un modello UX all'altro, intervenendo su struttura, presentazione e alcuni percorsi di interazione.

**Ambito:** estensione Chrome; due profili; Hybrid preliminare; attivazione manuale; analisi DOM locale; riconoscimento semantico dei componenti principali; classificazione tipi di pagina; Visual; Structural; prime interazioni alternative non distruttive; ripristino; configurazione per dominio; indicatore di compatibilità.

**Siti iniziali (poche tipologie):** motore di ricerca; e-commerce; portale editoriale; social/piattaforma di contenuti.

**Criteri di accettazione:** riconosce gli elementi principali delle pagine testate; applica entrambi i profili; modifica la gerarchia visiva; riorganizza almeno alcune sezioni; aggiunge almeno un percorso alternativo funzionante; mantiene le funzioni originali; non modifica dati/transazioni; ripristino completo; nessun invio di dati a server esterni.

## 16. Roadmap

0. Ricerca e progettazione (profili, esempi reali, regole, siti di test, architettura). 1. Prototipo tecnico (estensione, lettura DOM, Semantic Mapper, CSS, ripristino). 2. Structural (riordino, menu, raggruppamenti, shortcut). 3. Deep Interaction (percorsi, componenti, stati, adapter per sito). 4. Ecosystem Integration (connettori, servizi locali, discovery, integrazioni autorizzate). 5. Estensione dei mercati (nuovi profili, RTL, nuove lingue/scritture, nuovi provider).

## 17. Test e validazione

| Area | Metrica |
|---|---|
| Riconoscimento | Precisione del Semantic Mapper |
| Visual | Coerenza della gerarchia |
| IA | Findability |
| Interaction | Task completion |
| Performance | Tempo di trasformazione |
| Stabilità | Errori DOM e JS |
| Compatibilità | % pagine supportate |
| Reversibilità | Successo del rollback |
| Privacy | Dati trasmessi esternamente |
| Accessibilità | Mantenimento dei requisiti |

Test con utenti dei mercati di riferimento, non solo valutazioni interne.

## 18. Rischi tecnici

| Rischio | Contromisura |
|---|---|
| DOM complesso | Semantic Mapper e Site Adapter |
| Siti dinamici | Monitoraggio controllato delle modifiche |
| Componenti non riconosciuti | Fallback conservativo |
| Interazioni interrotte | Interaction Controller e test |
| Conflitti CSS | Namespace e isolamento |
| Aggiornamenti dei siti | Test di regressione |
| Dipendenza dai provider | Connettori modulari |
| Eccessiva complessità | MVP progressivo |
| Modifiche non reversibili | Snapshot e rollback |
| Falsi riconoscimenti | Livelli di confidenza |

## 19. Direzione futura

Da estensione di personalizzazione a motore di compatibilità UX tra contesti digitali: profili aggiuntivi; rilevamento automatico del tipo di pagina; suggerimento del profilo; editor visuale delle regole; adapter della community; repository pubblico di Market Profile; confronto originale/adattato; modalità di test per UX designer e ricercatori; analisi comparativa di siti; API per integrare il motore in altri strumenti.

## 20. Principio conclusivo

Il progetto non deve trasformare un sito in una caricatura visiva di un altro mercato, ma renderlo più compatibile con convenzioni diverse di progettazione, organizzazione e interazione, mantenendo invariati contenuti e funzioni fondamentali. **Un'unica pagina, più modalità di fruizione, senza imporre un unico modello culturale di UX.**

## Indicazioni progettuali aggiuntive (dal committente)

1. **Separare profilo di mercato e lingua**: una pagina in inglese può richiedere un adattamento per un altro contesto; la sola traduzione in cinese non è localizzazione UX.
2. **Non affidare tutto all'AI**: il riconoscimento può usare modelli, ma le trasformazioni sono governate da regole verificabili e reversibili.
3. **Archivio di trasformazioni verificato**: ogni regola con esempi, condizioni di applicabilità, limiti e risultati dei test.

**Prima attività concreta:** definire il *Transformation Rule System*, il nucleo che permette di aggiungere mercati senza riscrivere l'estensione.
