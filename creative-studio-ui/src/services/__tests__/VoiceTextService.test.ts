import { VoiceTextService, voiceTextService, type VoiceSettings } from '../VoiceTextService';

describe('VoiceTextService', () => {
  let service: VoiceTextService;

  beforeEach(() => {
    service = voiceTextService;
    // Reset settings to default for each test
    service.saveSettings({
      enabled: true,
      inputLanguage: 'fr',
      commandPrefix: 'slash'
    });
  });

  describe('Voice Commands', () => {
    it('should have all voice commands loaded', () => {
      const commands = service.getVoiceCommands();
      expect(commands.length).toBeGreaterThan(0);
    });

    it('should have the new configuration commands', () => {
      const commands = service.getVoiceCommands();
      const commandIds = commands.map(cmd => cmd.id);

      expect(commandIds).toContain('open-settings');
      expect(commandIds).toContain('open-voice-settings');
      expect(commandIds).toContain('open-api-settings');
      expect(commandIds).toContain('open-comfyui-settings');
      expect(commandIds).toContain('open-llm-settings');
    });

    it('should have the new navigation commands', () => {
      const commands = service.getVoiceCommands();
      const commandIds = commands.map(cmd => cmd.id);

      expect(commandIds).toContain('go-back');
      expect(commandIds).toContain('go-home');
      expect(commandIds).toContain('next-page');
      expect(commandIds).toContain('previous-page');
    });

    it('should have the new playback commands', () => {
      const commands = service.getVoiceCommands();
      const commandIds = commands.map(cmd => cmd.id);

      expect(commandIds).toContain('play');
      expect(commandIds).toContain('pause');
      expect(commandIds).toContain('stop');
      expect(commandIds).toContain('volume-up');
      expect(commandIds).toContain('volume-down');
    });

    it('should have the new creation commands', () => {
      const commands = service.getVoiceCommands();
      const commandIds = commands.map(cmd => cmd.id);

      expect(commandIds).toContain('create-project');
      expect(commandIds).toContain('save-as');
      expect(commandIds).toContain('export');
      expect(commandIds).toContain('import');
    });

    it('should have the new editing commands', () => {
      const commands = service.getVoiceCommands();
      const commandIds = commands.map(cmd => cmd.id);

      expect(commandIds).toContain('cut');
      expect(commandIds).toContain('copy');
      expect(commandIds).toContain('paste');
      expect(commandIds).toContain('select-all');
    });

    it('should have the new system commands', () => {
      const commands = service.getVoiceCommands();
      const commandIds = commands.map(cmd => cmd.id);

      expect(commandIds).toContain('refresh');
      expect(commandIds).toContain('clear');
      expect(commandIds).toContain('minimize');
      expect(commandIds).toContain('maximize');
      expect(commandIds).toContain('close');
    });
  });

  describe('Voice Settings', () => {
    it('should have default settings', () => {
      const settings = service.getSettings();
      expect(settings.enabled).toBe(true);
      expect(settings.inputLanguage).toBe('fr');
      expect(settings.commandPrefix).toBe('slash');
    });

    it('should save and load settings', () => {
      const newSettings: Partial<VoiceSettings> = {
        enabled: false,
        commandPrefix: 'hey'
      };
      service.saveSettings(newSettings);

      const loadedSettings = service.getSettings();
      expect(loadedSettings.enabled).toBe(false);
      expect(loadedSettings.commandPrefix).toBe('hey');
    });
  });

  describe('Voice Command Processing', () => {
    it('should process voice commands with prefix', () => {
      const testTranscript = 'slash ouvrir paramètres';
      const result = service.processVoiceCommand(testTranscript);
      expect(result).toBe(true);
    });

    it('should not process commands without prefix', () => {
      const testTranscript = 'open settings';
      const result = service.processVoiceCommand(testTranscript);
      expect(result).toBe(false);
    });

    it('should handle different languages', () => {
      // Default is 'fr' from beforeEach
      const testTranscriptFr = 'slash ouvrir paramètres';
      const resultFr = service.processVoiceCommand(testTranscriptFr);
      expect(resultFr).toBe(true);

      // Change to 'en'
      service.saveSettings({ inputLanguage: 'en' });
      const testTranscriptEn = 'slash open settings';
      const resultEn = service.processVoiceCommand(testTranscriptEn);
      expect(resultEn).toBe(true);
    });
  });
});