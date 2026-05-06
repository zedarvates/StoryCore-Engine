import { Provider as ReduxProvider } from 'react-redux';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { createDragDropManager } from 'dnd-core';
import { I18nProvider } from '@/utils/i18n';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { SecretModeProvider } from '@/contexts/SecretModeContext';
import { LLMProvider } from '@/providers/LLMProvider';
import { ScreenReaderAnnouncerProvider } from '@/components/menuBar/ScreenReaderAnnouncer';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { StoreSynchronizer } from '@/stores/StoreSynchronizer';
import { store as reduxStore } from '@/sequence-editor/store';

let globalDndManager: any = null;
const getDndManager = () => {
  if (!globalDndManager) {
    globalDndManager = createDragDropManager(HTML5Backend);
  }
  return globalDndManager;
};

export interface AppProvidersProps {
  children: React.ReactNode;
}

export function AppProviders({ children }: AppProvidersProps) {
  return (
    <ErrorBoundary>
      <ReduxProvider store={reduxStore}>
        <DndProvider manager={getDndManager()}>
          <I18nProvider defaultLanguage="en" enableAutoDetect={false}>
            <StoreSynchronizer />
            <LanguageProvider>
              <NavigationProvider>
                <SecretModeProvider>
                  <LLMProvider>
                    <ScreenReaderAnnouncerProvider>
                      <div className="relative min-h-screen">
                        {children}
                      </div>
                    </ScreenReaderAnnouncerProvider>
                  </LLMProvider>
                </SecretModeProvider>
              </NavigationProvider>
            </LanguageProvider>
          </I18nProvider>
        </DndProvider>
      </ReduxProvider>
    </ErrorBoundary>
  );
}
