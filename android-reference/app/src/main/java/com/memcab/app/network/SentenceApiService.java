package com.memcab.app.network;

import com.memcab.app.network.model.SentenceRequest;
import com.memcab.app.network.model.SentenceResponse;

import retrofit2.Call;
import retrofit2.http.Body;
import retrofit2.http.POST;

/**
 * AI sentence-generation endpoint. Point RetrofitClient.BASE_URL at whatever backend
 * fronts your AI model (Claude, OpenAI, your own proxy, etc.) — this interface only
 * describes the contract, not the provider.
 */
public interface SentenceApiService {

    @POST("api/sentence")
    Call<SentenceResponse> generateSentence(@Body SentenceRequest request);
}
