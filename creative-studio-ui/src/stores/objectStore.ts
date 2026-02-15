import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { StoryObject } from '@/types/object';
import { listObjectsInProject, loadObjectFromProject, saveObjectToProject, deleteObjectFromProject } from '@/utils/objectStorage';

interface ObjectState {
    objects: StoryObject[];
    isLoading: boolean;
    error: string | null;

    // Actions
    fetchProjectObjects: (projectId: string) => Promise<void>;
    addObject: (projectId: string, object: StoryObject) => Promise<void>;
    updateObject: (projectId: string, object: StoryObject) => Promise<void>;
    removeObject: (projectId: string, objectId: string) => Promise<void>;
}

export const useObjectStore = create<ObjectState>()(
    devtools(
        (set, get) => ({
            objects: [],
            isLoading: false,
            error: null,

            fetchProjectObjects: async (projectId) => {
                set({ isLoading: true, error: null });
                try {
                    const objectIds = await listObjectsInProject(projectId);
                    const loadedObjects: StoryObject[] = [];

                    for (const id of objectIds) {
                        const obj = await loadObjectFromProject(projectId, id);
                        if (obj) loadedObjects.push(obj);
                    }

                    set({ objects: loadedObjects, isLoading: false });
                } catch (error) {
                    console.error('Failed to fetch project objects:', error);
                    set({ error: 'Failed to load objects', isLoading: false });
                }
            },

            addObject: async (projectId, object) => {
                try {
                    await saveObjectToProject(projectId, object.id, object);
                    set((state) => ({
                        objects: [...state.objects, object]
                    }));
                } catch (error) {
                    console.error('Failed to add object:', error);
                    throw error;
                }
            },

            updateObject: async (projectId, object) => {
                try {
                    await saveObjectToProject(projectId, object.id, object);
                    set((state) => ({
                        objects: state.objects.map(obj => obj.id === object.id ? object : obj)
                    }));
                } catch (error) {
                    console.error('Failed to update object:', error);
                    throw error;
                }
            },

            removeObject: async (projectId, objectId) => {
                try {
                    await deleteObjectFromProject(projectId, objectId);
                    set((state) => ({
                        objects: state.objects.filter(obj => obj.id !== objectId)
                    }));
                } catch (error) {
                    console.error('Failed to remove object:', error);
                    throw error;
                }
            },
        }),
        { name: 'ObjectStore' }
    )
);
