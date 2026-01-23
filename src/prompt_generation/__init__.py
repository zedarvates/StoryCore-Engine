#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Package pour la génération de prompts vidéo.

Ce package contient les modules nécessaires pour générer des prompts vidéo
en utilisant des templates de style extraits des fichiers de référence.
"""

from .VideoPromptGenerator import VideoPromptGenerator, VideoTemplate

__all__ = ["VideoPromptGenerator", "VideoTemplate"]