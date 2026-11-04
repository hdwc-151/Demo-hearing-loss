import test from "node:test";
import assert from "node:assert/strict";
import { answerFromEvidence, MEDICAL_SOURCES } from "../src/data/medicalEvidence.js";
import { stripDecorativeEmoji, selectBunnyEmotion, BUNNY_EMOTIONS } from "../src/util/bunnyPersona.js";

test("WHO statistics and reference title are attributed", () => {
 const response = answerFromEvidence("WHO 2050 có bao nhiêu người nghe kém?");
 assert.equal(response.mode, "evidence");
 assert.ok(response.answer.includes("2,5 tỷ"));
 assert.equal(response.sources[0].url, MEDICAL_SOURCES.who2026.url);
});
test("urgent sudden hearing loss is escalated independently of an audiogram", () => {
 const response = answerFromEvidence("Sáng nay tôi đột ngột nghe kém một tai");
 assert.equal(response.risk, "urgent");
 assert.equal(response.emotion, "serious");
 assert.match(response.answer,/khẩn cấp/);
 assert.equal(selectBunnyEmotion(response),"serious");
});
test("simulated 6-frequency profile cannot diagnose or fit hearing aid", () => {
 const response = answerFromEvidence("Tôi mắc bệnh gì?", {profileSource:"simulated"});
 assert.match(response.answer,/mô phỏng/);
 assert.doesNotMatch(response.answer,/bạn mắc bệnh/);
});
test("general noise communication guidance is not a diagnosis", () => {
 const response = answerFromEvidence("Ở siêu thị tôi nghe thấy nhưng không rõ lời");
 assert.ok(response.sources.length >= 1);
 assert.equal(response.risk,"education");
 assert.equal(response.emotion,"supportive");
});
test("SII not claimed to be clinically implemented", () => {
 const response = answerFromEvidence("SII được tính như thế nào?");
 assert.match(response.answer,/chưa triển khai SII/);
});
test("Unknown questions fall through to the existing GraphRAG", () => {
 assert.equal(answerFromEvidence("Bài toán nguyên hàm là gì?"), null);
});
test("Avatar emotions are finite set; decorative emojis removed without losing meaning", () => {
 assert.equal(Object.keys(BUNNY_EMOTIONS).length,6);
 assert.equal(selectBunnyEmotion({emotion:"irrelevant"}),"explaining");
 assert.equal(stripDecorativeEmoji("🐰 ⚠️ Đi khám ngay"),"Đi khám ngay");
});
