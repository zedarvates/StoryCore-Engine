import React, { useState, useMemo } from 'react';
import { Accessibility, Search, Box, Info } from 'lucide-react';
import { POSE_TEMPLATES, POSE_TEMPLATE_CATEGORIES } from '../../../data/templates/poseTemplates';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import './Library.css';

export interface PoseLibraryProps {
  onPoseSelect: (poseId: string) => void;
  className?: string;
}

export const PoseLibrary: React.FC<PoseLibraryProps> = ({
  onPoseSelect,
  className = ''
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('all');

  const filteredPoses = useMemo(() => {
    return POSE_TEMPLATES.filter(pose => {
      const matchesSearch = pose.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        pose.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = activeCategory === 'all' || pose.category === activeCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, activeCategory]);

  const handleDragStart = (pose: typeof POSE_TEMPLATES[number]) => (e: React.DragEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify({
      type: 'pose-template',
      poseId: pose.id,
      name: pose.name,
      category: pose.category
    }));
  };

  return (
    <div className={cn("pose-library flex flex-col h-full bg-[#050508] border-r border-primary/20", className)}>
      <div className="p-4 border-b border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 bg-primary/20 rounded-lg">
            <Accessibility className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-black text-xs uppercase tracking-widest text-white">Pose Library</h3>
            <p className="text-[10px] text-primary-foreground/60 uppercase">Template Actions</p>
          </div>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-primary/40" />
          <Input
            placeholder="Search poses..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 bg-black/40 border-primary/20 text-xs focus-visible:ring-primary/30"
          />
        </div>
      </div>

      <Tabs defaultValue="all" className="flex-1 flex flex-col overflow-hidden" onValueChange={setActiveCategory}>
        <div className="px-2 pt-2 bg-primary/2">
          <TabsList className="w-full bg-black/40 border border-primary/10 h-8 p-1">
            <TabsTrigger value="all" className="flex-1 text-[9px] uppercase font-bold data-[state=active]:bg-primary/20">All</TabsTrigger>
            <TabsTrigger value="basic" className="flex-1 text-[9px] uppercase font-bold data-[state=active]:bg-primary/20">Basic</TabsTrigger>
            <TabsTrigger value="action" className="flex-1 text-[9px] uppercase font-bold data-[state=active]:bg-primary/20">Action</TabsTrigger>
            <TabsTrigger value="emotional" className="flex-1 text-[9px] uppercase font-bold data-[state=active]:bg-primary/20">Emo</TabsTrigger>
            <TabsTrigger value="interaction" className="flex-1 text-[9px] uppercase font-bold data-[state=active]:bg-primary/20">Inter</TabsTrigger>
          </TabsList>
        </div>

        <ScrollArea className="flex-1 p-2">
          <div className="grid grid-cols-2 gap-2">
            {filteredPoses.map((pose) => (
              <div
                key={pose.id}
                className="group relative flex flex-col items-center justify-center p-3 rounded-xl border border-primary/10 bg-primary/2 hover:bg-primary/10 hover:border-primary/40 transition-all cursor-pointer overflow-hidden"
                draggable
                onDragStart={handleDragStart(pose)}
                onClick={() => onPoseSelect(pose.id)}
              >
                <div className="w-10 h-10 mb-2 rounded-lg bg-black/40 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <span className="text-xl">
                    {POSE_TEMPLATE_CATEGORIES[pose.category as keyof typeof POSE_TEMPLATE_CATEGORIES].icon}
                  </span>
                </div>
                <div className="text-[10px] font-bold text-white text-center line-clamp-1">{pose.name}</div>
                <div className="text-[8px] text-primary/40 uppercase tracking-tighter">{pose.category}</div>
                
                {/* Drag handle overlay */}
                <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Box className="w-3 h-3 text-primary/60" />
                </div>
              </div>
            ))}

            {filteredPoses.length === 0 && (
              <div className="col-span-2 py-12 text-center space-y-3">
                <Info className="w-8 h-8 text-primary/20 mx-auto" />
                <p className="text-xs text-primary/40 uppercase font-bold">No poses found</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </Tabs>
      
      <div className="p-3 bg-primary/5 border-t border-primary/10">
        <p className="text-[8px] text-primary-foreground/40 text-center uppercase tracking-widest">
          {filteredPoses.length} POSES READY TO DEPLOY
        </p>
      </div>
    </div>
  );
};
