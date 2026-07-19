package com.memcab.app.data;

/** Mirrors the Word shape from models.ts (word.id, word.word, word.translation, ...). */
public class DeckWord {

    private final String id;
    private final String word;
    private final String translation;
    private final String romanization;
    private final String partOfSpeech;
    private final String customNote;

    public DeckWord(String id, String word, String translation, String romanization,
                     String partOfSpeech, String customNote) {
        this.id = id;
        this.word = word;
        this.translation = translation;
        this.romanization = romanization;
        this.partOfSpeech = partOfSpeech;
        this.customNote = customNote;
    }

    public String getId() {
        return id;
    }

    public String getWord() {
        return word;
    }

    public String getTranslation() {
        return translation;
    }

    public String getRomanization() {
        return romanization;
    }

    public String getPartOfSpeech() {
        return partOfSpeech;
    }

    public String getCustomNote() {
        return customNote;
    }
}
