/**
 * Breadcrumbs Component
 * 
 * Displays navigation breadcrumbs for the current page/section.
 * Helps users understand their location in the application hierarchy.
 */

import React, { useMemo } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import './Breadcrumbs.css';

interface BreadcrumbItem {
  label: string;
  path: string;
  isActive?: boolean;
}

/**
 * Parse the current location and generate breadcrumb items
 */
function useBreadcrumbs(): BreadcrumbItem[] {
  const location = useLocation();

  return useMemo(() => {
    const pathnames = location.pathname.split('/').filter(Boolean);
    const breadcrumbs: BreadcrumbItem[] = [
      {
        label: 'Home',
        path: '/',
        isActive: location.pathname === '/',
      },
    ];

    let currentPath = '';
    pathnames.forEach((pathname, index) => {
      currentPath += `/${pathname}`;
      const isActive = index === pathnames.length - 1;

      // Format the label
      let label = pathname;
      if (pathname === 'project') {
        label = 'Project';
      } else if (pathname === 'editor') {
        label = 'Editor';
      } else if (pathname === 'settings') {
        label = 'Settings';
      } else {
        // Try to get a more readable label from the path
        label = pathname.replace(/-/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
      }

      breadcrumbs.push({
        label,
        path: currentPath,
        isActive,
      });
    });

    return breadcrumbs;
  }, [location.pathname]);
}

/**
 * Breadcrumbs Component
 */
export function Breadcrumbs() {
  const breadcrumbs = useBreadcrumbs();

  if (breadcrumbs.length <= 1) {
    return null; // Don't show breadcrumbs on home page
  }

  return (
    <nav
      className="breadcrumbs"
      aria-label="Breadcrumb navigation"
      role="navigation"
    >
      <ol className="breadcrumbs__list">
        {breadcrumbs.map((breadcrumb, index) => (
          <li key={breadcrumb.path} className="breadcrumbs__item">
            {breadcrumb.isActive ? (
              <span
                className="breadcrumbs__link breadcrumbs__link--active"
                aria-current="page"
              >
                {breadcrumb.label}
              </span>
            ) : (
              <>
                <Link
                  to={breadcrumb.path}
                  className="breadcrumbs__link"
                  aria-label={`Navigate to ${breadcrumb.label}`}
                >
                  {breadcrumb.label}
                </Link>
                {index < breadcrumbs.length - 1 && (
                  <ChevronRight
                    className="breadcrumbs__separator"
                    aria-hidden="true"
                    size={16}
                  />
                )}
              </>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
