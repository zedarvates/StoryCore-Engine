import React, { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    className?: string;
    icon?: React.ReactNode;
    headerActions?: React.ReactNode;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    defaultExpanded = false,
    className = '',
    icon,
    headerActions,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div className={`collapsible-section ${isExpanded ? 'is-expanded' : 'is-collapsed'} ${className}`}>
            <div
                className="collapsible-header"
                onClick={() => setIsExpanded(!isExpanded)}
                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'rgba(255, 255, 255, 0.03)', borderRadius: '8px', marginBottom: isExpanded ? '12px' : '0', transition: 'all 0.2s ease' }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                    {icon && <span className="section-icon text-primary">{icon}</span>}
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--foreground)' }}>{title}</h3>
                </div>
                <div onClick={(e) => e.stopPropagation()}>
                    {headerActions}
                </div>
            </div>

            {isExpanded && (
                <div className="collapsible-content">
                    {children}
                </div>
            )}
        </div>
    );
};
