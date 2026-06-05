import React, { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import { generateAIPrompt, parseAIUpdate } from '../lib/aiPrompt';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Copy, Upload, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export const AIView = () => {
  const appData = useAppData();
  const [importJson, setImportJson] = useState('');
  const [preview, setPreview] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCopyPrompt = async () => {
    const prompt = generateAIPrompt(appData);
    try {
      await navigator.clipboard.writeText(prompt);
      toast.success('Copied to clipboard!', {
        description: 'Paste this into ChatGPT or Claude.',
      });
    } catch (err) {
      toast.error('Failed to copy', { description: 'Please copy manually.' });
    }
  };

  const handlePreview = () => {
    setError(null);
    try {
      if (!importJson.trim()) throw new Error("Please paste JSON first.");
      const data = parseAIUpdate(importJson);
      setPreview(data);
    } catch (err: any) {
      setError(err.message || "Invalid JSON format");
      setPreview(null);
    }
  };

  const handleApply = () => {
    if (!preview) return;
    try {
      appData.applyImportUpdate(preview);
      toast.success('Changes applied successfully!');
      setImportJson('');
      setPreview(null);
    } catch (err: any) {
      setError("Failed to apply changes.");
    }
  };

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex-none p-4 pb-2 border-b border-border bg-card sticky top-0 z-10">
        <h1 className="text-xl font-bold tracking-tight">AI Control</h1>
      </div>

      <div className="p-4 pb-24 space-y-8">
        
        {/* Export Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              1
            </div>
            <h2 className="text-lg font-bold">Export Context</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Generate a structured prompt containing your current schedule and tasks. Paste it into an AI assistant to get optimization suggestions.
          </p>
          <Button onClick={handleCopyPrompt} className="w-full h-12 text-base font-semibold gap-2">
            <Copy size={18} />
            Copy AI Planning Prompt
          </Button>
        </section>

        <div className="h-px bg-border/50 w-full" />

        {/* Import Section */}
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              2
            </div>
            <h2 className="text-lg font-bold">Import Update</h2>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Paste the JSON response from the AI here to apply schedule optimizations and new tasks.
          </p>

          <Textarea 
            value={importJson}
            onChange={e => setImportJson(e.target.value)}
            placeholder='{"events": {"add": [...]}}'
            className="font-mono text-xs h-40 bg-muted/30 resize-none"
          />

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!preview ? (
            <Button onClick={handlePreview} variant="secondary" className="w-full gap-2 h-12 text-base">
              <Upload size={18} />
              Preview Changes
            </Button>
          ) : (
            <div className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
              <div className="bg-card border border-border rounded-xl p-4 space-y-3">
                <h3 className="font-bold text-sm flex items-center gap-2 text-foreground">
                  <CheckCircle2 size={16} className="text-primary" />
                  Preview Summary
                </h3>
                <div className="text-sm space-y-1 text-muted-foreground">
                  {preview.events?.add?.length > 0 && <div>+ {preview.events.add.length} new events</div>}
                  {preview.events?.update?.length > 0 && <div>~ {preview.events.update.length} updated events</div>}
                  {preview.events?.delete?.length > 0 && <div>- {preview.events.delete.length} deleted events</div>}
                  
                  {preview.tasks?.add?.length > 0 && <div>+ {preview.tasks.add.length} new tasks</div>}
                  {preview.tasks?.update?.length > 0 && <div>~ {preview.tasks.update.length} updated tasks</div>}
                  {preview.tasks?.delete?.length > 0 && <div>- {preview.tasks.delete.length} deleted tasks</div>}
                  
                  {(!preview.events && !preview.tasks) && <div>No changes detected.</div>}
                </div>
              </div>

              <div className="flex gap-2">
                <Button onClick={() => setPreview(null)} variant="outline" className="flex-1">
                  Cancel
                </Button>
                <Button onClick={handleApply} className="flex-1 bg-green-600 hover:bg-green-700 text-white">
                  Apply Changes
                </Button>
              </div>
            </div>
          )}
        </section>

      </div>
    </div>
  );
};
