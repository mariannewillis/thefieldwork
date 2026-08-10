# Competitive Research

## App Category

**Solo-practitioner wellness marketing site + single-owner practice admin — UK energy healing (aura/reiki/sound), selling one-to-one services, single workshops, and multi-session courses at equal billing.**

Two distinct competitive halves, researched separately because they compete for different things:

- **(a) The register half** — UK energy-healing / reiki / sound-healing practitioner sites and small wellness studios. These compete for the visitor's belief that this is credible and not embarrassing. This is the category whose visual clichés §2 of the brief requires the product to defeat.
- **(b) The tooling half** — Squarespace/Wix templates, Acuity/Calendly/Fresha booking, Eventbrite ticketing, Mailchimp/Substack newsletters. These are what a non-technical sole operator would otherwise stitch together, and they define the operational bar the admin must clear.

Nine competitors researched (styleCount N = 10 → N−1 = 9). One candidate, `reikireunion.com`, was dropped: DNS did not resolve at research time and the URL could not be verified.

**The headline finding, measured not asserted:** across all six direct and adjacent practitioner/studio sites researched, the strings `clothed`, `undress`, `touch` / `hands-off`, and `believe` appear **zero times on the homepage**. The one site that answers all three questions well (Blossom Reiki) answers them on a second-click `/faq/` page. The unasked question is unanswered on every front door in the researched set.

---

## Competitor 1: Blossom Reiki Therapies

- **URL**: https://blossomreiki.co.uk/ · FAQ: https://blossomreiki.co.uk/faq/
- **Core Features**:
  - One-to-one Reiki (in person + distant), Scar Massage Therapy, Manual Lymphatic Drainage
  - Reiki Level 1 and Level 2 training courses
  - Full published price list on the site
  - Live 1:1 slot booking via an embedded **Calendly popup widget** (`calendly.com/charlinleung/60min`)
- **Visual Style**:
  - Primary Color: `#7FA200` (olive-lime — the theme's `--primary-color`, verified in `wp-content/themes/spa-and-salon/style.css`)
  - Secondary Color: `#533537` (mauve-brown) · grounds `#F7F7F7`, `#FFFFFF` · dark `#0C1923`
  - Typography: **Marcellus** (serif, headings — `--title-font`) + **Lato** 400/700 (sans, body — `--primary-font`), both Google Fonts
  - Density: moderate
  - Corner Radius: subtle (mixed `2px` / `3px` / `5px`, one `15px` card)
  - Animation: subtle (Slick carousel, perfect-scrollbar)
- **Key Flows**:
  - Onboarding: homepage → services → FAQ (where the reassurance actually lives) → Calendly popup
  - Core action: book a 60-minute slot in an embedded third-party widget with a visually unrelated register
  - Monetization: fixed published prices — Reiki £60 adult / £30 under-12; Scar Massage £65; MLD £65; Distant Reiki £40; Level 1 course £280; Level 2 course £350
- **Answers the unasked question**: **Yes — but two clicks deep.** Verbatim, from `/faq/`: _"During a reiki treatment you will remain fully clothed throughout, usually with a light blanket over you."_ On belief: _"It is compatible with all faiths and religions and you do not have to believe or subscribe to any set of beliefs to give or receive reiki."_ On other therapies she is scrupulous: _"clothing will need to be removed as appropriate, but the areas I am **not** working on will be covered with a towel or blanket."_ None of this appears on the homepage.
- **Prices/dates without contact**: Prices yes, on the homepage (`£30`–`£350` present in homepage HTML). Course dates not published.
- **Health-claim handling**: The best in the set. Verbatim: _"Reiki is not meant to replace conventional healthcare but to complement it: please continue taking your medications."_ This is exactly the CAP-safe framing §14 requires.
- **Strengths**: The content is right. She has independently arrived at the brief's own thesis — name what happens, name what it is not, publish the price. The Calendly embed means she genuinely offers live slots, which most sole practitioners do not.
- **Weaknesses**: The design is an off-the-shelf WordPress theme, **"Spa and Salon" by Rara Themes**, whose own description offers it for _"spa, salons, beauty, care, girly, hair, health, hospitality, massage, medical, parlor, physiotherapy, wellness, yoga."_ The register is inherited from a beauty parlour. The best content in the set is buried under an olive-lime salon skin, and the reassurance is in an FAQ nobody scrolls to. The Calendly widget is a visual foreign body — different type, different colour, different corner radius.

---

## Competitor 2: Aura Quartz Healing (Bristol)

- **URL**: https://www.auraquartzhealing.co.uk/
- **Core Features**:
  - Root Cause Therapy; Usui Reiki (incl. Angelic, Animal, Distance variants)
  - Meditation Pyramid sessions
  - Massage (luxury facial, full-body Swedish, TMJ)
  - Contact-only enquiry — phone, email, form
- **Visual Style**:
  - Primary Color: `#231F20` (near-black, most-used brand value)
  - Secondary Color: `#FEDB00` (saturated yellow) · `#FFFFFF` / cream grounds · `#999999` rules. (`#116DFF` and `#3899EC` are Wix editor chrome, not brand.)
  - Typography: **Work Sans** + **WorkSans-ExtraLight**, with Wix's `proxima-n-w01-reg` and `helvetica-w01-roman` fallbacks
  - Density: moderate
  - Corner Radius: subtle (Wix Thunderbolt component defaults)
  - Animation: subtle (Wix SlideShowContainer)
- **Key Flows**:
  - Onboarding: hero → about → services grid → testimonials → contact form
  - Core action: submit a contact form or phone; no self-service booking of any kind
  - Monetization: none surfaced — every price is a conversation
- **Answers the unasked question**: **No.** No wording about clothing, touch, or belief appears anywhere on the page — and this is the site that most needs it, because it sells Swedish massage _and_ Reiki off the same menu, so a visitor genuinely cannot tell which offerings involve undressing.
- **Prices/dates without contact**: **Neither.** No price, no date, no schedule.
- **Health-claim handling**: The clearest CAP exposure in the set. Verbatim: _"Release trapped traumas that often linger unresolved within our bodies, which, if left unattended, can manifest as a range of distressing physical and mental symptoms"_, plus promised outcomes _"Confident, Happy, Calm, Relaxed, Loved, Safe, Mentally clear."_ No disclaimer.
- **Strengths**: Warm crystal photography; a named practitioner with a face; a clear Bristol locality.
- **Weaknesses**: The exact failure the brief names in §3. Nothing is priced, nothing is dated, the question isn't answered, and the claims are the kind the ASA has upheld against. Platform is Wix (`static.parastorage.com` / `wixstatic.com`), so the layout is a stack of full-width Wix strips — the composition is the tool's, not the practice's.

---

## Competitor 3: Omnes Healing

- **URL**: https://omneshealing.com/
- **Core Features**:
  - One-to-one energy healing (online, telephone, video) — **£30**
  - Free/donation Online Healing Centre — **Mondays 16:30–17:00 and 17:30–18:00 UK**
  - Free distant-healing requests
  - Four-step Healer Development Course; Energy Field Self-Management **Workshops**; in-person Foundation Course at Findhorn Eco Village
  - Membership **£30–£45/year**; books and products **£6–£18**
- **Visual Style**:
  - Primary Color: `#0C4DA2` (corporate blue)
  - Secondary Color: `#9900FF` (violet) · `#202020` / `#373737` type · white ground
  - Typography: **Roboto** (full weight range loaded from Google Fonts)
  - Density: dense (multi-level nav, long alternating blocks)
  - Corner Radius: subtle (Elementor defaults)
  - Animation: subtle (Elementor entrance effects)
- **Key Flows**:
  - Onboarding: healing services → development courses → community → book promo → blog → membership signup
  - Core action: join a free online healing session, then convert to a paid 1:1 or a course
  - Monetization: £30 sessions, annual membership, course fees, book sales
- **Answers the unasked question**: **No — and it actively works against a hands-off proposition.** The only touch-adjacent language is an image caption: _"Practitioner with a client during a calm, hands-on healing session in a peaceful room."_ For The Field Work, whose whole differentiator is that the work is on the field and not the body, this is the exact confusion to design against.
- **Prices/dates without contact**: **Yes, and it is the best in the set at this.** Recurring weekly times are published as times, not as "get in touch"; the Foundation Course carries _"Our next Foundation Course will be in the Autumn 2026"_ with a _"Subject to demand"_ caveat.
- **Health-claim handling**: Careful by vocabulary rather than by disclaimer — language stays on _"wellbeing"_ and _"spiritual development"_, which is inside the ASA's permitted zone. No explicit medical disclaimer found on the homepage.
- **Strengths**: The **closest structural match to this brief's product** — 1:1 + workshops + a multi-session course, all sold from one site. Credentialled: teaches to Confederation of Healing Organisations standards. Publishes recurring dates as a standing pattern rather than a one-off list.
- **Weaknesses**: Design is entirely Elementor's (2,497 Elementor markers in the HTML) — a corporate blue, Roboto, a three-tier dropdown nav. Reads like a small trade association, not a practice. Feels nothing. This is the precise inverse of the brief's §1 principle 1: correct, informative, and affectively empty.

---

## Competitor 4: Re:Mind Studio (London)

- **URL**: https://www.remindstudio.co.uk/ · booking: https://www.remindstudio.co.uk/book-class
- **Core Features**:
  - Small group classes combining sound therapy, breathwork and energy healing, seven days a week to 21:00
  - Private/1:1 sessions
  - Founded 2018 by Yulia Kovaleva (author, Reiki Master, meditation teacher); 25A Eccleston Place, London SW1W 9NF
  - Membership, drop-in and class-pack pricing; gift cards
- **Visual Style**:
  - Primary Color: `#E1CCBE` (warm blush-sand — computed from Squarespace `--accent-hsl: 24, 36.84%, 81.37%`)
  - Secondary Color: `#EEEDEB` (warm near-white, `--lightAccent`) and `#757263` (olive-taupe, `--darkAccent`); white ground
  - Typography: **PP Editorial New Ultralight** on h1–h4 and **PP Object Sans Regular** on body (both self-hosted `.otf` via custom CSS), over Squarespace's own `orpheus-pro` / `adobe-garamond-pro` / `League Gothic` stack. **Note: `VCGaramondCondensed-Thin-Trial.otf` — a trial-licensed font — is shipped in production.**
  - Density: airy
  - Corner Radius: subtle (Squarespace `--tweak-*-block-radius` tokens)
  - Animation: subtle
- **Key Flows**:
  - Onboarding: hero image → mission statement → testimonials → founder bio → reviews → footer
  - Core action: "BOOK" → `/book-class` → **Momence** scheduling, or download the studio's iOS app
  - Monetization: membership classes from £12, drop-in from £30, new-client pack £45 — the range `"£12 and £30 per class"` is stated on the homepage
- **Answers the unasked question**: **No on the homepage.** There is a `/how-to-find-your-calm` page and an FAQ, but nothing on the front door. Policy language is prominent instead: _"Due to the nature of the classes we have a strict no-latecomers policy"_; 12 hours' cancellation notice for classes, 7 days for workshops.
- **Prices/dates without contact**: Prices yes (range on the homepage). **Dates no** — the `/book-class` schedule is client-rendered by Momence and returned "No results found" on a static fetch. A visitor on a slow connection, or a crawler, sees no dates at all.
- **Health-claim handling**: Loose but vague enough to be low-risk — _"helps you rest, thrive and grow"_, _"deep healing and meaningful growth"_. No disclaimer.
- **Strengths**: The design ceiling of the UK direct category. Editorial ultralight display type over generous whitespace; restrained warm-neutral palette; genuine art direction rather than a template skin. Prices are on the homepage.
- **Weaknesses**: It is _the_ current wellness template made beautifully — PP Editorial New Ultralight over cream is the single most-copied wellness typographic move of 2022–2026, and adopting it is now indistinguishable from adopting a preset. The schedule not rendering statically is a real conversion and accessibility defect. The trial font in production is a live licensing exposure.

---

## Competitor 5: Sahana Sound (London)

- **URL**: https://sahanasound.com/
- **Core Features**:
  - Group sound baths; 1:1 personalised sound healing; corporate wellness; private events
  - Residencies at three luxury spas
  - Claims "London's Best Sound Bath Experience" from the _Financial Times_ (their claim, not independently verified here)
  - Client-logo proof: Nike, Zara, United Airlines
- **Visual Style**:
  - Primary Color: `#AB8041` (brass/antique gold — 91 occurrences in the site bundle, unambiguously the brand accent)
  - Secondary Color: `#BFAD99` (warm taupe) and `#EFE3B8` (pale gold); white/cream ground; `#393939` / `#292A2B` type
  - Typography: **Raleway** (32 occurrences — display and body) with **Inter** as a secondary
  - Density: airy
  - Corner Radius: subtle
  - Animation: subtle; geometric triangle SVG accents
- **Key Flows**:
  - Onboarding: hero tagline → CTA → what a sound bath is → three spa residencies → services → corporate → private events → client logos
  - Core action: "Book now" → `/book`; "Enquire" → `/book#location`
  - Monetization: enquiry-gated — no price is published
- **Answers the unasked question**: **No.** Nothing about lying down, clothing, or contact. The only procedural line is _"A sound bath is a deeply immersive sound experience."_
- **Prices/dates without contact**: **Neither.** Both are behind an enquiry.
- **Health-claim handling**: The most CAP-exposed language found. Verbatim: _"stimulates the parasympathetic nervous system, triggering the body's innate response to rest and heal"_; _"stress hormones decrease, allowing the immune system to regenerate"_; _"penetrates each cell with restorative energy."_ These are physiological mechanism claims about immune function — precisely the class the ASA requires clinical-trial substantiation for. No disclaimer anywhere.
- **Strengths**: The only bespoke build in the direct set (an Astro/Vite bundle, not a template) — and it shows: real typographic control and a single confident metallic accent instead of a rainbow. Borrowed authority is used well (spa residencies, corporate logos, press award).
- **Weaknesses**: Premium positioning is bought at the price of every practical answer — no price, no date, no description of what happens to your body. It sells _access_, not _reassurance_. And its credibility strategy (mechanism claims dressed in physiology) is exactly the strategy this brief forbids, both legally and on principle 3.

---

## Competitor 6: Othership — the adjacent take

- **URL**: https://www.othership.us/ · first-timer surface: https://www.othership.us/first-timers
- **Core Features**:
  - Guided sauna + ice bath "modern bathhouse" classes (Toronto / New York)
  - 75-minute self-guided journeys plus scheduled guided classes
  - A dedicated `/first-timers` page — the only named first-timer surface in the entire researched set
  - Schedule and membership behind `/schedule`
- **Visual Style**:
  - Primary Color: `#372338` (`--base-color-brand--dark-purple` — 98 occurrences; the dominant ground)
  - Secondary Color: `#ECE8E3` (`--base-color-brand--off-white`) and `#DBF572` (`--base-color-brand--yellow`, acid); plus `#CB72C4` pink, `#A7CFC9` teal, `#9BA17B` khaki, `#A24E2B` dark orange
  - Typography: **Lido Condensed** (display), **Founders Grotesk** (body), with **DM Serif Display** / **DM Sans** secondary
  - Density: moderate
  - Corner Radius: rounded — `1rem` / `16px` dominant (51 + 14 declarations)
  - Animation: rich (Webflow-driven)
- **Key Flows**:
  - Onboarding: hero → value proposition → class types → amenities → practices/benefits → social proof → repeated CTAs
  - Core action: "Book a Class" → `/schedule`
  - Monetization: class packs and membership, both behind the schedule
- **Answers the unasked question**: **Partly, and structurally.** It does not answer clothing on the homepage, but it is the only competitor that has _built a surface whose entire job is the first-timer's fear._ That structural move is worth stealing even though its execution is thin.
- **Prices/dates without contact**: **Neither** — both live behind `/schedule`.
- **Health-claim handling**: Unhedged — _"Soothe anxiety"_, _"Boost metabolism"_, _"Fight fatigue"_, _"increase focus + mental clarity"_, _"faster athletic recovery"_, no disclaimer. In the UK this set would be CAP-risky; it is a US operator.
- **Voice, verbatim**: _"Otherworldly sauna and ice bath experiences for human beings to feel good now"_ · _"modern bathhouse to regulate your nervous system, process emotions and connect meaningfully"_ · _"We encourage human connection so You won't hear any shh-ing from us."_
- **Strengths**: Proof that a wellness brand can be **dark, warm, confident and non-lavender** and still convert. The voice is specific and unembarrassed — it names what the place is for in plain words rather than in category jargon. Full brand-token system in CSS variables; disciplined single-family display type.
- **Weaknesses (and the load-bearing caution for this project)**: `#372338` sits very close to this brief's working plum `#2B0E28`. **A dark-plum direction that also reaches for a condensed display face and a bright accent risks reading as an Othership derivative.** The differentiators available are the ones the brief already owns: a gold→magenta radial gradient rather than an acid-yellow flat accent, and stillness rather than motion. Othership is also loud in a way that would break this brief's "unhurried, quietly certain" voice — take the courage, not the volume.

---

## Competitor 7: Squarespace 7.1 wellness/therapist templates (+ Squarespace Courses)

- **URL**: https://www.squarespace.com/blog/health-wellness-website-examples (Squarespace's own recommended set) · course docs: https://support.squarespace.com/hc/en-us/articles/16096751630221-Course-pages
- **Core Features**:
  - Named wellness/therapist templates Squarespace itself recommends: **Jenani** (holistic wellness), **Anza** (provider-focused), **Clune** (spas), **Aurora** (retreats), **Myhra** (coaching), **Randi** (one-page), **Clove** (group practices)
  - Squarespace **Courses**: Chapters → Lessons, video + text + downloadable files; one-time, split, or subscription pricing plans; free plans that gate on an email address
  - Third-party template market sells the same shape under names like _The Healer_, _Sage_, _Boho Wellness_ (Etsy / GoLive / Imagiweb)
- **Visual Style** (the template default, which is the CATEGORY TEMPLATE):
  - Primary Color: near-white / cream ground — the shipped default across Jenani, Aurora, Clune
  - Secondary Color: exactly one warm accent (sand, terracotta, sage, or blush). `[NEEDS CLARIFICATION: Squarespace does not publish per-template hex values; the accent values measured on live builds of these templates were #E1CCBE (Re:Mind) and #AB8041 (Sahana). Treat those two as representative rather than canonical.]`
  - Typography: high-contrast light-weight serif display + neutral grotesk body
  - Density: airy — Squarespace's own words for Jenani: _"The layout is calm and welcoming, leading with soothing imagery and whitespace that creates a sensation of breathing room."_
  - Corner Radius: subtle, token-driven (`--tweak-*-block-radius`)
  - Animation: subtle scroll fade-ins
- **Key Flows** (Squarespace's own prescribed section order — quoted from its gallery copy):
  - Jenani: imagery and whitespace → approach → specialties and credentials → appointment booking
  - Anza: practitioner introduction → imagery paired with text → service listings → appointment booking
  - Clune: full-width photography → elegant typography → services menu → credentials → booking flow
  - Aurora: luminous opening → storytelling/philosophy → program offerings → individual sessions
  - Clove: opening aesthetic → team introductions → bios → contact/intake
  - Monetization: Courses require a Business or Commerce plan; digital-products add-on from ~$9/month
- **Answers the unasked question**: **Structurally, no.** Not one of the seven prescribed section orders contains a reassurance beat. "What actually happens to your body" is not a section Squarespace has a slot for. This is the single most important finding of the tooling half: the category template has no place to put the answer, which is _why_ nobody answers it.
- **Prices/dates**: templates ship a "services menu" slot, so prices are typical; live dates require Scheduling or an external tool.
- **Health-claim handling**: none — a template has no compliance surface. The practitioner is on her own.
- **Strengths**: Genuinely operable by a non-technical owner. Courses is now on every plan. Squarespace's own design thesis is correct and quotable — _"The way a website feels is as important as what it says"_; Clove _"communicates safety and care before a visitor reads anything about your services."_
- **Weaknesses**: **Configurability is what kills these sites in month two** — the brief's §5 "the admin is not a CMS" distinction is the direct answer to this. And because the template supplies the composition, every practitioner using one arrives at the same page: hero photo, three-up service cards, practitioner bio, testimonials, booking CTA. This is the skeleton C-1 requires the directions to reject.

---

## Competitor 8: Acuity Scheduling (Squarespace Scheduling)

- **URL**: https://www.acuityscheduling.com/ · class series docs: https://help.acuityscheduling.com/hc/en-us/articles/16676899741581-Creating-a-class-series-in-Acuity-Scheduling
- **Core Features**:
  - Branded self-service booking page, unlimited appointments, calendar sync
  - Custom intake forms; deposits; automated reminders; SMS (Standard tier and up)
  - Group classes and **class series** for multi-day workshops
  - Payments via Stripe / Square / PayPal
- **Visual Style**:
  - Primary Color: `#1B2737` (dark navy)
  - Secondary Color: green CTA accent on white ground · `#313131` type
  - Typography: neutral grotesk sans; no distinctive brand face
  - Density: airy marketing site; **moderate-to-dense** in the booking widget itself
  - Corner Radius: rounded (moderate on buttons and cards)
  - Animation: subtle — a rotating testimonial carousel, little else
- **Key Flows**:
  - Onboarding: sign up → define appointment types → set availability → publish a booking page
  - Core action, verbatim: _"Book beautifully, 24/7: Set up any type of appointment and let clients easily self-schedule on your branded booking page."_ Also _"Reduce no-shows: 75% of Acuity businesses have reduced no-shows with deposits, appointment reminders, and cancelation policies"_ and _"Automate your day: Collect client info with custom intake forms, prevent double-bookings with calendar sync, and send timely notifications."_
  - Monetization: Starter $20/mo, Standard $34/mo, Premium $61/mo billed monthly ($16 / $27 / $49 annual). No free plan; 7-day trial. `[NEEDS CLARIFICATION: pricing sourced from third-party 2026 reviews (Zeeg, Sonary, Talkspresso) rather than Acuity's own page, which gated pricing at fetch time. Re-verify before quoting to the client.]`
- **The three structural gaps against this brief**:
  1. **It self-books; it does not request.** The homepage model is _"clients easily self-schedule"_ end-to-end. There is no first-class "visitor asks, owner confirms, hold expires by itself" primitive — which is the brief's entire §5 BookingRequest/hold distinction. Simulating it means either taking payment (out of scope for v1) or turning off online booking.
  2. **Class series are rigid.** Acuity's own docs: _"clients must book all of the classes as a group to sign up"_; _"After the multi-day class series has begun, clients won't be able to book this event online"_; _"you need to create a class series for each date range you want clients to book."_ The brief's Course→Sessions model needs a Session to block the calendar without being separately bookable — Acuity has no shape for that.
  3. **Merged availability is manual.** Publishing a workshop does not automatically subtract that time from 1:1 availability unless the owner also blocks it by hand. The brief's §12 "she never blocks her own events by hand" is a genuine differentiator against the market default.
- **Strengths**: Mature, non-technical, self-serve, reliable, integrates with the site host she'd most likely use.
- **Weaknesses**: For this practitioner it is the wrong shape — a bookings engine when what she needs is a leads-with-a-hold engine. **Alternatives in the same slot**: Calendly (`#006BFF` primary, `#0B3558` navy, **Gilroy** — a pure meeting scheduler with no offering catalogue at all; note Blossom Reiki uses precisely this), Fresha (`#7B69FF` violet, **Aktiv Grotesk VF / Roobert PRO / Tartuffo** — a marketplace that inserts itself between practitioner and client, charging a ~20% one-off fee on marketplace-sourced new clients plus 1.40% + 25p online payment processing, on a subscription from ~£15/month), and Cliniko for clinical practice management. `[NEEDS CLARIFICATION: Fresha's fee figures are from third-party aggregators (Pabau, Capterra UK, Tavix), not Fresha's own pricing page.]`

---

## Competitor 9: Mailchimp (the newsletter half)

- **URL**: https://mailchimp.com/ · GDPR guidance: https://mailchimp.com/gdpr/
- **Core Features**:
  - List management, campaign composition, drag-and-drop templates
  - Double opt-in available as a **setting**; enforced unsubscribe link; GDPR consent-field blocks
  - Segmentation, automation, deliverability tooling, domain authentication
  - Free plan: **250 contacts, 500 sends/month, 250/day** (cut in January 2026 from a far larger allowance). `[NEEDS CLARIFICATION: 2026 free-tier figures sourced from third-party trackers (beehiiv, Groupmail, EmailToolTester); confirm against mailchimp.com/pricing before quoting.]`
- **Visual Style**:
  - Primary Color: `#FFE01B` (Cavendish yellow)
  - Secondary Color: `#241C15` (near-black) · `#575757` body grey · white ground
  - Typography: proprietary Mailchimp sans; illustrative, hand-drawn brand imagery
  - Density: moderate marketing site; **dense** campaign builder
  - Corner Radius: subtle
  - Animation: subtle (marquee/logo carousels)
- **Key Flows**:
  - Onboarding: create audience → import or build a list → design a campaign → verify sending domain → send
  - Core action: compose and broadcast an issue from a template gallery
  - Monetization: freemium, priced on contact count; costs escalate sharply past the 250-contact free ceiling
- **Regulatory posture**: Double opt-in is _available_, not default — Mailchimp's own guidance notes GDPR does not mandate it and only some jurisdictions require it. For a UK practitioner under PECR the practical consequence is that the strongest consent-evidence control is an off-by-default checkbox in a settings panel she will never find. This brief's §14 makes it structural instead.
- **Strengths**: Deliverability, domain authentication and suppression handling are genuinely hard and Mailchimp does them well. Compliance boilerplate (unsubscribe, sender identity) is built in and cannot be removed.
- **Weaknesses**: **Register break.** An issue built from a Mailchimp template does not look like her site — the brief's §12 answer ("her branding is the template, not an option") is the direct counter. The free tier is now too small to be a real option (250 contacts is under a year of a working practice). **Alternatives in the same slot**: Substack (free, but the reading surface is Substack-branded and it pushes her into a social feed she does not control), Kit/ConvertKit and beehiiv (creator-shaped, still a separate visual world). For workshops and courses, **Eventbrite** is the default third leg of the stitch, at **6.95% + £0.59 per ticket in the UK with no cap** — a £10 workshop ticket either costs the buyer £11.29 or nets her £8.71.

---

## Industry Best Practices

- **Publish the price on the page.** 3 of 6 practitioner/studio sites do (Blossom, Omnes, Re:Mind); 3 do not (Aura Quartz, Sahana, Othership). The brief's Carrier persona names "a price that only appears after you make contact" as the thing that breaks their day — and half the category still does it. Publishing the price is a trust signal before it is a conversion feature.
- **Carry the "complementary, not a substitute" line visibly.** The ASA permits reiki marketers to claim _"the emotional and spiritual effects of the therapy, their professionalism and therapy surroundings"_ and _"the relaxing nature of Reiki, its meditative qualities, improvement in a feeling of overall wellbeing and an improved sense of self"_ — and nothing about treating conditions. Only 1 of 6 sites carries a disclaimer at all. It is both a legal requirement and, per the brief's principle 3, the cheapest credibility available.
- **Answer procedure before philosophy.** Blossom's FAQ answers clothing, touch and belief in three sentences and is measurably the most trustworthy content in the set. Every site that leads with what the modality _is_ rather than what _happens to you_ leaves the real question open.
- **Publish recurring availability as a standing pattern, not as a list to maintain.** Omnes publishes _"Mondays 16:30–17:00 and 17:30–18:00"_ — a rule, not a calendar. It never goes stale. The brief's AvailabilityRule model is the same insight made structural.
- **Authenticate the sending domain before the first issue.** SPF/DKIM/DMARC on a new domain is the difference between a newsletter and a spam folder. Every managed provider in the tooling half makes this a setup gate; this build must too (§8).
- **Server-render the schedule.** Re:Mind's `/book-class` schedule returned "No results found" to a static fetch because Momence renders it client-side. Dates that only exist after JavaScript are dates that don't exist for crawlers, slow connections, or assistive tech.

## UX Patterns in This Category

- **The FAQ as a reassurance dumping-ground.** Used by Blossom (`/faq/`), Re:Mind (`/how-to-find-your-calm` + FAQs), Othership (`/first-timers`) — it works, in that the answers are good, but it fails because it requires a second click from a visitor whose default action is closing the tab. **Steal the surface, move it to the front door.**
- **The named first-timer page.** Othership's `/first-timers` is the only place in the set where the visitor's fear has been given its own designed room. This brief's Beat 1 (Root) is that idea, promoted from a page to the top of the scroll — a stronger version of the pattern than anyone in the researched set has shipped.
- **Third-party booking widget bolted onto a self-hosted site.** Blossom → Calendly popup; Re:Mind → Momence + an iOS app. It works functionally and breaks visually every time: different type, different colour, different corner radius, different motion. Owning the slot picker is a visible quality difference, not just an engineering preference.
- **Borrowed authority as a credibility substitute.** Sahana leans on spa residencies, a Financial Times award and Nike/Zara/United logos; Omnes on Confederation of Healing Organisations standards. It works when the practitioner has it and is unavailable to a sole operator who doesn't — which makes the brief's alternative (empathy first, credentials second, in Beat 4) the right play rather than the fallback.
- **Enquiry-gated pricing as a premium signal.** Sahana and Aura Quartz both use it. It reads as premium to the already-convinced and as evasive to the sceptical, which is precisely the wrong trade for the Carrier persona.

## The Category Template (what to reject, precisely)

Named here so downstream directions can reject it deliberately rather than accidentally reproduce it. Every element below is measured from the researched set, not asserted.

- **The compositional default** — Squarespace's own prescribed order, near-identical across Jenani / Anza / Clune / Aurora / Clove: _full-bleed soft-focus hero photograph → short mission statement → three-up service cards → practitioner bio → testimonials → booking CTA._ No slot for reassurance. No slot for "what this is not." 5 of the 6 direct/adjacent sites follow a recognisable variant of it.
- **The typographic default** — a light-to-ultralight high-contrast serif display over a neutral grotesk body. Concretely in this set: **PP Editorial New Ultralight + PP Object Sans** (Re:Mind), **Marcellus + Lato** (Blossom), **Raleway + Inter** (Sahana), **Roboto** alone (Omnes), **Work Sans** (Aura Quartz). Any direction reaching for an ultralight didone-ish serif over cream is reaching for the 2022–2026 wellness preset.
- **The palette default** — a near-white or cream ground with exactly one warm metallic or earth accent. Measured accents: `#E1CCBE`, `#AB8041`, `#BFAD99`, `#EFE3B8`, `#533537`, `#7FA200`. **Dark grounds: 1 of 6, and it is the non-UK, non-energy-healing outlier (Othership `#372338`).** The night-side register the brief asks for is genuinely unoccupied in the UK energy-healing category.
- **The chromatic gap** — **not one competitor in the set uses magenta or a gold→magenta gradient.** The brief's `magenta-deep #C2187A` / `gold #E9C87E` axis is unoccupied territory rather than a variation on an occupied one.
- **The imagery default** — soft-focus interiors, crystals, hands, candles, and low-saturation photography of empty rooms. Note that the brief's own `aura-hands-between` plate sits inside this cliché despite being commissioned; the inventory's "reserve only" designation is confirmed by this research.
- **The motion default** — a scroll fade-in and a testimonial carousel. Nothing else. No site in the set uses motion as meaning.
- **The copy default** — modality-first (_"Reiki is a Japanese technique for…"_), outcome-promising (_"Confident, Happy, Calm, Relaxed, Loved, Safe"_), and procedurally silent. The register is either clinical-explanatory or breathless-transformational, with nothing in between. The brief's "warm, unhurried, quietly certain" voice has no incumbent.

## Regulatory Baseline (UK CAP/ASA — evidence for §14)

- **ASA/CAP "Health: Reiki"** (https://www.asa.org.uk/advice-online/health-reiki.html) — permitted claims, verbatim: _"emotional and spiritual effects of the therapy, their professionalism and therapy surroundings"_ and _"the relaxing nature of Reiki, its meditative qualities, improvement in a feeling of overall wellbeing and an improved sense of self."_ Prohibited: physical healing effects without _"robust clinical evidence."_ Also verbatim: _"Marketers should not discourage essential medical treatment for conditions which should be carried out under the supervision of a suitably qualified healthcare professional."_
- **Upheld ruling** — _The Allan Sweeney International Reiki Healing & Training Centre_, **20 July 2011**: a website claiming Reiki could treat ADHD, back pain, depression and cancer. The ASA found no convincing evidence and held that the claims could discourage essential treatment.
- **ASA/CAP "Health: Healing therapy"** (https://www.asa.org.uk/advice-online/health-healing-therapy.html) — permitted: _"spiritual and emotional healing"_ and _"spiritual and emotional comfort & support during times of illness, grief and stress."_ Prohibited: treating physical or mental medical conditions or symptoms, absent _"robust documentary evidence in the form of clinical trials."_
- **Upheld ruling** — _Healing on the Streets – Bath_, **13 June 2013**: leaflet claims held unsubstantiated, capable of discouraging essential treatment, and irresponsible.
- **Compliance scoreboard across the 6 practitioner/studio sites researched**: carries a visible medical disclaimer **1 of 6** (Blossom, in the FAQ). Makes at least one claim that would likely require substantiation **3 of 6** (Aura Quartz — _"can manifest as a range of distressing physical and mental symptoms"_; Sahana — _"the immune system to regenerate"_; Othership — _"Soothe anxiety"_, _"Boost metabolism"_). Stays inside the permitted zone by vocabulary discipline **2 of 6** (Omnes, Blossom).
- **Implication for the build**: Beat 5 ("what this is not") is not a nice-to-have trust flourish — on this evidence it is the single most under-served compliance surface in the category, and shipping it visibly is simultaneously the brief's honesty play and its legal position.

## Opportunities for This Project

- **Answer the unasked question in the first viewport — nobody does.** Measured: 0 of 6 homepages contain the words _clothed_, _undress_, _touch_, _hands-off_, or _believe_. Blossom's answer is excellent and lives at `/faq/`. Beat 1 (Root) plus the `aura-two-people` plate — a practitioner's hands hovering above a _seated, fully clothed_ person — answers it before a word is read. **How to capitalise**: make the reassurance the hero, not the FAQ; state it as fact in plain declarative copy ("You stay dressed. Nobody touches you. Nothing is asked of your beliefs."), and let the image do the same work in parallel so it survives a skim. Success metric §15 (≥80% unprompted recall after one scroll) has no incumbent to beat.
- **Own the night-side register — the category is monochrome-cream and the one dark exemplar is a foreign non-competitor.** 5 of 6 sites are light-ground; the sixth (`#372338`) is a US bathhouse. **How to capitalise**: the dark-plum ground plus the measured gold-on-plum contrast (`#E9C87E` on `#2B0E28` = 10.89:1) is both the differentiating move _and_ the accessibility-compliant one, which is unusual and worth exploiting. The differentiator against Othership is the gold→magenta radial emanation and stillness, versus its acid-yellow flat accent and motion. Do not also take a condensed display face.
- **Publish real dates and real prices at equal billing for all three offering kinds — the market splits these across three tools and loses the seam.** The realistic incumbent stitch is Squarespace (site) + Acuity (£1:1s) + Eventbrite (workshops, 6.95% + £0.59/ticket) + Mailchimp (list), each with its own visual register and its own login. **How to capitalise**: the products block rendering live Offerings means publishing a workshop makes it appear with no second edit — one surface, three kinds, one register, one price list. That is a demonstrable owner-independence win in the §15 five-minute test.
- **Make "request with a self-expiring hold" a first-class primitive — no incumbent has it.** Acuity, Calendly and Fresha all self-book; Acuity's class series _"must book all of the classes as a group"_ and cannot be joined once begun. Nothing in the tooling half models "a lead the owner converts by hand" while still preventing double-offering. **How to capitalise**: the hold is a real product differentiator _and_ a trust move — telling the visitor plainly on the confirmation screen that the time is held rather than booked, and that a human will reply, is the honest version of a feature every competitor fakes with an instant confirmation email.
- **Automatic workshop→calendar subtraction is the operational lever every competitor leaves manual.** In every tool researched, publishing a group event does not remove that time from 1:1 availability without a second manual block. **How to capitalise**: the brief's §5 "availability is subtraction, not a list" makes double-offering structurally impossible rather than procedurally avoided — and §15's zero-double-offer defect target is measurable in a way none of the incumbents can claim.
- **Make the newsletter template unbrandable-away, and make double opt-in structural rather than a setting.** Mailchimp's double opt-in is an off-by-default toggle and its free tier is now 250 contacts; Substack takes the reading surface. **How to capitalise**: her branding as the template (logo, palette, type, footer, unsubscribe, sender identity — all applied automatically, none editable) means she cannot send something off-brand or non-compliant, which converts a PECR obligation into a design guarantee.
- **Reject the Squarespace section order explicitly, because it has no slot for the two beats that matter here.** The prescribed wellness composition (hero photo → mission → three-up cards → bio → testimonials → CTA) contains neither a reassurance beat nor a "what this is not" beat. **How to capitalise**: the seven-beat root→crown ascent is already a non-template composition; naming the template in the direction briefs (C-1) is what stops a direction sliding back into it under time pressure.

<!-- NEEDS CLARIFICATION: reikireunion.com did not resolve at research time and was dropped from the set. If a London studio comparator is wanted beyond Re:Mind, re-attempt or substitute. -->
<!-- NEEDS CLARIFICATION: Sahana Sound's "Best Sound Bath Experience, Financial Times" award is the site's own claim; the underlying FT article was not located and the award is unverified. -->
<!-- NEEDS CLARIFICATION: 2026 pricing for Acuity, Fresha and Mailchimp was sourced from third-party review sites, not from vendor pricing pages (which were gated or JS-rendered at fetch time). Re-verify any figure before it is repeated to the client. -->
<!-- NEEDS CLARIFICATION: Squarespace does not publish per-template hex values, so the "category template palette" accents above are measured from live builds (Re:Mind #E1CCBE, Sahana #AB8041) rather than from the templates themselves. -->
