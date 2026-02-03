import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

/**
 * Rover Commit Interface
 */
export interface RoverCommit {
    id: string;
    timestamp: string;
    message: string;
    author: string;
    schema_version: string;
    snapshot_path?: string; // Path to the full project.json snapshot if stored separately
}

/**
 * Rover History Interface
 */
export interface RoverHistory {
    project_id: string;
    created_at: string;
    updated_at: string;
    current_commit_id: string | null;
    commits: RoverCommit[];
}

/**
 * RoverService handles project history and persistent memory layer
 */
export class RoverService {
    private readonly ROVER_DIR = '.storycore';
    private readonly ROVER_FILE = 'rover.json';

    /**
     * Initialize Rover for a project
     * @param projectPath Path to the project root
     * @returns Initialized history
     */
    async initialize(projectPath: string, projectId: string): Promise<RoverHistory> {
        const roverPath = path.join(projectPath, this.ROVER_DIR);
        const roverFilePath = path.join(roverPath, this.ROVER_FILE);

        if (!fs.existsSync(roverPath)) {
            fs.mkdirSync(roverPath, { recursive: true });
        }

        if (fs.existsSync(roverFilePath)) {
            const content = fs.readFileSync(roverFilePath, 'utf-8');
            return JSON.parse(content);
        }

        const initialHistory: RoverHistory = {
            project_id: projectId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            current_commit_id: null,
            commits: [],
        };

        fs.writeFileSync(roverFilePath, JSON.stringify(initialHistory, null, 2), 'utf-8');
        return initialHistory;
    }

    /**
     * Create a new commit (checkpoint) in the history
     * @param projectPath Project root path
     * @param message Commit message
     * @param data Optional snapshot data
     */
    async commit(projectPath: string, message: string, data?: any): Promise<RoverCommit> {
        const history = await this.getHistory(projectPath);

        // Create commit record
        const commit: RoverCommit = {
            id: uuidv4(),
            timestamp: new Date().toISOString(),
            message,
            author: 'system',
            schema_version: data?.schema_version || '1.0',
        };

        // If data is provided, we might want to store a snapshot
        if (data) {
            const snapshotName = `snapshot_${commit.id}.json`;
            const snapshotPath = path.join(projectPath, this.ROVER_DIR, 'snapshots');

            if (!fs.existsSync(snapshotPath)) {
                fs.mkdirSync(snapshotPath, { recursive: true });
            }

            fs.writeFileSync(path.join(snapshotPath, snapshotName), JSON.stringify(data, null, 2), 'utf-8');
            commit.snapshot_path = path.join(this.ROVER_DIR, 'snapshots', snapshotName);
        }

        // Update history
        history.commits.push(commit);
        history.current_commit_id = commit.id;
        history.updated_at = commit.timestamp;

        const roverFilePath = path.join(projectPath, this.ROVER_DIR, this.ROVER_FILE);
        fs.writeFileSync(roverFilePath, JSON.stringify(history, null, 2), 'utf-8');

        return commit;
    }

    /**
     * Get project history
     */
    async getHistory(projectPath: string): Promise<RoverHistory> {
        const roverFilePath = path.join(projectPath, this.ROVER_DIR, this.ROVER_FILE);

        if (!fs.existsSync(roverFilePath)) {
            throw new Error('Rover not initialized for this project');
        }

        const content = fs.readFileSync(roverFilePath, 'utf-8');
        return JSON.parse(content);
    }

    /**
     * Restore project to a specific checkpoint
     */
    async restoreCheckpoint(projectPath: string, commitId: string): Promise<any> {
        const history = await this.getHistory(projectPath);
        const commit = history.commits.find(c => c.id === commitId);

        if (!commit) {
            throw new Error(`Checkpoint ${commitId} not found`);
        }

        if (!commit.snapshot_path) {
            throw new Error(`Commit ${commitId} does not have a snapshot`);
        }

        const fullSnapshotPath = path.join(projectPath, commit.snapshot_path);
        if (!fs.existsSync(fullSnapshotPath)) {
            throw new Error(`Snapshot file for ${commitId} is missing`);
        }

        const content = fs.readFileSync(fullSnapshotPath, 'utf-8');
        const projectData = JSON.parse(content);

        // Update current commit in history
        history.current_commit_id = commitId;
        history.updated_at = new Date().toISOString();

        const roverFilePath = path.join(projectPath, this.ROVER_DIR, this.ROVER_FILE);
        fs.writeFileSync(roverFilePath, JSON.stringify(history, null, 2), 'utf-8');

        // Return the data so the caller can overwrite project.json
        return projectData;
    }
}
