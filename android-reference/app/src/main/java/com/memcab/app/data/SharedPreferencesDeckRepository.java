package com.memcab.app.data;

import android.content.Context;
import android.content.SharedPreferences;

import com.google.gson.Gson;
import com.google.gson.reflect.TypeToken;

import java.lang.reflect.Type;
import java.util.ArrayList;
import java.util.List;

/**
 * Default {@link DeckRepository}: stores decks as JSON under the same "memcab_folders" key
 * the web app uses for localStorage, so the on-device shape stays consistent with the rest
 * of the product even though the two platforms don't share storage. Swap this out for a
 * Room-backed implementation if/when the app needs one.
 */
public class SharedPreferencesDeckRepository implements DeckRepository {

    private static final String PREFS_NAME = "memcab_prefs";
    private static final String FOLDERS_KEY = "memcab_folders";

    private final SharedPreferences prefs;
    private final Gson gson = new Gson();

    public SharedPreferencesDeckRepository(Context context) {
        this.prefs = context.getApplicationContext().getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE);
    }

    @Override
    public List<Deck> getAllDecks() {
        String json = prefs.getString(FOLDERS_KEY, null);
        if (json == null) {
            return new ArrayList<>();
        }
        Type listType = new TypeToken<ArrayList<Deck>>() {
        }.getType();
        List<Deck> decks = gson.fromJson(json, listType);
        return decks != null ? decks : new ArrayList<>();
    }

    @Override
    public void addWordToDeck(String deckId, DeckWord word) {
        List<Deck> decks = getAllDecks();
        List<Deck> updated = new ArrayList<>();
        for (Deck deck : decks) {
            if (deck.getId().equals(deckId)) {
                List<DeckWord> words = new ArrayList<>(deck.getWords());
                words.add(word);
                updated.add(new Deck(deck.getId(), deck.getName(), deck.getDescription(), deck.getCreatedAt(), words));
            } else {
                updated.add(deck);
            }
        }
        prefs.edit().putString(FOLDERS_KEY, gson.toJson(updated)).apply();
    }
}
