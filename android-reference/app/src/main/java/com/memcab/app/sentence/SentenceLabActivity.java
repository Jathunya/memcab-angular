package com.memcab.app.sentence;

import android.content.Context;
import android.os.Bundle;
import android.speech.tts.TextToSpeech;
import android.text.TextUtils;
import android.view.View;
import android.view.inputmethod.InputMethodManager;
import android.widget.ImageButton;
import android.widget.LinearLayout;
import android.widget.TextView;
import android.widget.Toast;

import androidx.annotation.Nullable;
import androidx.appcompat.app.AlertDialog;
import androidx.appcompat.app.AppCompatActivity;

import com.google.android.material.button.MaterialButton;
import com.google.android.material.textfield.TextInputEditText;
import com.memcab.app.R;
import com.memcab.app.data.Deck;
import com.memcab.app.data.DeckRepository;
import com.memcab.app.data.DeckWord;
import com.memcab.app.data.SharedPreferencesDeckRepository;
import com.memcab.app.network.RetrofitClient;
import com.memcab.app.network.model.SentenceRequest;
import com.memcab.app.network.model.SentenceResponse;

import java.util.List;
import java.util.Locale;
import java.util.UUID;

import retrofit2.Call;
import retrofit2.Callback;
import retrofit2.Response;

/**
 * Sentence Lab — custom word generation.
 *
 * Captures a user-typed word, asks the AI backend (via Retrofit/OkHttp, see
 * {@link RetrofitClient}) to translate it and write an example sentence, and renders the
 * result. Network/parse failures never crash the screen — they fall back to a single
 * friendly error message, matching SentenceService.generateCustom() on the web client.
 */
public class SentenceLabActivity extends AppCompatActivity {

    private static final String OFFLINE_ERROR_MESSAGE =
            "Could not generate sentence. Please check your internet connection.";

    private TextInputEditText customWordInput;
    private MaterialButton aiGenerateButton;
    private TextView sentenceErrorText;

    private LinearLayout loadingGroup;
    private LinearLayout customResultGroup;

    private TextView resultThaiWord;
    private TextView resultRomanization;
    private TextView resultTranslation;
    private TextView resultSentenceThai;
    private TextView resultSentenceRomanization;
    private TextView resultSentenceEnglish;
    private ImageButton hearWordButton;
    private ImageButton hearSentenceButton;
    private MaterialButton addToDecksButton;

    private DeckRepository deckRepository;
    @Nullable
    private TextToSpeech textToSpeech;

    @Nullable
    private SentenceResponse currentResult;
    @Nullable
    private String currentTerm;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_sentence_lab);

        // Swap for your real deck storage if the app already has one — see DeckRepository.
        deckRepository = new SharedPreferencesDeckRepository(this);

        bindViews();
        setupTextToSpeech();

        aiGenerateButton.setOnClickListener(v -> onGenerateClicked());
        hearWordButton.setOnClickListener(v -> speak(textOf(resultThaiWord)));
        hearSentenceButton.setOnClickListener(v -> speak(textOf(resultSentenceThai)));
        addToDecksButton.setOnClickListener(v -> showSaveToDeckDialog());
    }

    private void bindViews() {
        customWordInput = findViewById(R.id.customWordInput);
        aiGenerateButton = findViewById(R.id.aiGenerateButton);
        sentenceErrorText = findViewById(R.id.sentenceErrorText);

        loadingGroup = findViewById(R.id.loadingGroup);
        customResultGroup = findViewById(R.id.customResultGroup);

        resultThaiWord = findViewById(R.id.resultThaiWord);
        resultRomanization = findViewById(R.id.resultRomanization);
        resultTranslation = findViewById(R.id.resultTranslation);
        resultSentenceThai = findViewById(R.id.resultSentenceThai);
        resultSentenceRomanization = findViewById(R.id.resultSentenceRomanization);
        resultSentenceEnglish = findViewById(R.id.resultSentenceEnglish);
        hearWordButton = findViewById(R.id.hearWordButton);
        hearSentenceButton = findViewById(R.id.hearSentenceButton);
        addToDecksButton = findViewById(R.id.addToDecksButton);
    }

    private void setupTextToSpeech() {
        textToSpeech = new TextToSpeech(this, status -> {
            if (status == TextToSpeech.SUCCESS && textToSpeech != null) {
                textToSpeech.setLanguage(new Locale("th", "TH"));
            }
        });
    }

    private void onGenerateClicked() {
        String term = textOf(customWordInput).trim();

        if (TextUtils.isEmpty(term)) {
            showError("Please type a word first.");
            return;
        }

        hideKeyboard();
        showLoading();

        RetrofitClient.sentenceApi()
                .generateSentence(new SentenceRequest(term))
                .enqueue(new Callback<SentenceResponse>() {
                    @Override
                    public void onResponse(Call<SentenceResponse> call, Response<SentenceResponse> response) {
                        SentenceResponse body = response.body();
                        if (!response.isSuccessful() || body == null || !body.isComplete()) {
                            showError(OFFLINE_ERROR_MESSAGE);
                            return;
                        }
                        currentTerm = term;
                        currentResult = body;
                        showResult(term, body);
                    }

                    @Override
                    public void onFailure(Call<SentenceResponse> call, Throwable t) {
                        // Offline, timeout, DNS failure, malformed JSON, etc. — always degrade
                        // to the same friendly message instead of letting the app crash.
                        showError(OFFLINE_ERROR_MESSAGE);
                    }
                });
    }

    private void showLoading() {
        sentenceErrorText.setVisibility(View.GONE);
        customResultGroup.setVisibility(View.GONE);
        loadingGroup.setVisibility(View.VISIBLE);
        aiGenerateButton.setEnabled(false);
    }

    private void showResult(String term, SentenceResponse result) {
        loadingGroup.setVisibility(View.GONE);
        sentenceErrorText.setVisibility(View.GONE);
        aiGenerateButton.setEnabled(true);

        resultThaiWord.setText(result.getThai());
        resultRomanization.setText(result.getRomanization());
        resultTranslation.setText(term);
        resultSentenceThai.setText(result.getSentenceThai());
        resultSentenceRomanization.setText(result.getSentenceRomanization());
        resultSentenceEnglish.setText(result.getSentenceEnglish());

        customResultGroup.setVisibility(View.VISIBLE);
    }

    private void showError(String message) {
        loadingGroup.setVisibility(View.GONE);
        aiGenerateButton.setEnabled(true);
        sentenceErrorText.setText("⚠ " + message);
        sentenceErrorText.setVisibility(View.VISIBLE);
    }

    private void speak(String text) {
        if (textToSpeech == null || TextUtils.isEmpty(text)) return;
        textToSpeech.speak(text, TextToSpeech.QUEUE_FLUSH, null, null);
    }

    private void showSaveToDeckDialog() {
        if (currentResult == null || currentTerm == null) return;

        List<Deck> decks = deckRepository.getAllDecks();
        if (decks.isEmpty()) {
            Toast.makeText(this, "Create a deck first, then come back to save this word.", Toast.LENGTH_LONG).show();
            return;
        }

        String[] deckNames = new String[decks.size()];
        for (int i = 0; i < decks.size(); i++) {
            deckNames[i] = decks.get(i).getName();
        }

        new AlertDialog.Builder(this)
                .setTitle("Add to My Decks")
                .setItems(deckNames, (dialog, which) -> saveWordToDeck(decks.get(which)))
                .setNegativeButton("Cancel", null)
                .show();
    }

    private void saveWordToDeck(Deck deck) {
        if (currentResult == null || currentTerm == null) return;

        DeckWord word = new DeckWord(
                UUID.randomUUID().toString(),
                currentResult.getThai(),
                currentTerm,
                currentResult.getRomanization(),
                TextUtils.isEmpty(currentResult.getPartOfSpeech()) ? "noun" : currentResult.getPartOfSpeech(),
                null);

        deckRepository.addWordToDeck(deck.getId(), word);
        Toast.makeText(this, "Saved to " + deck.getName(), Toast.LENGTH_SHORT).show();
    }

    private void hideKeyboard() {
        InputMethodManager imm = (InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
        if (imm != null && getCurrentFocus() != null) {
            imm.hideSoftInputFromWindow(getCurrentFocus().getWindowToken(), 0);
        }
    }

    private static String textOf(TextView view) {
        return view.getText() == null ? "" : view.getText().toString();
    }

    @Override
    protected void onDestroy() {
        if (textToSpeech != null) {
            textToSpeech.stop();
            textToSpeech.shutdown();
            textToSpeech = null;
        }
        super.onDestroy();
    }
}
