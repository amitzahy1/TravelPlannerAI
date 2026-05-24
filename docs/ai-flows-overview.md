# AI Flows + User Paths — Admin Overview

> Generated 2026-05-21. Covers every place in the app where an AI call happens,
> every user-facing entry point, and the storage / cache / cost guards that
> wrap them. Built for the admin / developer who needs to know "where does
> money get spent and which path can I disable without breaking things".

This document uses Mermaid diagrams. To view rendered:
- **GitHub** — open this file in the repo, GitHub renders Mermaid natively.
- **VSCode** — install "Markdown Preview Mermaid Support" extension (`bierner.markdown-mermaid`).
- **Online** — copy any code block into [mermaid.live](https://mermaid.live).

---

## 1. Master flow — every path from user to AI

```mermaid
flowchart TD
    %% USER ENTRY POINTS
    Start([User opens app]) --> Auth{Signed in?}
    Auth -- No --> Login[Google Sign-in<br/>Firebase Auth]
    Login --> Dashboard
    Auth -- Yes --> Dashboard[Dashboard<br/>Trip list]

    %% TRIP CREATION — Wizard
    Dashboard --> NewTrip{New trip?}
    NewTrip -- Yes --> Wizard[MagicalWizard<br/>4 steps]
    Wizard --> Step1[Step 1: Destination<br/>+ optional cities dropdown]
    Step1 --> Step1_5[Step 1.5: Dates]
    Step1_5 --> Step2[Step 2: Choose Path<br/>3 methods]
    Step2 --> PathPDF[📄 PDF / Smart Import]
    Step2 --> PathText[📝 Free-text paste]
    Step2 --> PathMail[📬 Forward email to Gmail]

    PathPDF --> Step3PDF[Step3_SmartImport<br/>+ TripDetailsPanel<br/>cities, travelers, groupType]
    PathText --> Step3Text[Step3_TextImport<br/>+ TripDetailsPanel]
    PathMail --> Step3Mail[Step3_Mailbox<br/>Gmail listener]

    Step3PDF -- file[]+hints --> AnalyzeFiles[analyzeTripFiles<br/>intent: ANALYZE]
    Step3Text -- text+hints --> ParseFreeText[parseTripWizardInputs<br/>intent: SMART<br/>+ TRIP_OUTPUT_SCHEMA]
    Step3Mail --> MailWorker[Worker /api/email<br/>handleEmail pipeline]

    AnalyzeFiles --> Worker
    ParseFreeText --> Worker
    MailWorker --> Worker

    %% WORKER — Single AI gateway
    Worker[/api/generate<br/>Cloudflare Worker/]
    Worker --> AuthCheck{Firebase token<br/>+ allow-list}
    AuthCheck -- Fail --> Reject401[401 / 403]
    AuthCheck -- OK --> KeySelect{Model type?}

    KeySelect -- groq:* --> CallGroq[callGroq<br/>GROQ_API_KEY]
    KeySelect -- openrouter:* --> CallOR[callOpenRouter<br/>OPENROUTER_API_KEY]
    KeySelect -- gemini-* --> KeyChoice{tier=free-only?}
    KeyChoice -- yes --> FreeKey[GEMINI_API_KEY<br/>FREE key]
    KeyChoice -- no, PREMIUM set --> PremiumKey[GEMINI_PREMIUM_KEY<br/>PREMIUM key<br/>DEFAULT path]
    KeyChoice -- no PREMIUM --> FreeKey

    CallGroq --> WorkerReturn
    CallOR --> WorkerReturn
    FreeKey --> Gemini[generativelanguage.googleapis.com]
    PremiumKey --> Gemini
    Gemini --> WorkerReturn[Worker response<br/>+ keyTail, kind, tier]

    %% FRONTEND FALLBACK CHAIN
    WorkerReturn -- 200 OK --> ParseJSON[parseJsonLenient<br/>+ sanitize]
    WorkerReturn -- 429 / 500 / 504 --> Classify[classifyAiError<br/>SPEND_CAP / QUOTA /<br/>PERMISSION / AUTH /<br/>TIMEOUT / UNKNOWN]
    Classify --> ProbeCache[(aiHealth probe cache<br/>sessionStorage<br/>10-min TTL)]
    ProbeCache --> MarkFailed[markModelFailed<br/>+ demote to chain end]
    MarkFailed --> NextModel{More models<br/>in chain?}
    NextModel -- Yes --> Worker
    NextModel -- No --> ShowError[Hebrew error banner<br/>describeAiErrorForUser<br/>+ deep-link to fix]

    ParseJSON --> StoreTrip[(Firestore<br/>trips collection)]
    StoreTrip --> RenderTrip[Trip rendered<br/>across all tabs]

    %% RESTAURANT / ATTRACTION RESEARCH
    RenderTrip --> TabAttractions[Attractions tab<br/>AttractionsView]
    RenderTrip --> TabFood[Food tab<br/>RestaurantsView]

    TabAttractions --> AIRecAll[Click 'AI לכל הטיול']
    TabAttractions --> AIRecCity[Click city chip]
    TabFood --> AIRecAllR[Click 'AI לכל הטיול']
    TabFood --> AIRecCityR[Click city chip]

    AIRecAll --> generateWithFallback[generateWithFallback<br/>intent: SEARCH]
    AIRecCity --> generateWithFallback
    AIRecAllR --> generateWithFallback
    AIRecCityR --> generateWithFallback

    %% Manual Deep Research import (free)
    Dashboard --> AdminTab[Admin tab]
    AdminTab --> DeepResearchPanel[Deep Research panel<br/>paste external AI output]
    DeepResearchPanel --> ParseDeepText[parseDeepResearchText<br/>fast-path JSON sanitize<br/>or LLM fallback]
    ParseDeepText --> MergeDeep[mergeDeepResearchData<br/>city attribution<br/>+ enrichment]
    MergeDeep --> StoreTrip

    %% External AI prompt copy flow
    AdminTab --> ExtAI[External AI tab]
    ExtAI --> BuildPrompt[buildExternalAiPrompt<br/>scoped to trip cities]
    BuildPrompt --> CopyClipboard[User copies prompt]
    CopyClipboard -.->|user pastes into<br/>ChatGPT/Gemini Advanced/Claude| ExternalLLM[External LLM<br/>0 cost to us]
    ExternalLLM -.->|user pastes JSON back| ParseExt[parseExternalAiResponse<br/>parseJsonLenient]
    ParseExt --> MergeExt[mergeExternalAiIntoTrip]
    MergeExt --> StoreTrip

    %% TRIP UPDATE FLOWS
    RenderTrip --> EditHotel[HotelsView<br/>edit hotel]
    EditHotel -- save --> EnrichHotel[enrichHotelsWithAI<br/>intent: SMART]
    EnrichHotel --> generateWithFallback
    EnrichHotel --> StoreTrip

    RenderTrip --> EditFlight[FlightsView<br/>enrich flight]
    EditFlight --> generateWithFallback

    RenderTrip --> EditItinerary[ItineraryView<br/>suggest activities]
    EditItinerary --> generateWithFallback

    RenderTrip --> Chat[TripAssistant<br/>chat]
    Chat -- intent: FAST --> generateWithFallback

    %% BACKGROUND / AUTOMATIC
    StoreTrip -.fire-and-forget.-> BgResearch[runBackgroundResearch<br/>App.tsx:479<br/>⚠️ 4 grounded calls<br/>$0.20–0.50 per new trip]
    BgResearch --> generateWithFallback

    %% ADMIN — Observability
    AdminTab --> ModelHealth[ModelHealthPanel<br/>on-demand probe]
    ModelHealth -- click 'בדוק עכשיו' --> ProbeAPI[Worker /api/probe<br/>1-token ping per model]
    ProbeAPI --> ProbeCache

    AdminTab --> DataHealth[DataHealthPanel<br/>reverify all locations]
    DataHealth -- click 'אמת מחדש' --> VerifyBatch[verifyPlacesBatch<br/>Photon free geocoder]
    VerifyBatch --> Photon[(Photon / komoot.io<br/>FREE OSM geocoder)]
    Photon --> UpdateCoords[updates lat/lng/<br/>verifiedCity per item]
    UpdateCoords --> StoreTrip

    %% MAP
    RenderTrip --> MapTab[Map tab<br/>UnifiedMapView]
    MapTab --> ReadCoords[reads lat/lng<br/>from each item]
    ReadCoords --> RenderPins[Mapbox / Leaflet pins]

    %% STYLING
    classDef expensive fill:#fee,stroke:#c00,stroke-width:2px,color:#700
    classDef free fill:#efe,stroke:#0a0,stroke-width:2px,color:#070
    classDef storage fill:#eef,stroke:#00c,color:#007
    classDef worker fill:#ffe,stroke:#a80,color:#640

    class generateWithFallback,AIRecAll,AIRecCity,AIRecAllR,AIRecCityR,BgResearch expensive
    class DeepResearchPanel,ExtAI,ParseExt,VerifyBatch,Photon,ExternalLLM,Chat free
    class StoreTrip,ProbeCache storage
    class Worker,Gemini worker
```

### Legend

| Color | Meaning |
|---|---|
| 🔴 Red | Expensive AI calls — Gemini grounded SEARCH or Worker-billed paths |
| 🟢 Green | Free paths — Photon, Deep Research paste, external AI copy/paste, FAST chat |
| 🟡 Yellow | Cloudflare Worker code |
| 🔵 Blue | Persistent storage (Firestore, sessionStorage cache) |

---

## 2. Fallback chains — model order per intent

```mermaid
flowchart LR
    subgraph SMART_CHAIN ["SMART_CANDIDATES — trip extraction from text/PDF"]
        direction TB
        S1[gemini-3.5-flash] --> S2[gemini-3.1-flash-lite] --> S3[gemini-2.5-flash] --> S4[gemini-2.5-flash-lite] --> S5[gemini-2.5-pro] --> S6[groq:llama-3.3-70b-versatile] --> S7[groq:llama-3.1-8b-instant] --> S8[openrouter:llama-3.3-70b:free] --> S9[openrouter:llama-3.1-405b:free] --> S10[openrouter:gemma-2-9b:free] --> S11[openrouter:mistral-7b:free]
    end

    subgraph DOC_CHAIN ["DOC_CANDIDATES — PDF / heavy doc extraction (Pro-first)"]
        direction TB
        D1[gemini-2.5-pro] --> D2[gemini-3.5-flash] --> D3[gemini-3.1-flash-lite] --> D4[gemini-2.5-flash]
    end

    subgraph SEARCH_CHAIN ["RESEARCH_CANDIDATES — grounded restaurant / attraction search"]
        direction TB
        R1[gemini-3.5-flash + googleSearch] --> R2[gemini-2.5-flash + googleSearch] --> R3[gemini-3.1-flash-lite] --> R4[gemini-2.5-pro] --> R5[gemini-2.5-flash-lite] --> R6[groq:llama-3.3-70b<br/>⚠️ UNGROUNDED] --> R7[openrouter:llama-3.3-70b:free]
    end

    subgraph FAST_CHAIN ["FAST_CANDIDATES — chat, quick UI suggestions"]
        direction TB
        F1[gemini-3.1-flash-lite] --> F2[gemini-2.5-flash-lite] --> F3[gemini-2.5-flash] --> F4[openrouter:llama-3.3-70b:free]
    end

    classDef grounded fill:#fee,stroke:#c00,color:#700
    classDef ungrounded fill:#ffe,stroke:#a80,color:#640
    classDef free fill:#efe,stroke:#0a0,color:#070

    class R1,R2 grounded
    class R6 ungrounded
    class S6,S7,S8,S9,S10,S11,F4,R7 free
```

The auto-demote layer ([services/aiHealth.ts](../services/aiHealth.ts)) intercepts every failure and rewrites these chains at runtime — models that hit `SPEND_CAP`, `QUOTA`, `PERMISSION`, `AUTH`, or `INVALID_MODEL` get demoted to the end (or dropped entirely) for the rest of the session.

---

## 3. User-state machine — the wizard

```mermaid
stateDiagram-v2
    [*] --> Dashboard

    Dashboard --> Step1_Destination: click "New trip"
    Step1_Destination --> Step1_5_Dates: pick destination
    Step1_5_Dates --> Step2_ChoosePath: pick dates

    Step2_ChoosePath --> Step3_SmartImport: pick PDF
    Step2_ChoosePath --> Step3_TextImport: pick text
    Step2_ChoosePath --> Step3_Mailbox: pick mailbox

    Step3_SmartImport --> Analyzing: drop file
    Step3_TextImport --> Analyzing: paste text + click "analyze"
    Step3_Mailbox --> Analyzing: forward email arrives

    Analyzing --> SuccessAnimation: AI returned trip
    Analyzing --> Step3Error: all models failed
    Step3Error --> Step3_SmartImport: retry / paste-only path
    Step3Error --> Step3_TextImport: retry / paste-only path

    SuccessAnimation --> Dashboard: trip saved
    Dashboard --> [*]
```

---

## 4. Where the money actually goes

| Path | When it fires | Approx cost / fire | How to avoid |
|---|---|---|---|
| `runBackgroundResearch` (App.tsx:479) | Auto, on every new trip completion | $0.20–0.50 (4 grounded SEARCH calls) | Part C of plan — gate behind admin toggle |
| `RestaurantsView` "AI לכל הטיול" button | User click | $0.05–0.10 (1 large grounded SEARCH) | Part B — add paste-from-external-AI sibling button |
| `RestaurantsView` city-research chip | User click on city chip | $0.03–0.05 (1 city-scoped grounded SEARCH) | Same |
| `AttractionsView` same patterns | User click | $0.03–0.10 each | Same |
| `analyzeTripFiles` (PDF) | User uploads PDF during wizard | $0.02–0.05 (Pro 2.5 multimodal) | Already optimized — only fires on user action |
| `parseTripWizardInputs` (text) | User pastes text in wizard | $0.005 (Flash 3.5) | Already cheap |
| `enrichHotelsWithAI` (HotelsView save) | User saves hotel | $0.005 (Flash, SMART) | Cheap |
| Chat (TripAssistant) | User sends chat message | $0.001 (Flash-Lite, FAST) | Cheap |

**TL;DR**: 95% of Gemini spend is in the SEARCH chain. The Deep Research manual-paste flow already exists as a free alternative — Part B of the plan extends it from admin-only to RestaurantsView / AttractionsView too.

---

## 5. Storage + cache layers

```mermaid
flowchart TD
    UserAction[User action]
    UserAction --> ZStore[Zustand store<br/>useTripStore]
    UserAction --> RQ[React Query<br/>useTrips hook]
    ZStore <--> RQ
    RQ --> Firestore[(Firestore<br/>trips collection)]
    RQ --> Storage[(Firebase Storage<br/>uploaded files)]

    AIError[generateWithFallback failure]
    AIError --> ProbeSS[(sessionStorage<br/>ai-model-probe-v1<br/>10-min TTL)]
    ProbeSS -.read on next call.-> generateWithFallback[generateWithFallback]

    DeepResearch[Deep Research / External AI]
    DeepResearch --> RJ[(static JSON<br/>research/*.json<br/>bundled)]
    RJ -.loaded at boot.-> AppStart[App boot]

    Photon[Photon geocoder calls]
    Photon --> PhotonCache[(localStorage<br/>geocode results<br/>30d TTL)]

    Places[Google Places API]
    Places --> PlacesCache[(localStorage<br/>placeImageService<br/>30d TTL)]

    Routes[Itinerary routing classifier]
    Routes --> RouteCache[(localStorage<br/>routeClassifier cache)]

    classDef cache fill:#eef,stroke:#00c,color:#007
    class ProbeSS,PhotonCache,PlacesCache,RouteCache,RJ cache
```

---

## 6. Where to look in code

| Concept | File:line |
|---|---|
| Single AI entry point | [services/aiService.ts](../services/aiService.ts) — `generateWithFallback` |
| Worker gateway | [workers/src/index.ts](../workers/src/index.ts) — `/api/generate` |
| Probe + cache | [services/aiHealth.ts](../services/aiHealth.ts) |
| Error classification | `classifyAiError`, `describeAiErrorForUser` in [services/aiService.ts](../services/aiService.ts) |
| Model chains | `GOOGLE_MODELS` constant in [services/aiService.ts](../services/aiService.ts) |
| Wizard root | [components/onboarding/MagicalWizard.tsx](../components/onboarding/MagicalWizard.tsx) |
| PDF import | [components/onboarding/Step3_SmartImport.tsx](../components/onboarding/Step3_SmartImport.tsx) |
| Text import | [components/onboarding/Step3_TextImport.tsx](../components/onboarding/Step3_TextImport.tsx) |
| Mailbox import | [components/onboarding/Step3_Mailbox.tsx](../components/onboarding/Step3_Mailbox.tsx) |
| Background research | [services/backgroundResearch.ts](../services/backgroundResearch.ts), triggered in [App.tsx:479](../App.tsx) |
| Deep Research paste | [components/DeepResearchPanel.tsx](../components/DeepResearchPanel.tsx) + `parseDeepResearchText` in aiService |
| External AI copy | [services/externalAiImport.ts](../services/externalAiImport.ts) — `buildExternalAiPrompt`, `parseExternalAiResponse` |
| Verify locations | [components/admin/DataHealthPanel.tsx](../components/admin/DataHealthPanel.tsx) — `reverifyAll` |
| Model health panel | [components/admin/ModelHealthPanel.tsx](../components/admin/ModelHealthPanel.tsx) |
| Place geocoding | [utils/placeVerification.ts](../utils/placeVerification.ts), [utils/geocodePlaces.ts](../utils/geocodePlaces.ts) |
| JSON sanitizer (shared) | [services/jsonSanitizer.ts](../services/jsonSanitizer.ts) |

---

## 7. Things to consider when changing the diagram

- **Adding a new intent**: add a new `*_CANDIDATES` chain in `GOOGLE_MODELS`, route it in `generateWithFallback`'s `if/else if` chain, document the cost profile here.
- **Adding a new provider** (e.g. Together AI, Cerebras): mirror the `callGroq` / `callOpenRouter` pattern in Worker, add a `provider:*` prefix detector, add models to relevant chains, update the cost table above.
- **Removing a paid path**: replace the in-app button with a "Copy prompt → paste back" modal that reuses `parseExternalAiResponse` or `parseDeepResearchText`. This is the pattern Part B of the active plan uses.
