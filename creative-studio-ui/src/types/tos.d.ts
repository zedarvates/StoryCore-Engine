/** IPC exposed only by the terms-of-service dialog's preload. */
export interface TOSElectronAPI {
  sendAcceptance: () => void;
  sendExit: () => void;
}
