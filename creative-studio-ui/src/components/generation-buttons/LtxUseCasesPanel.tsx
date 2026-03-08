/**
 * LTX Use Cases Panel
 *
 * Panneau "Cas d'usage réels" du plan R&D LTX2.
 * Permet de démarrer rapidement une génération en choisissant un cas d'usage
 * (Explainer, Social Media, Testimonial, Marketing Ad, Hero Video) avec un prompt
 * pré-construit et des paramètres optimisés.
 *
 * R&D Plan Step 6 — Real-World Use Cases
 */

import React, { useState } from 'react';
import {
  BookOpen,
  Share2,
  Star,
  Megaphone,
  Film,
  ChevronRight,
  Sparkles,
  Play,
  Zap,
  Crown,
} from 'lucide-react';

// ==============================================================================
// TYPES
// ==============================================================================

export type UseCaseId =
  | 'explainer'
  | 'social_media'
  | 'testimonial'
  | 'marketing_ad'
  | 'hero_video';

export interface UseCase {
  id: UseCaseId;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  color: string;
  colorBg: string;
  recommendedEngine: 'ltx2' | 'wan21';
  recommendedQuality: 'draft' | 'standard' | 'cinematic' | 'ultra';
  recommendedDuration: string;
  templatePrompts: {
    label: string;
    prompt: string;
  }[];
  tips: string[];
}

interface LtxUseCasesPanelProps {
  /** Called when user selects a prompt and wants to generate */
  onLaunch?: (config: {
    useCase: UseCaseId;
    prompt: string;
    engine: 'ltx_video' | 'wan21';
    quality: 'draft' | 'standard' | 'cinematic' | 'ultra';
  }) => void;
}

// ==============================================================================
// USE CASES DATA
// ==============================================================================

const USE_CASES: UseCase[] = [
  {
    id: 'explainer',
    title: 'Explainer Video',
    subtitle: 'Tutoriels produit, démos onboarding, guides How-To',
    icon: <BookOpen className="h-5 w-5" />,
    color: '#3b82f6',
    colorBg: '#3b82f611',
    recommendedEngine: 'ltx2',
    recommendedQuality: 'standard',
    recommendedDuration: '5–8s',
    templatePrompts: [
      {
        label: 'Demo SaaS produit',
        prompt:
          'A clean, modern desk setup with a laptop displaying a colorful dashboard UI. A hand moves the mouse, clicking through features. Soft blue ambient light from screen. Camera slowly zooms in on the screen.',
      },
      {
        label: 'Guide d\'utilisation',
        prompt:
          'Over-the-shoulder view of hands opening a product box, removing a device and placing it on a table. Soft product photography lighting. Camera tracks forward as device turns on.',
      },
      {
        label: 'Onboarding étape par étape',
        prompt:
          'Split screen: left side shows a problem (messy calendar, frustrated person), right side shows the solution (clean organized schedule, smiling person). Camera dollies left to right through the transition.',
      },
    ],
    tips: [
      'Commence en mode Fast pour tester ta narration.',
      'Utilise le Visual Director pour enrichir ton prompt.',
      'Génère 3–4 clips de 5s et assemble-les dans l\'éditeur.',
    ],
  },
  {
    id: 'social_media',
    title: 'Social Media',
    subtitle: 'Contenus scroll-stopping, before/after, hooks viraux',
    icon: <Share2 className="h-5 w-5" />,
    color: '#ec4899',
    colorBg: '#ec489911',
    recommendedEngine: 'ltx2',
    recommendedQuality: 'standard',
    recommendedDuration: '3–5s',
    templatePrompts: [
      {
        label: 'Hook Before/After',
        prompt:
          'Before: a cluttered, messy home office desk. After: the same desk transformed into a sleek, organized minimalist workspace with plants and soft morning light. Camera pans slowly left to right.',
      },
      {
        label: 'Reveal produit',
        prompt:
          'A luxurious skincare product rises from white misty surface on a marble table. Warm golden light. Camera slowly rotates 180 degrees around the product. Highly cinematic product photography.',
      },
      {
        label: 'Scène relatable lifestyle',
        prompt:
          'A young professional in a coffee shop, laptop open, smiling as they type. Natural window light from the left. Warm autumn colors. Camera starts from wide, slowly zooms in to close-up on the smile.',
      },
    ],
    tips: [
      'Format Portrait (768×1280) = TikTok, Reels.',
      'Mode Fast pour itérer vite, Ultra pour le post final.',
      'Ajoute le son via ACE Step pour le wow factor.',
    ],
  },
  {
    id: 'testimonial',
    title: 'Testimonial Re-création',
    subtitle: 'Recréer des avis clients sous forme de vidéo stylisée',
    icon: <Star className="h-5 w-5" />,
    color: '#f59e0b',
    colorBg: '#f59e0b11',
    recommendedEngine: 'wan21',
    recommendedQuality: 'cinematic',
    recommendedDuration: '5–8s',
    templatePrompts: [
      {
        label: 'Témoignage satisfait B2C',
        prompt:
          'A happy woman in her early 30s sitting in a bright living room, speaking naturally to camera, smiling. Warm afternoon sunlight from the window. Shallow depth of field. Camera holds still, then slowly pushes in.',
      },
      {
        label: 'Review expert B2B',
        prompt:
          'A confident business executive in a modern office, arms crossed, nodding approvingly while looking directly at camera. Corporate background with blurred city view. Professional lighting.',
      },
      {
        label: 'Citation stylisée (texte + visage)',
        prompt:
          'Cinematic close-up of a smiling person, text overlay quote fades in from bottom. Desaturated warm color grade. Camera holds on face. Subtle bokeh in background.',
      },
    ],
    tips: [
      'Wan 2.1 = meilleure cohérence faciale sur plusieurs secondes.',
      'Utilise le mode Cinematic pour la crédibilité.',
      'Ajoute une voix IA via Qwen TTS pour un résultat clé en main.',
    ],
  },
  {
    id: 'marketing_ad',
    title: 'Marketing Ad',
    subtitle: 'Spots publicitaires, pain points, solutions, bénéfices',
    icon: <Megaphone className="h-5 w-5" />,
    color: '#ef4444',
    colorBg: '#ef444411',
    recommendedEngine: 'ltx2',
    recommendedQuality: 'ultra',
    recommendedDuration: '8–20s',
    templatePrompts: [
      {
        label: 'Pain → Solution 20s',
        prompt:
          'Act 1 (0-7s): A stressed person staring at a pile of paperwork, looking overwhelmed. Dark, cold lighting. Act 2 (7-14s): Same person using a sleek app on their phone — tasks disappearing. Act 3 (14-20s): Person smiling, relaxed in a clean workspace. Camera mirrors the mood shift.',
      },
      {
        label: 'Product hero shot',
        prompt:
          'Premium sneaker rotating on a black glossy pedestal. Studio lighting with dramatic side rim light. Slow 360° rotation. White light catches the texture of the shoe. Ultra cinematic product ad.',
      },
      {
        label: 'Storytelling émotionnel',
        prompt:
          'A father teaching his young child to ride a bike in a park on a golden autumn afternoon. Warm lens flare. Camera follows alongside at child\'s eye level. Emotional, nostalgic color grade.',
      },
    ],
    tips: [
      'Utilise Ultra mode pour les clients et publications.',
      'Décris clairement les 3 actes dans le prompt.',
      'Le Visual Director enrichira automatiquement la narration.',
    ],
  },
  {
    id: 'hero_video',
    title: 'Hero Video / B-Roll',
    subtitle: 'Vidéos de fond website, assets visuels sans tournage',
    icon: <Film className="h-5 w-5" />,
    color: '#8b5cf6',
    colorBg: '#8b5cf611',
    recommendedEngine: 'ltx2',
    recommendedQuality: 'cinematic',
    recommendedDuration: '5–10s',
    templatePrompts: [
      {
        label: 'Hero website tech',
        prompt:
          'Abstract flowing data streams of light and code against a dark background. Blues and cyans. Camera slowly drifts forward through the light streams. Cinematic, epic tech atmosphere.',
      },
      {
        label: 'Hero website lifestyle',
        prompt:
          'Aerial drone shot slowly rising above a green forest canopy. Morning mist in the valleys. Golden sunrise light. Birds fly through frame. Ultra cinematic, breathtaking nature.',
      },
      {
        label: 'B-Roll bureau/créativité',
        prompt:
          'Close-up of hands drawing on a tablet with a stylus. Colorful digital art appears on screen. Creative studio background, soft warm light. Camera slowly rack-focuses from the hand to the screen.',
      },
    ],
    tips: [
      'Format 1920×1080 = parfait pour les websites.',
      'Mode Cinematic = le sweet spot qualité/temps.',
      'Génère 4–5 clips B-Roll et assemble avec crossfades.',
    ],
  },
];

// ==============================================================================
// COMPONENT
// ==============================================================================

export const LtxUseCasesPanel: React.FC<LtxUseCasesPanelProps> = ({ onLaunch }) => {
  const [activeCase, setActiveCase] = useState<UseCaseId | null>(null);
  const [selectedPromptIdx, setSelectedPromptIdx] = useState(0);

  const activeCaseData = USE_CASES.find((c) => c.id === activeCase);

  const qualityLabel = (q: string) => {
    const map: Record<string, string> = { draft: 'Fast', standard: 'Pro', cinematic: 'Cinematic', ultra: 'Ultra' };
    return map[q] || q;
  };

  const qualityIcon = (q: string) => {
    if (q === 'draft') return <Zap className="h-3 w-3" />;
    if (q === 'ultra') return <Crown className="h-3 w-3" />;
    return <Sparkles className="h-3 w-3" />;
  };

  // ──────────────────────────────────────────────────────────────────────────
  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(10,10,20,0.97) 0%, rgba(18,8,30,0.97) 100%)',
      border: '1px solid rgba(139,92,246,0.2)',
      borderRadius: 16,
      padding: 24,
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      color: '#e2d9f3',
      boxShadow: '0 25px 60px rgba(0,0,0,0.5), 0 0 60px rgba(139,92,246,0.07)',
    }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #7c3aed, #4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Sparkles className="h-5 w-5" style={{ color: '#fff' }} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#e2d9f3' }}>Cas d'usage réels — LTX2</h2>
          <p style={{ margin: 0, fontSize: '0.72rem', color: '#7c6f9e' }}>Démarre en 30 secondes avec un template optimisé</p>
        </div>
      </div>

      {/* Use Case Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginBottom: 20 }}>
        {USE_CASES.map((uc) => {
          const isActive = activeCase === uc.id;
          return (
            <button
              key={uc.id}
              onClick={() => { setActiveCase(uc.id); setSelectedPromptIdx(0); }}
              style={{
                padding: '12px 8px',
                borderRadius: 10,
                border: isActive ? `2px solid ${uc.color}` : '1px solid rgba(139,92,246,0.15)',
                background: isActive ? uc.colorBg : 'rgba(255,255,255,0.02)',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                textAlign: 'center',
                boxShadow: isActive ? `0 0 20px ${uc.color}28` : 'none',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 6, color: isActive ? uc.color : '#5c5075' }}>
                {uc.icon}
              </div>
              <div style={{ fontWeight: 700, fontSize: '0.72rem', color: isActive ? '#e2d9f3' : '#8b7faa', lineHeight: 1.2 }}>
                {uc.title}
              </div>
            </button>
          );
        })}
      </div>

      {/* Detail Panel */}
      {activeCaseData ? (
        <div style={{
          borderRadius: 12,
          border: `1px solid ${activeCaseData.color}30`,
          background: activeCaseData.colorBg,
          padding: 20,
          animation: 'fadeIn 0.2s ease',
        }}>
          {/* Case Header */}
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16, gap: 12 }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ color: activeCaseData.color }}>{activeCaseData.icon}</span>
                <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#e2d9f3' }}>{activeCaseData.title}</h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.73rem', color: '#8b7faa' }}>{activeCaseData.subtitle}</p>
            </div>
            {/* Recommended config badges */}
            <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: 'rgba(139,92,246,0.15)', border: '1px solid rgba(139,92,246,0.25)', fontSize: '0.65rem', color: '#a78bfa', fontWeight: 600 }}>
                {activeCaseData.recommendedEngine === 'ltx2' ? '⚡ LTX2' : '🎬 Wan 2.1'}
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '3px 8px', borderRadius: 6, background: `${activeCaseData.color}18`, border: `1px solid ${activeCaseData.color}30`, fontSize: '0.65rem', color: activeCaseData.color, fontWeight: 600 }}>
                {qualityIcon(activeCaseData.recommendedQuality)}
                {qualityLabel(activeCaseData.recommendedQuality)}
              </span>
              <span style={{ padding: '3px 8px', borderRadius: 6, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', fontSize: '0.65rem', color: '#7c6f9e', fontWeight: 600 }}>
                🕐 {activeCaseData.recommendedDuration}
              </span>
            </div>
          </div>

          {/* Template Prompts */}
          <div style={{ marginBottom: 16 }}>
            <p style={{ fontSize: '0.7rem', fontWeight: 700, color: '#a78bfa', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              ✍️ Templates de prompts
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {activeCaseData.templatePrompts.map((tp, i) => {
                const isSelected = selectedPromptIdx === i;
                return (
                  <button
                    key={i}
                    onClick={() => setSelectedPromptIdx(i)}
                    style={{
                      textAlign: 'left',
                      padding: '10px 12px',
                      borderRadius: 8,
                      border: isSelected ? `1px solid ${activeCaseData.color}60` : '1px solid rgba(255,255,255,0.06)',
                      background: isSelected ? `${activeCaseData.color}12` : 'rgba(0,0,0,0.2)',
                      cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, color: isSelected ? activeCaseData.color : '#6b5f8a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        {tp.label}
                      </span>
                      {isSelected && <ChevronRight className="h-3 w-3" style={{ color: activeCaseData.color }} />}
                    </div>
                    <p style={{ margin: 0, fontSize: '0.72rem', color: isSelected ? '#c4b5fd' : '#6b5f8a', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                      {tp.prompt}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected prompt preview */}
          <div style={{ marginBottom: 16, padding: '10px 14px', borderRadius: 8, background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(139,92,246,0.1)' }}>
            <p style={{ margin: '0 0 4px', fontSize: '0.65rem', color: '#5c5075', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Prompt sélectionné</p>
            <p style={{ margin: 0, fontSize: '0.75rem', color: '#a594c5', lineHeight: 1.6 }}>
              {activeCaseData.templatePrompts[selectedPromptIdx]?.prompt}
            </p>
          </div>

          {/* Tips */}
          <div style={{ marginBottom: 18, padding: '10px 14px', borderRadius: 8, background: 'rgba(139,92,246,0.05)', border: '1px solid rgba(139,92,246,0.1)' }}>
            <p style={{ margin: '0 0 6px', fontSize: '0.65rem', color: '#7c3aed', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>💡 Conseils</p>
            <ul style={{ margin: 0, paddingLeft: 16 }}>
              {activeCaseData.tips.map((tip, i) => (
                <li key={i} style={{ fontSize: '0.72rem', color: '#8b7faa', lineHeight: 1.7 }}>{tip}</li>
              ))}
            </ul>
          </div>

          {/* CTA */}
          <button
            onClick={() => onLaunch?.({
              useCase: activeCaseData.id,
              prompt: activeCaseData.templatePrompts[selectedPromptIdx]?.prompt || '',
              engine: activeCaseData.recommendedEngine === 'ltx2' ? 'ltx_video' : 'wan21',
              quality: activeCaseData.recommendedQuality,
            })}
            style={{
              width: '100%',
              padding: '13px 20px',
              borderRadius: 10,
              border: 'none',
              background: `linear-gradient(135deg, ${activeCaseData.color} 0%, #7c3aed 100%)`,
              color: '#fff',
              fontWeight: 700,
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              boxShadow: `0 0 24px ${activeCaseData.color}40`,
              transition: 'all 0.2s',
            }}
          >
            <Play className="h-4 w-4" />
            Lancer avec ce template · {activeCaseData.recommendedEngine === 'ltx2' ? 'LTX2' : 'Wan 2.1'} · {qualityLabel(activeCaseData.recommendedQuality)}
          </button>
        </div>
      ) : (
        /* Empty state */
        <div style={{ textAlign: 'center', padding: '32px 20px', borderRadius: 12, border: '1px dashed rgba(139,92,246,0.2)', color: '#5c5075' }}>
          <Sparkles className="h-8 w-8" style={{ color: '#3d3060', margin: '0 auto 10px' }} />
          <p style={{ margin: 0, fontSize: '0.82rem' }}>Sélectionne un cas d'usage pour voir les templates de prompts optimisés</p>
        </div>
      )}

      {/* Open-source reminder */}
      <div style={{ marginTop: 16, padding: '8px 12px', borderRadius: 8, background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.18)', display: 'flex', gap: 8, alignItems: 'center' }}>
        <span style={{ fontSize: '0.85rem' }}>🔓</span>
        <p style={{ margin: 0, fontSize: '0.7rem', color: '#5eead4', lineHeight: 1.4 }}>
          <strong>LTX2 est open-source</strong> : aucun frais par vidéo, aucun watermark, tu possèdes tout. Tu peux le fine-tuner sur les couleurs et l'esthétique de ta marque.
        </p>
      </div>
    </div>
  );
};

export default LtxUseCasesPanel;
