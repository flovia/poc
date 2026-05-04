# pay-skills Provider Payment Atlas

Catalogues every provider in `https://storage.googleapis.com/pay-skills/v1/skills.json` together with the on-the-wire payment recipients they advertise via HTTP 402 challenges. Every recipient row is decoded from a real response captured by an unauthenticated probe; descriptive text (title, description, use_case, category) comes from the registry index itself.

- Generated: 2026-05-04T22:06:15Z
- Source index: `https://storage.googleapis.com/pay-skills/v1/skills.json` (66 providers)
- Probe method: unauthenticated `curl` against `<service_url>/<first paid endpoint>`. **All** `payment-required` (x402) and **all** `WWW-Authenticate: Payment` (MPP) headers in the response are decoded — providers commonly emit one `WWW-Authenticate` per accepted token (USDC/USDT/CASH).
- Sample size per provider: **1 endpoint**. Within a provider, `payTo` and accepted networks/assets are constant across endpoints (verified on `agentmail/email`); only `amount` varies. Different endpoints can occasionally drop networks (e.g., one endpoint of `agentmail/email` exposes only Solana+Base+Avalanche while another adds X Layer).

## Verification

- Raw HTTP responses for every probe are saved under `/tmp/pay-skills/raw/<fqn>.txt` (66 files). Tables in this document can be recomputed from those files alone.
- HTTP status distribution observed in the probes: `402`×53, `400`×7, `None`×2, `301`×1, `500`×1, `404`×1, `200`×1.
- Spot-check (re-run during reproduction):
  - `merit-systems/stableenrich/enrichment` → re-probed; payTo `0x325bdF6F7efAB24a2210c48c1b64cAb2eAe1d430` (Base) and `6cvgmdrsVxyiuPzqMCSBnS7fAmA5Mk2VG4BcfVhC8jdC` (Solana) match the table below.
  - `agentmail/email` → re-probed; all 4 networks (Base / Solana / Avalanche / X Layer) match.
  - `solana-foundation/alibaba/agentexplorer` → re-probed; recipient `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` matches across all three token variants (USDC/USDT/CASH).
- **Not** verified by this document: (a) on-chain existence/ownership of the recipient accounts, (b) that listed asset addresses are actually canonical USDC/USDT/CASH (label is derived by exact-match against a hard-coded registry of known stablecoin addresses), (c) that providers do not rotate `payTo` between probes.

## Summary

- **Providers in registry**: 66
- **Providers returning a usable challenge**: 53
- **Providers without a challenge** (auth required, schema validation, redirect, etc.): 13
- **Providers offering Solana mainnet** (x402 + MPP combined): 53
- **Protocols seen**: x402 (12 providers) · MPP (47 providers)
- **Total payment offers** (one per network × token combination): 175

### Chains observed

| Chain | Provider count | Distinct payTo addresses | Total offers |
|-------|---------------:|-------------------------:|-------------:|
| Solana mainnet (MPP) | 41 | 1 | 123 |
| Base | 11 | 10 | 13 |
| Solana mainnet | 12 | 11 | 13 |
| Tempo | 6 | 6 | 6 |
| X Layer | 2 | 2 | 3 |
| Base Sepolia (testnet) | 1 | 1 | 3 |
| Polygon Amoy (testnet) | 1 | 1 | 3 |
| Polygon | 1 | 1 | 3 |
| eip155:5042002 (unknown) | 1 | 1 | 3 |
| eip155:1952 (unknown) | 1 | 1 | 2 |
| Solana devnet (probable) | 1 | 1 | 2 |
| Avalanche | 1 | 1 | 1 |

### Assets observed (offer count, not provider count)

| Asset | Offers |
|-------|------:|
| USDC | 71 |
| USDT | 41 |
| CASH | 41 |
| USD (Tempo) | 6 |
| ERC20:0x036CbD53842c5426634e7929541eC2318f3dCF7e | 3 |
| ERC20:0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 | 3 |
| ERC20:0x3600000000000000000000000000000000000000 | 3 |
| ERC20:0x4ae46a509F6b1D9056937BA4500cb143933D2dc8 | 2 |
| ERC20:0xF0863D7A29a55d0c4263c11bFac754312ff078DF | 2 |
| SPL:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU | 2 |
| ERC20:0x74b7f16337b8972027f6196a17a631ac6de26d22 | 1 |

---

## Provider descriptions

`title`, `description`, `use_case`, `category`, and `service_url` are taken verbatim from the pay-skills registry index. Click `service_url` to reach the provider's gateway. Pricing range is the registry-declared min/max across all the provider's endpoints (not just the probed one).

| Provider (fqn) | Title | Category | Service URL | Description | Use case | Endpoints | Price range (USD) |
|----------------|-------|----------|-------------|-------------|----------|----------:|-------------------|
| `agentmail/email` | AgentMail | messaging | <https://x402.api.agentmail.to> | Create and operate dedicated email inboxes for AI agents. Supports programmatic inbox creation, outbound sending, inbound message retrieval, unique agent addresses, workflow automation, and no manual account setup for email-based agent tasks. | Use for giving agents their own email address, sending outbound email, receiving replies, monitoring inboxes, automating email-based workflows, collecting verification messages, routing support mail, and managing correspondence without manual setup. | 83 | 0 – 10 |
| `crushrewards/pricing` | Crush Rewards | data | <https://api.crushrewards.dev> | Track competitive retail pricing across Amazon, Walmart, Costco, Home Depot, Nordstrom, IKEA, and other US/Canadian retailers. Returns live prices, availability, deal alerts, brand positioning, inflation trends, and price-drop signals. | Use for comparing prices across major US and Canadian retailers, monitoring deal alerts, tracking price drops, checking product availability, analyzing brand positioning, competitive pricing research, ecommerce intelligence, and shopping recommendations. | 13 | 0 |
| `dtelecom/voice` | dTelecom | ai_ml | <https://x402.dtelecom.org> | Use wallet-authenticated WebRTC voice, speech-to-text, and text-to-speech APIs for AI agents. Supports realtime bidirectional voice sessions, transcription, speech synthesis, low-latency communication, and pay-per-use voice workflows. | Use for realtime AI voice conversations, WebRTC calling, speech-to-text transcription, text-to-speech playback, voice agents, audio interfaces, agent-to-user communication, low-latency conversations, and programmable voice workflows. | 16 | 0 |
| `merit-systems/stablecrypto/market-data` | StableCrypto | finance | <https://stablecrypto.dev> | Access crypto market and on-chain data through CoinGecko, DefiLlama, Alchemy, and Etherscan. Covers prices, DEX pools, DeFi TVL, yields, bridges, treasuries, token balances, transactions, contracts, logs, gas, and Ethereum stats. | Use for crypto prices, market charts, DeFi analytics, TVL and yield research, DEX pool data, wallet token balances, Ethereum transfers, contract metadata, gas estimates, bridge volume, stablecoin supply, treasury holdings, and blockchain monitoring. | 105 | 0.01 |
| `merit-systems/stabledomains/domains` | StableDomains | productivity | <https://stabledomains.dev> | Register, renew, and manage DNS for domains via stablecoin micropayments. Supports common TLDs including .com, .org, .net, .io, .ai, .dev, .app, and .xyz, plus DNS record creation and updates without traditional registrar billing. | Use for domain registration, renewing existing names, managing DNS records, buying agent-owned domains, setting A/AAAA/CNAME/MX/TXT records, launching websites, configuring branded email, and handling registrar workflows through micropayments. | 10 | 0.1 – 1500 |
| `merit-systems/stableemail/email` | StableEmail | messaging | <https://stableemail.dev> | Send email, buy dedicated inboxes, manage custom subdomains, and retrieve inbound messages through per-request email APIs. Supports shared relay sending, subdomain sender identities, forwarding inboxes, message storage, and attachment access. | Use for sending outbound emails, creating receiving inboxes, reading inbound messages, managing custom email subdomains, agent email workflows, forwarding inboxes, reply handling, verification messages, customer outreach, and per-message email delivery. | 24 | 0.001 – 8 |
| `merit-systems/stableenrich/enrichment` | StableEnrich | data | <https://stableenrich.dev> | Unified enrichment gateway for Apollo, Exa, Firecrawl, Google Maps, Hunter, Minerva, Reddit, Serper, Whitepages, Cloudflare, and more. Covers people and company enrichment, web search, scraping, maps, email verification, and property data. | Use for contact enrichment, company lookup, prospect search, web search, page scraping, local business discovery, place details, email verification, social profile enrichment, Reddit research, news and shopping search, people search, and property records. | 32 | 0.002 – 0.44 |
| `merit-systems/stablemerch/merchandise` | StableMerch | productivity | <https://stablemerch.dev> | Order custom printed merchandise from images or generated artwork via micropayments. Supports standard shirts, heavyweight shirts, mugs, multiple sizes and colors, uploaded image assets, worldwide shipping, and no traditional ecommerce checkout. | Use for creating and shipping custom shirts or mugs, turning AI-generated art into physical merchandise, ordering branded swag, fulfillment for user-provided images, gifts, prototypes, creator products, and agent-initiated print-on-demand workflows. | 3 | 0 |
| `merit-systems/stablephone/calls` | StablePhone | messaging | <https://stablephone.dev> | Make AI-powered outbound phone calls, buy dedicated phone numbers, extend number leases, and look up iMessage or FaceTime capability. Supports call IDs, caller ID continuity, global phone workflows, and pay-per-call voice automation. | Use for AI phone calls, outbound voice tasks, call automation, dedicated caller ID numbers, renewing phone number leases, checking iMessage or FaceTime availability, appointment calls, reminders, surveys, support outreach, and phone-based agent workflows. | 7 | 0.05 – 20 |
| `merit-systems/stablesocial/social-data` | StableSocial | media | <https://stablesocial.dev> | Retrieve social media data from TikTok, Instagram, Facebook, and Reddit. Covers profiles, posts, comments, followers, following lists, search results, subreddit content, engagement metrics, captions, authors, timestamps, and nested threads. | Use for social profile lookup, post retrieval, comment analysis, follower and following lists, TikTok/Instagram/Facebook/Reddit research, engagement metrics, subreddit monitoring, social listening, creator intelligence, and content discovery. | 37 | 0.06 |
| `merit-systems/stablestudio/media-generation` | StableStudio | media | <https://stablestudio.dev> | Generate and edit AI images and videos with Sora, Veo, Wan, Grok, Seedance, GPT Image, Nano Banana Pro, and Flux. Supports text-to-video, image-to-video, image generation, image editing, reference uploads, async jobs, and dynamic pricing. | Use for AI video generation, image generation, image editing, reference uploads, text-to-video prompts, image-to-video animation, creative assets, ads, social content, product mockups, visual ideation, and choosing Sora, Veo, Flux, Grok, or Seedance. | 30 | 0.01 – 10 |
| `merit-systems/stableupload/hosting` | StableUpload | storage | <https://stableupload.dev> | Upload files for permanent CDN URLs or deploy static websites from zip archives via micropayments. Supports durable artifact hosting, generated download links, static site subdomains, renewals, and simple file or site publishing for agents. | Use for hosting files, sharing generated artifacts, publishing static websites, uploading zip deployments, creating permanent CDN download URLs, serving images or documents, agent-generated deliverables, simple web hosting, and renewing site deployments. | 11 | 0.02 |
| `paysponge/perplexity` | Perplexity AI API | ai_ml | <https://pplx.x402.paysponge.com> | Search the web and generate grounded Perplexity Sonar responses with citations, search results, related questions, structured JSON, async jobs, and multimodal inputs including text, images, files, PDFs, and video URLs. | Use for cited web answers, live research, grounded chat, web search snippets, model discovery, structured JSON generation, async deep-research workflows, multimodal question answering, and agent responses that rely on current sources. | 6 | 0.01 |
| `paysponge/rentcast` | RentCast API | data | <https://rentcast.x402.paysponge.com> | Search US property records, sale listings, rental listings, market stats, rent estimates, and value estimates with geographic filters, structured housing attributes, listing detail lookups, and comparable-property data for real-estate workflows. | Use for US real-estate search, rental comps, home value estimates, rent estimates, ZIP-level market analysis, sale and rental listing lookup, property detail enrichment, investor research, and housing data workflows that need structured filters. | 10 | 0.01 |
| `purch/marketplace` | Purch | productivity | <https://api.purch.xyz> | Search and buy products from Amazon and Shopify with USDC on Solana. Includes an AI shopping assistant, dynamic-priced product purchase flow, and Purch Vault for digital goods (skills, knowledge, personas) with downloadable artifacts. | Use for product search, Amazon and Shopify shopping, AI shopping assistance, price and review comparison, agent-initiated purchases with shipping address, and buying or downloading Purch Vault digital items like skills, knowledge bases, and personas. | 6 | 0.01 |
| `quicknode/rpc` | QuickNode | compute | <https://x402.quicknode.com> | Pay-per-request JSON-RPC endpoints for 140+ blockchain networks. Each chain is its own path (e.g. solana-mainnet, ethereum-mainnet). Supports SIWX session auth, x402 micropayments, dynamic per-method pricing, and direct node access without infrastructure. | Use for blockchain JSON-RPC, querying account or contract state, submitting transactions, Solana RPC, EVM RPC, multi-chain dapps, block and transaction lookups, devnet/testnet access, and scalable chain reads with pay-per-request billing. | 137 | 0.001 |
| `socialintel/influencer-search` | Social Intel | data | <https://api.socialintel.dev> | Find Instagram influencers across 33M+ profiles by niche, country, city, follower count, and gender. Returns username, bio, follower count, engagement metrics, business contact email (~50% coverage), and creator categories for marketing discovery. | Use for Instagram influencer discovery, creator search, niche keyword matching, audience demographics, engagement rate filtering, follower count ranges, geographic targeting, campaign planning, brand partnerships, and marketing lead lists. | 9 | 0.01 – 0.5 |
| `solana-foundation/alibaba/agentexplorer` | Alibaba Cloud Agent Skills Explorer | search | <https://agentexplorer.alibaba.gateway-402.com> | Search and retrieve data with Alibaba Cloud Agent Skills Explorer, including retrieve the content of the Agent Skill file, obtain information about all Agent Skills categories, and search Alibaba Cloud Agent Skills, for search and discovery workflows. | Use for retrieve the content of the Agent Skill file, obtain information about all Agent Skills categories, search Alibaba Cloud Agent Skills, and related catalog discovery, skill lookup, and search routing. | 3 | 0.001 |
| `solana-foundation/alibaba/aigen` | Alibaba Cloud AI Generation | ai_ml | <https://aigen.alibaba.gateway-402.com> | Run image and video analysis or generation with Alibaba Cloud AI Generation, including cosplay - Anime Character Generation, interactive Full-image Segmentation, and interactive Scribble-based Segmentation. | Use for cosplay - Anime Character Generation, interactive Full-image Segmentation, interactive Scribble-based Segmentation, and related image or video generation, enhancement, detection, segmentation, and visual analysis. | 3 | 0.001 |
| `solana-foundation/alibaba/anytrans` | Alibaba Cloud AnyTrans | ai_ml | <https://anytrans.alibaba.gateway-402.com> | Translate and localize content with Alibaba Cloud AnyTrans, including text Translation, batch Text Translation, and batch Web Page Translation, for multilingual workflows. | Use for text Translation, batch Text Translation, batch Web Page Translation, and related translation, localization, and multilingual communication. | 3 | 0.001 |
| `solana-foundation/alibaba/captcha` | Alibaba Cloud CAPTCHA | ai_ml | <https://captcha.alibaba.gateway-402.com> | Run moderation, verification, and risk checks with Alibaba Cloud CAPTCHA, including intelligent Verification Code Authentication. | Use for intelligent Verification Code Authentication, and related moderation, compliance, identity verification, fraud screening, and risk analysis. | 1 | 0.001 |
| `solana-foundation/alibaba/cloudauth` | Alibaba Cloud Cloudauth | ai_ml | <https://cloudauth.alibaba.gateway-402.com> | Run moderation, verification, and risk checks with Alibaba Cloud Cloudauth, including aIGC Image Generation Detection, verification of Two, and three plus additional screening and verification operations. | Use for aIGC Image Generation Detection, verification of Two, three, and Four Elements of Bank Card, and related moderation, compliance, identity verification, fraud screening, and risk analysis. | 31 | 0.001 |
| `solana-foundation/alibaba/cloudauth-intl` | Alibaba Cloud Cloudauth International | ai_ml | <https://cloudauth-intl.alibaba.gateway-402.com> | Run moderation, verification, and risk checks with Alibaba Cloud Cloudauth International, including address Similarity Comparison, address Verification, and address Verification V2. | Use for address Similarity Comparison, address Verification, address Verification V2, and related moderation, compliance, identity verification, fraud screening, and risk analysis. | 23 | 0.001 |
| `solana-foundation/alibaba/contactcenterai` | Alibaba Cloud Contact Center AI | ai_ml | <https://contactcenterai.alibaba.gateway-402.com> | Analyze conversations, images, and assistant tasks with Alibaba Cloud Contact Center AI, including real-time Analysis of Audio Files, the Tongyi Xiaomi CCAI - Conversation Analysis AIO application by task type, and image Content Analysis. | Use for real-time Analysis of Audio Files, the Tongyi Xiaomi CCAI - Conversation Analysis AIO application by task type, image Content Analysis, and related conversation analysis, completion workflows, and multimodal assistant automation. | 6 | 0.001 |
| `solana-foundation/alibaba/documentparseservice` | Alibaba Cloud Document Parse Service | ai_ml | <https://documentparseservice.alibaba.gateway-402.com> | Extract text and structured document data with Alibaba Cloud Document Parse Service, including document Mind Parsing, for OCR workflows. | Use for document Mind Parsing, and related document OCR, structured extraction, and image-to-text parsing. | 1 | 0.001 |
| `solana-foundation/alibaba/edututor` | Alibaba Cloud EduTutor | ai_ml | <https://edututor.alibaba.gateway-402.com> | Extract text and structured document data with Alibaba Cloud EduTutor, including exam Paper Question Segmentation, for OCR workflows. | Use for exam Paper Question Segmentation, and related document OCR, structured extraction, and image-to-text parsing. | 1 | 0.001 |
| `solana-foundation/alibaba/embeddings` | Alibaba Cloud Model Studio Embeddings | ai_ml | <https://embeddings.alibaba.gateway-402.com> | Create text embeddings with Alibaba Cloud Model Studio's OpenAI-compatible embeddings API for retrieval and semantic search. | Use for semantic search, retrieval, reranking pipelines, clustering, classification, and vector indexing. | 1 | 0.0007 |
| `solana-foundation/alibaba/facebody` | Alibaba Cloud Facebody | ai_ml | <https://facebody.alibaba.gateway-402.com> | Run image and video analysis or generation with Alibaba Cloud Facebody, including face Information Desensitization, human Pose Keypoints, and face Comparison. | Use for face Information Desensitization, human Pose Keypoints, face Comparison, and related image or video generation, enhancement, detection, segmentation, and visual analysis. | 26 | 0.001 |
| `solana-foundation/alibaba/farui` | Alibaba Cloud FaRui | ai_ml | <https://farui.alibaba.gateway-402.com> | Extract contract fields, generate review results, and answer legal questions with Alibaba Cloud FaRui. | Use for contract Extraction, generate contract review result, legal Consultation, and related contract review, legal extraction, compliance checks, and legal advisory workflows. | 5 | 0.001 |
| `solana-foundation/alibaba/goodstech` | Alibaba Cloud Goods Tech | ai_ml | <https://goodstech.alibaba.gateway-402.com> | Run image and video analysis or generation with Alibaba Cloud Goods Tech, including product Categorization. | Use for product Categorization, and related image or video generation, enhancement, detection, segmentation, and visual analysis. | 1 | 0.001 |
| `solana-foundation/alibaba/green` | Alibaba Cloud Green | ai_ml | <https://green.alibaba.gateway-402.com> | Run moderation, verification, and risk checks with Alibaba Cloud Green, including imageBatchModeration, imageModeration, and multiModalAgent. | Use for imageBatchModeration, imageModeration, multiModalAgent, and related moderation, compliance, identity verification, fraud screening, and risk analysis. | 6 | 0.001 |
| `solana-foundation/alibaba/imageaudit` | Alibaba Cloud Image Audit | ai_ml | <https://imageaudit.alibaba.gateway-402.com> | Run moderation, verification, and risk checks with Alibaba Cloud Image Audit, including image Content Moderation and text Content Moderation. | Use for image Content Moderation, text Content Moderation, and related moderation, compliance, identity verification, fraud screening, and risk analysis. | 2 | 0.001 |
| `solana-foundation/alibaba/imagerecog` | Alibaba Cloud Image Recognition | ai_ml | <https://imagerecog.alibaba.gateway-402.com> | Run image and video analysis or generation with Alibaba Cloud Image Recognition, including garbage Classification Detection, element Detection, and certificate Photo Quality Review. | Use for garbage Classification Detection, element Detection, certificate Photo Quality Review, and related image or video generation, enhancement, detection, segmentation, and visual analysis. | 9 | 0.001 |
| `solana-foundation/alibaba/imageseg` | Alibaba Cloud Image Segmentation | ai_ml | <https://imageseg.alibaba.gateway-402.com> | Run image and video analysis or generation with Alibaba Cloud Image Segmentation, including sky Replacement, facial Feature Segmentation, and fine-Grained Mask Segmentation. | Use for sky Replacement, facial Feature Segmentation, fine-Grained Mask Segmentation, and related image or video generation, enhancement, detection, segmentation, and visual analysis. | 15 | 0.001 |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Alibaba Cloud Intelligent Speech Interaction | ai_ml | <https://intelligentspeechinteraction.alibaba.gateway-402.com> | Process speech and audio with Alibaba Cloud Intelligent Speech Interaction, including short-form voice command recognition, conversational speech input, and voice search, for transcription and voice workflows. | Use for short-form voice command recognition, conversational speech input, voice search, accessibility audio, and low-latency text-to-speech responses. | 2 | 0.0014 |
| `solana-foundation/alibaba/iqs` | Alibaba Cloud Information Query Service | search | <https://iqs.alibaba.gateway-402.com> | Search and retrieve data with Alibaba Cloud Information Query Service, including enhanced Search, general Search, and globalSearch - International Version (To Be Published), for search and discovery workflows. | Use for enhanced Search, general Search, globalSearch - International Version (To Be Published), and related catalog discovery, skill lookup, and search routing. | 9 | 0.001 |
| `solana-foundation/alibaba/ivpd` | Alibaba Cloud IVPD | ai_ml | <https://ivpd.alibaba.gateway-402.com> | Run image and video analysis or generation with Alibaba Cloud IVPD, including resize Image, element detection, and style Transfer. | Use for resize Image, element detection, style Transfer, and related image or video generation, enhancement, detection, segmentation, and visual analysis. | 9 | 0.001 |
| `solana-foundation/alibaba/machinetranslation` | Alibaba Cloud Machine Translation | ai_ml | <https://machinetranslation.alibaba.gateway-402.com> | Translate text with Alibaba Cloud Machine Translation's REST APIs for general-purpose and e-commerce scenarios. | Use for synchronous text translation, localization, buyer-seller communication, and e-commerce content workflows that need Alibaba Cloud's classic translation engines. | 2 | 0.001 |
| `solana-foundation/alibaba/objectdet` | Alibaba Cloud Object Detection | ai_ml | <https://objectdet.alibaba.gateway-402.com> | Run image and video analysis or generation with Alibaba Cloud Object Detection, including iPC Image Object Detection, cat and Mouse Recognition, and entity Detection. | Use for iPC Image Object Detection, cat and Mouse Recognition, entity Detection, and related image or video generation, enhancement, detection, segmentation, and visual analysis. | 8 | 0.001 |
| `solana-foundation/alibaba/ocr` | Alibaba Cloud Model Studio OCR | ai_ml | <https://ocr.alibaba.gateway-402.com> | Extract text and structured content from images with Qwen OCR through Alibaba Cloud Model Studio's OpenAI-compatible chat completions API. | Use for receipt extraction, invoice parsing, document OCR, table extraction, and multilingual image text recognition. | 1 | 0.001 |
| `solana-foundation/alibaba/ocr-api` | Alibaba Cloud OCR API | ai_ml | <https://ocr-api.alibaba.gateway-402.com> | Extract text and structured document data with Alibaba Cloud OCR API, including high-Precision Full-Text Recognition, air Travel Itinerary Recognition, and unified OCR Recognition, for OCR workflows. | Use for high-Precision Full-Text Recognition, air Travel Itinerary Recognition, unified OCR Recognition, and related document OCR, structured extraction, and image-to-text parsing. | 75 | 0.001 |
| `solana-foundation/alibaba/paimodelgallery` | Alibaba Cloud PAI Model Gallery | ai_ml | <https://paimodelgallery.alibaba.gateway-402.com> | Search and retrieve data with Alibaba Cloud PAI Model Gallery, including retrieve the ModelGallery model list, for search and discovery workflows. | Use for retrieve the ModelGallery model list, and related catalog discovery, skill lookup, and search routing. | 1 | 0.001 |
| `solana-foundation/alibaba/rai` | Alibaba Cloud Responsible AI | ai_ml | <https://rai.alibaba.gateway-402.com> | Run moderation, verification, and risk checks with Alibaba Cloud Responsible AI, including batch content synchronization detection, synchronize detection for a single piece of content, and synchronous Detection of Model Input Content. | Use for batch content synchronization detection, synchronize detection for a single piece of content, synchronous Detection of Model Input Content, and related moderation, compliance, identity verification, fraud screening, and risk analysis. | 4 | 0.001 |
| `solana-foundation/alibaba/saf` | Alibaba Cloud SAF | ai_ml | <https://saf.alibaba.gateway-402.com> | Run moderation, verification, and risk checks with Alibaba Cloud SAF, including multi-Scenario Risk Identification and Detection, decision Engine for Malaysian Cluster, and decision Engine Singapore Cluster. | Use for multi-Scenario Risk Identification and Detection, decision Engine for Malaysian Cluster, decision Engine Singapore Cluster, and related moderation, compliance, identity verification, fraud screening, and risk analysis. | 4 | 0.001 |
| `solana-foundation/alibaba/speech` | Alibaba Cloud Model Studio Speech Recognition | ai_ml | <https://speech.alibaba.gateway-402.com> | Transcribe audio files with Qwen ASR through Alibaba Cloud Model Studio's asynchronous speech recognition API. | Use for audio transcription, meeting notes, subtitle generation, interview transcription, voice note processing, and multilingual speech-to-text. | 2 | 3.5e-05 |
| `solana-foundation/alibaba/texttospeech` | Alibaba Cloud Model Studio Text-to-Speech | ai_ml | <https://texttospeech.alibaba.gateway-402.com> | Synthesize speech with Qwen TTS through Alibaba Cloud Model Studio's multimodal generation API. | Use for voiceovers, accessibility audio, narration, dubbing, spoken product copy, and synthetic voice generation. | 1 | 0 |
| `solana-foundation/alibaba/translate` | Alibaba Cloud Model Studio Translation | ai_ml | <https://translate.alibaba.gateway-402.com> | Translate text with Qwen-MT through Alibaba Cloud Model Studio's OpenAI-compatible chat completions API. | Use for single-turn machine translation, localization, multilingual content generation, and cross-language messaging. | 1 | 0.001 |
| `solana-foundation/alibaba/viapi-ocr` | Alibaba Cloud OCR (VIAPI) | ai_ml | <https://viapi-ocr.alibaba.gateway-402.com> | Extract text and structured document data with Alibaba Cloud OCR (VIAPI), including bank Card Recognition, business License Recognition, and general Recognition, for OCR workflows. | Use for bank Card Recognition, business License Recognition, general Recognition, and related document OCR, structured extraction, and image-to-text parsing. | 15 | 0.001 |
| `solana-foundation/alibaba/videoenhan` | Alibaba Cloud Video Enhancement | ai_ml | <https://videoenhan.alibaba.gateway-402.com> | Run image and video analysis or generation with Alibaba Cloud Video Enhancement, including video Rendering Intent, video Aspect Ratio Transformation, and video Portrait Enhancement. | Use for video Rendering Intent, video Aspect Ratio Transformation, video Portrait Enhancement, and related image or video generation, enhancement, detection, segmentation, and visual analysis. | 10 | 0.001 |
| `solana-foundation/alibaba/videorecog` | Alibaba Cloud Video Recognition | ai_ml | <https://videorecog.alibaba.gateway-402.com> | Run image and video analysis or generation with Alibaba Cloud Video Recognition, including shot parsing, video Quality Assessment, and video Thumbnail. | Use for shot parsing, video Quality Assessment, video Thumbnail, and related image or video generation, enhancement, detection, segmentation, and visual analysis. | 6 | 0.001 |
| `solana-foundation/alibaba/videoseg` | Alibaba Cloud Video Segmentation | ai_ml | <https://videoseg.alibaba.gateway-402.com> | Run image and video analysis or generation with Alibaba Cloud Video Segmentation, including video Portrait Segmentation. | Use for video Portrait Segmentation, and related image or video generation, enhancement, detection, segmentation, and visual analysis. | 1 | 0.001 |
| `solana-foundation/google/addressvalidation` | Address Validation API | maps | <https://addressvalidation.google.gateway-402.com> | Validate, normalize, and geocode postal addresses worldwide. Returns deliverability verdicts, address component fixes, geocoded coordinates, USPS metadata, plus residential, commercial, and PO Box handling across 200+ countries. | Use for checkout and shipping validation, CRM address cleanup, fraud checks, geocoding, postal code validation, deliverability scoring, standardizing user-entered addresses, and confirming residential, business, or PO Box destinations. | 1 | 0.001 |
| `solana-foundation/google/airquality` | Air Quality API | maps | <https://airquality.google.gateway-402.com> | Look up current, historical, and forecast air quality for global coordinates. Returns AQI, pollutant concentrations (PM2.5, PM10, O3, NO2, SO2, CO), health recommendations, local indexes, and heatmap tiles for maps. | Use for pollution checks, health risk guidance, outdoor activity planning, environmental monitoring, travel decisions, climate dashboards, school or workplace safety alerts, and map overlays showing AQI or pollutant heatmaps. | 4 | 0.001 |
| `solana-foundation/google/bigquery` | BigQuery API | data | <https://bigquery.google.gateway-402.com> | Run SQL over BigQuery and 255 public datasets: crypto, weather, healthcare, genomics, patents, GitHub, PyPI, Stack Overflow, census, Wikipedia, real estate, transportation, satellite imagery, NLP corpora, SEC filings, and IoT. | Use for data analytics, market research, fact-finding from public datasets, blockchain and crypto analysis, weather and climate queries, SQL exploration, benchmark datasets, investigative research, and large-scale structured data retrieval. | 2 | 0 |
| `solana-foundation/google/civicinfo` | Google Civic Information API | search | <https://civicinfo.google.gateway-402.com> | Look up US civic data by address: elected representatives, offices, political divisions, elections, polling locations, ballot contests, and voter guidance, with official contact info, social links, photos, and district metadata. | Use for finding elected officials, election lookup, polling place search, ballot and contest research, political district mapping, civic engagement tools, voter guidance, officeholder contact data, and address-to-district resolution. | 3 | 0 |
| `solana-foundation/google/documentai` | Cloud Document AI API | ai_ml | <https://documentai.google.gateway-402.com> | Extract structured data from PDFs, scans, and document images using OCR and ML. Handles invoices, receipts, forms, contracts, tax documents, IDs, and custom schemas, returning text, tables, entities, fields, and confidence signals. | Use for invoice and receipt parsing, OCR on scanned files, form digitization, contract analysis, tax document processing, ID extraction, table extraction, document classification, custom schema extraction, and human-review workflows. | 0 | 0 |
| `solana-foundation/google/factchecktools` | Fact Check Tools API | search | <https://factchecktools.google.gateway-402.com> | Search Google ClaimReview fact-check data across 100+ publishers. Returns checked claims, ratings, claimants, publishers, review URLs, claim dates, and pages for politics, health, science, viral images, and misinformation. | Use for claim verification, misinformation checks, media literacy tools, newsroom research, health or science claim review, political fact-check lookup, viral rumor triage, source citation, and finding prior fact-check coverage. | 1 | 0 |
| `solana-foundation/google/generativelanguage` | Generative Language API (Gemini) | ai_ml | <https://generativelanguage.google.gateway-402.com> | Use Google Gemini models for text generation, multimodal image/audio/video understanding, chat, embeddings, code generation, JSON output, function calling, cached context, file search, grounding with Google Search, and fine-tuned models. | Use for AI chat, text generation, summarization, code help, image and video understanding, embeddings, semantic retrieval, tool calling, structured JSON output, grounded answers, batch generation, cached prompts, and tuned model workflows. | 1 | 0 |
| `solana-foundation/google/kgsearch` | Knowledge Graph Search API | search | <https://kgsearch.google.gateway-402.com> | Search Google Knowledge Graph for entities including people, places, organizations, events, and things. Returns canonical names, descriptions, types, URLs, images, detailed scores, and structured identifiers from 500B+ facts. | Use for entity lookup, name disambiguation, canonical descriptions, enriching search results, finding official URLs or images, resolving people, places, brands, and organizations, and attaching structured knowledge to records. | 1 | 0 |
| `solana-foundation/google/language` | Cloud Natural Language API | ai_ml | <https://language.google.gateway-402.com> | Analyze text with Google NLP: sentiment, emotion, named entities, entity salience, content categories, moderation categories, syntax, and all-in-one annotation. Supports multilingual text analytics for documents, reviews, tickets, and articles. | Use for sentiment analysis, opinion mining, entity extraction, content classification, moderation triage, support ticket routing, review analytics, article tagging, syntax analysis, document annotation, and multilingual text intelligence. | 5 | 0.001 – 0.002 |
| `solana-foundation/google/places` | Places API (New) | maps | <https://places.google.gateway-402.com> | Search and inspect Google Places worldwide. Find businesses and points of interest, run nearby or text search, autocomplete addresses, retrieve place details, ratings, reviews, hours, photos, contact info, websites, and location metadata. | Use for restaurant and business search, hotel and POI lookup, local discovery, address autocomplete, nearby search, ratings and review lookup, opening-hours checks, store locators, lead generation, and place metadata enrichment. | 3 | 0.001 |
| `solana-foundation/google/speech` | Cloud Speech-to-Text API | ai_ml | <https://speech.google.gateway-402.com> | Convert speech audio to text with Google Speech-to-Text. Supports 125+ languages, short and long audio, streaming-style workflows, speaker diarization, word timestamps, phrase hints, custom classes, profanity filtering, and punctuation. | Use for audio transcription, meeting notes, podcast and video captions, call center analytics, voice command processing, accessibility, diarized conversations, timestamped transcripts, domain vocabulary hints, and long audio jobs. | 1 | 0.016 |
| `solana-foundation/google/texttospeech` | Cloud Text-to-Speech API | ai_ml | <https://texttospeech.google.gateway-402.com> | Generate natural-sounding speech from text or SSML in 50+ languages and 380+ voices. Supports pitch, speed, effects profiles, MP3/WAV/OGG output, long-form synthesis, and Neural2/Studio voice models for production audio. | Use for voiceovers, IVR and phone prompts, accessibility audio, audiobook generation, language learning, pronunciation previews, product narration, support bots, podcast snippets, SSML-controlled speech, and long-form narration. | 2 | 3e-05 |
| `solana-foundation/google/translate` | Cloud Translation API | ai_ml | <https://translate.google.gateway-402.com> | Translate text and documents across 130+ languages. Supports language detection, romanization, synchronous and batch translation, glossaries for domain terminology, adaptive MT datasets, custom models, and document formatting. | Use for multilingual content, localization, document translation, language detection, cross-language communication, glossary-controlled terminology, romanization, batch translation jobs, adaptive MT, and custom translation models. | 0 | 0 |
| `solana-foundation/google/videointelligence` | Cloud Video Intelligence API | ai_ml | <https://videointelligence.google.gateway-402.com> | Analyze video content asynchronously with Google Video Intelligence. Detect labels, shots, explicit content, speech, on-screen text, logos, object tracks, scene changes, and searchable metadata for uploaded or cloud-hosted videos. | Use for video indexing, content moderation, scene and shot detection, object tracking, logo recognition, OCR on video frames, speech transcription, media search, compliance review, archive tagging, and extracting structured video metadata. | 1 | 0.1 |
| `solana-foundation/google/vision` | Cloud Vision API | ai_ml | <https://vision.google.gateway-402.com> | Analyze images with Google Cloud Vision ML. Detect objects, faces, text/OCR, labels, landmarks, logos, safe-search signals, web entities, crop hints, dominant colors, and product-search reference images across image, PDF, and TIFF inputs. | Use for OCR, image labeling, object and face detection, content moderation, logo and landmark recognition, product search, PDF/TIFF text extraction, web entity lookup, crop hints, color analysis, and visual metadata enrichment. | 4 | 0.0015 |

---

## Per-provider payment table

Each row is one challenge offer (network × asset × payTo). A provider that accepts USDC, USDT, and CASH on Solana via MPP appears in three rows; a provider with multi-network x402 also expands across rows. See the **Provider descriptions** section above for what each provider does.

| Provider (fqn) | Title | Category | Protocol | Chain | Asset | payTo | Probe price (USD) |
|----------------|-------|----------|----------|-------|-------|-------|------------------:|
| `agentmail/email` | AgentMail | messaging | x402 | Base | USDC | `0x6e3184C204e596dED89E8A5693B602097F4Ab687` | 10.000000 |
| `agentmail/email` | AgentMail | messaging | x402 | Solana mainnet | USDC | `7r4e5dwNS68MDaxbw7N8jbzHq7RCMBp9z6smHFH4NXWw` | 10.000000 |
| `agentmail/email` | AgentMail | messaging | x402 | Avalanche | USDC | `0x6e3184C204e596dED89E8A5693B602097F4Ab687` | 10.000000 |
| `agentmail/email` | AgentMail | messaging | x402 | X Layer | ERC20:0x74b7f16337b8972027f6196a17a631ac6de26d22 | `0x6e3184C204e596dED89E8A5693B602097F4Ab687` | 10.000000 |
| `crushrewards/pricing` | Crush Rewards | data | x402 | Solana mainnet | USDC | `2hYY7wHhXsoWnskQRzYFUNH7YboXNMEqbGnAFHpRuB2W` | 0.020000 |
| `crushrewards/pricing` | Crush Rewards | data | x402 | Base | USDC | `0xe2e662cF219025AFC0C9Bf850b6a2B0a0b5517fe` | 0.020000 |
| `crushrewards/pricing` | Crush Rewards | data | MPP | Tempo | USD (Tempo) | `0xe2e662cF219025AFC0C9Bf850b6a2B0a0b5517fe` | 0.020000 |
| `dtelecom/voice` | dTelecom | ai_ml | x402 | Base | USDC | `0x47d3394c7234714E4B9e9b74827c12bE847F9DDA` | 0.000000 |
| `dtelecom/voice` | dTelecom | ai_ml | x402 | Solana mainnet | USDC | `8MPzJeXx1RipFmRADExptc3UK4EV3nhEFN6NRSx7o7jm` | 0.000000 |
| `merit-systems/stablecrypto/market-data` | StableCrypto | finance | x402 | Base | USDC | `0x124F620b4F3b53559Cd9148c9b1B2773ca104478` | 0.010000 |
| `merit-systems/stablecrypto/market-data` | StableCrypto | finance | x402 | Solana mainnet | USDC | `BX1v9we4BCt28GM3hWwfXwnXDXpYHKWMFcWaHNytnbNL` | 0.010000 |
| `merit-systems/stablecrypto/market-data` | StableCrypto | finance | MPP | Tempo | USD (Tempo) | `0x124F620b4F3b53559Cd9148c9b1B2773ca104478` | 0.010000 |
| `merit-systems/stabledomains/domains` | StableDomains | productivity | — | — | — | _no challenge (HTTP 400)_ | — |
| `merit-systems/stableemail/email` | StableEmail | messaging | x402 | Base | USDC | `0xdb5aa553feeb2c3e3d03e8360b36fb0f7e480671` | 0.001000 |
| `merit-systems/stableemail/email` | StableEmail | messaging | x402 | Solana mainnet | USDC | `29XqFRpqRrXs8UjSsZnscqW3cTxNdY84qfaa9BGo3y4j` | 0.001000 |
| `merit-systems/stableemail/email` | StableEmail | messaging | MPP | Tempo | USD (Tempo) | `0xdb5aa553feeb2c3e3d03e8360b36fb0f7e480671` | 0.001000 |
| `merit-systems/stableenrich/enrichment` | StableEnrich | data | x402 | Base | USDC | `0x325bdF6F7efAB24a2210c48c1b64cAb2eAe1d430` | 0.049500 |
| `merit-systems/stableenrich/enrichment` | StableEnrich | data | x402 | Solana mainnet | USDC | `6cvgmdrsVxyiuPzqMCSBnS7fAmA5Mk2VG4BcfVhC8jdC` | 0.049500 |
| `merit-systems/stableenrich/enrichment` | StableEnrich | data | MPP | Tempo | USD (Tempo) | `0x325bdF6F7efAB24a2210c48c1b64cAb2eAe1d430` | 0.049500 |
| `merit-systems/stablemerch/merchandise` | StableMerch | productivity | — | — | — | _no challenge (HTTP 400)_ | — |
| `merit-systems/stablephone/calls` | StablePhone | messaging | x402 | Base | USDC | `0xD219dB8179Bb9C1899eF87f39eebA9D1070c6801` | 0.050000 |
| `merit-systems/stablephone/calls` | StablePhone | messaging | x402 | Solana mainnet | USDC | `HgZtbsqE7MdPcUipeuiiNEMuLByDAXE4X9qrH1w6LdDz` | 0.050000 |
| `merit-systems/stablephone/calls` | StablePhone | messaging | MPP | Tempo | USD (Tempo) | `0xD219dB8179Bb9C1899eF87f39eebA9D1070c6801` | 0.050000 |
| `merit-systems/stablesocial/social-data` | StableSocial | media | x402 | Base | USDC | `0xCfA26F13c6C18307033EcE13BBb8F470dA5b4dbE` | 0.060000 |
| `merit-systems/stablesocial/social-data` | StableSocial | media | x402 | Solana mainnet | USDC | `Ab4tooTiV5tWj5tiYHnw2t2p4QHcYjEMd4ZboB8JpF5q` | 0.060000 |
| `merit-systems/stablesocial/social-data` | StableSocial | media | MPP | Tempo | USD (Tempo) | `0xCfA26F13c6C18307033EcE13BBb8F470dA5b4dbE` | 0.060000 |
| `merit-systems/stablestudio/media-generation` | StableStudio | media | — | — | — | _no challenge (HTTP 400)_ | — |
| `merit-systems/stableupload/hosting` | StableUpload | storage | — | — | — | _no challenge (HTTP 400)_ | — |
| `paysponge/perplexity` | Perplexity AI API | ai_ml | x402 | Base | USDC | `0xD73912BA30832328a3db96BeE73ebfaB58b7429f` | 0.010000 |
| `paysponge/perplexity` | Perplexity AI API | ai_ml | x402 | Solana mainnet | USDC | `9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ` | 0.010000 |
| `paysponge/rentcast` | RentCast API | data | x402 | Base | USDC | `0xD73912BA30832328a3db96BeE73ebfaB58b7429f` | 0.010000 |
| `paysponge/rentcast` | RentCast API | data | x402 | Solana mainnet | USDC | `9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ` | 0.010000 |
| `purch/marketplace` | Purch | productivity | x402 | Solana mainnet | USDC | `8LiXrHC61irY8qwj6qevoiRXxYfrTgSaHVbm8rav6HT2` | 0.010000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Base Sepolia (testnet) | ERC20:0x036CbD53842c5426634e7929541eC2318f3dCF7e | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 1.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Base Sepolia (testnet) | ERC20:0x036CbD53842c5426634e7929541eC2318f3dCF7e | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Base Sepolia (testnet) | ERC20:0x036CbD53842c5426634e7929541eC2318f3dCF7e | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.000100 |
| `quicknode/rpc` | QuickNode | compute | x402 | Base | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 10.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Base | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Base | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.000100 |
| `quicknode/rpc` | QuickNode | compute | x402 | Polygon Amoy (testnet) | ERC20:0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 1.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Polygon Amoy (testnet) | ERC20:0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Polygon Amoy (testnet) | ERC20:0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.000100 |
| `quicknode/rpc` | QuickNode | compute | x402 | Polygon | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 10.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Polygon | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Polygon | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.000100 |
| `quicknode/rpc` | QuickNode | compute | x402 | X Layer | ERC20:0x4ae46a509F6b1D9056937BA4500cb143933D2dc8 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 10.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | X Layer | ERC20:0x4ae46a509F6b1D9056937BA4500cb143933D2dc8 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | eip155:1952 (unknown) | ERC20:0xF0863D7A29a55d0c4263c11bFac754312ff078DF | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 1.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | eip155:1952 (unknown) | ERC20:0xF0863D7A29a55d0c4263c11bFac754312ff078DF | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | eip155:5042002 (unknown) | ERC20:0x3600000000000000000000000000000000000000 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 1.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | eip155:5042002 (unknown) | ERC20:0x3600000000000000000000000000000000000000 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | eip155:5042002 (unknown) | ERC20:0x3600000000000000000000000000000000000000 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` | 0.000100 |
| `quicknode/rpc` | QuickNode | compute | x402 | Solana devnet (probable) | SPL:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU | `2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57` | 1.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Solana devnet (probable) | SPL:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU | `2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57` | 0.001000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Solana mainnet | USDC | `2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57` | 10.000000 |
| `quicknode/rpc` | QuickNode | compute | x402 | Solana mainnet | USDC | `2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57` | 0.001000 |
| `socialintel/influencer-search` | Social Intel | data | — | — | — | _no challenge (HTTP 301)_ | — |
| `solana-foundation/alibaba/agentexplorer` | Alibaba Cloud Agent Skills Explorer | search | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/agentexplorer` | Alibaba Cloud Agent Skills Explorer | search | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/agentexplorer` | Alibaba Cloud Agent Skills Explorer | search | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/aigen` | Alibaba Cloud AI Generation | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/aigen` | Alibaba Cloud AI Generation | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/aigen` | Alibaba Cloud AI Generation | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/anytrans` | Alibaba Cloud AnyTrans | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/anytrans` | Alibaba Cloud AnyTrans | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/anytrans` | Alibaba Cloud AnyTrans | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/captcha` | Alibaba Cloud CAPTCHA | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/captcha` | Alibaba Cloud CAPTCHA | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/captcha` | Alibaba Cloud CAPTCHA | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/cloudauth` | Alibaba Cloud Cloudauth | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/cloudauth` | Alibaba Cloud Cloudauth | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/cloudauth` | Alibaba Cloud Cloudauth | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/cloudauth-intl` | Alibaba Cloud Cloudauth International | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/cloudauth-intl` | Alibaba Cloud Cloudauth International | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/cloudauth-intl` | Alibaba Cloud Cloudauth International | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/contactcenterai` | Alibaba Cloud Contact Center AI | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/contactcenterai` | Alibaba Cloud Contact Center AI | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/contactcenterai` | Alibaba Cloud Contact Center AI | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/documentparseservice` | Alibaba Cloud Document Parse Service | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/documentparseservice` | Alibaba Cloud Document Parse Service | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/documentparseservice` | Alibaba Cloud Document Parse Service | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/edututor` | Alibaba Cloud EduTutor | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/edututor` | Alibaba Cloud EduTutor | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/edututor` | Alibaba Cloud EduTutor | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/embeddings` | Alibaba Cloud Model Studio Embeddings | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000700 |
| `solana-foundation/alibaba/embeddings` | Alibaba Cloud Model Studio Embeddings | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000700 |
| `solana-foundation/alibaba/embeddings` | Alibaba Cloud Model Studio Embeddings | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000700 |
| `solana-foundation/alibaba/facebody` | Alibaba Cloud Facebody | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/facebody` | Alibaba Cloud Facebody | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/facebody` | Alibaba Cloud Facebody | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/farui` | Alibaba Cloud FaRui | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/farui` | Alibaba Cloud FaRui | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/farui` | Alibaba Cloud FaRui | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/goodstech` | Alibaba Cloud Goods Tech | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/goodstech` | Alibaba Cloud Goods Tech | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/goodstech` | Alibaba Cloud Goods Tech | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/green` | Alibaba Cloud Green | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/green` | Alibaba Cloud Green | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/green` | Alibaba Cloud Green | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imageaudit` | Alibaba Cloud Image Audit | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imageaudit` | Alibaba Cloud Image Audit | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imageaudit` | Alibaba Cloud Image Audit | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imagerecog` | Alibaba Cloud Image Recognition | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imagerecog` | Alibaba Cloud Image Recognition | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imagerecog` | Alibaba Cloud Image Recognition | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imageseg` | Alibaba Cloud Image Segmentation | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imageseg` | Alibaba Cloud Image Segmentation | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/imageseg` | Alibaba Cloud Image Segmentation | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Alibaba Cloud Intelligent Speech Interaction | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001400 |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Alibaba Cloud Intelligent Speech Interaction | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001400 |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Alibaba Cloud Intelligent Speech Interaction | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001400 |
| `solana-foundation/alibaba/iqs` | Alibaba Cloud Information Query Service | search | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/iqs` | Alibaba Cloud Information Query Service | search | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/iqs` | Alibaba Cloud Information Query Service | search | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ivpd` | Alibaba Cloud IVPD | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ivpd` | Alibaba Cloud IVPD | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ivpd` | Alibaba Cloud IVPD | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/machinetranslation` | Alibaba Cloud Machine Translation | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/machinetranslation` | Alibaba Cloud Machine Translation | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/machinetranslation` | Alibaba Cloud Machine Translation | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/objectdet` | Alibaba Cloud Object Detection | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/objectdet` | Alibaba Cloud Object Detection | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/objectdet` | Alibaba Cloud Object Detection | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ocr` | Alibaba Cloud Model Studio OCR | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ocr` | Alibaba Cloud Model Studio OCR | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ocr` | Alibaba Cloud Model Studio OCR | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ocr-api` | Alibaba Cloud OCR API | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ocr-api` | Alibaba Cloud OCR API | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/ocr-api` | Alibaba Cloud OCR API | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/paimodelgallery` | Alibaba Cloud PAI Model Gallery | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/paimodelgallery` | Alibaba Cloud PAI Model Gallery | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/paimodelgallery` | Alibaba Cloud PAI Model Gallery | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/rai` | Alibaba Cloud Responsible AI | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/rai` | Alibaba Cloud Responsible AI | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/rai` | Alibaba Cloud Responsible AI | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/saf` | Alibaba Cloud SAF | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/saf` | Alibaba Cloud SAF | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/saf` | Alibaba Cloud SAF | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/speech` | Alibaba Cloud Model Studio Speech Recognition | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000035 |
| `solana-foundation/alibaba/speech` | Alibaba Cloud Model Studio Speech Recognition | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000035 |
| `solana-foundation/alibaba/speech` | Alibaba Cloud Model Studio Speech Recognition | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000035 |
| `solana-foundation/alibaba/texttospeech` | Alibaba Cloud Model Studio Text-to-Speech | ai_ml | — | — | — | _no challenge (HTTP 500)_ | — |
| `solana-foundation/alibaba/translate` | Alibaba Cloud Model Studio Translation | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/translate` | Alibaba Cloud Model Studio Translation | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/translate` | Alibaba Cloud Model Studio Translation | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/viapi-ocr` | Alibaba Cloud OCR (VIAPI) | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/viapi-ocr` | Alibaba Cloud OCR (VIAPI) | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/viapi-ocr` | Alibaba Cloud OCR (VIAPI) | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videoenhan` | Alibaba Cloud Video Enhancement | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videoenhan` | Alibaba Cloud Video Enhancement | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videoenhan` | Alibaba Cloud Video Enhancement | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videorecog` | Alibaba Cloud Video Recognition | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videorecog` | Alibaba Cloud Video Recognition | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videorecog` | Alibaba Cloud Video Recognition | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videoseg` | Alibaba Cloud Video Segmentation | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videoseg` | Alibaba Cloud Video Segmentation | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/alibaba/videoseg` | Alibaba Cloud Video Segmentation | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/addressvalidation` | Address Validation API | maps | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/addressvalidation` | Address Validation API | maps | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/addressvalidation` | Address Validation API | maps | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/airquality` | Air Quality API | maps | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/airquality` | Air Quality API | maps | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/airquality` | Air Quality API | maps | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/bigquery` | BigQuery API | data | — | — | — | _no challenge (HTTP 404)_ | — |
| `solana-foundation/google/civicinfo` | Google Civic Information API | search | — | — | — | _no challenge (HTTP 400)_ | — |
| `solana-foundation/google/documentai` |  |  | — | — | — | _no challenge (HTTP None)_ | — |
| `solana-foundation/google/factchecktools` | Fact Check Tools API | search | — | — | — | _no challenge (HTTP 400)_ | — |
| `solana-foundation/google/generativelanguage` | Generative Language API (Gemini) | ai_ml | — | — | — | _no challenge (HTTP 200)_ | — |
| `solana-foundation/google/kgsearch` | Knowledge Graph Search API | search | — | — | — | _no challenge (HTTP 400)_ | — |
| `solana-foundation/google/language` | Cloud Natural Language API | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/language` | Cloud Natural Language API | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/language` | Cloud Natural Language API | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/places` | Places API (New) | maps | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/places` | Places API (New) | maps | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/places` | Places API (New) | maps | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001000 |
| `solana-foundation/google/speech` | Cloud Speech-to-Text API | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.016000 |
| `solana-foundation/google/speech` | Cloud Speech-to-Text API | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.016000 |
| `solana-foundation/google/speech` | Cloud Speech-to-Text API | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.016000 |
| `solana-foundation/google/texttospeech` | Cloud Text-to-Speech API | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000030 |
| `solana-foundation/google/texttospeech` | Cloud Text-to-Speech API | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000030 |
| `solana-foundation/google/texttospeech` | Cloud Text-to-Speech API | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.000030 |
| `solana-foundation/google/translate` |  |  | — | — | — | _no challenge (HTTP None)_ | — |
| `solana-foundation/google/videointelligence` | Cloud Video Intelligence API | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.100000 |
| `solana-foundation/google/videointelligence` | Cloud Video Intelligence API | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.100000 |
| `solana-foundation/google/videointelligence` | Cloud Video Intelligence API | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.100000 |
| `solana-foundation/google/vision` | Cloud Vision API | ai_ml | MPP | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001500 |
| `solana-foundation/google/vision` | Cloud Vision API | ai_ml | MPP | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001500 |
| `solana-foundation/google/vision` | Cloud Vision API | ai_ml | MPP | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` | 0.001500 |

---

## Solana mainnet payment recipients (deduped)

12 unique Solana wallet addresses across 53 providers.

| Provider | Variant | Asset | payTo (Solana) |
|----------|---------|-------|----------------|
| `agentmail/email` | Solana mainnet | USDC | `7r4e5dwNS68MDaxbw7N8jbzHq7RCMBp9z6smHFH4NXWw` |
| `crushrewards/pricing` | Solana mainnet | USDC | `2hYY7wHhXsoWnskQRzYFUNH7YboXNMEqbGnAFHpRuB2W` |
| `dtelecom/voice` | Solana mainnet | USDC | `8MPzJeXx1RipFmRADExptc3UK4EV3nhEFN6NRSx7o7jm` |
| `merit-systems/stablecrypto/market-data` | Solana mainnet | USDC | `BX1v9we4BCt28GM3hWwfXwnXDXpYHKWMFcWaHNytnbNL` |
| `merit-systems/stableemail/email` | Solana mainnet | USDC | `29XqFRpqRrXs8UjSsZnscqW3cTxNdY84qfaa9BGo3y4j` |
| `merit-systems/stableenrich/enrichment` | Solana mainnet | USDC | `6cvgmdrsVxyiuPzqMCSBnS7fAmA5Mk2VG4BcfVhC8jdC` |
| `merit-systems/stablephone/calls` | Solana mainnet | USDC | `HgZtbsqE7MdPcUipeuiiNEMuLByDAXE4X9qrH1w6LdDz` |
| `merit-systems/stablesocial/social-data` | Solana mainnet | USDC | `Ab4tooTiV5tWj5tiYHnw2t2p4QHcYjEMd4ZboB8JpF5q` |
| `paysponge/perplexity` | Solana mainnet | USDC | `9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ` |
| `paysponge/rentcast` | Solana mainnet | USDC | `9hw9Py9uMGtXRNpABZjifcK1t3suwzjyri9L9QYKg6zZ` |
| `purch/marketplace` | Solana mainnet | USDC | `8LiXrHC61irY8qwj6qevoiRXxYfrTgSaHVbm8rav6HT2` |
| `quicknode/rpc` | Solana devnet (probable) | SPL:4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU | `2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57` |
| `quicknode/rpc` | Solana mainnet | USDC | `2LWbc9Mi6dRUrdEHBttoNS4udDtH1A4xwBdm1EKqcT57` |
| `solana-foundation/alibaba/agentexplorer` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/agentexplorer` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/agentexplorer` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/aigen` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/aigen` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/aigen` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/anytrans` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/anytrans` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/anytrans` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/captcha` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/captcha` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/captcha` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/cloudauth` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/cloudauth` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/cloudauth` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/cloudauth-intl` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/cloudauth-intl` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/cloudauth-intl` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/contactcenterai` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/contactcenterai` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/contactcenterai` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/documentparseservice` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/documentparseservice` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/documentparseservice` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/edututor` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/edututor` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/edututor` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/embeddings` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/embeddings` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/embeddings` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/facebody` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/facebody` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/facebody` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/farui` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/farui` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/farui` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/goodstech` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/goodstech` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/goodstech` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/green` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/green` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/green` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imageaudit` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imageaudit` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imageaudit` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imagerecog` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imagerecog` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imagerecog` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imageseg` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imageseg` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/imageseg` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/intelligentspeechinteraction` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/iqs` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/iqs` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/iqs` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ivpd` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ivpd` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ivpd` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/machinetranslation` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/machinetranslation` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/machinetranslation` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/objectdet` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/objectdet` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/objectdet` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ocr` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ocr` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ocr` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ocr-api` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ocr-api` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/ocr-api` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/paimodelgallery` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/paimodelgallery` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/paimodelgallery` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/rai` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/rai` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/rai` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/saf` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/saf` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/saf` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/speech` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/speech` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/speech` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/translate` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/translate` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/translate` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/viapi-ocr` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/viapi-ocr` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/viapi-ocr` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videoenhan` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videoenhan` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videoenhan` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videorecog` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videorecog` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videorecog` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videoseg` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videoseg` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/alibaba/videoseg` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/addressvalidation` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/addressvalidation` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/addressvalidation` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/airquality` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/airquality` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/airquality` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/language` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/language` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/language` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/places` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/places` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/places` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/speech` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/speech` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/speech` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/texttospeech` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/texttospeech` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/texttospeech` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/videointelligence` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/videointelligence` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/videointelligence` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/vision` | Solana mainnet (MPP) | CASH | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/vision` | Solana mainnet (MPP) | USDC | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |
| `solana-foundation/google/vision` | Solana mainnet (MPP) | USDT | `Cs2zdfUNonRdRGsiZUQQLdTxzxVvJZmgiX2mpLYKuEqP` |

## EVM (non-Tempo) payment recipients (deduped)

| Provider | Chain | Asset | payTo |
|----------|-------|-------|-------|
| `agentmail/email` | Avalanche | USDC | `0x6e3184C204e596dED89E8A5693B602097F4Ab687` |
| `agentmail/email` | Base | USDC | `0x6e3184C204e596dED89E8A5693B602097F4Ab687` |
| `agentmail/email` | X Layer | ERC20:0x74b7f16337b8972027f6196a17a631ac6de26d22 | `0x6e3184C204e596dED89E8A5693B602097F4Ab687` |
| `crushrewards/pricing` | Base | USDC | `0xe2e662cF219025AFC0C9Bf850b6a2B0a0b5517fe` |
| `dtelecom/voice` | Base | USDC | `0x47d3394c7234714E4B9e9b74827c12bE847F9DDA` |
| `merit-systems/stablecrypto/market-data` | Base | USDC | `0x124F620b4F3b53559Cd9148c9b1B2773ca104478` |
| `merit-systems/stableemail/email` | Base | USDC | `0xdb5aa553feeb2c3e3d03e8360b36fb0f7e480671` |
| `merit-systems/stableenrich/enrichment` | Base | USDC | `0x325bdF6F7efAB24a2210c48c1b64cAb2eAe1d430` |
| `merit-systems/stablephone/calls` | Base | USDC | `0xD219dB8179Bb9C1899eF87f39eebA9D1070c6801` |
| `merit-systems/stablesocial/social-data` | Base | USDC | `0xCfA26F13c6C18307033EcE13BBb8F470dA5b4dbE` |
| `paysponge/perplexity` | Base | USDC | `0xD73912BA30832328a3db96BeE73ebfaB58b7429f` |
| `paysponge/rentcast` | Base | USDC | `0xD73912BA30832328a3db96BeE73ebfaB58b7429f` |
| `quicknode/rpc` | Base | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |
| `quicknode/rpc` | Base Sepolia (testnet) | ERC20:0x036CbD53842c5426634e7929541eC2318f3dCF7e | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |
| `quicknode/rpc` | Polygon | USDC | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |
| `quicknode/rpc` | Polygon Amoy (testnet) | ERC20:0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |
| `quicknode/rpc` | X Layer | ERC20:0x4ae46a509F6b1D9056937BA4500cb143933D2dc8 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |
| `quicknode/rpc` | eip155:1952 (unknown) | ERC20:0xF0863D7A29a55d0c4263c11bFac754312ff078DF | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |
| `quicknode/rpc` | eip155:5042002 (unknown) | ERC20:0x3600000000000000000000000000000000000000 | `0xF46394adDdA95A3d5bCC1124605E3d15D204623C` |

## Tempo (MPP chainId 4217) payment recipients (deduped)

| Provider | Asset | payTo |
|----------|-------|-------|
| `crushrewards/pricing` | USD (Tempo) | `0xe2e662cF219025AFC0C9Bf850b6a2B0a0b5517fe` |
| `merit-systems/stablecrypto/market-data` | USD (Tempo) | `0x124F620b4F3b53559Cd9148c9b1B2773ca104478` |
| `merit-systems/stableemail/email` | USD (Tempo) | `0xdb5aa553feeb2c3e3d03e8360b36fb0f7e480671` |
| `merit-systems/stableenrich/enrichment` | USD (Tempo) | `0x325bdF6F7efAB24a2210c48c1b64cAb2eAe1d430` |
| `merit-systems/stablephone/calls` | USD (Tempo) | `0xD219dB8179Bb9C1899eF87f39eebA9D1070c6801` |
| `merit-systems/stablesocial/social-data` | USD (Tempo) | `0xCfA26F13c6C18307033EcE13BBb8F470dA5b4dbE` |

---

## Providers without a usable challenge

These providers did not return a parseable 402 challenge for the probed endpoint. Causes typically: schema validation rejects empty body, endpoint requires authentication, redirect, or upstream error. A different endpoint or a body matching the spec would likely produce a challenge.

| Provider | HTTP status | Probed URL |
|----------|------------:|------------|
| `merit-systems/stabledomains/domains` | 400 | https://stabledomains.dev/api/check |
| `merit-systems/stablemerch/merchandise` | 400 | https://stablemerch.dev/api/heavyweight-shirt |
| `merit-systems/stablestudio/media-generation` | 400 | https://stablestudio.dev/api/generate/flux-2-max/edit |
| `merit-systems/stableupload/hosting` | 400 | https://stableupload.dev/api/site |
| `socialintel/influencer-search` | 301 | https://api.socialintel.dev/v1/search |
| `solana-foundation/alibaba/texttospeech` | 500 | https://texttospeech.alibaba.gateway-402.com/api/v1/services/aigc/multimodal-generation/generation |
| `solana-foundation/google/bigquery` | 404 | https://bigquery.google.gateway-402.com/projects/{projectId}/queries |
| `solana-foundation/google/civicinfo` | 400 | https://civicinfo.google.gateway-402.com/civicinfo/v2/divisions |
| `solana-foundation/google/documentai` | None | None |
| `solana-foundation/google/factchecktools` | 400 | https://factchecktools.google.gateway-402.com/v1alpha1/claims:search |
| `solana-foundation/google/generativelanguage` | 200 | https://generativelanguage.google.gateway-402.com/v1beta/models |
| `solana-foundation/google/kgsearch` | 400 | https://kgsearch.google.gateway-402.com/v1/entities:search |
| `solana-foundation/google/translate` | None | None |

---

## Methodology notes

- For each provider, the probe target was chosen by: prefer `pricing > 0 AND probe_status == 'ok'` from the registry; else any paid endpoint; else any endpoint.
- Request body was an empty JSON object `{}` for POST/PUT/PATCH; GET requests were sent as-is.
- x402 challenges are encoded as base64-JSON in the `payment-required` HTTP response header; one header carries an `accepts[]` array containing every accepted (network, asset, payTo) triple in the same response.
- MPP challenges are encoded as base64-JSON in the `request="..."` parameter of the `WWW-Authenticate: Payment …` header. Providers that accept multiple SPL tokens emit **one `WWW-Authenticate` header per token** in the same response (commonly USDC + USDT + CASH on Solana). All such headers are decoded; each becomes one row in the per-provider table.
- Solana MPP responses use `methodDetails.network = "mainnet"`; EVM/Tempo MPP responses use `methodDetails.chainId = 4217`.
- Asset labels (USDC/USDT/CASH) are derived by exact-match against a hard-coded registry of known stablecoin addresses; unknown assets are shown as raw addresses (e.g., `ERC20:0x…` or `SPL:…`). This labeling is **not** an on-chain verification.
- Some Solana MPP responses include `splits[]` describing fee distribution to operator/platform recipients in addition to the primary `recipient`. Only the primary `recipient` is shown above.
- The probe captures one snapshot in time. Provider operators can rotate `payTo`, change supported networks, or update prices without notice.
- Recipient addresses are returned as Base58 (Solana) or hex (EVM). EVM addresses are not normalized to checksum case — they are reproduced exactly as the provider returned them.
- The **Provider descriptions** section is sourced from `skills.json` directly (registry text), not from probe responses. The other sections are sourced from probes.

---

## How this report was produced (reproduction guide)

Anyone can regenerate this document by running the steps below. Total wall time is ~2 minutes (mostly the per-provider HTTP probes). No authentication or paid tokens are needed — every request is the unauthenticated 402 challenge that any HTTP client receives before payment.

### Prerequisites

- `curl`, `jq`, `python3` (3.10+), `bash` available on PATH.
- Outbound HTTPS access to `storage.googleapis.com` and to each provider's `service_url`.
- A scratch working directory. The scripts below default to `/tmp/pay-skills`.

### Step 1 — Fetch the registry index and per-provider JSON

The pay-skills registry is published as a static GCS bucket. The GitHub source repo (`solana-foundation/pay-skills`) is referenced by the dist JSON but **was not yet public at the time of this research** — the GCS dist is the only authoritative source.

```sh
mkdir -p /tmp/pay-skills/providers
cd /tmp/pay-skills

# 1a. Fetch the index of all providers (description, use_case, service_url, etc.).
curl -s https://storage.googleapis.com/pay-skills/v1/skills.json -o index.json

# 1b. Extract the list of fully-qualified provider names (fqn).
jq -r '.providers[].fqn' index.json > fqns.txt

# 1c. Fetch each provider's normalized JSON. The base URL is taken from index.json's `base_url`.
while read fqn; do
  mkdir -p "providers/$(dirname "$fqn")"
  curl -sf "https://storage.googleapis.com/pay-skills/v1/providers/${fqn}.json" \
    -o "providers/${fqn}.json" || echo "MISS: $fqn"
done < fqns.txt
```

After this step you have `index.json` plus 66 per-provider JSON files under `providers/`.

### Step 2 — Choose one probe target per provider

Each provider exposes many endpoints. We pick one representative endpoint per provider, preferring paid endpoints whose registry-side probe already succeeded. (Script omitted for brevity — see `/tmp/pay-skills/select_endpoints.py` in the working directory.)

### Step 3 — Probe each endpoint and capture every 402 challenge

We send an unauthenticated request to each target. POST/PUT/PATCH requests get an empty JSON body (`{}`) so most schema validators return a 402 rather than a 400. Two challenge formats are supported, and the parser must capture **all** challenge headers in the response (multi-token MPP providers emit several `WWW-Authenticate` headers in one response):

- **x402**: response carries one `payment-required` header; its base64-JSON body has `accepts[]` enumerating every (network, asset, payTo) tuple.
- **MPP**: response can carry **multiple** `WWW-Authenticate: Payment id="…", method="…", request="<base64-json>"` headers — typically one per token (USDC/USDT/CASH). Decode every one of them.

Probe results land in `probe-results.json` plus `raw/<fqn>.txt` (the full HTTP response). The full `probe.py` script lives in the working directory.

### Step 4 — Normalize and render

Map raw fields to friendly labels:
- EVM chain IDs (`eip155:8453` → `Base`, `eip155:43114` → `Avalanche`, …) via a hard-coded map.
- Stablecoin addresses to symbols (`USDC` / `USDT` / `CASH`) by exact match against canonical mints/contracts.
- MPP variants: `methodDetails.chainId == 4217` → Tempo; `methodDetails.network == "mainnet"` → Solana mainnet.
- Amount: `amount` is in the asset's smallest unit; divide by `10**decimals` (6 for USDC/USDT/CASH) to get USD.

The renderer reads `report-rows.json` (probe-derived rows) **and** `index.json` (registry text fields) to produce both the **Provider descriptions** and **Per-provider payment table** sections.

### How to verify a single row by hand

```sh
# x402: replace url + method with the value from the per-provider table.
curl -sS -i -X POST "https://stableenrich.dev/api/apollo/org-enrich" \
  -H "content-type: application/json" -d "{}" \
  | awk '/^payment-required:/ { sub(/^payment-required: /, ""); print; exit }' \
  | base64 -d | jq '.accepts'

# MPP: capture every WWW-Authenticate header (some providers emit 3).
curl -sS -i -X GET "https://agentexplorer.alibaba.gateway-402.com/openapi/categories" \
  | grep -i '^www-authenticate:' \
  | sed -nE 's/.*request="([^"]+)".*/\1/p' \
  | while read enc; do echo "$enc" | base64 -d | jq -c '{recipient, currency, amount}'; done
```

### Refresh policy

- The pay-skills index (`skills.json`) is rebuilt by Solana Foundation's CI on each merge to the `pay-skills` repo (full rebuild) or a partial rebuild for changed providers. Re-run Step 1 to pick up new providers and updated descriptions.
- Provider operators can rotate `payTo` at any time. Re-running Steps 3–4 against the existing `targets.json` is sufficient to refresh recipient addresses without re-fetching the registry.
- The 13 providers in the **Providers without a usable challenge** section can usually be recovered by either (a) sending a body that satisfies the OpenAPI schema, or (b) probing a different endpoint. Both are out of scope for this baseline snapshot.

### Files written under `/tmp/pay-skills`

| Path | Purpose |
|------|---------|
| `index.json` | Snapshot of `skills.json` (used both for fqn enumeration and the description table) |
| `fqns.txt` | List of provider fqns from `index.json` |
| `providers/<fqn>.json` | Per-provider normalized JSON from the registry |
| `targets.json` | Chosen probe endpoint per provider |
| `raw/<safe-fqn>.txt` | Full raw HTTP response from each probe (66 files) |
| `probe-results.json` (or `-v2.json`) | Parsed probe output (headers, accepts[], mpp_requests[]) |
| `report-rows.json` (or `-v2.json`) | Normalized report rows (chain labels, asset labels, USD amounts) |