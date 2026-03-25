#!/usr/bin/env python3
# -*- coding: utf-8 -*-
# cspell:ignore Krita krita storycore

"""
Krita Plugin for StoryCore Engine
A basic plugin structure to enable StoryCore integration with Krita
"""

from krita import Extension, Krita  # type: ignore

class StoryCoreKritaExtension(Extension):
    def __init__(self, parent):
        super().__init__(parent)
        self.krita = Krita.instance()

    def setup(self):
        # Register the plugin with Krita
        self.krita.addExtension(self)

    def createActions(self, window):
        # Create actions for the plugin
        action = window.createAction("storycore_import_storyboard", "Import Storyboard")
        action.triggered.connect(self.import_storyboard)
        
        # Add to the appropriate menu
        window.addAction(action, "import", "Tools")

    def import_storyboard(self):
        """
        Import a storyboard from StoryCore format
        Reads shot information and creates layers for each shot
        """
        import json
        from PyQt5.QtWidgets import QFileDialog, QMessageBox # type: ignore
        
        # File dialog to select storyboard JSON
        file_path, _ = QFileDialog.getOpenFileName(
            None, "Select StoryCore Storyboard JSON", "", "JSON Files (*.json)"
        )
        
        if not file_path:
            return

        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                storyboard = json.load(f)
            
            shots = storyboard.get('shots', []) if isinstance(storyboard, dict) else storyboard
            
            if not shots:
                QMessageBox.warning(None, "Import Error", "No shots found in the selected file.")
                return

            # Ensure we have a document
            doc = self.krita.activeDocument()
            if not doc:
                # Create a default document if none exists (1920x1080, 24fps)
                doc = self.krita.createDocument(1920, 1080, "StoryCore Storyboard", "RGBA", "U8", "", 24.0)
                self.krita.activeWindow().addView(doc)

            root = doc.rootNode()
            
            # Create a group for the storyboard
            storyboard_group = doc.createGroupLayer(f"Storyboard Import")
            root.addChildNode(storyboard_group, None)

            for i, shot in enumerate(shots):
                shot_name = shot.get('name', f"Shot {i+1}")
                duration = shot.get('duration', 120)
                
                # Create a layer for each shot
                shot_layer = doc.createPaintLayer(shot_name, "None")
                storyboard_group.addChildNode(shot_layer, None)
                
                # Optionally set some metadata or color labels
                # (Krita API for setting frame data is more complex, but we can start with layers)
            
            doc.refreshProjection()
            QMessageBox.information(None, "Import Success", f"Imported {len(shots)} shots as layers.")
            
        except Exception as e:
            QMessageBox.critical(None, "Import Error", f"Failed to import storyboard: {str(e)}")

# Register the extension
Krita.instance().addExtension(StoryCoreKritaExtension(Krita.instance()))
