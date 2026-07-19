package com.memcab.app.network.model;

/** Request body for POST /api/sentence — mirrors the prompt built in sentence.service.ts. */
public class SentenceRequest {

    private final String term;

    public SentenceRequest(String term) {
        this.term = term;
    }

    public String getTerm() {
        return term;
    }
}
