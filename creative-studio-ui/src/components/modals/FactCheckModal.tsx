/**
 * Fact Check Modal Component
 *
 * Quick fact-checking tool that allows users to verify facts using LLM.
 * User enters text and the LLM responds with verification results.
 */

import { useState, useRef, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, AlertCircle, Loader2, Send, X } from 'lucide-react';
import { getLLMService } from '@/services/llmService';
import { useAppStore } from '@/stores/useAppStore';

interface FactCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface FactCheckResult {
  id: string;
  query: string;
  response: string;
  timestamp: Date;
  status: 'verified' | 'questionable' | 'unverified' | 'error';
  confidence?: number;
}

const FACT_CHECK_SYSTEM_PROMPT = `You are a fact-checking assistant. Your role is to verify statements and claims made by the user.

When given a statement to check:
1. Analyze the claim carefully
2. Provide a clear verdict: VERIFIED, QUESTIONABLE, or UNVERIFIED
3. Explain your reasoning with supporting evidence or sources when possible
4. If the claim is questionable or incorrect, provide the correct information
5. Be concise but thorough in your response

Format your response as follows:
VERDICT: [VERIFIED/QUESTIONABLE/UNVERIFIED]
CONFIDENCE: [High/Medium/Low]
REASONING: [Your detailed explanation]

If you cannot verify the claim due to lack of information, clearly state this.`;

export function FactCheckModal({ isOpen, onClose }: FactCheckModalProps) {
  const { toast } = useToast();
  const [inputText, setInputText] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [results, setResults] = useState<FactCheckResult[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const ollamaStatus = useAppStore((state) => state.ollamaStatus);

  // Auto-scroll to bottom when new results are added
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [results]);

  const handleCheckFact = async () => {
    if (!inputText.trim()) {
      toast({
        title: 'Empty Input',
        description: 'Please enter a statement to check.',
        variant: 'destructive',
      });
      return;
    }

    if (ollamaStatus !== 'connected') {
      toast({
        title: 'LLM Not Connected',
        description: 'Please configure and connect to an LLM service first.',
        variant: 'destructive',
      });
      return;
    }

    setIsChecking(true);
    const query = inputText.trim();
    const resultId = `fact-${Date.now()}`;

    try {
      const llmService = getLLMService();

      const response = await llmService.generateCompletion({
        prompt: `Please fact-check the following statement:\n\n"${query}"`,
        systemPrompt: FACT_CHECK_SYSTEM_PROMPT,
        temperature: 0.3,
        maxTokens: 1000,
      });

      let result: FactCheckResult;

      if (response.success && response.data) {
        const content = response.data.content;
        
        // Parse the verdict from the response
        let status: FactCheckResult['status'] = 'unverified';
        if (content.toLowerCase().includes('verdict: verified')) {
          status = 'verified';
        } else if (content.toLowerCase().includes('verdict: questionable')) {
          status = 'questionable';
        } else if (content.toLowerCase().includes('verdict: unverified')) {
          status = 'unverified';
        }

        // Extract confidence if present
        const confidenceMatch = content.match(/confidence:\s*(high|medium|low)/i);
        const confidence = confidenceMatch 
          ? confidenceMatch[1].toLowerCase() === 'high' ? 0.9 
            : confidenceMatch[1].toLowerCase() === 'medium' ? 0.6 
            : 0.3
          : undefined;

        result = {
          id: resultId,
          query,
          response: content,
          timestamp: new Date(),
          status,
          confidence,
        };
      } else {
        result = {
          id: resultId,
          query,
          response: `Error: ${response.error || 'Failed to get response from LLM'}`,
          timestamp: new Date(),
          status: 'error',
        };
      }

      setResults((prev) => [...prev, result]);
      setInputText('');
    } catch (error) {
      console.error('[FactCheck] Error:', error);
      
      const errorResult: FactCheckResult = {
        id: resultId,
        query,
        response: `Error: ${error instanceof Error ? error.message : 'Unknown error occurred'}`,
        timestamp: new Date(),
        status: 'error',
      };
      
      setResults((prev) => [...prev, errorResult]);
      
      toast({
        title: 'Fact Check Failed',
        description: error instanceof Error ? error.message : 'Failed to verify the statement',
        variant: 'destructive',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const clearResults = () => {
    setResults([]);
  };

  const getStatusIcon = (status: FactCheckResult['status']) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'questionable':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'unverified':
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
      case 'error':
        return <X className="h-5 w-5 text-red-500" />;
    }
  };

  const getStatusColor = (status: FactCheckResult['status']) => {
    switch (status) {
      case 'verified':
        return 'bg-green-500/10 border-green-500/30';
      case 'questionable':
        return 'bg-yellow-500/10 border-yellow-500/30';
      case 'unverified':
        return 'bg-gray-500/10 border-gray-500/30';
      case 'error':
        return 'bg-red-500/10 border-red-500/30';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleCheckFact();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl h-[80vh] flex flex-col bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-cyan-400">
            <CheckCircle className="h-5 w-5" />
            Fact Check
          </DialogTitle>
        </DialogHeader>

        {/* Connection Status */}
        <div className="flex items-center gap-2 text-sm">
          <div
            className={`w-2 h-2 rounded-full ${
              ollamaStatus === 'connected' ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-slate-400">
            LLM: {ollamaStatus === 'connected' ? 'Connected' : 'Not Connected'}
          </span>
        </div>

        {/* Results Area */}
        <ScrollArea ref={scrollRef} className="flex-1 border border-slate-700 rounded-lg bg-slate-950/50 p-4">
          {results.length === 0 ? (
            <div className="h-full flex items-center justify-center text-slate-500">
              <div className="text-center">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Enter a statement to fact-check</p>
                <p className="text-sm mt-2">The LLM will verify your claim and provide reasoning</p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {results.map((result) => (
                <div
                  key={result.id}
                  className={`p-4 rounded-lg border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-start gap-3">
                    {getStatusIcon(result.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-slate-200">Query:</span>
                        <span className="text-slate-300">{result.query}</span>
                      </div>
                      <div className="text-slate-300 whitespace-pre-wrap text-sm">
                        {result.response}
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        {result.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Input Area */}
        <div className="space-y-3">
          <Textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter a statement to fact-check... (e.g., 'The Eiffel Tower was built in 1889')"
            className="min-h-[80px] bg-slate-800 border-slate-700 text-slate-200 placeholder:text-slate-500 resize-none"
            disabled={isChecking}
          />
          
          <div className="flex justify-between items-center">
            <div className="flex gap-2">
              {results.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clearResults}
                  className="border-slate-600 text-slate-400 hover:text-slate-200"
                >
                  Clear History
                </Button>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500">
                Ctrl+Enter to check
              </span>
              <Button
                onClick={handleCheckFact}
                disabled={isChecking || !inputText.trim() || ollamaStatus !== 'connected'}
                className="bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                {isChecking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Check Fact
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
