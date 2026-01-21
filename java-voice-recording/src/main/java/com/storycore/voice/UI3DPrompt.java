package com.storycore.voice;

import org.lwjgl.glfw.GLFW;
import org.lwjgl.opengl.GL;
import org.lwjgl.opengl.GL11;
import org.lwjgl.stb.STBTTFontinfo;
import org.lwjgl.stb.STBTTPackContext;
import org.lwjgl.stb.STBTTPackedchar;
import org.lwjgl.system.MemoryStack;
import java.nio.ByteBuffer;
import java.nio.IntBuffer;

/**
 * UI overlay 3D simple via LWJGL pour affichage prompteur phrases.
 */
public final class UI3DPrompt {
    private long window;
    private int width = 800;
    private int height = 600;
    private String currentPhrase = "";

    public void init() {
        if (!GLFW.glfwInit()) {
            throw new RuntimeException("Impossible initialiser GLFW");
        }

        GLFW.glfwWindowHint(GLFW.GLFW_VISIBLE, GLFW.GLFW_FALSE);
        GLFW.glfwWindowHint(GLFW.GLFW_DECORATED, GLFW.GLFW_FALSE);
        GLFW.glfwWindowHint(GLFW.GLFW_TRANSPARENT_FRAMEBUFFER, GLFW.GLFW_TRUE);

        window = GLFW.glfwCreateWindow(width, height, "Voice Prompt", 0, 0);
        if (window == 0) {
            throw new RuntimeException("Impossible créer fenêtre GLFW");
        }

        GLFW.glfwMakeContextCurrent(window);
        GL.createCapabilities();
        GL11.glEnable(GL11.GL_BLEND);
        GL11.glBlendFunc(GL11.GL_SRC_ALPHA, GL11.GL_ONE_MINUS_SRC_ALPHA);
    }

    public void setPhrase(String phrase) {
        this.currentPhrase = phrase;
    }

    public void render() {
        GL11.glClear(GL11.GL_COLOR_BUFFER_BIT);
        GL11.glLoadIdentity();

        // Rendu texte simple (placeholder - vrai rendu font nécessiterait plus de setup)
        GL11.glColor3f(1.0f, 1.0f, 1.0f);
        // Ici ajouter vrai rendu texte avec STB

        GLFW.glfwSwapBuffers(window);
        GLFW.glfwPollEvents();
    }

    public void show() {
        GLFW.glfwShowWindow(window);
    }

    public void hide() {
        GLFW.glfwHideWindow(window);
    }

    public boolean shouldClose() {
        return GLFW.glfwWindowShouldClose(window);
    }

    public void cleanup() {
        GLFW.glfwDestroyWindow(window);
        GLFW.glfwTerminate();
    }
}