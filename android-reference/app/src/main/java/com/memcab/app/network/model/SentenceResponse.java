package com.memcab.app.network.model;

/**
 * Response body for POST /api/sentence. Field names match the JSON contract used by
 * SentenceService.generateCustom() on the web side, so both clients can share one backend.
 */
public class SentenceResponse {

    private String thai;
    private String romanization;
    private String partOfSpeech;
    private String sentenceThai;
    private String sentenceRomanization;
    private String sentenceEnglish;

    public String getThai() {
        return thai;
    }

    public String getRomanization() {
        return romanization;
    }

    public String getPartOfSpeech() {
        return partOfSpeech;
    }

    public String getSentenceThai() {
        return sentenceThai;
    }

    public String getSentenceRomanization() {
        return sentenceRomanization;
    }

    public String getSentenceEnglish() {
        return sentenceEnglish;
    }

    /** True once every field the UI needs to render a result is present. */
    public boolean isComplete() {
        return thai != null && !thai.isEmpty()
                && sentenceThai != null && !sentenceThai.isEmpty()
                && sentenceEnglish != null && !sentenceEnglish.isEmpty();
    }
}
