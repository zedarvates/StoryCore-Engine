import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { LandingPageWithHooks } from '@/pages/LandingPageWithHooks';
import { ProjectDashboardPage } from '@/pages/ProjectDashboardPage';
import { EditorPageSimple } from '@/pages/EditorPageSimple';
import { DetachedChatPage } from '@/pages/DetachedChatPage';
import ImageEnhancementPanel from '@/components/ImageEnhancementPanel';
import { AdvancedGridEditorPage } from '@/pages/experimental/AdvancedGridEditorPage';
import { AIAssistantV3Page } from '@/pages/experimental/AIAssistantV3Page';
import { PerformanceProfilerPage } from '@/pages/experimental/PerformanceProfilerPage';

import { AppContentInner } from './AppContent';

const AppRoutes = () => {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen">Loading...</div>}>
      <Routes>
        {/* Detached chat - standalone */}
        <Route path="/detached-chat" element={<DetachedChatPage />} />

        {/* Main app routes wrapper with MenuBar and common logic */}
        <Route element={<AppContentInner />}>
          <Route index element={<LandingPageWithHooks />} />
          
          <Route path="project/:projectId" element={<ProjectDashboardPage />} />
          
          <Route path="project/:projectId/editor/:sequenceId" element={<EditorPageSimple />} />
          
          <Route path="experimental-ai" element={<ImageEnhancementPanel />} />
          
          <Route path="experimental/advanced-grid" element={<AdvancedGridEditorPage />} />
          <Route path="experimental/ai-assistant-v3" element={<AIAssistantV3Page />} />
          <Route path="experimental/performance-profiler" element={<PerformanceProfilerPage />} />
          
          {/* 404 */}
          <Route path="*" element={
            <div className="flex items-center justify-center h-screen">
              <div className="text-center">
                <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
                <p className="text-gray-600">The page you're looking for doesn't exist.</p>
              </div>
            </div>
          } />
        </Route>
      </Routes>
    </Suspense>
  );
};

export { AppRoutes };
