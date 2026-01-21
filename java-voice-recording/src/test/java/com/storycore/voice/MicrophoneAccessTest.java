package com.storycore.voice;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class MicrophoneAccessTest {

    @Test
    void testIsMicrophoneAvailable() {
        // Test vérification disponibilité microphone
        boolean available = MicrophoneAccess.isMicrophoneAvailable();
        // Ne peut pas assumer true/false, juste que méthode ne crash pas
        assertNotNull(available);
    }

    @Test
    void testMicrophoneAccessLifecycle() throws Exception {
        if (!MicrophoneAccess.isMicrophoneAvailable()) {
            // Skip si pas de micro
            return;
        }

        MicrophoneAccess access = new MicrophoneAccess();
        assertFalse(access.isOpen());

        access.open();
        assertTrue(access.isOpen());

        access.close();
        assertFalse(access.isOpen());
    }
}