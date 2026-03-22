import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

interface CollapsibleSectionProps {
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    className?: string;
    icon?: React.ReactNode;
    headerActions?: React.ReactNode;
    id?: string;
}

export const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
    title,
    children,
    defaultExpanded = false,
    className = '',
    icon,
    headerActions,
    id,
}) => {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div 
            id={id}
            className={cn(
            'group mb-6 rounded-2xl overflow-hidden transition-all duration-300',
            isExpanded ? 'glass-panel shadow-2xl' : 'bg-white/5 hover:bg-white/8 border border-white/5',
            className
        )}>
            <div
                className="flex items-center justify-between p-4 cursor-pointer select-none"
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div className="flex items-center gap-3">
                    <motion.div
                        animate={{ rotate: isExpanded ? 0 : -90 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                    >
                        <ChevronDown className="w-4 h-4 text-white/40 group-hover:text-white/60 transition-colors" />
                    </motion.div>
                    
                    {icon && (
                        <span className="flex items-center justify-center p-2 rounded-xl bg-primary/10 text-primary border border-primary/20 shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
                            {icon}
                        </span>
                    )}
                    
                    <h3 className="text-sm font-bold uppercase tracking-widest text-white/90 group-hover:text-white transition-colors">
                        {title}
                    </h3>
                </div>
                
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    {headerActions}
                </div>
            </div>

            <motion.div
                initial={false}
                animate={isExpanded ? "open" : "collapsed"}
                variants={{
                    open: { height: "auto", opacity: 1 },
                    collapsed: { height: 0, opacity: 0 }
                }}
                transition={{ duration: 0.4, ease: [0.04, 0.62, 0.23, 0.98] }}
                className="overflow-hidden"
            >
                <div className="p-6 pt-0 border-t border-white/5 mt-2 overflow-hidden">
                    {children}
                </div>
            </motion.div>
        </div>
    );
};
