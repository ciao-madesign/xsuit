# 01 — Ricerca: differenze UX/UI tra mercato occidentale (USA/UE) e cinese

> Documento fondativo. Revisione novembre 2026. Fonte: report di ricerca fornito dal committente.
> Le differenze osservate sono **tendenze da validare con utenti reali**, non regole culturali universali.

## 1. Perimetro

- Due soli modelli: **Occidentale** (USA + UE) e **Cinese** (Cina continentale e relativo ecosistema digitale).
- Il Giappone è escluso da confronto e conclusioni.
- USA e UE restano nello stesso gruppo per le convenzioni UX comuni; le differenze normative/commerciali/tecnologiche sono evidenziate quando rilevanti.

**Obiettivo:** capire se e come cambia la progettazione di un prodotto digitale per i due mercati, considerando: composizione delle interfacce, gerarchia/densità informativa, architettura dell'informazione, navigazione e flussi, ricerca e discovery, registrazione/autenticazione, e-commerce e pagamenti, social e servizi integrati, personalizzazione, privacy/sicurezza/normative.

**Distinzione fondamentale** (da non confondere):
1. differenze **culturali**;
2. differenze di **ecosistema**;
3. differenze **normative**.

Esempio: una funzione diffusa in Cina può dipendere dalla struttura delle piattaforme locali, non da una preferenza culturale.

## 2. Evidenze degli studi comparativi

### 2.1 Revisione della letteratura (Li, Karreman, de Jong, 2022)
*Cultural Differences in Web Design on Chinese and Western Websites* — 17 studi comparativi.
- Siti cinesi: più elementi e interazioni; più rosso e blu.
- Siti occidentali: più spazio bianco, link sottolineati, footer articolati.
- Limite: definizioni e metodologie non uniformi → non universalmente dimostrato.

### 2.2 Studio 2026 — 200 homepage municipali (Li, Karreman, de Jong, 17 giugno 2026)
*Cross-Cultural Design: Comparing the Visual Characteristics of Chinese and Western Municipal Websites.* 100 homepage cinesi vs 100 occidentali.

| Indicatore | Cina | Occidente |
|---|---|---|
| Diversità delle immagini (media) | 6,32 | 4,34 |
| Densità visiva (immagini/video per 1.000 px) | 38,21 | 12,87 |
| Blocchi di contenuto principali | 5,91 | 3,14 |
| Blocchi periferici | 1,61 | 0,61 |
| Titoli HTML / 1.000 unità testuali | 0,49 | 3,47 |
| Heading HTML / 1.000 unità testuali | 3,52 | 28,95 |
| Paragrafi HTML / 1.000 unità testuali | 8,85 | 25,25 |

Altri risultati: poster/infografiche 99 vs 66; **QR code 94 vs 2**; elementi autoplay 99 vs 39; palette cinesi più ampie, sature e luminose.

**Cautela:** campione di siti istituzionali, non di app commerciali. Dimostra differenze nel campione, non preferenze universali.

### 2.3 Densità ≠ cattiva UX (Nielsen Norman Group, 2016)
*Are Chinese Websites Too Complex?*
- Utenti cinesi: preferiscono densità informativa relativamente alta.
- Utenti occidentali: preferiscono semplicità visiva.
- Entrambi faticano quando la complessità è eccessiva.
- La **familiarità con le convenzioni** influenza la complessità percepita.
- Non ridurre il design cinese a "versione meno raffinata" di quello occidentale.

## 3. Composizione delle interfacce

### 3.1 Modello occidentale: gerarchia e selezione
Header con navigazione → hero/contenuto principale → sezioni gerarchiche → CTA principali chiare → contenuti secondari meno evidenti → footer informativo. Limita gli elementi che competono per l'attenzione. Obiettivo: individuare rapidamente la funzione principale e completare il task.

### 3.2 Modello cinese: densità e accessibilità simultanea
Header con molteplici accessi; numerosi blocchi; più categorie visibili; banner promozionali/editoriali; icone e shortcut; QR code; feed e raccomandazioni; contenuti dinamici; elementi commerciali integrati. Obiettivo: più percorsi di accesso e opportunità di scoperta dalla stessa schermata.

### 3.3 Differenze operative

| Caratteristica | Occidente | Cina |
|---|---|---|
| Header | Selettivo | Più articolato |
| Homepage | Gerarchia verticale | Più blocchi e percorsi simultanei |
| Spazio bianco | Elemento strutturale | Meno dominante |
| Card | Poche informazioni | Maggiore densità |
| Banner | Selettivi | Numerosi e dinamici |
| Icone | Funzioni principali | Numerose scorciatoie |
| QR code | Funzione specifica | Anche punto di accesso ai servizi |
| Feed | Spesso sezione separata | Può essere centrale nella homepage |
| CTA | Poche azioni dominanti | Più azioni disponibili |
| Informazioni | Progressive disclosure | Maggiore quantità simultanea |

### 3.4 Struttura semantica
Il campione occidentale ha più heading e paragrafi strutturati. Non implica che i siti cinesi siano meno accessibili: non confondere organizzazione visiva, organizzazione HTML, gerarchia semantica, accessibilità, facilità di navigazione. Una UI densa può avere buona semantica: da preservare in entrambe le versioni.

## 4. Motori di ricerca

- **Google**: SERP con organici, ads, snippet, immagini, video, mappe, shopping, pannelli, AI Overviews → da lista di link a risposta composita.
- **Bing**: convenzioni simili a Google, con Copilot integrato, ricerca visuale, servizi Microsoft.
- **Baidu**: ricerca + contenuti editoriali + feed personalizzato + video + mappe + servizi + Mini Programs + risposte AI. Dati aziendali: ~70% delle SERP mobile con contenuti AI nel Q3 2025 (64% a luglio 2025); Baidu App 708 mln MAU a settembre 2025. La ricerca è un'interfaccia di accesso a contenuti e servizi.

### Ricerca web vs ricerca interna alle piattaforme

| Esigenza | Occidente | Cina |
|---|---|---|
| Ricerca web | Google, Bing | Baidu, Bing |
| Prodotti | Google Shopping, Amazon | Taobao, JD.com, Pinduoduo |
| Recensioni/esperienze | Google, Reddit, siti specializzati | Xiaohongshu, Douyin |
| Video | YouTube | Douyin, Bilibili, Kuaishou |
| Luoghi/attività | Google Maps, Yelp | Amap, Baidu Maps, Dianping |
| Informazioni/community | Reddit, forum, portali | Zhihu, WeChat, Xiaohongshu |
| Servizi integrati | App e siti distinti | WeChat, Alipay, Baidu App |

Non è sostituzione uno-a-uno.

### Quote di mercato: cautela
StatCounter misura le visite ai siti con il suo tracker, non le ricerche totali; la ricerca in WeChat/Douyin/Xiaohongshu/Taobao non appare come traffico di motore di ricerca. Ottobre 2026: Baidu primo nel mercato misurato, con forti differenze desktop/mobile. Non usarlo come unica base strategica. Per entrare in Cina non basta ottimizzare per Baidu: conta la ricerca interna alle piattaforme e la discovery social.

## 5. Ecosistemi digitali

- **Occidente**: Google (Search, Maps, Gmail, Drive, YouTube, Shopping, Android), Meta (Facebook, Instagram, WhatsApp, Messenger), Amazon, Microsoft. Account/infrastruttura condivisi, ma interfacce e app distinte.
- **Cina**: WeChat (messaggistica, pagamenti, account ufficiali, Mini Programs, ricerca), Alipay, Douyin, Xiaohongshu/RedNote, Taobao, Baidu App.

**Differenza architetturale:** non è che in Occidente manchino super-app; cambia diffusione e centralità. Un utente occidentale distribuisce le attività su servizi diversi (cerca su Google, legge recensioni su siti esterni, prenota su servizio dedicato, paga con wallet, contatta via WhatsApp); un utente cinese può svolgere gran parte del percorso in un ecosistema o tramite Mini Programs.

### Mini Programs
App leggere dentro un host (WeChat, Alipay). Accesso via QR, ricerca interna, condivisione, account ufficiale.
- Vantaggi: nessuna installazione/account nuovo; account e pagamenti già disponibili; riaccesso da più canali.
- Limiti: dipendenza da regole/API/approvazioni dell'host; possibile duplicazione di logiche; minor controllo dell'esperienza.

## 6. E-commerce e social commerce

| Occidente | Cina | Funzione |
|---|---|---|
| Amazon | Taobao / Tmall | Marketplace |
| eBay | Pinduoduo | Marketplace / acquisto promozionale-social |
| Instagram Shopping | Douyin | Scoperta e commercio social |
| YouTube | Douyin / Bilibili | Video |
| Reddit | Xiaohongshu / Zhihu | Opinioni e community |
| Google Shopping | JD.com / Taobao | Ricerca e acquisto |

Equivalenze funzionali, non tecnologiche.

- **Occidente**: ricerca prodotto → risultati e filtri → scheda → recensioni/comparazione → carrello e checkout.
- **Cina**: feed/ricerca/creator → contenuto/recensione/live → interazione e raccomandazione → scheda prodotto → acquisto integrato. Il contenuto può generare il bisogno.

**Live commerce**: in una schermata video live, creator/venditore, chat, spettatori, promozioni, prodotti, carrello, coupon, countdown, acquisto. Stime USDA 2024 (da dati cinesi e di settore): mercato ~807 mld $, 833 mln di utenti, penetrazione 75,2% degli utenti Internet. Studio 2024 su 7.701 utenti Douyin: associazioni positive tra presenza sociale dello streamer/altri spettatori, esperienza e intenzione d'acquisto. Sono stime, non misure indipendenti di efficacia UX.

**Implicazioni:** un e-commerce per la Cina non è "Amazon tradotto". Valutare: contenuti/feed come ingresso, recensioni visuali, video dimostrativi, creator/community, coupon, acquisto rapido, pagamenti locali, fidelizzazione, integrazione con ecosistemi social. Non tutto è sempre necessario: dipende da settore, posizionamento, pubblico.

## 7. Registrazione, autenticazione, pagamenti

| Funzione | Occidente | Cina |
|---|---|---|
| Email | Molto diffusa | Presente |
| Password | Molto diffusa | Presente |
| Social login | Google, Apple, Meta | WeChat, account locali |
| Numero telefonico | Diffuso | Molto importante |
| SMS OTP | Utilizzato | Molto diffuso |
| QR login | Meno centrale | Convenzione importante |
| Account condiviso tra servizi | Ecosistemi maggiori | Centrale nelle super-app |

**QR login**: il desktop mostra un QR → l'utente scansiona con l'app mobile già autenticata → conferma → sessione desktop autorizzata.

**Pagamenti** — USA/UE: carte, Apple Pay, Google Pay, PayPal, wallet locali, bonifici. Cina: Alipay, WeChat Pay, QR, wallet integrati, pagamenti in-app, sistemi locali. Da progettare: disponibilità metodi, autorizzazione, rimborsi, ricevute, errori, collegamento account–wallet, assistenza/contestazioni. Un checkout solo PayPal/carte internazionali in cinese non è adeguato. Dato di settore 2025: ~92,8% degli utenti Internet cinesi ha usato pagamenti online nel 2024 (stima).

## 8. Privacy, fiducia, normativa

- **USA**: quadro frammentato — norme settoriali federali, leggi statali (CCPA e successive), FTC Act contro pratiche ingannevoli.
- **UE**: GDPR, ePrivacy, Digital Services Act (trasparenza sulle raccomandazioni, divieto di dark patterns), Digital Markets Act (concorrenza/interoperabilità), European Accessibility Act.
- **Cina**: PIPL — basi giuridiche, consenso volontario/esplicito/informato, finalità specifiche, minimizzazione, diritti degli interessati, trasferimenti transfrontalieri, dati sensibili; applicabile anche a trattamenti fuori Cina su persone in Cina. Regole CAC sulle informazioni personali necessarie per le app: il rifiuto di fornire dati non necessari non deve impedire le funzioni di base.

| Componente | USA | UE | Cina |
|---|---|---|---|
| Cookie/tracking | Variabile | ePrivacy/GDPR | PIPL e regole applicabili |
| Consenso | Dipende dal contesto | Molto strutturato | Informative e consenso PIPL |
| Profilazione | Frammentata | Vincoli specifici | Vincoli specifici |
| Trasferimento dati | Settoriale/statale | GDPR | PIPL e regole transfrontaliere |
| Trasparenza algoritmica | Variabile | DSA e altre | Normativa cinese |
| Accessibilità | ADA e altre | EAA | Standard locali |

**Indicazione progettuale:** privacy e sicurezza sono core comune; consensi, informative, conservazione e trasferimenti sono configurabili per normativa. La densità cinese non giustifica minor trasparenza o controlli meno accessibili.

## 9. Sintesi comparativa

| Dimensione | USA/UE | Cina |
|---|---|---|
| Filosofia | Task-oriented | Ecosystem-oriented |
| Homepage | Selezione e gerarchia | Accesso multiplo e densità |
| Densità | Contenuta | Più elevata |
| Spazio bianco | Più importante | Meno dominante |
| Navigazione | Menu e percorsi | Shortcut, feed, categorie |
| Ricerca | Motore generalista centrale | Web + ricerca in-app |
| Scoperta | Search, social, ads | Search, feed, creator, community |
| Social commerce | In crescita | Fortemente integrato |
| E-commerce | Prodotto e conversione | Prodotto, contenuto, conversione |
| Login | Email, password, social, passkey | Account locali, telefono, QR |
| Pagamenti | Carte, wallet, banche | Alipay, WeChat Pay, QR |
| Servizi | Distribuiti | Super-app |
| Personalizzazione | Feed e raccomandazioni | Integrata nei percorsi |
| Privacy | Differenze USA/UE | PIPL e regole locali |

Tendenze prevalenti, non classificazione rigida dei singoli utenti.

## 10. Architettura raccomandata per un prodotto unico

```
CORE FUNZIONALE (business logic · API · DB · sicurezza)
        │
UX ADAPTATION LAYER (layout · componenti · navigazione · flussi · densità · personalizzazione)
        │
 WESTERN UI (task-oriented)      CHINA UI (ecosystem-oriented)
```

- **Condividere**: funzionalità, DB/modelli informativi, API, autorizzazione, sicurezza, logica, design token fondamentali, standard di accessibilità, validazioni.
- **Rendere configurabili**: homepage (selettiva/multipercorso), header, navigazione (menu/shortcut+feed), card, feed (secondario/centrale), ricerca (search-first / search+discovery), raccomandazioni, registrazione, pagamenti, social.
- **Localizzazione ≠ integrazione tecnologica**: caratteri cinesi, più icone, altri colori, più contenuti *non bastano*. Servono (a seconda del caso) autenticazione WeChat, Mini Program, Alipay/WeChat Pay, piattaforme locali, hosting compatibile con le norme cinesi, motori di ricerca e analytics locali: requisiti tecnologici e commerciali, non di UI.

## 11. Protocollo di validazione UX

- **Varianti**: A Western UX · B Chinese UX · C ibrida (per capire se servono due esperienze o basta un sistema adattivo).
- **Task**: individuare una funzione; cercare un contenuto; trovare un prodotto; confrontare due alternative; registrarsi; completare un acquisto; modificare impostazioni; ritrovare un contenuto già consultato.
- **Metriche**: task completion rate, time on task, error rate, navigation depth, click count, abandonment rate, SUS, soddisfazione.
- Utenti effettivi dei due mercati, nella loro lingua, sui dispositivi abituali.

## 12. Cinque conclusioni

1. La composizione delle schermate è diversa (gerarchie selettive e spazio bianco vs più elementi, blocchi, scorciatoie).
2. La navigazione segue logiche diverse (verso un obiettivo vs accesso a un ecosistema).
3. La ricerca non è solo ricerca web (discovery dentro Douyin, Xiaohongshu, Taobao, WeChat).
4. Il commercio è più integrato con i contenuti.
5. La localizzazione coinvolge l'architettura del prodotto (auth, pagamenti, servizi locali, ricerca, distribuzione, normativa).

**Raccomandazione finale:** due configurazioni di riferimento (Western: chiarezza, gerarchia, task-oriented, progressive disclosure; Chinese: densità, accesso simultaneo, ricerca integrata, discovery, servizi/ecosistemi), usate come **baseline da validare**, non imposte.

## 13. Bibliografia essenziale

**Studi**
- Li, Karreman, de Jong (2022), *Cultural Differences in Web Design on Chinese and Western Websites* — https://ieeexplore.ieee.org/document/9881630
- Li, Karreman, de Jong (2026), *Cross-Cultural Design: Comparing the Visual Characteristics of Chinese and Western Municipal Websites* — https://journals.sagepub.com/doi/full/10.1177/00472816261460385
- NN/G (2016), *Are Chinese Websites Too Complex?* — https://www.nngroup.com/articles/china-website-complexity/
- *Digital Platforms' Growth Strategies and the Rise of Super Apps* (2024) — https://www.sciencedirect.com/science/article/pii/S2405844024018875
- *Understanding Customer Experience in Live Streaming Shopping* (2024) — https://www.nature.com/articles/s41599-024-02690-6
- *Customer Journeys in Livestream Commerce* (2025) — https://www.tandfonline.com/doi/full/10.1080/09593969.2025.2518211

**Ricerca, motori, piattaforme**
- Baidu Q3 2025 Results — https://ir.baidu.com/news-releases/news-release-details/baidu-announces-third-quarter-2025-results
- Baidu Q2 2025 Results — https://ir.baidu.com/news-releases/news-release-details/baidu-announces-second-quarter-2025-results/
- Baidu Mobile Ecosystem — https://ir.baidu.com/baidu-general-business
- China Search Engine Market (ott. 2026) — https://indexinchina.com/search-engines/market-share/
- USDA, *Selling in China – The Rise of Livestreaming E-commerce* (2025)
- Tencent, Weixin Mini Programs — https://www.tencent.com/products/weixin-mini-programs/
- Alipay Mini Program UX — https://pds.alipay.com/docs/miniprogram/design/overview

**Normativa**
- PIPL — https://en.spp.gov.cn/2021-12/29/c_948419.htm
- Digital Services Act — https://www.consilium.europa.eu/en/policies/digital-services-act/
- Digital Markets Act — https://digital-markets-act.ec.europa.eu/businesses-portal/interoperability_en
- EDPB, Guidelines 03/2022 on dark patterns — https://www.edpb.europa.eu/system/files/2022-03/edpb_03-2022_guidelines_on_dark_patterns_in_social_media_platform_interfaces_en.pdf
- CAC, regole sulle informazioni personali necessarie per le app — https://www.cac.gov.cn/2021-03/22/c_1617990997054277.htm

Le fonti aziendali non sono prove indipendenti.
