import React from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { ProjectTranslator } from '@/addons/project-translator';

interface ProjectTranslatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectData: Record<string, unknown>;
}

export const ProjectTranslatorModal: React.FC<ProjectTranslatorModalProps> = ({
  isOpen,
  onClose,
  projectId,
  projectData
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative z-[110] w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Close button */}
        <div className="absolute top-4 right-4 z-[120]">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={onClose}
            className="text-slate-400 hover:text-white hover:bg-slate-800 rounded-full"
          >
            <X size={20} />
          </Button>
        </div>

        {/* The Translator Addon Component */}
        <div className="max-h-[85vh] overflow-y-auto custom-scrollbar">
          <ProjectTranslator 
            projectId={projectId}
            projectData={projectData}
            onTranslationComplete={() => {
              // Optionally handle completion (e.g. reload project)
            }}
          />
        </div>
      </div>
    </div>
  );
};
