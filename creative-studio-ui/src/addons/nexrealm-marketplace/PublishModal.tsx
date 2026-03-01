/**
 * PublishAsset Modal — NexRealm Marketplace
 * Permet aux utilisateurs de publier leurs créations et de définir leur pricing GEM.
 */

import React, { useState, useCallback, useRef } from 'react';
import { useNexRealmStore } from './nexrealmStore';
import { GEM_REWARDS } from './gemTypes';
import styles from './PublishModal.module.css';

// ─── Constants ────────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: 'character', label: 'Personnage', icon: '👤', desc: 'Character Sheet, LoRA, lore, prompts' },
  { key: 'location',  label: 'Location',   icon: '🗺️', desc: 'Décors, ambiances, style guides' },
  { key: 'scene3d',   label: 'Scène 3D',  icon: '🎬', desc: 'Scènes GLB, environnements 3D' },
  { key: 'object',    label: 'Objet/Prop', icon: '📦', desc: 'Props 3D, véhicules, accessoires' },
  { key: 'addon',     label: 'Add-on',     icon: '🧩', desc: 'Extension StoryCore' },
  { key: 'audio',     label: 'Audio',      icon: '🎵', desc: 'SFX, musiques, ambiances' },
  { key: 'texture',   label: 'Texture',    icon: '🎨', desc: 'PBR, stylisé, photoréaliste' },
  { key: 'style',     label: 'Style/LUT',  icon: '✨', desc: 'Color grading, presets visuels' },
  { key: 'template',  label: 'Template',   icon: '📋', desc: 'Workflow préconfigurés' },
  { key: 'bundle',    label: 'Bundle',     icon: '🎁', desc: 'Pack multi-catégories' },
];

const PRICING_MODELS = [
  {
    key: 'free',
    label: 'Gratuit',
    icon: '🆓',
    desc: `Accessible à tous. Vous gagnez ${GEM_REWARDS.DOWNLOAD_FREE_ASSET} GEMs par téléchargement.`,
    color: '#10b981',
  },
  {
    key: 'gems',
    label: 'Payant en GEMs',
    icon: '💎',
    desc: 'Les membres paient avec leurs GEMs. Vous recevez 70% du prix à chaque vente.',
    color: '#8b5cf6',
  },
  {
    key: 'eur',
    label: 'Payant en €',
    icon: '💳',
    desc: 'Paiement en euros via Stripe. Revenus convertis en GEMs + option retrait EUR.',
    color: '#f59e0b',
  },
  {
    key: 'freemium',
    label: 'Freemium',
    icon: '🌟',
    desc: 'Version de base gratuite, version avancée payante en GEMs.',
    color: '#06b6d4',
  },
];

const LICENSE_OPTIONS = [
  { key: 'personal',   label: 'Usage personnel',    desc: 'Non commercialisable par l\'acheteur' },
  { key: 'commercial', label: 'Usage commercial',    desc: 'Projets commerciaux autorisés' },
  { key: 'cc-by',      label: 'CC BY',               desc: 'Free, avec attribution obligatoire' },
  { key: 'cc0',        label: 'CC0 — Domaine public', desc: 'Aucune restriction, libre de droits total' },
];

type Step = 1 | 2 | 3 | 4;

interface PublishModalProps {
  onClose: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const PublishModal: React.FC<PublishModalProps> = ({ onClose }) => {
  const publishAsset = useNexRealmStore(s => s.publishAsset);
  const wallet = useNexRealmStore(s => s.wallet);

  const [step, setStep] = useState<Step>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [publishSuccess, setPublishSuccess] = useState<{ gemsEarned: number } | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Form state
  const [category, setCategory] = useState('');
  const [name, setName] = useState('');
  const [tagline, setTagline] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [pricingModel, setPricingModel] = useState('free');
  const [gemCost, setGemCost] = useState(10);
  const [eurPrice, setEurPrice] = useState(0);
  const [gemsPerDownload] = useState(GEM_REWARDS.DOWNLOAD_FREE_ASSET);
  const [license, setLicense] = useState('personal');
  const [allowsRedistribution, setAllowsRedistribution] = useState(false);
  const [allowsModification, setAllowsModification] = useState(true);
  const [isNSFW, setIsNSFW] = useState(false);
  const [minVersion, setMinVersion] = useState('3.0.0');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const thumbInputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [thumbnail, setThumbnail] = useState<File | null>(null);

  const validate = useCallback((s: Step): boolean => {
    const errs: Record<string, string> = {};
    if (s === 1 && !category) errs.category = 'Sélectionnez une catégorie';
    if (s === 2) {
      if (!name.trim()) errs.name = 'Le nom est requis';
      if (!tagline.trim()) errs.tagline = 'Le tagline est requis';
      if (!description.trim() || description.length < 30) errs.description = 'Description d\'au moins 30 caractères';
    }
    if (s === 3 && pricingModel === 'gems' && gemCost < 1) errs.gemCost = 'Minimum 1 GEM';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }, [category, name, tagline, description, pricingModel, gemCost]);

  const nextStep = () => {
    if (!validate(step)) return;
    setStep(s => Math.min(4, s + 1) as Step);
  };

  const prevStep = () => setStep(s => Math.max(1, s - 1) as Step);

  const handleSubmit = async () => {
    if (!validate(3)) return;
    setIsSubmitting(true);
    try {
      const earned = await publishAsset({
        name, tagline, description,
        category,
        tags: tags.split(',').map(t => t.trim()).filter(Boolean),
        files, thumbnail,
        pricingModel,
        gemCost: pricingModel === 'gems' ? gemCost : 0,
        eurPrice: pricingModel === 'eur' ? eurPrice : 0,
        gemsPerDownload: pricingModel === 'free' ? gemsPerDownload : 0,
        license,
        allowsRedistribution,
        allowsModification,
        isNSFW,
        minVersion,
      });
      setPublishSuccess({ gemsEarned: earned });
      setStep(4);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Close on Escape
  React.useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);

  const gemsEstimation = pricingModel === 'free'
    ? `${gemsPerDownload} GEMs × nb de téléchargements`
    : pricingModel === 'gems'
    ? `${Math.floor(gemCost * 0.70)} GEMs par vente (70%)`
    : pricingModel === 'eur'
    ? `€${eurPrice} par vente → GEMs versés`
    : `${gemsPerDownload} GEMs (gratuit) + GEMs (premium)`;

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal} role="dialog" aria-modal="true" aria-label="Publier un asset">

        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerBrand}>
            <span className={styles.headerIcon}>🚀</span>
            <div>
              <div className={styles.headerTitle}>Publier ma création</div>
              <div className={styles.headerSub}>Partagez avec la communauté · Gagnez des GEMmes</div>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* Progress */}
        <div className={styles.progress}>
          {([
            { n: 1, label: 'Catégorie' },
            { n: 2, label: 'Informations' },
            { n: 3, label: 'Pricing GEM' },
            { n: 4, label: 'Publication' },
          ] as { n: Step; label: string }[]).map((s) => (
            <div key={s.n} className={`${styles.progressStep} ${step >= s.n ? styles.progressStepDone : ''} ${step === s.n ? styles.progressStepActive : ''}`}>
              <div className={styles.progressDot}>{step > s.n ? '✓' : s.n}</div>
              <span className={styles.progressLabel}>{s.label}</span>
              {s.n < 4 && <div className={`${styles.progressLine} ${step > s.n ? styles.progressLineDone : ''}`} />}
            </div>
          ))}
        </div>

        {/* Body */}
        <div className={styles.body}>

          {/* ── Step 1: Category ── */}
          {step === 1 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Quelle type de création partagez-vous ?</h2>
              <div className={styles.catGrid}>
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    className={`${styles.catCard} ${category === cat.key ? styles.catCardActive : ''}`}
                    onClick={() => setCategory(cat.key)}
                    id={`publish-cat-${cat.key}`}
                  >
                    <span className={styles.catIcon}>{cat.icon}</span>
                    <span className={styles.catLabel}>{cat.label}</span>
                    <span className={styles.catDesc}>{cat.desc}</span>
                  </button>
                ))}
              </div>
              {errors.category && <div className={styles.error}>{errors.category}</div>}
            </div>
          )}

          {/* ── Step 2: Informations ── */}
          {step === 2 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Décrivez votre création</h2>
              <div className={styles.formGrid}>
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="pub-name">Nom de l'asset *</label>
                  <input
                    id="pub-name"
                    className={`${styles.input} ${errors.name ? styles.inputError : ''}`}
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="ex : Paris 1920s — Location Pack"
                    maxLength={80}
                  />
                  {errors.name && <span className={styles.error}>{errors.name}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="pub-tagline">Tagline *</label>
                  <input
                    id="pub-tagline"
                    className={`${styles.input} ${errors.tagline ? styles.inputError : ''}`}
                    value={tagline}
                    onChange={e => setTagline(e.target.value)}
                    placeholder="ex : 8 décors parisiens années 1920 pour vos projets"
                    maxLength={120}
                  />
                  {errors.tagline && <span className={styles.error}>{errors.tagline}</span>}
                </div>

                <div className={styles.formGroup} style={{ gridColumn: '1/-1' }}>
                  <label className={styles.label} htmlFor="pub-desc">Description *</label>
                  <textarea
                    id="pub-desc"
                    className={`${styles.textarea} ${errors.description ? styles.inputError : ''}`}
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Décrivez en détail le contenu, les formats inclus, les cas d'usage…"
                    rows={5}
                  />
                  <div className={styles.charCount}>{description.length} / 2000</div>
                  {errors.description && <span className={styles.error}>{errors.description}</span>}
                </div>

                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="pub-tags">Tags (séparés par des virgules)</label>
                  <input
                    id="pub-tags"
                    className={styles.input}
                    value={tags}
                    onChange={e => setTags(e.target.value)}
                    placeholder="ex : paris, historical, 1920s, interior"
                  />
                </div>

                {/* Thumbnail upload */}
                <div className={styles.formGroup}>
                  <label className={styles.label}>Miniature (thumbnail)</label>
                  <div
                    className={styles.dropzone}
                    onClick={() => thumbInputRef.current?.click()}
                  >
                    {thumbnail
                      ? <span className={styles.dropzoneFile}>✓ {thumbnail.name}</span>
                      : <><span style={{ fontSize: 28 }}>🖼️</span><span>Cliquez ou glissez une image (PNG/JPG)</span></>
                    }
                    <input ref={thumbInputRef} type="file" accept="image/*" hidden
                      onChange={e => setThumbnail(e.target.files?.[0] ?? null)} />
                  </div>
                </div>

                {/* Files upload */}
                <div className={styles.formGroup} style={{ gridColumn: '1/-1' }}>
                  <label className={styles.label}>Fichiers de l'asset *</label>
                  <div
                    className={styles.dropzone}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {files.length > 0
                      ? <span className={styles.dropzoneFile}>{files.length} fichier(s) sélectionné(s)</span>
                      : <><span style={{ fontSize: 28 }}>📁</span><span>Cliquez ou glissez vos fichiers (.zip, .glb, .json…)</span></>
                    }
                    <input ref={fileInputRef} type="file" multiple hidden
                      onChange={e => setFiles(Array.from(e.target.files ?? []))} />
                  </div>
                </div>

                {/* Compatibility */}
                <div className={styles.formGroup}>
                  <label className={styles.label} htmlFor="pub-version">StoryCore min. version</label>
                  <input id="pub-version" className={styles.input} value={minVersion}
                    onChange={e => setMinVersion(e.target.value)} placeholder="3.0.0" />
                </div>
              </div>
            </div>
          )}

          {/* ── Step 3: Pricing GEM ── */}
          {step === 3 && (
            <div className={styles.stepContent}>
              <h2 className={styles.stepTitle}>Choisissez votre modèle de prix</h2>
              <p className={styles.stepSub}>
                Vos revenus en GEMmes s'accumulent automatiquement à chaque téléchargement ou achat.
                Votre tier créateur ({wallet ? wallet.tier : '…'}) détermine votre part des revenus.
              </p>

              {/* Pricing Models */}
              <div className={styles.pricingGrid}>
                {PRICING_MODELS.map(m => (
                  <button
                    key={m.key}
                    className={`${styles.pricingCard} ${pricingModel === m.key ? styles.pricingCardActive : ''}`}
                    style={pricingModel === m.key ? { borderColor: `${m.color}66`, background: `${m.color}11` } : {}}
                    onClick={() => setPricingModel(m.key)}
                    id={`pricing-${m.key}`}
                  >
                    <span className={styles.pricingIcon}>{m.icon}</span>
                    <div className={styles.pricingLabel} style={pricingModel === m.key ? { color: m.color } : {}}>{m.label}</div>
                    <div className={styles.pricingDesc}>{m.desc}</div>
                  </button>
                ))}
              </div>

              {/* Details selon le modèle choisi */}
              {pricingModel === 'gems' && (
                <div className={styles.pricingDetail}>
                  <label className={styles.label} htmlFor="gem-cost">Prix en GEMs</label>
                  <div className={styles.gemSliderWrap}>
                    <input id="gem-cost" type="range" min={1} max={500} value={gemCost}
                      onChange={e => setGemCost(Number(e.target.value))} className={styles.gemSlider} />
                    <span className={styles.gemSliderValue}>💎 {gemCost} GEMs</span>
                  </div>
                  <p className={styles.pricingNote}>
                    ≈ €{(gemCost * 0.10).toFixed(2)} · Vous recevez {Math.floor(gemCost * 0.70)} GEMs par vente (70%)
                  </p>
                  {errors.gemCost && <span className={styles.error}>{errors.gemCost}</span>}
                </div>
              )}

              {pricingModel === 'eur' && (
                <div className={styles.pricingDetail}>
                  <label className={styles.label} htmlFor="eur-price">Prix en euros (€)</label>
                  <div className={styles.gemSliderWrap}>
                    <input id="eur-price" type="range" min={0.99} max={99} step={0.5} value={eurPrice || 4.99}
                      onChange={e => setEurPrice(Number(e.target.value))} className={styles.gemSlider} />
                    <span className={styles.gemSliderValue}>€{(eurPrice || 4.99).toFixed(2)}</span>
                  </div>
                  <p className={styles.pricingNote}>
                    Paiement via Stripe — revenus versés en GEMs + option retrait EUR mensuel
                  </p>
                </div>
              )}

              {pricingModel === 'freemium' && (
                <div className={styles.pricingDetail}>
                  <label className={styles.label} htmlFor="freemium-gem-cost">Prix de la version Premium (GEMs)</label>
                  <div className={styles.gemSliderWrap}>
                    <input id="freemium-gem-cost" type="range" min={5} max={200} value={gemCost}
                      onChange={e => setGemCost(Number(e.target.value))} className={styles.gemSlider} />
                    <span className={styles.gemSliderValue}>💎 {gemCost} GEMs</span>
                  </div>
                  <p className={styles.pricingNote}>
                    Version basique gratuite (+{gemsPerDownload} GEMs/téléchargement) · Version premium : {Math.floor(gemCost * 0.70)} GEMs pour vous
                  </p>
                </div>
              )}

              {/* GEM Estimation */}
              <div className={styles.earningEstimate}>
                <span className={styles.estimateIcon}>💎</span>
                <div>
                  <div className={styles.estimateTitle}>Vos revenus estimés</div>
                  <div className={styles.estimateValue}>{gemsEstimation}</div>
                </div>
              </div>

              {/* Licence */}
              <div className={styles.formGroup} style={{ marginTop: 24 }}>
                <label className={styles.label}>Licence</label>
                <div className={styles.licenseGrid}>
                  {LICENSE_OPTIONS.map(l => (
                    <button
                      key={l.key}
                      className={`${styles.licenseCard} ${license === l.key ? styles.licenseCardActive : ''}`}
                      onClick={() => setLicense(l.key)}
                      id={`license-${l.key}`}
                    >
                      <div className={styles.licenseName}>{l.label}</div>
                      <div className={styles.licenseDesc}>{l.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Options */}
              <div className={styles.checkboxGroup}>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={allowsModification} onChange={e => setAllowsModification(e.target.checked)} />
                  Modifications autorisées
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={allowsRedistribution} onChange={e => setAllowsRedistribution(e.target.checked)} />
                  Redistribution autorisée
                </label>
                <label className={styles.checkboxLabel}>
                  <input type="checkbox" checked={isNSFW} onChange={e => setIsNSFW(e.target.checked)} />
                  Contenu adulte (18+)
                </label>
              </div>
            </div>
          )}

          {/* ── Step 4: Success ── */}
          {step === 4 && (
            <div className={styles.success}>
              <div className={styles.successOrb}>🚀</div>
              <h2 className={styles.successTitle}>Félicitations !</h2>
              {publishSuccess ? (
                <>
                  <p className={styles.successText}>
                    Votre asset <strong>{name}</strong> a été publié avec succès sur NexRealm Marketplace !
                  </p>
                  <div className={styles.successGems}>
                    <span style={{ fontSize: 32 }}>💎</span>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 900 }}>+{publishSuccess.gemsEarned} GEMs</div>
                      <div style={{ fontSize: 13, color: 'var(--pm-text-2)' }}>Bonus de publication reçus</div>
                    </div>
                  </div>
                  <p className={styles.successSub}>
                    Vous gagnerez des GEMs supplémentaires à chaque téléchargement de votre création par la communauté.
                  </p>
                  <div className={styles.successActions}>
                    <button className={styles.successClose} onClick={onClose}>Fermer</button>
                  </div>
                </>
              ) : (
                <p className={styles.successText}>Publication en cours…</p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className={styles.footer}>
            <button
              className={styles.footerBack}
              onClick={step === 1 ? onClose : prevStep}
            >
              {step === 1 ? 'Annuler' : '← Retour'}
            </button>
            <div className={styles.footerRight}>
              {step < 3 ? (
                <button className={styles.footerNext} onClick={nextStep}>
                  Continuer →
                </button>
              ) : (
                <button
                  className={styles.footerPublish}
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  id="nexrealm-publish-btn"
                >
                  {isSubmitting ? '⏳ Publication…' : '🚀 Publier et gagner des GEMs'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PublishModal;
