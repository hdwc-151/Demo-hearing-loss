# HearAtlas — product naming & release transition

**Temporary product identity:** HearAtlas; **assistant:** Dr. Bunny — nhân vật trò chuyện trong HearAtlas, không phải bác sĩ; **tagline:** *Hiểu âm thanh. Kết nối trải nghiệm.*; **phase:** product-alpha, not clinically validated.

## Keywords
`audiogram` = biểu đồ thính lực; `hearing_threshold_db_hl` = ngưỡng nghe (dB HL); `spl_db` = mức áp suất âm; `digital_level_dbfs` = mức tín hiệu số; `ear_left/right` = tai trái/phải; `simulation_profile` = hồ sơ giả định; `measured_audiogram` = dữ liệu có nguồn đo; `speech_in_noise` = hiểu lời nói trong môi trường ồn; `cochlear_model` = mô hình ốc tai; `educational_wdrc` = WDRC minh hoạ; `evidence_assistant` = trợ lý có nguồn; `care_referral` = định hướng tìm chuyên gia.

## Product phases
- **Alpha (now):** unify public branding, preserve internal identifiers/storage/API, define privacy, medical claim policy and dated release notes; old demo snapshots remain under archive.
- **Research validation:** separate audiogram measured/simulated, build offline source-controlled RAG and clinical red-flag test suites; add bilateral schema.
- **Private beta:** usability/accessibility, staged mobile builds, restore/delete and backup tests, structured feedback and P95 latency.
- **Public beta:** accurate documentation, changelog, support, distribution signing, dependency audit, explicit safety boundaries.
- **Regulated/clinical use (future only):** requires independent validation and product-intended-use/regulatory assessment; a disclaimer does not exempt a diagnostic product from applicable rules.

## Safe rename decisions
- Only alter **display brand** across Web/PWA/iOS/Android and assistant persona in this PR; do **not** rename the GitHub repository, Android bundle ID, deep-link scheme, storage keys or legacy API endpoints.
- Do not overwrite historic demos; the single-file artifact is an offline distribution and is preserved with a SHA snapshot before replacing.
- Brand name still requires trademark, domain, social and app-store clearance before release.
