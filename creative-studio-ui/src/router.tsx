import { createBrowserRouter, RouteObject } from 'react-router-dom';
import App from '@/App';
import { LandingPageWithHooks } from '@/pages/LandingPageWithHooks';
import { ProjectDashboardPage } from '@/pages/ProjectDashboardPage';
import { EditorPageSimple } from '@/pages/EditorPageSimple';

/**
 * Application Router Configuration
 * Defines all routes and their components
 */

const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      {
        index: true,
        element: <LandingPageWithHooks />,
      },
      {
        path: 'project/:projectId',
        element: <ProjectDashboardPage />,
      },
      {
        path: 'project/:projectId/editor/:sequenceId',
        element: <EditorPageSimple />,
      },
      {
        path: '*',
        element: <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">404 - Page Not Found</h1>
            <p className="text-gray-600">The page you're looking for doesn't exist.</p>
          </div>
        </div>,
      },
    ],
  },
];

export const router = createBrowserRouter(routes);
