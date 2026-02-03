/**
 * Modal Schemas
 *
 * Declarative configuration for modal forms using the ModalFramework.
 */

import type { ModalSchema } from '@/types/modal';

/**
 * ComfyUI Server Modal Schema
 */
export const comfyUIServerSchema: ModalSchema = {
  id: 'comfyui-server',
  title: 'Configuration Serveur ComfyUI',
  description: 'Configurez un nouveau serveur ComfyUI ou modifiez un serveur existant',
  size: 'lg',
  enableConnectionTest: true,
  connectionTest: {
    endpoint: (data) => {
      // Custom connection test that checks if ComfyUI server is responding
      const serverUrl = data.serverUrl as string;
      if (!serverUrl) return Promise.resolve(false);

      return fetch(`${serverUrl}/system_stats`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      })
        .then(response => response.ok)
        .catch(() => false);
    },
    successMessage: 'Connexion au serveur ComfyUI réussie',
    errorMessage: 'Impossible de se connecter au serveur ComfyUI',
  },
  fields: [
    // Basic Information
    {
      id: 'name',
      label: 'Nom du serveur',
      type: 'text',
      required: true,
      placeholder: 'ex: Serveur local, Production, GPU 1',
      validation: [
        { type: 'required', message: 'Le nom du serveur est requis' },
        { type: 'minLength', value: 2, message: 'Le nom doit contenir au moins 2 caractères' },
        { type: 'maxLength', value: 50, message: 'Le nom ne peut pas dépasser 50 caractères' },
      ],
    },
    {
      id: 'serverUrl',
      label: 'URL du serveur',
      type: 'url',
      required: true,
      placeholder: 'http://localhost:8000', // ComfyUI Desktop default
      validation: [
        { type: 'required', message: 'L\'URL du serveur est requise' },
        { type: 'url', message: 'Format d\'URL invalide' },
      ],
    },

    // Authentication
    {
      id: 'authType',
      label: 'Type d\'authentification',
      type: 'radio',
      required: true,
      defaultValue: 'none',
      options: [
        { value: 'none', label: 'Aucune' },
        { value: 'basic', label: 'Basique (Utilisateur/Mot de passe)' },
        { value: 'bearer', label: 'Bearer Token' },
        { value: 'api-key', label: 'Clé API' },
      ],
    },
    {
      id: 'username',
      label: 'Nom d\'utilisateur',
      type: 'text',
      required: false,
      layout: { group: 'authentication' },
      validation: [
        {
          type: 'custom',
          value: (value, context) => {
            if (context?.data.authType === 'basic') {
              return typeof value === 'string' && value.trim().length > 0;
            }
            return true;
          },
          message: 'Le nom d\'utilisateur est requis pour l\'authentification basique',
        },
      ],
    },
    {
      id: 'password',
      label: 'Mot de passe',
      type: 'password',
      required: false,
      layout: { group: 'authentication' },
      validation: [
        {
          type: 'custom',
          value: (value, context) => {
            if (context?.data.authType === 'basic') {
              return typeof value === 'string' && value.trim().length > 0;
            }
            return true;
          },
          message: 'Le mot de passe est requis pour l\'authentification basique',
        },
      ],
    },
    {
      id: 'token',
      label: 'Token',
      type: 'password',
      required: false,
      layout: { group: 'authentication' },
      validation: [
        {
          type: 'custom',
          value: (value, context) => {
            if (context?.data.authType === 'bearer' || context?.data.authType === 'api-key') {
              return typeof value === 'string' && value.trim().length > 0;
            }
            return true;
          },
          message: 'Le token est requis pour ce type d\'authentification',
        },
      ],
    },

    // Advanced Settings
    {
      id: 'autoStart',
      label: 'Démarrage automatique',
      type: 'checkbox',
      required: false,
      layout: { group: 'advanced' },
    },
    {
      id: 'maxQueueSize',
      label: 'Taille max de la file d\'attente',
      type: 'number',
      required: false,
      defaultValue: 10,
      layout: { group: 'advanced' },
      validation: [
        { type: 'minLength', value: 1, message: 'Minimum 1' },
        { type: 'maxLength', value: 50, message: 'Maximum 50' },
      ],
    },
    {
      id: 'timeout',
      label: 'Timeout des requêtes (ms)',
      type: 'number',
      required: false,
      defaultValue: 300000,
      layout: { group: 'advanced' },
      validation: [
        { type: 'minLength', value: 1000, message: 'Minimum 1000ms' },
      ],
    },
    {
      id: 'vramLimit',
      label: 'Limite VRAM (GB)',
      type: 'number',
      required: false,
      placeholder: 'Laisser vide pour détection automatique',
      layout: { group: 'advanced' },
      validation: [
        {
          type: 'custom',
          value: (value) => {
            if (value === undefined || value === '') return true;
            const num = Number(value);
            return !isNaN(num) && num > 0;
          },
          message: 'Doit être un nombre positif',
        },
      ],
    },
    {
      id: 'modelsPath',
      label: 'Chemin des modèles',
      type: 'text',
      required: false,
      placeholder: '/chemin/vers/ComfyUI/models',
      layout: { group: 'advanced' },
    },
  ],
  submitLabel: 'Sauvegarder',
  cancelLabel: 'Annuler',
};

/**
 * Example schema for a simple contact form
 */
export const contactFormSchema: ModalSchema = {
  id: 'contact-form',
  title: 'Contactez-nous',
  description: 'Envoyez-nous un message',
  fields: [
    {
      id: 'name',
      label: 'Nom',
      type: 'text',
      required: true,
      validation: [{ type: 'required', message: 'Le nom est requis' }],
    },
    {
      id: 'email',
      label: 'Email',
      type: 'email',
      required: true,
      validation: [
        { type: 'required', message: 'L\'email est requis' },
        { type: 'email', message: 'Format d\'email invalide' },
      ],
    },
    {
      id: 'message',
      label: 'Message',
      type: 'textarea',
      required: true,
      validation: [{ type: 'required', message: 'Le message est requis' }],
    },
  ],
  submitLabel: 'Envoyer',
  cancelLabel: 'Annuler',
};
