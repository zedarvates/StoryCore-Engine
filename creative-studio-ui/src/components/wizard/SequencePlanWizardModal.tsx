/**
 * SequencePlanWizardModal - Modal pour créer/modifier des plans de séquence
 */

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

export interface SequencePlan {
  id: string;
  name: string;
  description: string;
  shots: Shot[];
  order: number;
  duration: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Shot {
  id: string;
  title: string;
  description: string;
  duration: number;
  position: number;
}

interface SequencePlanWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: (plan: SequencePlan) => void;
  initialPlan?: SequencePlan;
  mode: 'create' | 'edit';
}

export function SequencePlanWizardModal({
  isOpen,
  onClose,
  onComplete,
  initialPlan,
  mode,
}: SequencePlanWizardModalProps) {
  const [formData, setFormData] = useState<Partial<SequencePlan>>(
    initialPlan || {
      name: '',
      description: '',
      shots: [],
      order: 1,
      duration: 0,
    }
  );

  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name?.trim()) {
      newErrors.name = 'Le nom du plan est requis';
    }

    if (!formData.description?.trim()) {
      newErrors.description = 'La description est requise';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const plan: SequencePlan = {
      id: initialPlan?.id || `plan_${Date.now()}`,
      name: formData.name!,
      description: formData.description!,
      shots: formData.shots || [],
      order: formData.order || 1,
      duration: formData.duration || 0,
      createdAt: initialPlan?.createdAt || new Date(),
      updatedAt: new Date(),
    };

    onComplete(plan);
    onClose();
  };

  const handleChange = (
    field: keyof SequencePlan,
    value: string | number
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Créer un plan de séquence' : 'Modifier le plan de séquence'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Nom du plan */}
          <div className="space-y-2">
            <Label htmlFor="planName">Nom du plan *</Label>
            <Input
              id="planName"
              value={formData.name || ''}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ex: Séquence 1 - Introduction"
              className={errors.name ? 'border-red-500' : ''}
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="planDescription">Description *</Label>
            <Textarea
              id="planDescription"
              value={formData.description || ''}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Décrivez le plan de séquence..."
              rows={4}
              className={errors.description ? 'border-red-500' : ''}
            />
            {errors.description && (
              <p className="text-sm text-red-500">{errors.description}</p>
            )}
          </div>

          {/* Ordre */}
          <div className="space-y-2">
            <Label htmlFor="planOrder">Ordre</Label>
            <Input
              id="planOrder"
              type="number"
              min="1"
              value={formData.order || 1}
              onChange={(e) => handleChange('order', parseInt(e.target.value) || 1)}
            />
          </div>

          {/* Durée estimée */}
          <div className="space-y-2">
            <Label htmlFor="planDuration">Durée estimée (secondes)</Label>
            <Input
              id="planDuration"
              type="number"
              min="0"
              value={formData.duration || 0}
              onChange={(e) => handleChange('duration', parseInt(e.target.value) || 0)}
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">
              {mode === 'create' ? 'Créer' : 'Mettre à jour'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default SequencePlanWizardModal;

