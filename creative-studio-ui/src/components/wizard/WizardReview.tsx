/**
 * WizardReview Component
 * 
 * Displays a comprehensive review of all wizard data before final export:
 * - Collapsible sections for each wizard step
 * - Project statistics (duration, counts)
 * - Master Coherence Sheet preview
 * - Edit buttons to navigate back to specific steps
 * - Confirm and Cancel actions
 * 
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 */

import React, { useState, useMemo } from 'react';
import type { WizardReviewProps } from '../../types/wizard';

/**
 * WizardReview Component
 * Renders the final review screen with all project data
 */
export const WizardReview: React.FC<WizardReviewProps> = ({
  projectData,
  onEdit,
  onConfirm,
  onCancel,
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(['statistics', 'project-type'])
  );

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionId)) {
        newSet.delete(sectionId);
      } else {
        newSet.add(sectionId);
      }
      return newSet;
    });
  };

  // Calculate project statistics (Requirement 14.6)
  const statistics = useMemo(() => {
    const totalDuration = projectData.scenes?.reduce(
      (sum, scene) => sum + (scene.durationMinutes || 0),
      0
    ) || projectData.projectType?.durationMinutes || 0;

    return {
      totalDuration,
      sceneCount: projectData.scenes?.length || 0,
      shotCount: projectData.shots?.length || 0,
      characterCount: projectData.characters?.length || 0,
      locationCount: projectData.worldBuilding?.locations?.length || 0,
    };
  }, [projectData]);

  return (
    <div className="wizard-review">
      <div className="wizard-review__container">
        <h2 className="wizard-review__title">Review Your Project</h2>
        <p className="wizard-review__description">
          Review all project details before finalizing. Click Edit to make changes to any section.
        </p>

        {/* Project Statistics Section (Requirement 14.6) */}
        <div className="wizard-review__statistics">
          <h3 className="wizard-review__statistics-title">Project Statistics</h3>
          <div className="wizard-review__statistics-grid">
            <div className="wizard-review__stat">
              <span className="wizard-review__stat-value">{statistics.totalDuration}</span>
              <span className="wizard-review__stat-label">Minutes</span>
            </div>
            <div className="wizard-review__stat">
              <span className="wizard-review__stat-value">{statistics.sceneCount}</span>
              <span className="wizard-review__stat-label">Scenes</span>
            </div>
            <div className="wizard-review__stat">
              <span className="wizard-review__stat-value">{statistics.shotCount}</span>
              <span className="wizard-review__stat-label">Shots</span>
            </div>
            <div className="wizard-review__stat">
              <span className="wizard-review__stat-value">{statistics.characterCount}</span>
              <span className="wizard-review__stat-label">Characters</span>
            </div>
            <div className="wizard-review__stat">
              <span className="wizard-review__stat-value">{statistics.locationCount}</span>
              <span className="wizard-review__stat-label">Locations</span>
            </div>
          </div>
        </div>

        {/* Step 1: Project Type Section (Requirement 14.1, 14.2) */}
        <ReviewSection
          id="project-type"
          title="1. Project Type"
          isExpanded={expandedSections.has('project-type')}
          onToggle={() => toggleSection('project-type')}
          onEdit={() => onEdit(1)}
        >
          <ReviewField label="Project Type" value={projectData.projectType?.type || 'Not specified'} />
          {projectData.projectType?.durationMinutes && (
            <ReviewField label="Duration" value={`${projectData.projectType.durationMinutes} minutes`} />
          )}
          {projectData.projectType?.durationRange && (
            <ReviewField 
              label="Duration Range" 
              value={`${projectData.projectType.durationRange.min}-${projectData.projectType.durationRange.max} minutes`} 
            />
          )}
        </ReviewSection>

        {/* Step 2: Genre & Style Section (Requirement 14.1, 14.2) */}
        <ReviewSection
          id="genre-style"
          title="2. Genre & Visual Style"
          isExpanded={expandedSections.has('genre-style')}
          onToggle={() => toggleSection('genre-style')}
          onEdit={() => onEdit(2)}
        >
          <ReviewField 
            label="Genres" 
            value={projectData.genreStyle?.genres?.join(', ') || 'Not specified'} 
          />
          <ReviewField 
            label="Visual Style" 
            value={projectData.genreStyle?.visualStyle || 'Not specified'} 
          />
          {projectData.genreStyle?.colorPalette && (
            <>
              <ReviewField label="Color Palette">
                <div className="wizard-review__color-palette">
                  <div 
                    className="wizard-review__color-swatch" 
                    style={{ backgroundColor: projectData.genreStyle.colorPalette.primary }}
                    title="Primary"
                  />
                  <div 
                    className="wizard-review__color-swatch" 
                    style={{ backgroundColor: projectData.genreStyle.colorPalette.secondary }}
                    title="Secondary"
                  />
                  <div 
                    className="wizard-review__color-swatch" 
                    style={{ backgroundColor: projectData.genreStyle.colorPalette.accent }}
                    title="Accent"
                  />
                </div>
              </ReviewField>
            </>
          )}
          <ReviewField 
            label="Mood" 
            value={projectData.genreStyle?.mood?.join(', ') || 'Not specified'} 
          />
        </ReviewSection>

        {/* Step 3: World Building Section (Requirement 14.1, 14.2) */}
        <ReviewSection
          id="world-building"
          title="3. World Building"
          isExpanded={expandedSections.has('world-building')}
          onToggle={() => toggleSection('world-building')}
          onEdit={() => onEdit(3)}
        >
          <ReviewField label="Time Period" value={projectData.worldBuilding?.timePeriod || 'Not specified'} />
          <ReviewField label="Primary Location" value={projectData.worldBuilding?.primaryLocation || 'Not specified'} />
          <ReviewField label="Universe Type" value={projectData.worldBuilding?.universeType || 'Not specified'} />
          <ReviewField label="Technology Level" value={`${projectData.worldBuilding?.technologyLevel || 0}/10`} />
          {projectData.worldBuilding?.worldRules && (
            <ReviewField label="World Rules" value={projectData.worldBuilding.worldRules} />
          )}
          {projectData.worldBuilding?.locations && projectData.worldBuilding.locations.length > 0 && (
            <ReviewField label="Locations">
              <ul className="wizard-review__list">
                {projectData.worldBuilding.locations.map(location => (
                  <li key={location.id} className="wizard-review__list-item">
                    <strong>{location.name}</strong>: {location.description}
                  </li>
                ))}
              </ul>
            </ReviewField>
          )}
        </ReviewSection>

        {/* Step 4: Characters Section (Requirement 14.1, 14.2) */}
        <ReviewSection
          id="characters"
          title="4. Characters"
          isExpanded={expandedSections.has('characters')}
          onToggle={() => toggleSection('characters')}
          onEdit={() => onEdit(4)}
        >
          {projectData.characters && projectData.characters.length > 0 ? (
            <div className="wizard-review__characters">
              {projectData.characters.map(character => (
                <div key={character.id} className="wizard-review__character">
                  <h4 className="wizard-review__character-name">{character.name}</h4>
                  <ReviewField label="Role" value={character.role} />
                  <ReviewField label="Physical Appearance" value={character.physicalAppearance} />
                  <ReviewField label="Personality" value={character.personalityTraits.join(', ')} />
                  {character.characterArc && (
                    <ReviewField label="Character Arc" value={character.characterArc} />
                  )}
                  <ReviewField label="Dialogue Style" value={character.dialogueStyle} />
                </div>
              ))}
            </div>
          ) : (
            <p className="wizard-review__empty">No characters defined</p>
          )}
        </ReviewSection>

        {/* Step 5: Story Structure Section (Requirement 14.1, 14.2) */}
        <ReviewSection
          id="story-structure"
          title="5. Story Structure"
          isExpanded={expandedSections.has('story-structure')}
          onToggle={() => toggleSection('story-structure')}
          onEdit={() => onEdit(5)}
        >
          {projectData.storyStructure?.logline && (
            <ReviewField label="Logline" value={projectData.storyStructure.logline} />
          )}
          {projectData.storyStructure?.premise && (
            <ReviewField label="Premise" value={projectData.storyStructure.premise} />
          )}
          <ReviewField 
            label="Act Structure" 
            value={projectData.storyStructure?.actStructure || 'Not specified'} 
          />
          <ReviewField 
            label="Narrative Perspective" 
            value={projectData.storyStructure?.narrativePerspective || 'Not specified'} 
          />
          {projectData.storyStructure?.themes && projectData.storyStructure.themes.length > 0 && (
            <ReviewField label="Themes" value={projectData.storyStructure.themes.join(', ')} />
          )}
          {projectData.storyStructure?.plotPoints && projectData.storyStructure.plotPoints.length > 0 && (
            <ReviewField label="Plot Points">
              <ul className="wizard-review__list">
                {projectData.storyStructure.plotPoints.map(point => (
                  <li key={point.id} className="wizard-review__list-item">
                    <strong>{point.name}</strong> (Act {point.actNumber}, {point.timingMinutes} min): {point.description}
                  </li>
                ))}
              </ul>
            </ReviewField>
          )}
        </ReviewSection>

        {/* Step 6: Script Section (Requirement 14.1, 14.2) */}
        <ReviewSection
          id="script"
          title="6. Dialogue & Script"
          isExpanded={expandedSections.has('script')}
          onToggle={() => toggleSection('script')}
          onEdit={() => onEdit(6)}
        >
          <ReviewField label="Script Format" value={projectData.script?.format || 'Not specified'} />
          {projectData.script?.importedFrom && (
            <ReviewField label="Imported From" value={projectData.script.importedFrom} />
          )}
          {projectData.script?.content && (
            <ReviewField label="Script Content">
              <div className="wizard-review__script-preview">
                {projectData.script.content.substring(0, 500)}
                {projectData.script.content.length > 500 && '...'}
              </div>
            </ReviewField>
          )}
          {projectData.script?.parsedScenes && projectData.script.parsedScenes.length > 0 && (
            <ReviewField label="Parsed Scenes" value={`${projectData.script.parsedScenes.length} scenes`} />
          )}
        </ReviewSection>

        {/* Step 7: Scene Breakdown Section (Requirement 14.1, 14.2) */}
        <ReviewSection
          id="scenes"
          title="7. Scene Breakdown"
          isExpanded={expandedSections.has('scenes')}
          onToggle={() => toggleSection('scenes')}
          onEdit={() => onEdit(7)}
        >
          {projectData.scenes && projectData.scenes.length > 0 ? (
            <div className="wizard-review__scenes">
              {projectData.scenes.map(scene => (
                <div key={scene.id} className="wizard-review__scene">
                  <h4 className="wizard-review__scene-title">
                    Scene {scene.sceneNumber}: {scene.sceneName}
                  </h4>
                  <ReviewField label="Duration" value={`${scene.durationMinutes} minutes`} />
                  <ReviewField label="Time of Day" value={scene.timeOfDay} />
                  <ReviewField label="Emotional Beat" value={scene.emotionalBeat} />
                  {scene.keyActions && scene.keyActions.length > 0 && (
                    <ReviewField label="Key Actions">
                      <ul className="wizard-review__list">
                        {scene.keyActions.map((action, idx) => (
                          <li key={idx} className="wizard-review__list-item">{action}</li>
                        ))}
                      </ul>
                    </ReviewField>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="wizard-review__empty">No scenes defined</p>
          )}
        </ReviewSection>

        {/* Step 8: Shot Planning Section (Requirement 14.1, 14.2) */}
        <ReviewSection
          id="shots"
          title="8. Shot Planning"
          isExpanded={expandedSections.has('shots')}
          onToggle={() => toggleSection('shots')}
          onEdit={() => onEdit(8)}
        >
          {projectData.shots && projectData.shots.length > 0 ? (
            <div className="wizard-review__shots">
              {projectData.shots.map(shot => (
                <div key={shot.id} className="wizard-review__shot">
                  <h4 className="wizard-review__shot-title">Shot {shot.shotNumber}</h4>
                  <ReviewField label="Type" value={shot.shotType} />
                  <ReviewField label="Camera Angle" value={shot.cameraAngle} />
                  <ReviewField label="Camera Movement" value={shot.cameraMovement} />
                  <ReviewField label="Transition" value={shot.transition} />
                  {shot.compositionNotes && (
                    <ReviewField label="Composition Notes" value={shot.compositionNotes} />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="wizard-review__empty">No shots defined</p>
          )}
        </ReviewSection>

        {/* Master Coherence Sheet Preview (Requirement 14.5) */}
        <div className="wizard-review__coherence-preview">
          <h3 className="wizard-review__coherence-title">Master Coherence Sheet Configuration</h3>
          <div className="wizard-review__coherence-content">
            <ReviewField label="Visual Style" value={projectData.genreStyle?.visualStyle || 'Not specified'} />
            <ReviewField label="Mood Palette" value={projectData.genreStyle?.mood?.join(', ') || 'Not specified'} />
            {projectData.genreStyle?.colorPalette && (
              <ReviewField label="Color Palette">
                <div className="wizard-review__color-palette">
                  <div 
                    className="wizard-review__color-swatch wizard-review__color-swatch--large" 
                    style={{ backgroundColor: projectData.genreStyle.colorPalette.primary }}
                  >
                    <span className="wizard-review__color-label">Primary</span>
                  </div>
                  <div 
                    className="wizard-review__color-swatch wizard-review__color-swatch--large" 
                    style={{ backgroundColor: projectData.genreStyle.colorPalette.secondary }}
                  >
                    <span className="wizard-review__color-label">Secondary</span>
                  </div>
                  <div 
                    className="wizard-review__color-swatch wizard-review__color-swatch--large" 
                    style={{ backgroundColor: projectData.genreStyle.colorPalette.accent }}
                  >
                    <span className="wizard-review__color-label">Accent</span>
                  </div>
                </div>
              </ReviewField>
            )}
            <p className="wizard-review__coherence-note">
              These settings will be used to generate the 3x3 Master Coherence Sheet that locks the visual DNA of your project.
            </p>
          </div>
        </div>

        {/* Action Buttons (Requirement 14.3, 14.4) */}
        <div className="wizard-review__actions">
          <button
            className="wizard-review__button wizard-review__button--secondary"
            onClick={onCancel}
            type="button"
            aria-label="Cancel and return to wizard"
          >
            Cancel
          </button>
          <button
            className="wizard-review__button wizard-review__button--primary"
            onClick={onConfirm}
            type="button"
            aria-label="Confirm and export project"
          >
            Confirm & Export Project
          </button>
        </div>
      </div>

      {/* Styles */}
      <style>{`
        .wizard-review {
          width: 100%;
          padding: 2rem;
          background: #f7fafc;
          min-height: 100vh;
        }

        .wizard-review__container {
          max-width: 900px;
          margin: 0 auto;
        }

        .wizard-review__title {
          font-size: 2rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          color: #1a202c;
        }

        .wizard-review__description {
          color: #718096;
          margin-bottom: 2rem;
          font-size: 1rem;
        }

        /* Statistics Section */
        .wizard-review__statistics {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 0.75rem;
          padding: 2rem;
          margin-bottom: 2rem;
          color: #ffffff;
        }

        .wizard-review__statistics-title {
          font-size: 1.25rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .wizard-review__statistics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
          gap: 1.5rem;
        }

        .wizard-review__stat {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
        }

        .wizard-review__stat-value {
          font-size: 2.5rem;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 0.5rem;
        }

        .wizard-review__stat-label {
          font-size: 0.875rem;
          opacity: 0.9;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        /* Review Sections */
        .wizard-review__section {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 0.5rem;
          margin-bottom: 1rem;
          overflow: hidden;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .wizard-review__section-header {
          width: 100%;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1rem 1.5rem;
          background: #f7fafc;
          border: none;
          cursor: pointer;
          transition: background-color 0.2s;
          text-align: left;
        }

        .wizard-review__section-header:hover {
          background: #edf2f7;
        }

        .wizard-review__section-header:focus-visible {
          outline: 3px solid #667eea;
          outline-offset: -3px;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
        }

        .wizard-review__section-title {
          font-weight: 600;
          font-size: 1.125rem;
          color: #2d3748;
        }

        .wizard-review__section-icon {
          font-size: 1.5rem;
          color: #4a5568;
          font-weight: 300;
        }

        .wizard-review__section-content {
          padding: 1.5rem;
        }

        /* Fields */
        .wizard-review__field {
          margin-bottom: 1rem;
        }

        .wizard-review__field-label {
          display: block;
          font-weight: 600;
          color: #4a5568;
          margin-bottom: 0.25rem;
          font-size: 0.875rem;
        }

        .wizard-review__field-value {
          color: #2d3748;
          line-height: 1.6;
        }

        /* Lists */
        .wizard-review__list {
          list-style: none;
          padding: 0;
          margin: 0.5rem 0 0 0;
        }

        .wizard-review__list-item {
          padding: 0.5rem 0;
          border-bottom: 1px solid #e2e8f0;
        }

        .wizard-review__list-item:last-child {
          border-bottom: none;
        }

        /* Characters */
        .wizard-review__characters {
          display: grid;
          gap: 1.5rem;
        }

        .wizard-review__character {
          padding: 1rem;
          background: #f7fafc;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
        }

        .wizard-review__character-name {
          font-size: 1.125rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 1rem;
        }

        /* Scenes */
        .wizard-review__scenes {
          display: grid;
          gap: 1.5rem;
        }

        .wizard-review__scene {
          padding: 1rem;
          background: #f7fafc;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
        }

        .wizard-review__scene-title {
          font-size: 1.125rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 1rem;
        }

        /* Shots */
        .wizard-review__shots {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
          gap: 1rem;
        }

        .wizard-review__shot {
          padding: 1rem;
          background: #f7fafc;
          border-radius: 0.5rem;
          border: 1px solid #e2e8f0;
        }

        .wizard-review__shot-title {
          font-size: 1rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 0.75rem;
        }

        /* Color Palette */
        .wizard-review__color-palette {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.5rem;
        }

        .wizard-review__color-swatch {
          width: 40px;
          height: 40px;
          border-radius: 0.375rem;
          border: 2px solid #e2e8f0;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .wizard-review__color-swatch--large {
          width: 80px;
          height: 80px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 0.5rem;
        }

        .wizard-review__color-label {
          font-size: 0.75rem;
          font-weight: 600;
          color: #ffffff;
          text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
        }

        /* Script Preview */
        .wizard-review__script-preview {
          background: #f7fafc;
          padding: 1rem;
          border-radius: 0.375rem;
          border: 1px solid #e2e8f0;
          font-family: 'Courier New', monospace;
          font-size: 0.875rem;
          line-height: 1.6;
          white-space: pre-wrap;
          max-height: 200px;
          overflow-y: auto;
        }

        /* Coherence Preview */
        .wizard-review__coherence-preview {
          background: #ffffff;
          border: 2px solid #667eea;
          border-radius: 0.75rem;
          padding: 2rem;
          margin: 2rem 0;
        }

        .wizard-review__coherence-title {
          font-size: 1.25rem;
          font-weight: 600;
          color: #2d3748;
          margin-bottom: 1.5rem;
        }

        .wizard-review__coherence-content {
          display: grid;
          gap: 1rem;
        }

        .wizard-review__coherence-note {
          margin-top: 1rem;
          padding: 1rem;
          background: #edf2f7;
          border-left: 4px solid #667eea;
          color: #4a5568;
          font-size: 0.875rem;
          line-height: 1.6;
        }

        /* Empty State */
        .wizard-review__empty {
          color: #a0aec0;
          font-style: italic;
          padding: 1rem;
          text-align: center;
        }

        /* Edit Button */
        .wizard-review__edit-button {
          margin-top: 1rem;
          padding: 0.5rem 1rem;
          background: #667eea;
          color: #ffffff;
          border: none;
          border-radius: 0.375rem;
          cursor: pointer;
          font-weight: 500;
          font-size: 0.875rem;
          transition: all 0.2s;
        }

        .wizard-review__edit-button:hover {
          background: #5a67d8;
          transform: translateY(-1px);
          box-shadow: 0 2px 4px rgba(102, 126, 234, 0.4);
        }

        .wizard-review__edit-button:focus-visible {
          outline: 3px solid #667eea;
          outline-offset: 3px;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
        }

        .wizard-review__edit-button:active {
          transform: translateY(0);
        }

        /* Action Buttons */
        .wizard-review__actions {
          display: flex;
          justify-content: flex-end;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 2rem;
          border-top: 2px solid #e2e8f0;
        }

        .wizard-review__button {
          padding: 0.75rem 2rem;
          border: none;
          border-radius: 0.5rem;
          font-weight: 600;
          font-size: 1rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .wizard-review__button--secondary {
          background: #ffffff;
          color: #4a5568;
          border: 2px solid #e2e8f0;
        }

        .wizard-review__button--secondary:hover {
          background: #f7fafc;
          border-color: #cbd5e0;
        }

        .wizard-review__button--primary {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: #ffffff;
          box-shadow: 0 4px 6px rgba(102, 126, 234, 0.3);
        }

        .wizard-review__button--primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 12px rgba(102, 126, 234, 0.4);
        }

        .wizard-review__button:focus-visible {
          outline: 3px solid #667eea;
          outline-offset: 3px;
          box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2);
        }

        .wizard-review__button:active {
          transform: translateY(0);
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .wizard-review {
            padding: 1rem;
          }

          .wizard-review__title {
            font-size: 1.5rem;
          }

          .wizard-review__statistics-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .wizard-review__stat-value {
            font-size: 2rem;
          }

          .wizard-review__shots {
            grid-template-columns: 1fr;
          }

          .wizard-review__actions {
            flex-direction: column;
          }

          .wizard-review__button {
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

// Helper component for review sections (Requirement 14.1, 14.2, 14.3)
interface ReviewSectionProps {
  id: string;
  title: string;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  children: React.ReactNode;
}

const ReviewSection: React.FC<ReviewSectionProps> = ({
  id,
  title,
  isExpanded,
  onToggle,
  onEdit,
  children,
}) => {
  // Handle keyboard navigation for section toggle
  const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onToggle();
    }
  };

  return (
    <div className="wizard-review__section">
      <button
        className="wizard-review__section-header"
        onClick={onToggle}
        onKeyDown={handleKeyDown}
        aria-expanded={isExpanded ? "true" : "false"}
        aria-controls={`section-${id}`}
        type="button"
      >
        <span className="wizard-review__section-title">{title}</span>
        <span className="wizard-review__section-icon" aria-hidden="true">
          {isExpanded ? '−' : '+'}
        </span>
      </button>
      {isExpanded && (
        <div className="wizard-review__section-content" id={`section-${id}`}>
          {children}
          <button
            className="wizard-review__edit-button"
            onClick={onEdit}
            type="button"
            aria-label={`Edit ${title}`}
          >
            Edit
          </button>
        </div>
      )}
    </div>
  );
};

// Helper component for review fields
interface ReviewFieldProps {
  label: string;
  value?: string;
  children?: React.ReactNode;
}

const ReviewField: React.FC<ReviewFieldProps> = ({ label, value, children }) => (
  <div className="wizard-review__field">
    <span className="wizard-review__field-label">{label}:</span>
    {value && <span className="wizard-review__field-value">{value}</span>}
    {children}
  </div>
);

export default WizardReview;
