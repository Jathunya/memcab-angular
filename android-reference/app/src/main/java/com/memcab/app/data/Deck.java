package com.memcab.app.data;

import java.util.ArrayList;
import java.util.List;

/** Mirrors the Folder shape from models.ts (folder.id, folder.name, folder.words, ...). */
public class Deck {

    private final String id;
    private final String name;
    private final String description;
    private final long createdAt;
    private final List<DeckWord> words;

    public Deck(String id, String name, String description, long createdAt, List<DeckWord> words) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.createdAt = createdAt;
        this.words = words != null ? words : new ArrayList<>();
    }

    public String getId() {
        return id;
    }

    public String getName() {
        return name;
    }

    public String getDescription() {
        return description;
    }

    public long getCreatedAt() {
        return createdAt;
    }

    public List<DeckWord> getWords() {
        return words;
    }
}
