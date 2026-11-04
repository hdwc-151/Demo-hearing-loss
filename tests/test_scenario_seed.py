"""Check that all synthetic assistant scenario seeds remain non-trainable drafts."""
import json
from pathlib import Path

def test_scenario_seeds_are_structured_and_not_clinical_ground_truth():
    path = Path(__file__).resolve().parents[1] / "datasets" / "scenarios" / "seed_vi.jsonl"
    data = [json.loads(s) for s in path.read_text(encoding="utf-8").splitlines() if s.strip()]
    assert len(data) >= 12
    ids = [x["id"] for x in data]
    assert len(ids) == len(set(ids))
    assert any(x["risk"] == "urgent" for x in data)
    assert any(x["profile_source"] == "simulated" for x in data)
    for record in data:
        assert record["status"] == "synthetic_draft_not_clinically_reviewed"
        assert record["trainable"] is False
        assert record["split"] in ("dev", "holdout")
        assert record["user_message"].strip() and record["expected_behavior"].strip()
        assert isinstance(record["reference_urls"], list)
