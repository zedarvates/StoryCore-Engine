# Plan API et Modèles de Données

Objectif: documenter les endpoints API et les modèles de données nécessaires pour soutenir l'architecture Story Core inspirée de Whisk, afin de faciliter l'implémentation et l'intégration avec les services externes.

## Endpoints API (exemples et style équivalent REST/JSON)
- Identity
  - POST /api/identity/create
  - GET /api/identity/{identity_id}
  - PUT /api/identity/{identity_id}
  - DELETE /api/identity/{identity_id}
  - POST /api/identity/apply
  - GET /api/identity/{identity_id}/validate/{scene_id}

- Segmentation
  - POST /api/segmentation/segment
  - GET /api/segmentation/{id}
  - PUT /api/segmentation/{id}/adjust

- Templates & Prompts
  - GET /api/templates?category={category}
  - POST /api/templates/{template_id}/render
  - POST /api/templates/create
  - PUT /api/templates/{template_id}
  - DELETE /api/templates/{template_id}

- Video Rendering & Export
  - POST /api/video/render
  - POST /api/video/merge-export
  - GET /api/video/{video_id}

- Webhooks N8N (intégrations externes)
  - POST /api/webhooks/n8n/identity-lock
  - POST /api/webhooks/n8n/segment
  - POST /api/webhooks/n8n/voice-synthesize
  - POST /api/webhooks/n8n/video-render
  - POST /api/webhooks/n8n/merge-export

## Modèles de données (Schéma conceptuel)
- IdentityProfile
  - id: string
  - name: string
  - project_id: string
  - facial_features: object
  - visual_attributes: object
  - locked_features: string[]
  - lock_strength: number
  - reference_images: string[]
- ScriptSegment
  - id: string
  - script_id: string
  - original_text: string
  - duration_estimate: number
  - prompts: string[]
  - start_time: number
  - end_time: number
- PromptTemplate
  - id: string
  - name: string
  - category: string
  - template_text: string
  - variables: object
  - description: string
  - version: string

## Relations (exemples)
- IdentityProfile -> Project (many-to-one)
- ScriptSegment -> IdentityProfile (many-to-one)
- VideoRender -> ScriptSegment (one-to-many)
- PromptTemplate -> Script (one-to-many)

### Contraintes techniques
- API Design: restful, versioning, pagination si nécessaire
- Validation et schémas stricts (OpenAPI/JSON Schema)
- Sécurité: authentification, autorisation, rotativités des clés

