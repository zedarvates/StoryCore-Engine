import {
  ServerError,
  ServerErrorCode,
  ProjectError,
  ProjectErrorCode,
  FileSystemError,
  FileSystemErrorCode,
  StorageError,
  StorageErrorCode,
  ErrorLogger,
} from './errors';

describe('Error Classes', () => {
  describe('ServerError', () => {
    it('should create server error with correct properties', () => {
      const error = new ServerError(
        ServerErrorCode.PORT_CONFLICT,
        'Port 5173 is already in use',
        'Tried ports 5173-5183'
      );

      expect(error.code).toBe(ServerErrorCode.PORT_CONFLICT);
      expect(error.message).toBe('Port 5173 is already in use');
      expect(error.details).toBe('Tried ports 5173-5183');
      expect(error.category).toBe('server');
      expect(error.timestamp).toBeInstanceOf(Date);
    });

    it('should provide user-friendly message for PORT_CONFLICT', () => {
      const error = new ServerError(ServerErrorCode.PORT_CONFLICT, 'Test');
      expect(error.getUserMessage()).toBe('Unable to start server. All ports are in use.');
    });

    it('should provide suggestions for PORT_CONFLICT', () => {
      const error = new ServerError(ServerErrorCode.PORT_CONFLICT, 'Test');
      const suggestions = error.getSuggestions();
      
      expect(suggestions).toContain('Close other applications using ports 5173-5183');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should provide user-friendly message for SPAWN_FAILED', () => {
      const error = new ServerError(ServerErrorCode.SPAWN_FAILED, 'Test');
      expect(error.getUserMessage()).toBe('Failed to start the development server.');
    });

    it('should provide user-friendly message for SERVER_CRASHED', () => {
      const error = new ServerError(ServerErrorCode.SERVER_CRASHED, 'Test');
      expect(error.getUserMessage()).toBe('The server stopped unexpectedly.');
    });

    it('should provide user-friendly message for TIMEOUT', () => {
      const error = new ServerError(ServerErrorCode.TIMEOUT, 'Test');
      expect(error.getUserMessage()).toBe('Server is taking longer than expected to start.');
    });
  });

  describe('ProjectError', () => {
    it('should create project error with correct properties', () => {
      const validationErrors = [
        {
          type: 'missing_file' as const,
          path: 'project.json',
          message: 'File not found',
        },
      ];

      const error = new ProjectError(
        ProjectErrorCode.MISSING_FILES,
        'Required files missing',
        '/path/to/project',
        validationErrors
      );

      expect(error.code).toBe(ProjectErrorCode.MISSING_FILES);
      expect(error.message).toBe('Required files missing');
      expect(error.projectPath).toBe('/path/to/project');
      expect(error.validationErrors).toEqual(validationErrors);
      expect(error.category).toBe('project');
    });

    it('should provide user-friendly message for INVALID_STRUCTURE', () => {
      const error = new ProjectError(ProjectErrorCode.INVALID_STRUCTURE, 'Test');
      expect(error.getUserMessage()).toBe('The selected directory is not a valid StoryCore project.');
    });

    it('should provide suggestions for INVALID_STRUCTURE', () => {
      const error = new ProjectError(ProjectErrorCode.INVALID_STRUCTURE, 'Test');
      const suggestions = error.getSuggestions();
      
      expect(suggestions).toContain('Select a valid StoryCore project directory');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should provide user-friendly message for PERMISSION_DENIED', () => {
      const error = new ProjectError(ProjectErrorCode.PERMISSION_DENIED, 'Test');
      expect(error.getUserMessage()).toBe('Permission denied accessing the project directory.');
    });
  });

  describe('FileSystemError', () => {
    it('should create filesystem error with correct properties', () => {
      const error = new FileSystemError(
        FileSystemErrorCode.CREATE_FAILED,
        'Failed to create directory',
        '/path/to/dir'
      );

      expect(error.code).toBe(FileSystemErrorCode.CREATE_FAILED);
      expect(error.message).toBe('Failed to create directory');
      expect(error.filePath).toBe('/path/to/dir');
      expect(error.category).toBe('filesystem');
    });

    it('should provide user-friendly message for INSUFFICIENT_SPACE', () => {
      const error = new FileSystemError(FileSystemErrorCode.INSUFFICIENT_SPACE, 'Test');
      expect(error.getUserMessage()).toBe('Insufficient disk space.');
    });

    it('should provide suggestions for INSUFFICIENT_SPACE', () => {
      const error = new FileSystemError(FileSystemErrorCode.INSUFFICIENT_SPACE, 'Test');
      const suggestions = error.getSuggestions();
      
      expect(suggestions).toContain('Free up disk space');
      expect(suggestions.length).toBeGreaterThan(0);
    });

    it('should provide user-friendly message for PATH_TOO_LONG', () => {
      const error = new FileSystemError(FileSystemErrorCode.PATH_TOO_LONG, 'Test');
      expect(error.getUserMessage()).toBe('The path is too long.');
    });
  });

  describe('StorageError', () => {
    it('should create storage error with correct properties', () => {
      const error = new StorageError(
        StorageErrorCode.QUOTA_EXCEEDED,
        'Storage quota exceeded',
        'LocalStorage full'
      );

      expect(error.code).toBe(StorageErrorCode.QUOTA_EXCEEDED);
      expect(error.message).toBe('Storage quota exceeded');
      expect(error.details).toBe('LocalStorage full');
      expect(error.category).toBe('storage');
    });

    it('should provide user-friendly message for QUOTA_EXCEEDED', () => {
      const error = new StorageError(StorageErrorCode.QUOTA_EXCEEDED, 'Test');
      expect(error.getUserMessage()).toBe('Storage quota exceeded.');
    });

    it('should provide suggestions for QUOTA_EXCEEDED', () => {
      const error = new StorageError(StorageErrorCode.QUOTA_EXCEEDED, 'Test');
      const suggestions = error.getSuggestions();
      
      expect(suggestions).toContain('Clear browser cache');
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
});

describe('ErrorLogger', () => {
  let logger: ErrorLogger;

  beforeEach(() => {
    logger = new ErrorLogger();
    logger.clear();
  });

  it('should log errors', () => {
    const error = new ServerError(ServerErrorCode.PORT_CONFLICT, 'Test error');
    logger.log(error);

    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Test error');
    expect(logs[0].category).toBe('server');
  });

  it('should log errors with context', () => {
    const error = new ServerError(ServerErrorCode.PORT_CONFLICT, 'Test error');
    const context = { port: 5173, attempts: 3 };
    
    logger.log(error, context);

    const logs = logger.getLogs();
    expect(logs[0].context).toEqual(context);
  });

  it('should log standard Error objects', () => {
    const error = new Error('Standard error');
    logger.log(error);

    const logs = logger.getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0].message).toBe('Standard error');
  });

  it('should filter logs by category', () => {
    logger.log(new ServerError(ServerErrorCode.PORT_CONFLICT, 'Server error'));
    logger.log(new ProjectError(ProjectErrorCode.INVALID_STRUCTURE, 'Project error'));
    logger.log(new FileSystemError(FileSystemErrorCode.CREATE_FAILED, 'FS error'));

    const serverLogs = logger.getLogsByCategory('server');
    const projectLogs = logger.getLogsByCategory('project');

    expect(serverLogs).toHaveLength(1);
    expect(projectLogs).toHaveLength(1);
    expect(serverLogs[0].message).toBe('Server error');
    expect(projectLogs[0].message).toBe('Project error');
  });

  it('should limit number of logs', () => {
    // Create more than maxLogs errors
    for (let i = 0; i < 150; i++) {
      logger.log(new ServerError(ServerErrorCode.PORT_CONFLICT, `Error ${i}`));
    }

    const logs = logger.getLogs();
    expect(logs.length).toBeLessThanOrEqual(100);
    
    // Should keep most recent logs
    expect(logs[logs.length - 1].message).toBe('Error 149');
  });

  it('should clear logs', () => {
    logger.log(new ServerError(ServerErrorCode.PORT_CONFLICT, 'Test'));
    expect(logger.getLogs()).toHaveLength(1);

    logger.clear();
    expect(logger.getLogs()).toHaveLength(0);
  });

  it('should export logs as JSON', () => {
    logger.log(new ServerError(ServerErrorCode.PORT_CONFLICT, 'Test error'));
    
    const exported = logger.export();
    const parsed = JSON.parse(exported);

    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].message).toBe('Test error');
  });

  it('should provide diagnostic information', () => {
    logger.log(new ServerError(ServerErrorCode.PORT_CONFLICT, 'Test error'));
    
    const diagnostics = logger.getDiagnostics();

    expect(diagnostics).toHaveProperty('platform');
    expect(diagnostics).toHaveProperty('arch');
    expect(diagnostics).toHaveProperty('nodeVersion');
    expect(diagnostics).toHaveProperty('totalMemory');
    expect(diagnostics).toHaveProperty('recentErrors');
    expect(Array.isArray(diagnostics.recentErrors)).toBe(true);
  });

  it('should include user message and suggestions in logs', () => {
    const error = new ServerError(ServerErrorCode.PORT_CONFLICT, 'Test error');
    logger.log(error);

    const logs = logger.getLogs();
    expect(logs[0].userMessage).toBe('Unable to start server. All ports are in use.');
    expect(logs[0].suggestions).toContain('Close other applications using ports 5173-5183');
  });
});
