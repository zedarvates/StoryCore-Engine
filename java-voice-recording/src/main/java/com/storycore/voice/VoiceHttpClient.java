package com.storycore.voice;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * Client HTTP pour communication avec backend Python.
 */
public final class VoiceHttpClient {
    private final HttpClient client;
    private final String baseUrl;
    private final ObjectMapper mapper;

    public VoiceHttpClient(String baseUrl) {
        this.client = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();
        this.baseUrl = baseUrl;
        this.mapper = new ObjectMapper();
    }

    public void sendRecordingTimestamp(String phraseId, double startTime, double endTime, String audioPath) throws IOException, InterruptedException {
        Map<String, Object> payload = Map.of(
            "phraseId", phraseId,
            "startTime", startTime,
            "endTime", endTime,
            "audioPath", audioPath,
            "type", "voice_recording"
        );

        String json = mapper.writeValueAsString(payload);
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/voice-recording"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(json))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IOException("Erreur HTTP: " + response.statusCode() + " - " + response.body());
        }
    }

    public void syncWithTimeline(String timelineData) throws IOException, InterruptedException {
        HttpRequest request = HttpRequest.newBuilder()
            .uri(URI.create(baseUrl + "/timeline-sync"))
            .header("Content-Type", "application/json")
            .POST(HttpRequest.BodyPublishers.ofString(timelineData))
            .build();

        HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new IOException("Erreur sync timeline: " + response.statusCode());
        }
    }
}