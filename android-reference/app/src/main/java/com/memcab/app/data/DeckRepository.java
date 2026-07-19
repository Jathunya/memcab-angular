package com.memcab.app.data;

import java.util.List;

/**
 * Integration point for "Add to My Decks". If your app already has a deck store (Room DAO,
 * a repository backed by your own backend, etc.), implement this interface against it instead
 * of using {@link SharedPreferencesDeckRepository} — SentenceLabActivity only depends on this
 * interface, not on any concrete storage.
 */
public interface DeckRepository {

    List<Deck> getAllDecks();

    void addWordToDeck(String deckId, DeckWord word);
}
