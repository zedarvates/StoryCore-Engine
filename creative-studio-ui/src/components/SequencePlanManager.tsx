import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useAppStore } from '@/stores/useAppStore';
// No alert-dialog, using Dialog instead
import { ChevronDown, ChevronRight, ChevronUp, Plus, FileText, Copy, Trash2, Download, Star, Expand, Edit } from 'lucide-react';
import { SequencePlan, Act, Scene } from '@/types/sequencePlan';
import { cn } from '@/lib/utils';

interface SequencePlanManagerProps {
  plans: SequencePlan[];
  currentPlanId: string | null;
  onSelectPlan: (planId: string) => void;
  onCreatePlan: (name: string, description?: string) => void;
  onDuplicatePlan: (planId: string) => void;
  onDeletePlan: (planId: string) => void;
  onExportPlan: (planId: string) => void;
  className?: string;
}

interface TreeNode {
  id: string;
  name: string;
  type: 'plan' | 'act' | 'scene' | 'shot';
  children?: TreeNode[];
  level: number;
  parentId?: string;
}

export function SequencePlanManager({
  plans,
  currentPlanId,
  onSelectPlan,
  onCreatePlan,
  onDuplicatePlan,
  onDeletePlan,
  onExportPlan,
  className,
}: SequencePlanManagerProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState<string | null>(null);
  const [createForm, setCreateForm] = useState({ name: '', description: '' });
  
  // Get wizard action from useAppStore
  const openSequencePlanWizard = useAppStore((state) => state.openSequencePlanWizard);

  // Convert plans to tree nodes
  const buildTreeNodes = (): TreeNode[] => {
    const nodes: TreeNode[] = [];

    plans.forEach(plan => {
      const planNode: TreeNode = {
        id: plan.id,
        name: plan.name,
        type: 'plan',
        level: 0,
        children: [],
      };

      // Add acts
      plan.acts.forEach(act => {
        const actNode: TreeNode = {
          id: act.id,
          name: `Act ${act.number}: ${act.title}`,
          type: 'act',
          level: 1,
          parentId: plan.id,
          children: [],
        };

        // Add scenes in this act
        const actScenes = plan.scenes.filter(scene => scene.actId === act.id);
        actScenes.forEach(scene => {
          const sceneNode: TreeNode = {
            id: scene.id,
            name: `Scene ${scene.number}: ${scene.title}`,
            type: 'scene',
            level: 2,
            parentId: act.id,
            children: [],
          };

          // Add shots in this scene
          const sceneShots = plan.shots.filter(shot => scene.shotIds.includes(shot.id));
          sceneNode.children = sceneShots.map(shot => ({
            id: shot.id,
            name: `Shot ${shot.number}`,
            type: 'shot' as const,
            level: 3,
            parentId: scene.id,
          }));

          actNode.children!.push(sceneNode);
        });

        planNode.children!.push(actNode);
      });

      nodes.push(planNode);
    });

    return nodes;
  };

  const treeNodes = buildTreeNodes();

  const toggleExpanded = (nodeId: string) => {
    const newExpanded = new Set(expandedNodes);
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId);
    } else {
      newExpanded.add(nodeId);
    }
    setExpandedNodes(newExpanded);
  };

  const expandAll = () => {
    const allExpandable = new Set<string>();
    const collectExpandable = (nodes: TreeNode[]) => {
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          allExpandable.add(node.id);
          collectExpandable(node.children);
        }
      });
    };
    collectExpandable(treeNodes);
    setExpandedNodes(allExpandable);
  };

  const collapseAll = () => {
    setExpandedNodes(new Set());
  };

  const renderTreeNode = (node: TreeNode): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.id);
    const isCurrentPlan = node.type === 'plan' && node.id === currentPlanId;
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id}>
        <div
          className={cn(
            'group flex items-center py-2 px-2 hover:bg-muted cursor-pointer rounded-sm',
            isCurrentPlan && 'bg-primary/10 border border-primary/20'
          )}
          style={{ paddingLeft: `${node.level * 16 + 8}px` }}
          onClick={() => {
            if (node.type === 'plan') {
              onSelectPlan(node.id);
            } else if (hasChildren) {
              toggleExpanded(node.id);
            }
          }}
        >
          {/* Expand/Collapse Icon */}
          {hasChildren ? (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(node.id);
              }}
              className="mr-2 p-1 hover:bg-muted rounded"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
          ) : (
            <div className="w-6" />
          )}

          {/* Icon based on type */}
          <div className="mr-2">
            {node.type === 'plan' && <FileText className="w-4 h-4" />}
            {node.type === 'act' && <div className="w-4 h-4 rounded bg-blue-500" />}
            {node.type === 'scene' && <div className="w-4 h-4 rounded bg-green-500" />}
            {node.type === 'shot' && <div className="w-4 h-4 rounded bg-orange-500" />}
          </div>

          {/* Name */}
          <span className="flex-1 text-sm truncate">{node.name}</span>

          {/* Current plan indicator */}
          {isCurrentPlan && (
            <Star className="w-4 h-4 text-primary fill-primary ml-2" />
          )}

          {/* Actions for plans */}
          {node.type === 'plan' && (
            <div className="ml-2 flex gap-1 opacity-0 group-hover:opacity-100">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const plan = plans.find(p => p.id === node.id);
                  if (plan) {
                    openSequencePlanWizard({
                      mode: 'edit',
                      existingSequencePlan: plan,
                      sourceLocation: 'plans-panel',
                    });
                  }
                }}
                className="p-1 hover:bg-muted rounded"
                title="Edit plan"
              >
                <Edit className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicatePlan(node.id);
                }}
                className="p-1 hover:bg-muted rounded"
                title="Duplicate plan"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onExportPlan(node.id);
                }}
                className="p-1 hover:bg-muted rounded"
                title="Export plan"
              >
                <Download className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowDeleteModal(node.id);
                }}
                className="p-1 hover:bg-destructive/10 text-destructive hover:text-destructive rounded"
                title="Delete plan"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Children */}
        {hasChildren && isExpanded && (
          <div>
            {node.children!.map(child => renderTreeNode(child))}
          </div>
        )}
      </div>
    );
  };

  const handleCreatePlan = () => {
    if (createForm.name.trim()) {
      onCreatePlan(createForm.name, createForm.description);
      setShowCreateModal(false);
      setCreateForm({ name: '', description: '' });
    }
  };

  const handleDeleteConfirm = () => {
    if (showDeleteModal) {
      onDeletePlan(showDeleteModal);
      setShowDeleteModal(null);
    }
  };

  return (
    <div className={cn('flex flex-col h-full', className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Sequence Plans</h2>
        <div className="flex items-center gap-2">
          <Button
            onClick={expandAll}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
            title="Expand all"
          >
            <Expand className="w-4 h-4" />
          </Button>
          <Button
            onClick={collapseAll}
            size="sm"
            variant="outline"
            className="flex items-center gap-1"
            title="Collapse all"
          >
            <ChevronUp className="w-4 h-4" />
          </Button>
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            New Plan
          </Button>
        </div>
      </div>

      {/* Tree View */}
      <div className="flex-1 overflow-auto p-2">
        {treeNodes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
            <FileText className="w-12 h-12 mb-4" />
            <p className="text-sm">No sequence plans yet</p>
            <Button
              onClick={() => setShowCreateModal(true)}
              variant="outline"
              size="sm"
              className="mt-4"
            >
              Create your first plan
            </Button>
          </div>
        ) : (
          <div className="space-y-1">
            {treeNodes.map(node => renderTreeNode(node))}
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Sequence Plan</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="plan-name">Name</Label>
              <Input
                id="plan-name"
                value={createForm.name}
                onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter plan name"
              />
            </div>
            <div>
              <Label htmlFor="plan-description">Description (optional)</Label>
              <Textarea
                id="plan-description"
                value={createForm.description}
                onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Enter plan description"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePlan} disabled={!createForm.name.trim()}>
              Create Plan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!showDeleteModal} onOpenChange={() => setShowDeleteModal(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Sequence Plan</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete this sequence plan? This action cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleDeleteConfirm} variant="destructive">
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
