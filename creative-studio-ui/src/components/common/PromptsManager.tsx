import React, { useState } from 'react';
import { Plus, X, Edit2, Check, Copy, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { notificationService } from '@/services/NotificationService';

interface PromptsManagerProps {
    prompts: string[];
    onUpdate: (prompts: string[]) => void;
    entityName?: string;
}

export function PromptsManager({ prompts = [], onUpdate, entityName }: PromptsManagerProps) {
    const [newPrompt, setNewPrompt] = useState('');
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [editingValue, setEditingValue] = useState('');

    const handleAddString = () => {
        if (!newPrompt.trim()) return;
        onUpdate([...prompts, newPrompt.trim()]);
        setNewPrompt('');
    };

    const handleDelete = (index: number) => {
        const newPrompts = [...prompts];
        newPrompts.splice(index, 1);
        onUpdate(newPrompts);
    };

    const startEditing = (index: number, value: string) => {
        setEditingIndex(index);
        setEditingValue(value);
    };

    const saveEdit = (index: number) => {
        if (!editingValue.trim()) return;
        const newPrompts = [...prompts];
        newPrompts[index] = editingValue.trim();
        onUpdate(newPrompts);
        setEditingIndex(null);
        setEditingValue('');
    };

    const cancelEdit = () => {
        setEditingIndex(null);
        setEditingValue('');
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        notificationService.success('Copied', 'Prompt copied to clipboard');
    };

    return (
        <div className="space-y-6 p-4">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Associated Prompts</h3>
                <Badge variant="outline">{prompts.length} Prompts</Badge>
            </div>

            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium text-gray-700">Add New Prompt</label>
                    <div className="flex gap-2">
                        <Textarea
                            value={newPrompt}
                            onChange={(e) => setNewPrompt(e.target.value)}
                            placeholder="Enter a prompt used to generate this entity..."
                            className="min-h-[80px]"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && e.ctrlKey) {
                                    e.preventDefault();
                                    handleAddString();
                                }
                            }}
                        />
                    </div>
                    <div className="flex justify-end">
                        <Button onClick={handleAddString} disabled={!newPrompt.trim()} size="sm">
                            <Plus className="w-4 h-4 mr-2" />
                            Add Prompt
                        </Button>
                    </div>
                </div>

                <div className="space-y-3 mt-6">
                    {prompts.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                            <p>No prompts recorded yet.</p>
                            <p className="text-sm mt-1">Add prompts to keep track of how this entity was generated.</p>
                        </div>
                    ) : (
                        prompts.map((prompt, index) => (
                            <div key={index} className="bg-white border rounded-lg p-4 shadow-sm group hover:border-purple-200 transition-colors">
                                {editingIndex === index ? (
                                    <div className="space-y-3">
                                        <Textarea
                                            value={editingValue}
                                            onChange={(e) => setEditingValue(e.target.value)}
                                            className="min-h-[100px]"
                                            autoFocus
                                        />
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                                <X className="w-4 h-4 mr-2" />
                                                Cancel
                                            </Button>
                                            <Button size="sm" onClick={() => saveEdit(index)}>
                                                <Check className="w-4 h-4 mr-2" />
                                                Save
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="flex justify-between items-start gap-4 mb-2">
                                            <div className="text-sm text-gray-800 whitespace-pre-wrap flex-1 font-mono bg-gray-50 p-3 rounded">
                                                {prompt}
                                            </div>
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-500 hover:text-blue-600"
                                                    onClick={() => copyToClipboard(prompt)}
                                                    title="Copy to clipboard"
                                                >
                                                    <Copy className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-500 hover:text-purple-600"
                                                    onClick={() => startEditing(index, prompt)}
                                                    title="Edit prompt"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-gray-500 hover:text-red-600"
                                                    onClick={() => handleDelete(index)}
                                                    title="Delete prompt"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
