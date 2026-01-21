package com.storycore.voice;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;
import java.util.List;
import java.util.Map;

/**
 * Gestion synchronisation phrases avec timeline audio_sync_points.
 */
public final class PhraseSyncManager {
    private final VoiceHttpClient httpClient;
    private final ObjectMapper mapper;

    public PhraseSyncManager(VoiceHttpClient httpClient) {
        this.httpClient = httpClient;
        this.mapper = new ObjectMapper();
    }

    public void syncPhraseRecording(String phraseId, double recordingStart, double recordingEnd, String audioPath) throws IOException, InterruptedException {
        httpClient.sendRecordingTimestamp(phraseId, recordingStart, recordingEnd, audioPath);
    }

    public List<Map<String, Object>> getAudioSyncPoints(String timelineJson) throws IOException {
        JsonNode root = mapper.readTree(timelineJson);
        JsonNode syncPoints = root.path("audio_sync_points");

        return mapper.convertValue(syncPoints, List.class);
    }

    public double findNearestSyncPoint(List<Map<String, Object>> syncPoints, double targetTime) {
        return syncPoints.stream()
            .mapToDouble(point -> (Double) point.get("timestamp"))
            .min((a, b) -> Double.compare(Math.abs(a - targetTime), Math.abs(b - targetTime)))
            .orElse(targetTime);
    }

    public void updateTimelineSync(String updatedTimelineJson) throws IOException, InterruptedException {
        httpClient.syncWithTimeline(updatedTimelineJson);
    }
}