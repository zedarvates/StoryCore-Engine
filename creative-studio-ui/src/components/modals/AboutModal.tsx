/**
 * AboutModal Component
 * 
 * Displays information about StoryCore Creative Studio.
 */

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Info, Github, Globe, Heart } from 'lucide-react';

interface AboutModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-white dark:bg-gray-900 border-none shadow-2xl">
                <DialogHeader>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
                            <Info className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <DialogTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-blue-600">
                            StoryCore Creative Studio
                        </DialogTitle>
                    </div>
                </DialogHeader>

                <div className="py-6 flex flex-col items-center text-center">
                    <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-blue-500 rounded-3xl shadow-lg flex items-center justify-center mb-6 transform rotate-3 hover:rotate-0 transition-transform duration-300">
                        <span className="text-4xl font-black text-white italic">SC</span>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        Version 1.0.0 (Beta)
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 max-w-xs">
                        The next generation of cinematic storytelling, powered by advanced AI and creative freedom.
                    </p>

                    <div className="grid grid-cols-2 gap-4 w-full mt-8">
                        <Button
                            variant="outline"
                            className="flex items-center gap-2 border-gray-200 dark:border-gray-800"
                            onClick={() => window.open('https://storycore.dev', '_blank')}
                        >
                            <Globe className="w-4 h-4" />
                            Website
                        </Button>
                        <Button
                            variant="outline"
                            className="flex items-center gap-2 border-gray-200 dark:border-gray-800"
                            onClick={() => window.open('https://github.com/storycore', '_blank')}
                        >
                            <Github className="w-4 h-4" />
                            GitHub
                        </Button>
                    </div>
                </div>

                <DialogFooter className="sm:justify-center border-t border-gray-100 dark:border-gray-800 pt-4">
                    <div className="flex flex-col items-center gap-2">
                        <p className="text-xs text-gray-400 dark:text-gray-500 flex items-center gap-1">
                            Made with <Heart className="w-3 h-3 text-red-500 fill-red-500" /> by Google DeepMind Team
                        </p>
                        <p className="text-[10px] text-gray-300 dark:text-gray-600 uppercase tracking-widest font-bold">
                            Advanced Agentic Coding Project
                        </p>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default AboutModal;
