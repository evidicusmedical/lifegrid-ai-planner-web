import React, { useState } from 'react';
import { useAppData } from '../context/AppDataContext';
import {
  generatePlanningPrompt,
  generateImportPrompt,
  generateOnboardingPrompt,
  parseAIUpdate,
  ParsedUpdate,
} from '../lib/aiPrompt';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  Copy, Upload, AlertCircle, CheckCircle2, ChevronRight,
  Sparkles, CalendarPlus, Wand2, Trash2, PenLine, Plus,
  ClipboardPaste, RotateCcw, Info,
} from 'lucide-react';

// ─── small helpers ────────────────────────────────────────────────────────────
const CATEGORY_COLOR: Record<string, string> = {
  work: '#2563eb', personal: '#7c3aed', health: '#059669',
  travel: '#d97706', family: '#dc2626', other: '#6b7280',
};

function CategoryDot({ category }: { category: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full shrink-0 mt-0.5"
      style={{ background: CATEGORY_COLOR[category] ?? '#6b7280' }}
    />
  );
}

type Mode = 'choose' | 'optimize' | 'import' | 'onboard';

// ─── Main component ───────────────────────────────────────────────────────────
export const AIView = () => {
  const appData = useAppData();
  const hasData = appData.events.length > 0 || appData.tasks.length > 0;

  const [mode, setMode]             = useState<Mode>('choose');
  const [rawInput, setRawInput]     = useState('');
  const [promptText, setPromptText] = useState('');
  const [importJson, setImportJson] = useState('');
  const [preview, setPreview]       = useState<ParsedUpdate | null>(null);
  const [error, setError]           = useState<string | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  // ── Copy to clipboard helper ────────────────────────────────────────────────
  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`${label} copied!`, { description: 'Paste it into ChatGPT, Claude, or Gemini.' });
    } catch {
      toast.error('Clipboard blocked', { description: 'Long-press the text box to copy manually.' });
    }
  };

  // ── Step 1: Generate prompt ──────────────────────────────────────────────────
  const handleGeneratePrompt = () => {
    let prompt = '';
    if (mode === 'optimize') {
      prompt = generatePlanningPrompt(appData);
    } else if (mode === 'import') {
      if (!rawInput.trim()) {
        toast.error('Paste your calendar data first', { description: 'Add your schedule in any format above.' });
        return;
      }
      prompt = generateImportPrompt(rawInput, appData);
    } else if (mode === 'onboard') {
      prompt = generateOnboardingPrompt();
    }
    setPromptText(prompt);
    setShowPrompt(true);
    copyToClipboard(prompt, 'Prompt');
  };

  // ── Step 2: Parse & preview ──────────────────────────────────────────────────
  const handlePreview = () => {
    setError(null);
    setPreview(null);
    try {
      if (!importJson.trim()) throw new Error('Paste the AI response first.');
      const parsed = parseAIUpdate(importJson);
      setPreview(parsed);
    } catch (err: any) {
      setError(err.message ?? 'Invalid response format.');
    }
  };

  // ── Step 3: Apply ────────────────────────────────────────────────────────────
  const handleApply = () => {
    if (!preview) return;
    try {
      appData.applyImportUpdate(preview);
      const added   = (preview.events?.add?.length ?? 0)  + (preview.tasks?.add?.length  ?? 0);
      const updated = (preview.events?.update?.length ?? 0) + (preview.tasks?.update?.length ?? 0);
      const deleted = (preview.events?.delete?.length ?? 0) + (preview.tasks?.delete?.length ?? 0);
      toast.success('Changes applied!', {
        description: [
          added   > 0 ? `+${added} added`    : '',
          updated > 0 ? `~${updated} updated` : '',
          deleted > 0 ? `−${deleted} deleted` : '',
        ].filter(Boolean).join(', '),
      });
      setImportJson('');
      setPreview(null);
      setRawInput('');
      setPromptText('');
      setShowPrompt(false);
      setMode('choose');
    } catch {
      setError('Failed to apply changes. Please try again.');
    }
  };

  const reset = () => {
    setMode('choose');
    setRawInput('');
    setPromptText('');
    setImportJson('');
    setPreview(null);
    setError(null);
    setShowPrompt(false);
  };

  // ── MODE SELECTOR ────────────────────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="flex flex-col h-full bg-background overflow-y-auto">
        <div className="flex-none px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
          <h1 className="text-lg font-bold">AI Planner</h1>
          <p className="text-xs text-muted-foreground mt-0.5">Connect with any AI to build or optimize your schedule</p>
        </div>

        <div className="p-4 space-y-3">

          {/* How it works banner */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3 flex gap-3">
            <Info size={16} className="text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              LifeGrid works with <strong className="text-foreground">any AI assistant</strong> — ChatGPT, Claude, Gemini, etc.
              Generate a prompt below, paste it into your AI, then paste the response back here to update your schedule.
            </p>
          </div>

          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider pt-1">What do you want to do?</p>

          {/* Option 1: Optimize */}
          {hasData && (
            <ModeCard
              icon={<Sparkles size={20} className="text-primary" />}
              title="Analyze & Optimize"
              description="Export your current schedule for an AI to review — find conflicts, overloaded weeks, and optimization suggestions."
              badge="Best for existing data"
              badgeColor="bg-primary/10 text-primary"
              onClick={() => setMode('optimize')}
            />
          )}

          {/* Option 2: Import a calendar */}
          <ModeCard
            icon={<CalendarPlus size={20} className="text-amber-500" />}
            title="Import Any Calendar"
            description="Paste your schedule in ANY format — iCal, plain text, Google Calendar export, a list of appointments, Outlook CSV, or just describe your week in plain English."
            badge="Supports all formats"
            badgeColor="bg-amber-500/10 text-amber-600 dark:text-amber-400"
            onClick={() => setMode('import')}
          />

          {/* Option 3: Onboard from scratch */}
          {!hasData && (
            <ModeCard
              icon={<Wand2 size={20} className="text-violet-500" />}
              title="Generate Starter Schedule"
              description="New here? Let AI create a realistic starter schedule for you to customize."
              badge="Great for new users"
              badgeColor="bg-violet-500/10 text-violet-600 dark:text-violet-400"
              onClick={() => setMode('onboard')}
            />
          )}

          {/* Divider + paste-only shortcut */}
          <div className="flex items-center gap-3 py-1">
            <div className="h-px flex-1 bg-border" />
            <span className="text-[10px] text-muted-foreground font-medium">OR</span>
            <div className="h-px flex-1 bg-border" />
          </div>

          <div className="bg-card border border-border rounded-xl p-3 space-y-2">
            <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <ClipboardPaste size={13} className="text-muted-foreground" />
              Already have AI output? Paste it directly
            </p>
            <Textarea
              value={importJson}
              onChange={e => { setImportJson(e.target.value); setError(null); }}
              placeholder={'Paste the JSON response from your AI here...\n\n{"events": {"add": [...], "update": [...], "delete": [...]}, "tasks": {...}}'}
              className="font-mono text-[11px] h-28 bg-muted/30 resize-none"
              data-testid="input-import-direct"
            />
            {error && <ErrorBanner message={error} />}
            {importJson.trim() && !preview && (
              <Button onClick={handlePreview} className="w-full gap-2" size="sm">
                <Upload size={14} />
                Preview Changes
              </Button>
            )}
            {preview && <PreviewBlock preview={preview} onApply={handleApply} onCancel={() => { setPreview(null); setImportJson(''); }} />}
          </div>
        </div>
      </div>
    );
  }

  // ── OPTIMIZE MODE ────────────────────────────────────────────────────────────
  if (mode === 'optimize') {
    return (
      <FlowLayout
        title="Analyze & Optimize"
        icon={<Sparkles size={16} className="text-primary" />}
        onBack={reset}
      >
        <StepCard number={1} title="Generate your planning prompt">
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            This creates a structured summary of your {appData.events.length} events and {appData.tasks.length} tasks for the AI to analyze.
          </p>
          <Button onClick={handleGeneratePrompt} className="w-full gap-2" data-testid="button-generate-prompt">
            <Copy size={15} />
            {showPrompt ? 'Re-copy Prompt' : 'Generate & Copy Prompt'}
          </Button>
          {showPrompt && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Prompt preview</span>
                <button onClick={() => copyToClipboard(promptText, 'Prompt')} className="text-[10px] text-primary font-semibold">Copy again</button>
              </div>
              <pre className="text-[9px] font-mono bg-muted/40 rounded-lg p-2.5 max-h-40 overflow-y-auto whitespace-pre-wrap text-muted-foreground">{promptText}</pre>
            </div>
          )}
        </StepCard>

        {showPrompt && (
          <StepCard number={2} title="Paste the AI response">
            <AIResponseInput
              value={importJson}
              onChange={v => { setImportJson(v); setError(null); setPreview(null); }}
              onPreview={handlePreview}
              error={error}
              preview={preview}
              onApply={handleApply}
              onCancelPreview={() => setPreview(null)}
            />
          </StepCard>
        )}
      </FlowLayout>
    );
  }

  // ── IMPORT MODE ────────────────────────────────────────────────────────────
  if (mode === 'import') {
    return (
      <FlowLayout
        title="Import Any Calendar"
        icon={<CalendarPlus size={16} className="text-amber-500" />}
        onBack={reset}
      >
        <StepCard number={1} title="Paste your raw calendar data">
          <p className="text-xs text-muted-foreground leading-relaxed mb-2">
            Paste anything — iCal/ICS file content, Google Calendar export, a plain text list of appointments, Outlook CSV, or just describe your schedule in plain English.
          </p>
          <div className="text-[10px] text-muted-foreground/70 mb-2 space-y-0.5">
            <p className="font-semibold text-muted-foreground">Accepted formats:</p>
            <p>• iCal / ICS file contents</p>
            <p>• Plain text ("Monday 9am — Dentist, Tuesday...")</p>
            <p>• Google Calendar / Outlook CSV export</p>
            <p>• Any other structured or unstructured schedule</p>
          </div>
          <Textarea
            value={rawInput}
            onChange={e => setRawInput(e.target.value)}
            placeholder={"Paste your schedule here in any format.\n\nExamples:\n• ICS/iCal file content\n• \"Mon Jun 9: 9am dentist, 2pm team meeting\"\n• CSV rows from Google Calendar export\n• A block of text describing your upcoming weeks"}
            className="font-mono text-[11px] h-44 bg-muted/30 resize-none"
            data-testid="input-raw-calendar"
          />
          <Button
            onClick={handleGeneratePrompt}
            className="w-full gap-2 mt-2"
            disabled={!rawInput.trim()}
            data-testid="button-generate-import-prompt"
          >
            <Copy size={15} />
            {showPrompt ? 'Re-copy Import Prompt' : 'Generate & Copy Import Prompt'}
          </Button>
          {showPrompt && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Prompt preview</span>
                <button onClick={() => copyToClipboard(promptText, 'Prompt')} className="text-[10px] text-primary font-semibold">Copy again</button>
              </div>
              <pre className="text-[9px] font-mono bg-muted/40 rounded-lg p-2.5 max-h-36 overflow-y-auto whitespace-pre-wrap text-muted-foreground">{promptText}</pre>
            </div>
          )}
        </StepCard>

        {showPrompt && (
          <StepCard number={2} title="Paste the AI response">
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              The AI will return JSON. Paste the entire response below — the app will automatically extract the JSON even if there's extra text around it.
            </p>
            <AIResponseInput
              value={importJson}
              onChange={v => { setImportJson(v); setError(null); setPreview(null); }}
              onPreview={handlePreview}
              error={error}
              preview={preview}
              onApply={handleApply}
              onCancelPreview={() => setPreview(null)}
            />
          </StepCard>
        )}
      </FlowLayout>
    );
  }

  // ── ONBOARD MODE ────────────────────────────────────────────────────────────
  if (mode === 'onboard') {
    return (
      <FlowLayout
        title="Generate Starter Schedule"
        icon={<Wand2 size={16} className="text-violet-500" />}
        onBack={reset}
      >
        <StepCard number={1} title="Copy the starter prompt">
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">
            This prompt asks the AI to create a realistic starter schedule for a busy professional. Paste it into ChatGPT, Claude, or any AI assistant.
          </p>
          <Button onClick={handleGeneratePrompt} className="w-full gap-2" data-testid="button-generate-onboard">
            <Copy size={15} />
            {showPrompt ? 'Re-copy Prompt' : 'Generate & Copy Starter Prompt'}
          </Button>
          {showPrompt && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-muted-foreground uppercase">Prompt preview</span>
                <button onClick={() => copyToClipboard(promptText, 'Prompt')} className="text-[10px] text-primary font-semibold">Copy again</button>
              </div>
              <pre className="text-[9px] font-mono bg-muted/40 rounded-lg p-2.5 max-h-36 overflow-y-auto whitespace-pre-wrap text-muted-foreground">{promptText}</pre>
            </div>
          )}
        </StepCard>

        {showPrompt && (
          <StepCard number={2} title="Paste the AI response">
            <AIResponseInput
              value={importJson}
              onChange={v => { setImportJson(v); setError(null); setPreview(null); }}
              onPreview={handlePreview}
              error={error}
              preview={preview}
              onApply={handleApply}
              onCancelPreview={() => setPreview(null)}
            />
          </StepCard>
        )}
      </FlowLayout>
    );
  }

  return null;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function ModeCard({ icon, title, description, badge, badgeColor, onClick }: {
  icon: React.ReactNode;
  title: string;
  description: string;
  badge: string;
  badgeColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl p-4 flex gap-3 items-start hover:border-primary/40 hover:bg-primary/5 transition-colors active:scale-[0.99]"
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-sm text-foreground">{title}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${badgeColor}`}>{badge}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <ChevronRight size={16} className="text-muted-foreground shrink-0 mt-1" />
    </button>
  );
}

function FlowLayout({ title, icon, onBack, children }: {
  title: string;
  icon: React.ReactNode;
  onBack: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex-none px-4 py-3 border-b border-border bg-card sticky top-0 z-10 flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-back">
          <RotateCcw size={15} className="text-muted-foreground" />
        </button>
        <div className="flex items-center gap-2">
          {icon}
          <h1 className="text-base font-bold">{title}</h1>
        </div>
      </div>
      <div className="p-4 pb-24 space-y-4">{children}</div>
    </div>
  );
}

function StepCard({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/30 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <span className="text-sm font-semibold text-foreground">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function AIResponseInput({ value, onChange, onPreview, error, preview, onApply, onCancelPreview }: {
  value: string;
  onChange: (v: string) => void;
  onPreview: () => void;
  error: string | null;
  preview: ParsedUpdate | null;
  onApply: () => void;
  onCancelPreview: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground leading-relaxed">
        Paste the <strong className="text-foreground">entire AI response</strong> below — the app will automatically
        extract the JSON even if there's analysis text around it.
      </p>
      <Textarea
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={"Paste the full AI response here.\n\nThe app handles:\n• Pure JSON\n• JSON inside code blocks (```json ... ```)\n• JSON mixed with analysis text\n• Common AI formatting quirks"}
        className="font-mono text-[11px] h-40 bg-muted/30 resize-none"
        data-testid="input-import-json"
      />
      {error && <ErrorBanner message={error} />}
      {!preview && (
        <Button
          onClick={onPreview}
          variant="secondary"
          className="w-full gap-2"
          disabled={!value.trim()}
          data-testid="button-preview-changes"
        >
          <Upload size={15} />
          Preview Changes
        </Button>
      )}
      {preview && (
        <PreviewBlock preview={preview} onApply={onApply} onCancel={onCancelPreview} />
      )}
    </div>
  );
}

function PreviewBlock({ preview, onApply, onCancel }: {
  preview: ParsedUpdate;
  onApply: () => void;
  onCancel: () => void;
}) {
  const evtAdd    = preview.events?.add    ?? [];
  const evtUpdate = preview.events?.update ?? [];
  const evtDelete = preview.events?.delete ?? [];
  const tskAdd    = preview.tasks?.add     ?? [];
  const tskUpdate = preview.tasks?.update  ?? [];
  const tskDelete = preview.tasks?.delete  ?? [];
  const total = evtAdd.length + evtUpdate.length + evtDelete.length +
                tskAdd.length + tskUpdate.length + tskDelete.length;

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-2">
          <CheckCircle2 size={14} className="text-green-500" />
          <span className="text-xs font-semibold">Preview — {total} change{total !== 1 ? 's' : ''}</span>
        </div>
        <div className="p-3 space-y-2 max-h-64 overflow-y-auto">
          {evtAdd.map((e, i) => (
            <PreviewRow key={i} op="add" label={`${e.date} — ${e.title}`} category={e.category} />
          ))}
          {evtUpdate.map((e, i) => (
            <PreviewRow key={i} op="update" label={`Update event: ${e.id?.slice(0, 12)}…`} />
          ))}
          {evtDelete.map((id, i) => (
            <PreviewRow key={i} op="delete" label={`Delete event: ${id.slice(0, 16)}…`} />
          ))}
          {tskAdd.map((t, i) => (
            <PreviewRow key={i} op="add" label={`Task: ${t.name}`} category={t.category} isTask />
          ))}
          {tskUpdate.map((t, i) => (
            <PreviewRow key={i} op="update" label={`Update task: ${t.id?.slice(0, 12)}…`} isTask />
          ))}
          {tskDelete.map((id, i) => (
            <PreviewRow key={i} op="delete" label={`Delete task: ${id.slice(0, 16)}…`} isTask />
          ))}
          {total === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No changes detected.</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onCancel} variant="outline" className="flex-1 gap-1" size="sm">
          Cancel
        </Button>
        <Button
          onClick={onApply}
          className="flex-1 gap-1 bg-green-600 hover:bg-green-700 text-white"
          size="sm"
          disabled={total === 0}
          data-testid="button-apply-changes"
        >
          <CheckCircle2 size={13} />
          Apply {total} Change{total !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}

function PreviewRow({ op, label, category, isTask }: {
  op: 'add' | 'update' | 'delete';
  label: string;
  category?: string;
  isTask?: boolean;
}) {
  const config = {
    add:    { icon: <Plus size={10} />,    bg: 'bg-green-500/10',  text: 'text-green-600 dark:text-green-400',  border: 'border-green-500/20' },
    update: { icon: <PenLine size={10} />, bg: 'bg-amber-500/10',  text: 'text-amber-600 dark:text-amber-400',  border: 'border-amber-500/20' },
    delete: { icon: <Trash2 size={10} />,  bg: 'bg-red-500/10',    text: 'text-red-600 dark:text-red-400',      border: 'border-red-500/20' },
  }[op];

  return (
    <div className={`flex items-start gap-2 px-2 py-1.5 rounded-lg border ${config.bg} ${config.border}`}>
      <span className={`shrink-0 mt-0.5 ${config.text}`}>{config.icon}</span>
      {category && <CategoryDot category={category} />}
      {isTask && !category && <span className="text-[9px] font-bold text-muted-foreground bg-muted rounded px-1 shrink-0">TASK</span>}
      <span className="text-[11px] text-foreground font-medium leading-tight truncate">{label}</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
      <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
      <p className="text-xs text-destructive leading-relaxed whitespace-pre-wrap">{message}</p>
    </div>
  );
}
