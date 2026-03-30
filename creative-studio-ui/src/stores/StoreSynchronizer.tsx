import { useEffect } from 'react';
import { useProjectStore } from './useProjectStore';
import { useEditorStore } from './editorStore';
import { useSequencePlanStore } from './sequencePlanStore';
import { useAppDispatch } from '@/sequence-editor/store';
import { setProject } from '@/sequence-editor/store/slices/projectSlice';
import { setTimelineState, reorderShots, setSelectedElements } from '@/sequence-editor/store/slices/timelineSlice';
import { logger } from '@/utils/logger';

/**
 * StoreSynchronizer - Ensures data consistency between the Unified Zustand Store
 * and the Legacy Redux Store used by the Cinematic Sequence Editor.
 * 
 * This bridge is temporary until all components are migrated to Zustand.
 */
export const StoreSynchronizer = () => {
  const dispatch = useAppDispatch();
  
  // Subscribe to Unified Store data
  const project = useProjectStore(state => state.project);
  const shots = useProjectStore(state => state.shots);
  const selectedShotId = useProjectStore(state => state.selectedShotId);
  const currentTime = useProjectStore(state => state.currentTime);
  const isPlaying = useProjectStore(state => state.isPlaying);
  const tracks = useProjectStore(state => state.tracks);
  const zoomLevel = useProjectStore(state => state.zoomLevel);
  const selectedElements = useProjectStore(state => state.selectedElements);
  const timelineDuration = useProjectStore(state => state.timelineDuration);
  const markers = useProjectStore(state => state.markers);

  // Sync Project & Shots to Redux
  useEffect(() => {
    if (project) {
      logger.debug('🔄 [Sync] Propagating Project to all stores');
      dispatch(setProject(project));
      
      // Sync to EditorStore
      const editorStore = useEditorStore.getState();
      if (editorStore.currentProject?.project_name !== project.project_name) {
         // Deep sync if needed, but at least ensure project is present
      }
    }
  }, [project, dispatch]);

  useEffect(() => {
    if (shots && shots.length > 0) {
      logger.debug(`🔄 [Sync] Propagating ${shots.length} shots to all stores`);
      dispatch(reorderShots(shots));
      
      // Also sync to SequencePlanStore (the one Timeline uses)
      const planActions = useSequencePlanStore.getState();
      if (planActions.currentPlanData) {
        planActions.updateCurrentPlan({ shots });
      }

      // Also sync to EditorStore
      const editorStore = useEditorStore.getState();
      // Only sync if they differ to avoid loops
      if (JSON.stringify(editorStore.shots) !== JSON.stringify(shots)) {
         useEditorStore.setState({ shots });
      }
    }
  }, [shots, dispatch]);
  
  // Sync Selection
  useEffect(() => {
    if (selectedShotId) {
      logger.debug(`🔄 [Sync] Propagating selectedShotId: ${selectedShotId}`);
      
      // Sync to EditorStore
      const editorStore = useEditorStore.getState();
      if (editorStore.selectedShotId !== selectedShotId) {
        editorStore.selectShot(selectedShotId);
      }

      // Sync to Redux
      dispatch(setSelectedElements([selectedShotId]));
    }
  }, [selectedShotId, dispatch]);

  // Sync Timeline UI State to Redux (Task 21 bridge)
  useEffect(() => {
    logger.debug('🔄 [Sync] Propagating Timeline UI State to Redux');
    dispatch(setTimelineState({
      playheadPosition: currentTime,
      isPlaying,
      duration: timelineDuration || project?.metadata?.duration || 0,
      tracks,
      zoomLevel,
      selectedElements,
      markers
    }));
  }, [
    currentTime, 
    isPlaying, 
    timelineDuration, 
    tracks, 
    zoomLevel, 
    selectedElements, 
    markers,
    project?.metadata?.duration, 
    dispatch
  ]);

  return null; // This is a logic-only component
};
