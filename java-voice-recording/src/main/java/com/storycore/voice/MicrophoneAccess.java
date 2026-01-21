package com.storycore.voice;

import javax.sound.sampled.AudioFormat;
import javax.sound.sampled.AudioSystem;
import javax.sound.sampled.DataLine;
import javax.sound.sampled.LineUnavailableException;
import javax.sound.sampled.TargetDataLine;
import java.util.Arrays;

/**
 * Accès microphone via Java Sound API avec gestion d'erreurs robuste.
 */
public final class MicrophoneAccess {
    private static final AudioFormat FORMAT = new AudioFormat(
        AudioFormat.Encoding.PCM_SIGNED,
        44100.0f,
        16,
        2,
        4,
        44100.0f,
        false
    );

    private final TargetDataLine line;

    public MicrophoneAccess() throws LineUnavailableException {
        DataLine.Info info = new DataLine.Info(TargetDataLine.class, FORMAT);
        if (!AudioSystem.isLineSupported(info)) {
            throw new LineUnavailableException("Format audio non supporté");
        }
        this.line = (TargetDataLine) AudioSystem.getLine(info);
    }

    public void open() throws LineUnavailableException {
        line.open(FORMAT);
        line.start();
    }

    public void close() {
        line.stop();
        line.close();
    }

    public boolean isOpen() {
        return line.isOpen();
    }

    public int read(byte[] buffer) {
        return line.read(buffer, 0, buffer.length);
    }

    public AudioFormat getFormat() {
        return FORMAT;
    }

    public static boolean isMicrophoneAvailable() {
        return Arrays.stream(AudioSystem.getTargetLineInfo(new DataLine.Info(TargetDataLine.class, FORMAT)))
            .findAny()
            .isPresent();
    }
}