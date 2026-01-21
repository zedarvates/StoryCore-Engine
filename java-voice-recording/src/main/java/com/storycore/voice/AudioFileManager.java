package com.storycore.voice;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

/**
 * Gestion structurée fichiers audio avec organisation par phrase.
 */
public final class AudioFileManager {
    private final Path baseDirectory;

    public AudioFileManager(Path baseDirectory) {
        this.baseDirectory = baseDirectory;
        createDirectories();
    }

    private void createDirectories() {
        try {
            Files.createDirectories(baseDirectory);
        } catch (IOException e) {
            throw new RuntimeException("Impossible créer répertoires audio", e);
        }
    }

    public Path createPhraseDirectory(String phraseId) throws IOException {
        Path phraseDir = baseDirectory.resolve(phraseId);
        return Files.createDirectories(phraseDir);
    }

    public Path generateAudioFilePath(String phraseId, String extension) {
        String fileName = "recording_" + UUID.randomUUID() + "." + extension;
        return baseDirectory.resolve(phraseId).resolve(fileName);
    }

    public boolean deletePhraseAudio(String phraseId) throws IOException {
        Path phraseDir = baseDirectory.resolve(phraseId);
        if (Files.exists(phraseDir)) {
            // Supprimer tous fichiers dans le dossier
            Files.walk(phraseDir)
                .filter(Files::isRegularFile)
                .forEach(file -> {
                    try {
                        Files.delete(file);
                    } catch (IOException e) {
                        // Log erreur mais continuer
                    }
                });
            Files.deleteIfExists(phraseDir);
            return true;
        }
        return false;
    }

    public long getPhraseAudioSize(String phraseId) throws IOException {
        Path phraseDir = baseDirectory.resolve(phraseId);
        if (!Files.exists(phraseDir)) {
            return 0;
        }
        return Files.walk(phraseDir)
            .filter(Files::isRegularFile)
            .mapToLong(file -> {
                try {
                    return Files.size(file);
                } catch (IOException e) {
                    return 0;
                }
            })
            .sum();
    }
}