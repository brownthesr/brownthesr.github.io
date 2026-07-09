# Portfolio TODO

**Status:** holding pattern — waiting on two arXiv preprints (Sheep Herding 2510.25115, Epidemiological Dynamics 2510.25085) to be officially published before making large changes. Small/cosmetic items can still ship now.

---

## index.html Publications section — DONE

- [x] SIAM card: full 11-author list, "Co-first author", Code link → github.com/brownthesr/Synthetic-Graphs
- [x] ICML card: full author list, Paper (OpenReview 5jGcYMUZx1) + Code (Utah-Math-Data-Science/SPT)
- [x] Sheep herding card: arXiv link (2510.25115)
- [x] Epidemiological dynamics card: arXiv link (2510.25085)
- [x] Added `.pub-card__links` styling in style.css
- NeurIPS card intentionally has no links (under review, topic withheld)

## Project-page Resources links — remaining

- [x] `projects/steering.html` — Paper (OpenReview) + Code (SPT repo) wired; arXiv/poster/slides commented out
- [x] `projects/pursuit-containment.html` — arXiv:2510.25115 + Code (`Optimal_Paths`)
- [x] `projects/neural-odes.html` — Code (`three_body`); paper/poster/slides commented out (no paper)
- [x] `projects/epidemic-gnns.html` — arXiv:2510.25085 only; code intentionally omitted
- [x] `projects/other-projects.html` — Music (`Music-Interpolation`) + Ancient Texts (`Exegesis-of-Ancient-Texts`) code links added; Prisoner's Dilemma left link-less (repo gone)
- [x] `projects/generative-drift.html` — intentionally left link-less: work not published yet, and the only public repo is a fork. Revisit when the paper/clean repo is public.

- [x] Push GitHub profile README (with SIAM + ICML + arXiv papers) → live on `brownthesr/brownthesr`
- [x] Push rewritten Synthetic-Graphs README → live
- [x] Update GitHub bio, location (Salt Lake City), company (University of Utah), website, LinkedIn → all live
- [x] Add description to `three_body` repo → live
- [x] Repin profile around real research (Synthetic-Graphs, Optimal_Paths, three_body, Exegesis)
- [ ] Consider pinning the SPT repo (`Utah-Math-Data-Science/SPT`) — ICML 2026, strongest signal; org repos aren't always offered in the personal pin picker. Up to 6 pins allowed.

## Safe to do now (not blocked)

- [x] Update CV and resume with current research topics and affiliation (`cv.tex` + `resume.tex` rewritten; full ICML author list added, first-author tags, advisor Bao Wang)
- [x] Wire Resume PDF button alongside CV (hero + footer, `Drake_Brown_Resume_2026.docx.pdf`)
- [x] Add SPT results visuals to `steering.html` (base-vs-SPT image grid + Wasserstein plot in `assets/steering/`); removed the empty `steering-results` canvas and the unwired sliders
- [x] Add a real CV PDF and wire up the two `href="#"` CV links in `index.html` (CV.pdf, wired in hero button + footer)
- [x] Wire LinkedIn link in footer to real profile (`linkedin.com/in/drake-brown-5398b9224`)
- [x] Add the two arXiv preprints to the Publications section on `index.html` (also added ICML 2026 accepted card and NeurIPS under-review card)
- [x] Update Google Scholar profile metadata (affiliation, research interests, co-authors) — done by Drake
- [x] Update LinkedIn description to match portfolio framing (PhD + AWS agentic systems + accepted papers) — done by Drake
- [x] Update GitHub bio + location + company — all live
- [x] Confirm `assets/headshot.jpg` exists and renders (present in assets)
- [x] LinkedIn wired to real profile in footer (superseded earlier root-URL item)
- [ ] (Optional) Decide which version of the research section to keep: original 4-card grid (live) vs. compact tag strip (preserved as HTML comment in `index.html`)

## Animations still to build (from memory: 24 of 27 remaining)

Empty canvas placeholders with no JS wired up:
- `generative-drift.html` — `drift-hero`, `drift-results`
- `steering.html` — `steering-hero`, `steering-results`
- `neural-odes.html` — `neuralode-hero`
- `epidemic-gnns.html` — `epidemic-hero`
- `pursuit-containment.html` — `pursuit-hero`
- `other-projects.html` — verify `project-prisoners.js`, `project-music.js`, `project-ancient-texts.js` all exist in `/js`

## Defer / nice-to-have

- [ ] Wire the unconnected sliders in `steering.html` (Guidance λ, Regularization β) and `aws-agentic.html` (Traffic load, Adversarial %) to actually drive their result canvases — or remove the sliders if they're not going to be live
- [ ] `aws-agentic.html` — currently excluded from nav; revisit when internal/external clearance allows
