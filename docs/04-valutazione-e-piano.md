# 04 — Valutazione della specifica, aggiustamenti proposti e piano di lavoro

> Stato: bozza di lavoro. Le decisioni aperte sono in fondo; man mano che vengono prese, vanno registrate in `05-decisioni.md`.

## Giudizio generale
Idea solida; il posizionamento "mercato di destinazione" (non nazionalità) è corretto. Il rischio principale è l'ambizione: **trasformare la struttura di siti arbitrari è molto difficile**. Lo scopo della V1 è dimostrare che funziona, non coprire il web.

## Punti di forza
- Principi chiari: reversibilità, privacy locale, nessun intervento su login e pagamenti.
- Motore separato dai profili → nuovi mercati senza riscrivere l'estensione.
- Tre livelli (Visual / Structural / Deep) e soglie di confidenza.
- Il Transformation Rule System come primo passo.

## Aggiustamenti proposti
1. **Restringere l'MVP**: 4 siti noti (uno per categoria) con adapter dedicati; solo Visual + un po' di Structural. Il Semantic Mapper generico arriva dopo, dai pattern emersi dagli adapter (nella spec l'ordine è invertito rispetto alla fattibilità).
2. **Rimandare la modalità Deep**: nell'MVP solo shortcut, riordino e *un* percorso alternativo.
3. **Limite del profilo cinese su siti occidentali**: un sito non ha i contenuti, feed e creator di Taobao. Si adattano densità e scorciatoie, non l'ecosistema. Dichiararlo all'utente: sono "convenzioni di layout", non localizzazione completa.
4. **Chiarire l'utente target**: designer/ricercatore, utente finale che naviga siti stranieri, o ricercatore che confronta le versioni — cambiano priorità e interfaccia. Proposta: partire da designer/ricercatore.
5. **Evidenze come ipotesi**: gli studi citati riguardano siti istituzionali e una ricerca NN/G del 2016. Ogni regola ha un livello di evidenza obbligatorio.
6. **Hybrid** rimandato alla fase 2: si ottiene quasi gratis se le regole sono ben separate.
7. **Aggiornamento remoto delle regole**: in tensione con "nessun codice remoto" e con le policy degli store. Le regole devono essere **dati dichiarativi**, mai codice eseguibile.
8. **AI nel riconoscimento**: non nell'MVP; in seguito solo locale e solo come suggerimento.
9. **Misurare l'efficacia**: confronto originale/adattato integrato (A/B interno), altrimenti non si dimostra nulla.

## Piano di lavoro (indicativo, senza codice)

**Fase 0 — Definizioni (1–2 sett.)** utente target e 4 siti di test; raccolta screenshot/pattern reali delle due convenzioni; 15–20 regole scritte a mano con evidenze e limiti.

**Fase 1 — Regole e formato (1–2 sett.)** schema di Transformation Rule, Market Profile, adapter; criteri di accettazione per regola (esempio prima/dopo, test).

**Fase 2 — Prototipo Chrome (3–4 sett.)** estensione base (ON/OFF, profilo, ripristino); motore Visual con rollback; 1 adapter completo, poi gli altri 3.

**Fase 3 — Structural (3–4 sett.)** riordino sezioni, scorciatoie, siti dinamici, indicatore di compatibilità.

**Fase 4 — Validazione (2 sett.)** test con utenti per mercato, metriche della spec; decisione su Deep e riconoscimento generico.

## Decisioni aperte
1. Utente target della V1.
2. I 4 siti di test.
3. Stack tecnico (proposta: TypeScript, Chrome MV3).
4. Formato dei dati delle regole e dove vivono nel repo.
5. Nome del progetto / dei profili visibili.
6. Lingua dei documenti e della UI dell'estensione.
7. Ruolo dei test con utenti reali nella V1 (chi, quanti, come).
