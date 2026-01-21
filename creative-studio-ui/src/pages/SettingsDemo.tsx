/**
 * Settings Demo Page
 * 
 * Demo page for testing the LLM and ComfyUI Settings Panel components
 */

import { useState } from 'react';
import { LLMSettingsPanel, ComfyUISettingsPanel } from '@/components/settings';
import type { LLMConfig } from '@/services/llmService';
import type { ComfyUIConfig } from '@/services/comfyuiService';
import { getLLMService } from '@/services/llmService';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export function SettingsDemo() {
  const [savedLLMConfig, setSavedLLMConfig] = useState<LLMConfig | null>(null);
  const [savedComfyUIConfig, setSavedComfyUIConfig] = useState<ComfyUIConfig | null>(null);
  const llmService = getLLMService();

  const handleLLMSave = async (config: LLMConfig) => {
    ;
    
    // Update the LLM service
    llmService.updateConfig(config);
    
    // Save to state
    setSavedLLMConfig(config);
    
    alert('LLM settings saved successfully!');
  };

  const handleComfyUISave = async (config: ComfyUIConfig) => {
    ;
    
    // Save to state
    setSavedComfyUIConfig(config);
    
    alert('ComfyUI settings saved successfully!');
  };

  const handleTestConnection = async (config: Partial<LLMConfig>): Promise<boolean> => {
    ;
    
    // Create a temporary service with the test config
    const testService = getLLMService();
    testService.updateConfig(config as LLMConfig);
    
    // Test the connection
    const result = await testService.validateConnection();
    
    return result.success && result.data === true;
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Settings Demo</h1>
          <p className="text-muted-foreground mt-2">
            Test the LLM and ComfyUI configuration panels
          </p>
        </div>

        <Tabs defaultValue="llm" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="llm">LLM Settings</TabsTrigger>
            <TabsTrigger value="comfyui">ComfyUI Settings</TabsTrigger>
          </TabsList>
          
          <TabsContent value="llm" className="space-y-6">
            <LLMSettingsPanel
              currentConfig={savedLLMConfig || undefined}
              onSave={handleLLMSave}
              onTestConnection={handleTestConnection}
            />

            {savedLLMConfig && (
              <div className="mt-8 p-4 bg-muted rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Saved LLM Configuration</h2>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(savedLLMConfig, null, 2)}
                </pre>
              </div>
            )}
          </TabsContent>

          <TabsContent value="comfyui" className="space-y-6">
            <ComfyUISettingsPanel
              currentConfig={savedComfyUIConfig || undefined}
              onSave={handleComfyUISave}
            />

            {savedComfyUIConfig && (
              <div className="mt-8 p-4 bg-muted rounded-lg">
                <h2 className="text-lg font-semibold mb-2">Saved ComfyUI Configuration</h2>
                <pre className="text-xs overflow-auto">
                  {JSON.stringify(savedComfyUIConfig, null, 2)}
                </pre>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
