# Dataset/medical evidence governance for HearAtlas Guide

## Dataset selection

| Source | What it contains | Suitable research use | Restrictions |
| --- | --- | --- | --- |
| [CDC NHANES AUX_J](https://wwwn.cdc.gov/Nchs/Data/Nhanes/Public/2017/DataFiles/AUX_J.htm) | Pure-tone thresholds, audiometry QA and associated exam variables | Audiogram schema, population analyses, missingness and numerical benchmarking | Not a diagnosis dataset; follow NCHS analysis guidance and source terms |
| [CDC NHANES P_AUX](https://wwwn.cdc.gov/nchs/nhanes/Search/DataPage.aspx?Component=Examination&Cycle=2017-2020) | Pre-pandemic audiometry examination data | Independent cohort comparison | Source terms/weights/variables to verify |
| [Clarity CPC2](https://claritychallenge.org/docs/cpc2/cpc2_data) | Left/right audiograms, processed hearing-aid signals and listener responses | Speech intelligibility/DSP research | Verify challenge terms and listener splits before any training |
| [Clarity CEC2](https://claritychallenge.org/docs/cec2/data/cec2_data) | Scenes, interferers, hearing-aid listener metadata | Speech/noise benchmarking | Verify rights for each audio corpus |
| [WHO World Report on Hearing](https://www.who.int/publications/i/item/9789240020481) | Public-health reference | Citation-backed educational retrieval | Do not assume permission to fine-tune on full text |
| [NIDCD hearing education](https://www.nidcd.nih.gov/health/hearing-ear-infections-deafness) | Patient education | Citation-based RAG and clinical red-flag research | Review usage and copyright terms |
| Apple Health / HealthKit | Individual user-authorized personal health records | Optional local import/display only if permitted | **Not a public labelled training dataset; no default model training** |
| Kaggle and Hugging Face | Third-party hosted datasets of varying quality | Discovery only | Dataset card, original source, PII, label protocol and training rights must be independently verified |

**The mere presence of labels or “medical” in the dataset name is not evidence of diagnostic validity.** Audiograms alone do not determine pathology. Never infer bone/air conduction, a diagnosis or treatment from air-conduction thresholds alone.

## Source acceptance fields

`source_id, title, url, version, publisher, original_author, license, permitted_training, permitted_redistribution, PII_review, consent_scope, sample_count, label_protocol, clinical_reviewer, checksum, train_split, dev_split, holdout_split, approved_by, approved_at`.

## Apple Health boundary

HealthKit is an integration interface to user-permissioned records; it is not Apple-provided downloadable training ground truth. Access/processing must be declared, purpose-limited and governed by developer policies and applicable local laws. Consent to import data for display does **not** equal consent to train a shared model; users must have export/delete controls. Never scrape or upload patient information from Apple Health by default.

## Roadmap for assistant data

1. **RAG first** with versioned sources and passage-level citations.
2. Curate 100–200 synthetic Vietnamese conversation cases for editorial review (family communication, audiogram explanation, red flags, privacy, sample-versus-measured distinction); avoid claiming these drafts are clinical ground truth.
3. Build 200–500 held-out cases with clinician annotation (risk, hallucination, unsupported claims, ear/frequency/unit errors).
4. Pilot SFT/LoRA **only** to improve style/format/policy adherence after a stronger RAG baseline and licensed data.
5. Recheck safety, source accuracy, red-flag escalation and latency before any release.

**Not release criteria:** fitting a neural model, using an image classifier on unlabeled audiograms or a simulated accuracy score.
