# Plan d'Implémentation API et Modèles de Données

Objectif: préciser les endpoints, les payloads et les schémas de données pour soutenir l'architecture Story Core inspirée Whisk, et préparer l'implémentation dans le backend.

1) Portée et MVP
- Endpoints MVP à développer en priorité (Backend FastAPI): Identity, Segmentation, Templates, Video rendering et Webhooks n8n
- Modèles de données API: IdentityProfile, ScriptSegment, PromptTemplate, VideoRender
- Considérer la sécurité et l’authentification/autorisation dès le départ

2) Architecture API et schémas
- Architectural style: RESTful, versioning v1, OpenAPI spec
- Schémas JSON des ressources: IdentityProfile, ScriptSegment, PromptTemplate, VideoRender
- Relations entre ressources: IdentityProfile → Project, ScriptSegment → IdentityProfile, VideoRender → ScriptSegment

3) Endpoints API (exemples)
- POST /api/identity/create
- GET /api/identity/{identity_id}
- POST /api/identity/apply
- GET /api/identity/{identity_id}/validate/{scene_id}
- POST /api/segmentation/segment
- GET /api/segmentation/{id}
- PUT /api/segmentation/{id}/adjust
- GET /api/templates
- POST /api/templates/{template_id}/render
- POST /api/templates/create
- PUT /api/templates/{template_id}
- DELETE /api/templates/{template_id}
- POST /api/video/render
- POST /api/video/merge-export
- GET /api/video/{video_id}
- POST /api/webhooks/n8n/identity-lock
- POST /api/webhooks/n8n/segment
- POST /api/webhooks/n8n/voice-synthesize
- POST /api/webhooks/n8n/video-render
- POST /api/webhooks/n8n/merge-export

4) Exemples de payloads et réponses (format JSON)
- Identity create: { name, project_id, reference_image, lock_features[] }
- Identity apply: { identity_id, scene_id, generation_params }
- Segmentation segment: { script, language, target_duration }
- Template render/create: template_id, payload_vars
- Video render: { prompt, identity_id, resolution, etc. }

5) Plan de test et critères d’acceptation
- Tests unitaires pour chaque endpoint
- Tests d’intégration avec des mocks (backend services)
- Vérifications de sécurité (auth, permissions)

6) Dépendances et risques
- Dépendances sur le reste du backend (auth, storage, queues)
- Risques: incompatibilités de schéma, non-conformité JSON
- Mitigation: spec OpenAPI et schemas stricts, tests contractuels

7) Livrables
- Fichier OpenAPI v1 (yaml/json)
- Modèles de données en Markdown et code samples
- Exemples de payloads et réponses

