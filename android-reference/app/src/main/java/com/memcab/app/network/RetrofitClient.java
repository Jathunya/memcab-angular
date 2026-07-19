package com.memcab.app.network;

import java.util.concurrent.TimeUnit;

import okhttp3.OkHttpClient;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;

/** Lazily-built singleton Retrofit client shared by all network calls in the app. */
public final class RetrofitClient {

    // TODO: replace with your actual AI backend base URL.
    private static final String BASE_URL = "https://api.memcab.app/";

    private static volatile Retrofit instance;

    private RetrofitClient() {
    }

    public static SentenceApiService sentenceApi() {
        return getRetrofit().create(SentenceApiService.class);
    }

    private static Retrofit getRetrofit() {
        if (instance == null) {
            synchronized (RetrofitClient.class) {
                if (instance == null) {
                    OkHttpClient client = new OkHttpClient.Builder()
                            .connectTimeout(15, TimeUnit.SECONDS)
                            .readTimeout(20, TimeUnit.SECONDS)
                            .writeTimeout(15, TimeUnit.SECONDS)
                            .build();

                    instance = new Retrofit.Builder()
                            .baseUrl(BASE_URL)
                            .client(client)
                            .addConverterFactory(GsonConverterFactory.create())
                            .build();
                }
            }
        }
        return instance;
    }
}
