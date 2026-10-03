/**
 * WorkflowDestinationDialog
 * 
 * A dialog to select the ComfyUI workflow (model) for a specific entity
 * (Character, Location, or Object).
 */

import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Box, Typography, Card, CardContent, Grid, Radio, RadioGroup, FormControlLabel } from '@mui/material';
import { Workflow, CheckCircle, Zap, Shield, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface WorkflowOption {
    id: string;
    name: string;
    description: string;
    icon: React.ElementType;
    quality: 'Standard' | 'High' | 'Ultra';
    speed: 'Fast' | 'Normal' | 'Slow';
}

const workflowOptions: WorkflowOption[] = [
    {
        id: 'z_image_turbo',
        name: 'Z-Image Turbo',
        description: 'Fastest generation with good quality. Ideal for quick iterations.',
        icon: Zap,
        quality: 'Standard',
        speed: 'Fast',
    },
    {
        id: 'flux2',
        name: 'Flux.2 Klein',
        description: 'High quality 9B model for detailed characters and realistic landscapes.',
        icon: Sparkles,
        quality: 'High',
        speed: 'Normal',
    },
    {
        id: 'z_image_turbo_coherence',
        name: 'Turbo Coherence',
        description: 'Optimized for consistency across multiple generations of the same subject.',
        icon: Shield,
        quality: 'High',
        speed: 'Normal',
    },
    {
        id: 'sdxl',
        name: 'SDXL Standard',
        description: 'Classic Stable Diffusion XL workflow for general purpose generation.',
        icon: Workflow,
        quality: 'Standard',
        speed: 'Normal',
    },
    {
        id: 'firered_image_edit',
        name: 'FireRed Edit',
        description: 'Specialized workflow for modifying existing character appearances.',
        icon: Zap,
        quality: 'Ultra',
        speed: 'Slow',
    }
];

interface WorkflowDestinationDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (workflowId: string) => void;
    currentWorkflowId?: string;
    entityName: string;
    entityType: 'Character' | 'Location' | 'Object' | 'Style';
}

export const WorkflowDestinationDialog: React.FC<WorkflowDestinationDialogProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentWorkflowId,
    entityName,
    entityType,
}) => {
    const [selectedId, setSelectedId] = useState<string>(currentWorkflowId || 'z_image_turbo');

    const handleConfirm = () => {
        onSelect(selectedId);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl bg-white p-0 overflow-hidden">
                <DialogHeader className="p-6 bg-slate-900 text-white">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500/20 rounded-lg">
                            <Workflow className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                            <DialogTitle className="text-xl font-bold">Workflow Model Selection</DialogTitle>
                            <DialogDescription className="text-slate-400">
                                Choose the generation pipeline for <span className="text-blue-400 font-semibold">{entityName}</span> ({entityType})
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 max-h-[60vh] overflow-y-auto bg-slate-50">
                    <div className="grid grid-cols-1 gap-4">
                        {workflowOptions.map((option) => (
                            <Card
                                key={option.id}
                                className={cn(
                                    "cursor-pointer transition-all border-2",
                                    selectedId === option.id
                                        ? "border-blue-500 bg-blue-50 shadow-md"
                                        : "border-transparent bg-white hover:border-slate-200"
                                )}
                                onClick={() => setSelectedId(option.id)}
                            >
                                <CardContent className="p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className={cn(
                                            "p-3 rounded-full",
                                            selectedId === option.id ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500"
                                        )}>
                                            {React.createElement(option.icon, { className: "w-6 h-6" })}
                                        </div>
                                        <div>
                                            <Typography variant="subtitle1" fontWeight="bold">
                                                {option.name}
                                            </Typography>
                                            <Typography variant="body2" color="text.secondary">
                                                {option.description}
                                            </Typography>
                                            <div className="flex gap-2 mt-2">
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                                    option.quality === 'Ultra' ? "bg-purple-100 text-purple-700" :
                                                        option.quality === 'High' ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-700"
                                                )}>
                                                    {option.quality} Quality
                                                </span>
                                                <span className={cn(
                                                    "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase",
                                                    option.speed === 'Fast' ? "bg-green-100 text-green-700" :
                                                        option.speed === 'Slow' ? "bg-orange-100 text-orange-700" : "bg-slate-100 text-slate-700"
                                                )}>
                                                    {option.speed} Speed
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    {selectedId === option.id && (
                                        <CheckCircle className="w-6 h-6 text-blue-500" />
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>

                <DialogFooter className="p-4 border-t bg-white">
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} className="bg-blue-600 hover:bg-blue-700 text-white">
                        Set as Destination Workflow
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
