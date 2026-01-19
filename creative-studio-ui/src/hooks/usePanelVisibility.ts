import { useAppStore } from '@/stores/useAppStore';

/**
 * Hook for managing panel visibility and layout adjustments
 */
export function usePanelVisibility() {
  const { showChat, setShowChat, panelSizes, setPanelSizes } = useAppStore();

  /**
   * Toggle chat assistant visibility
   */
  const toggleChat = () => {
    const newShowChat = !showChat;
    setShowChat(newShowChat);

    // Adjust panel sizes when chat is toggled
    if (newShowChat) {
      // Chat is being shown - reduce canvas size
      const newSizes = {
        ...panelSizes,
        canvas: Math.max(30, panelSizes.canvas - 10),
        propertiesOrChat: Math.min(40, panelSizes.propertiesOrChat + 10),
      };
      setPanelSizes(newSizes);
    } else {
      // Chat is being hidden - expand canvas
      const newSizes = {
        ...panelSizes,
        canvas: Math.min(60, panelSizes.canvas + 10),
        propertiesOrChat: Math.max(20, panelSizes.propertiesOrChat - 10),
      };
      setPanelSizes(newSizes);
    }
  };

  /**
   * Toggle asset library visibility
   */
  const toggleAssetLibrary = (show: boolean) => {
    if (show) {
      // Show asset library - reduce canvas size
      const newSizes = {
        ...panelSizes,
        assetLibrary: 20,
        canvas: Math.max(40, panelSizes.canvas - 10),
      };
      setPanelSizes(newSizes);
    } else {
      // Hide asset library - expand canvas
      const newSizes = {
        ...panelSizes,
        assetLibrary: 0,
        canvas: Math.min(70, panelSizes.canvas + 10),
      };
      setPanelSizes(newSizes);
    }
  };

  /**
   * Reset panel sizes to defaults
   */
  const resetPanelSizes = () => {
    setPanelSizes({
      assetLibrary: 20,
      canvas: 50,
      propertiesOrChat: 30,
    });
  };

  /**
   * Check if asset library is visible
   */
  const isAssetLibraryVisible = panelSizes.assetLibrary > 0;

  return {
    showChat,
    toggleChat,
    toggleAssetLibrary,
    resetPanelSizes,
    isAssetLibraryVisible,
    panelSizes,
  };
}
