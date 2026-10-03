/**
 * Workflow Progress Bar Component
 * 
 * A sleek, high-level progress tracker showing the user's journey
 * through the filmmaking process.
 */

import React from 'react';
import { useWorkflowStore, WorkflowStage } from '../stores/workflowStore';
import { Check, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import './WorkflowProgressBar.css';

const STAGE_LABELS: Record<WorkflowStage, string> = {
    preparation: 'Préparation',
    storytelling: 'Histoire',
    generation: 'Génération AI',
    post_prod: 'Post-Prod',
    delivery: 'Export',
};

const STAGE_ORDER: WorkflowStage[] = ['preparation', 'storytelling', 'generation', 'post_prod', 'delivery'];

export const WorkflowProgressBar: React.FC = () => {
    const { currentStage, stageProgress, globalProgress } = useWorkflowStore();

    return (
        <div className="workflow-progress-container">
            {/* Global Progress Line Overlay (Subtle Background) */}
            <div className="workflow-background-line" />

            {/* Active Stage Indicator Line */}
            <div
                className="workflow-active-line"
                style={{ width: `${(STAGE_ORDER.indexOf(currentStage) / (STAGE_ORDER.length - 1)) * 100}%` }}
            />

            <div className="workflow-stages-row">
                {STAGE_ORDER.map((stage, index) => {
                    const progress = stageProgress[stage];
                    const isCompleted = progress.status === 'completed';
                    const isCurrent = currentStage === stage;
                    const isTodo = progress.status === 'todo';

                    return (
                        <div
                            key={stage}
                            className={cn(
                                "workflow-stage-item",
                                isCompleted && "is-completed",
                                isCurrent && "is-current",
                                isTodo && "is-todo"
                            )}
                        >
                            <div className="stage-icon-wrapper">
                                {isCompleted ? (
                                    <Check className="stage-icon" />
                                ) : (
                                    <span className="stage-number">{index + 1}</span>
                                )}

                                {/* Visual tooltip on hover showing tasks */}
                                <div className="stage-tooltip">
                                    <div className="tooltip-header">{STAGE_LABELS[stage]}</div>
                                    <div className="tooltip-progress">{progress.percentage}% completé</div>
                                    <ul className="tooltip-tasks">
                                        {progress.requiredTasks.map(task => (
                                            <li key={task} className={progress.completedTasks.includes(task) ? 'task-done' : ''}>
                                                {progress.completedTasks.includes(task) ? '✓' : '○'} {formatTaskId(task)}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                            <span className="stage-label">{STAGE_LABELS[stage]}</span>
                        </div>
                    );
                })}
            </div>

            {/* Global Percentage Badge (Optional, subtle) */}
            <div className="global-progress-badge">
                <span className="percentage">{globalProgress}%</span>
                <span className="label">GLOBAL</span>
            </div>
        </div>
    );
};

function formatTaskId(id: string): string {
    return id
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}
