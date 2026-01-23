/**
 * ComfyUI Server Modal - Framework Version
 *
 * New implementation using the generic ModalFramework with declarative schema.
 * This replaces the old ComfyUIServerModal with a more maintainable approach.
 */

import React from 'react';
import { ModalFramework } from '@/components/ui/ModalFramework';
import { comfyUIServerSchema } from '@/schemas/modalSchemas';
import type { ComfyUIServer } from '@/types/comfyuiServers';
import type { CreateComfyUIServerInput } from '@/types/comfyuiServers';

export interface ComfyUIServerModalNewProps {
  server?: ComfyUIServer | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (input: CreateComfyUIServerInput) => void;
}

/**
 * Transform ComfyUI server data to form data
 */
function serverToFormData(server: ComfyUIServer | null): Record<string, unknown> | undefined {
  if (!server) {
    return {
      serverUrl: 'http://localhost:8188',
      authType: 'none',
      maxQueueSize: 10,
      timeout: 300000,
      autoStart: false,
    };
  }

  return {
    name: server.name,
    serverUrl: server.serverUrl,
    authType: server.authentication.type,
    username: server.authentication.username || '',
    password: server.authentication.password || '',
    token: server.authentication.token || '',
    maxQueueSize: server.maxQueueSize || 10,
    timeout: server.timeout || 300000,
    vramLimit: server.vramLimit,
    modelsPath: server.modelsPath || '',
    autoStart: server.autoStart || false,
  };
}

/**
 * Transform form data to ComfyUI server input
 */
function formDataToServerInput(data: Record<string, unknown>): CreateComfyUIServerInput {
  return {
    name: String(data.name).trim(),
    serverUrl: String(data.serverUrl).trim(),
    authentication: {
      type: data.authType as 'none' | 'basic' | 'bearer' | 'api-key',
      ...(data.authType === 'basic' && {
        username: String(data.username).trim(),
        password: String(data.password),
      }),
      ...((data.authType === 'bearer' || data.authType === 'api-key') && {
        token: String(data.token),
      }),
    },
    maxQueueSize: Number(data.maxQueueSize) || 10,
    timeout: Number(data.timeout) || 300000,
    vramLimit: data.vramLimit ? Number(data.vramLimit) : undefined,
    modelsPath: data.modelsPath ? String(data.modelsPath).trim() || undefined : undefined,
    autoStart: Boolean(data.autoStart),
  };
}

/**
 * New ComfyUI Server Modal using the framework
 */
export function ComfyUIServerModalNew({
  server,
  isOpen,
  onClose,
  onSave,
}: ComfyUIServerModalNewProps) {
  const handleSubmit = async (data: Record<string, unknown>) => {
    const input = formDataToServerInput(data);
    onSave(input);
  };

  return (
    <ModalFramework
      schema={comfyUIServerSchema}
      isOpen={isOpen}
      onClose={onClose}
      onSubmit={handleSubmit}
      initialData={serverToFormData(server)}
    />
  );
}
