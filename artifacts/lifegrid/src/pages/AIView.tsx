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
  Copy, Check, Upload, AlertCircle, CheckCircle2,
  ArrowRight, Plus, PenLine, Trash2,
  ExternalLink, ChevronRight, RotateCcw,
} from 'lucide-react';

const CATEGORY_COLOR: Record<string, string> = {
  work: '#2563eb', personal: '#7c3aed', health: '#059669',
  travel: '#d97706', family: '#dc2626', other: '#6b7280',
};

type Mode = 'choose' | 'optimize' | 'import' | 'onboard';

// ─── External AI links shown after copying the prompt ────────────────────────
const AI_LINKS = [
  { name: 'ChatGPT',  url: 'https://chat.openai.com',  color: '#10a37f' },
  { name: 'Claude',   url: 'https://claude.ai',         color: '#d97706' },
  { name: 'Gemini',   url: 'https://gemini.google.com', color: '#4285f4' },
];

export const AIView = () => {
  const appData = useAppData();
  const hasData = appData.events.length > 0 || appData.tasks.length > 0;

  const [mode, setMode]           = useState<Mode>('choose');
  const [rawInput, setRawInput]   = useState('');
  const [prompt, setPrompt]       = useState('');
  const [copied, setCopied]       = useState(false);
  const [importJson, setImportJson] = useState('');
  const [preview, setPreview]     = useState<ParsedUpdate | null>(null);
  const [error, setError]         = useState<string | null>(null);

  // ── Build & copy prompt ─────────────────────────────────────────────────────
  const buildPrompt = () => {
    if (mode === 'optimize') return generatePlanningPrompt(appData);
    if (mode === 'import')   return generateImportPrompt(rawInput, appData);
    if (mode === 'onboard')  return generateOnboardingPrompt();
    return '';
  };

  const handleCopyPrompt = async () => {
    const p = buildPrompt();
    if (mode === 'import' && !rawInput.trim()) {
      toast.error('Paste your schedule data first', { description: 'Add it in Step 1 before generating the prompt.' });
      return;
    }
    setPrompt(p);
    try {
      await navigator.clipboard.writeText(p);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success('Prompt copied to clipboard', { description: 'Paste it into ChatGPT, Claude, or Gemini.' });
    } catch {
      toast.error('Clipboard blocked', { description: 'Use the text box below to copy manually.' });
    }
  };

  // ── Parse & preview ─────────────────────────────────────────────────────────
  const handlePreview = () => {
    setError(null);
    setPreview(null);
    try {
      if (!importJson.trim()) throw new Error('Paste the AI response first.');
      setPreview(parseAIUpdate(importJson));
    } catch (e: any) {
      setError(e.message ?? 'Could not parse the response.');
    }
  };

  // ── Apply ───────────────────────────────────────────────────────────────────
  const handleApply = () => {
    if (!preview) return;
    try {
      appData.applyImportUpdate(preview);
      const add = (preview.events?.add.length ?? 0) + (preview.tasks?.add.length ?? 0);
      const upd = (preview.events?.update.length ?? 0) + (preview.tasks?.update.length ?? 0);
      const del = (preview.events?.delete.length ?? 0) + (preview.tasks?.delete.length ?? 0);
      toast.success('Schedule updated!', {
        description: [add && `+${add} added`, upd && `~${upd} updated`, del && `−${del} removed`].filter(Boolean).join('  '),
      });
      setImportJson(''); setPreview(null); setRawInput(''); setPrompt(''); setMode('choose');
    } catch { setError('Failed to apply — please try again.'); }
  };

  const reset = () => { setMode('choose'); setRawInput(''); setPrompt(''); setImportJson(''); setPreview(null); setError(null); setCopied(false); };

  // ─────────────────────────────────────────────────────────────────────────────
  //  MODE: CHOOSE
  // ─────────────────────────────────────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="flex flex-col h-full bg-background overflow-y-auto">
        <Header title="AI Planner" subtitle="Works with any AI — ChatGPT, Claude, Gemini, and more" />

        <div className="p-4 space-y-3 pb-24">

          {/* How it works — 3-step summary */}
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-foreground">How it works</p>
            </div>
            <div className="flex items-start p-3 gap-0">
              {[
                { n: '1', label: 'Copy the prompt from this app' },
                { n: '2', label: 'Paste into any AI + add your schedule' },
                { n: '3', label: 'Paste the AI response back here' },
              ].map((step, i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center text-center flex-1 px-1">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mb-1.5">{step.n}</div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{step.label}</p>
                  </div>
                  {i < 2 && <ArrowRight size={12} className="text-muted-foreground/40 mt-3 shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Choose a task</p>

          {hasData && (
            <ModeCard
              emoji="🔍"
              title="Analyze my schedule"
              description="Export your current events and tasks. The AI will spot conflicts, overloaded days, and missing prep work."
              tag="Has existing data"
              tagColor="text-primary bg-primary/10"
              onClick={() => setMode('optimize')}
            />
          )}

          <ModeCard
            emoji="📥"
            title="Import a calendar"
            description="Paste your schedule in any format — iCal, plain text, CSV, Google/Outlook export, or just describe your week. The AI converts it."
            tag="Any format accepted"
            tagColor="text-amber-600 dark:text-amber-400 bg-amber-500/10"
            onClick={() => setMode('import')}
          />

          {!hasData && (
            <ModeCard
              emoji="✨"
              title="Build a starter schedule"
              description="Starting fresh? Get a realistic example schedule to kickstart your planner."
              tag="New to LifeGrid"
              tagColor="text-violet-600 dark:text-violet-400 bg-violet-500/10"
              onClick={() => setMode('onboard')}
            />
          )}

          {/* Quick paste shortcut */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Already have AI output?</p>
            <div className="bg-card border border-border rounded-xl p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Skip the flow — paste JSON directly:</p>
              <Textarea
                value={importJson}
                onChange={e => { setImportJson(e.target.value); setError(null); setPreview(null); }}
                placeholder={'Paste AI JSON response here...\n\n{"events":{"add":[...],"update":[],"delete":[]},"tasks":{...}}'}
                className="font-mono text-[11px] h-28 bg-muted/20 resize-none"
                data-testid="input-direct-paste"
              />
              {error && <ErrorBanner message={error} />}
              {importJson.trim() && !preview && (
                <Button onClick={handlePreview} size="sm" variant="secondary" className="w-full gap-2">
                  <Upload size={13} /> Preview Changes
                </Button>
              )}
              {preview && (
                <DiffPreview preview={preview} onApply={handleApply} onCancel={() => { setPreview(null); setImportJson(''); }} />
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  //  SHARED FLOW (optimize / import / onboard all follow the same 3-step layout)
  // ─────────────────────────────────────────────────────────────────────────────
  const modeConfig = {
    optimize: { title: 'Analyze my schedule',   emoji: '🔍', promptLabel: 'Generate planning prompt' },
    import:   { title: 'Import a calendar',      emoji: '📥', promptLabel: 'Generate import prompt' },
    onboard:  { title: 'Build starter schedule', emoji: '✨', promptLabel: 'Generate starter prompt' },
  }[mode as 'optimize' | 'import' | 'onboard'];

  const promptReady = mode === 'import' ? rawInput.trim().length > 0 : true;

  return (
    <div className="flex flex-col h-full bg-background overflow-y-auto">
      <div className="flex-none px-4 py-3 border-b border-border bg-card sticky top-0 z-10 flex items-center gap-3">
        <button onClick={reset} className="p-1.5 rounded-lg hover:bg-muted transition-colors" data-testid="button-back">
          <RotateCcw size={14} className="text-muted-foreground" />
        </button>
        <span className="text-base">{modeConfig.emoji}</span>
        <h1 className="text-base font-bold flex-1">{modeConfig.title}</h1>
      </div>

      <div className="p-4 pb-24 space-y-4">

        {/* ── STEP 1: raw input (import mode only) ── */}
        {mode === 'import' && (
          <StepBlock number={1} title="Paste your raw schedule data">
            <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
              Paste anything — iCal/ICS, plain English, Google Calendar CSV, Outlook export, or just type out your schedule. The AI will parse it.
            </p>
            <FormatHints />
            <Textarea
              value={rawInput}
              onChange={e => setRawInput(e.target.value)}
              placeholder={"Paste your schedule here in any format.\n\nExamples:\n  • BEGIN:VCALENDAR ... (ICS file)\n  • \"Mon Jun 9: 9am dentist, 2pm team meeting\"\n  • Subject,Start Date,Start Time ... (Google CSV)\n  • Just describe your week in plain sentences"}
              className="font-mono text-[11px] h-44 bg-muted/20 resize-none mt-2"
              data-testid="input-raw-schedule"
            />
          </StepBlock>
        )}

        {/* ── STEP 1 (non-import) or STEP 2 (import): generate prompt ── */}
        <StepBlock
          number={mode === 'import' ? 2 : 1}
          title="Copy the prompt — paste it into your AI"
        >
          {mode === 'optimize' && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              This generates a structured text prompt containing your entire schedule ({appData.events.length} events, {appData.tasks.length} tasks). Copy it and paste it into ChatGPT, Claude, or any AI of your choice.
            </p>
          )}
          {mode === 'import' && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              This wraps your pasted data in a prompt that instructs the AI exactly how to reformat it. Copy and paste it into your AI.
            </p>
          )}
          {mode === 'onboard' && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              This asks the AI to generate a realistic starter schedule. Copy and paste it into any AI assistant.
            </p>
          )}

          <Button
            onClick={handleCopyPrompt}
            disabled={!promptReady}
            className="w-full gap-2 h-11"
            data-testid="button-copy-prompt"
          >
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : modeConfig.promptLabel}
          </Button>

          {/* Open in AI links */}
          {prompt && (
            <div className="mt-3 space-y-2">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">Open an AI assistant ↗</p>
              <div className="flex gap-2">
                {AI_LINKS.map(ai => (
                  <a
                    key={ai.name}
                    href={ai.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-muted transition-colors"
                    data-testid={`link-ai-${ai.name.toLowerCase()}`}
                  >
                    <ExternalLink size={10} style={{ color: ai.color }} />
                    {ai.name}
                  </a>
                ))}
              </div>
              <p className="text-[10px] text-muted-foreground leading-relaxed">
                Paste the copied prompt, let the AI respond, then come back and paste the response in Step {mode === 'import' ? 3 : 2} below.
              </p>

              {/* Prompt preview — collapsible */}
              <details className="group">
                <summary className="text-[10px] font-semibold text-primary cursor-pointer list-none flex items-center gap-1">
                  <ChevronRight size={10} className="group-open:rotate-90 transition-transform" />
                  Preview prompt text
                </summary>
                <div className="mt-2 relative">
                  <pre className="text-[9px] font-mono bg-muted/30 rounded-lg p-3 max-h-52 overflow-y-auto whitespace-pre-wrap text-muted-foreground leading-relaxed">{prompt}</pre>
                  <button
                    onClick={() => { navigator.clipboard.writeText(prompt); toast.success('Copied again!'); }}
                    className="absolute top-2 right-2 p-1 rounded bg-muted text-muted-foreground hover:bg-border transition-colors"
                    title="Copy again"
                  >
                    <Copy size={10} />
                  </button>
                </div>
              </details>
            </div>
          )}
        </StepBlock>

        {/* ── STEP 2 (non-import) or STEP 3 (import): paste AI response ── */}
        {prompt && (
          <StepBlock
            number={mode === 'import' ? 3 : 2}
            title="Paste the AI response here"
          >
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Copy the <strong className="text-foreground">entire response</strong> from the AI and paste it below. The app automatically extracts the JSON — even if it's surrounded by explanation text or wrapped in code blocks.
            </p>
            <Textarea
              value={importJson}
              onChange={e => { setImportJson(e.target.value); setError(null); setPreview(null); }}
              placeholder={"Paste the full AI response here.\n\nThe app handles:\n  • Pure JSON output\n  • JSON wrapped in ```code blocks```\n  • JSON mixed with analysis text\n  • Common AI formatting quirks (trailing commas, etc.)"}
              className="font-mono text-[11px] h-44 bg-muted/20 resize-none"
              data-testid="input-ai-response"
            />
            {error && <ErrorBanner message={error} />}
            {importJson.trim() && !preview && (
              <Button onClick={handlePreview} variant="secondary" className="w-full gap-2 mt-2" data-testid="button-preview">
                <Upload size={14} /> Preview Changes
              </Button>
            )}
            {preview && (
              <div className="mt-2">
                <DiffPreview
                  preview={preview}
                  onApply={handleApply}
                  onCancel={() => { setPreview(null); setImportJson(''); setError(null); }}
                />
              </div>
            )}
          </StepBlock>
        )}
      </div>
    </div>
  );
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex-none px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
      <h1 className="text-lg font-bold">{title}</h1>
      <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
    </div>
  );
}

function ModeCard({ emoji, title, description, tag, tagColor, onClick }: {
  emoji: string; title: string; description: string;
  tag: string; tagColor: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-card border border-border rounded-xl p-4 flex gap-3 hover:border-primary/40 hover:bg-primary/5 transition-colors active:scale-[0.99]"
    >
      <span className="text-xl shrink-0">{emoji}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap mb-1">
          <span className="font-semibold text-sm">{title}</span>
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${tagColor}`}>{tag}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
      </div>
      <ChevronRight size={15} className="text-muted-foreground shrink-0 mt-1" />
    </button>
  );
}

function StepBlock({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card border border-border rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
        <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center shrink-0">
          {number}
        </span>
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function FormatHints() {
  return (
    <div className="flex flex-wrap gap-1.5">
      {['iCal / ICS', 'Plain text', 'Google CSV', 'Outlook export', 'Free-form description'].map(f => (
        <span key={f} className="text-[9px] bg-muted text-muted-foreground px-1.5 py-0.5 rounded font-medium">{f}</span>
      ))}
    </div>
  );
}

function DiffPreview({ preview, onApply, onCancel }: {
  preview: ParsedUpdate; onApply: () => void; onCancel: () => void;
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
        <div className="px-3 py-2 bg-muted/20 border-b border-border flex items-center gap-2">
          <CheckCircle2 size={13} className="text-green-500" />
          <span className="text-xs font-semibold">{total} change{total !== 1 ? 's' : ''} ready to apply</span>
        </div>
        <div className="p-3 space-y-1 max-h-60 overflow-y-auto">
          {evtAdd.map((e, i)    => <DiffRow key={`ea${i}`} op="add"    label={`${e.date} — ${e.title}`} cat={e.category} />)}
          {evtUpdate.map((e, i) => <DiffRow key={`eu${i}`} op="update" label={`Update: ${(e as any).title ?? e.id}`} />)}
          {evtDelete.map((id,i) => <DiffRow key={`ed${i}`} op="delete" label={`Remove event: ${String(id).slice(0,20)}`} />)}
          {tskAdd.map((t, i)    => <DiffRow key={`ta${i}`} op="add"    label={`Task: ${t.name}`} cat={t.category} isTask />)}
          {tskUpdate.map((t, i) => <DiffRow key={`tu${i}`} op="update" label={`Update task: ${(t as any).name ?? t.id}`} isTask />)}
          {tskDelete.map((id,i) => <DiffRow key={`td${i}`} op="delete" label={`Remove task: ${String(id).slice(0,20)}`} isTask />)}
          {total === 0 && <p className="text-xs text-center text-muted-foreground py-2">No changes found in the response.</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <Button onClick={onCancel} variant="outline" size="sm" className="flex-1">Cancel</Button>
        <Button
          onClick={onApply}
          size="sm"
          disabled={total === 0}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1"
          data-testid="button-apply"
        >
          <CheckCircle2 size={13} />
          Apply {total > 0 ? `${total} ` : ''}Change{total !== 1 ? 's' : ''}
        </Button>
      </div>
    </div>
  );
}

function DiffRow({ op, label, cat, isTask }: {
  op: 'add' | 'update' | 'delete'; label: string; cat?: string; isTask?: boolean;
}) {
  const styles = {
    add:    { icon: <Plus size={9} />,    wrap: 'bg-green-500/8 border-green-500/20 dark:bg-green-500/10', icon_: 'text-green-600 dark:text-green-400' },
    update: { icon: <PenLine size={9} />, wrap: 'bg-amber-500/8 border-amber-500/20 dark:bg-amber-500/10', icon_: 'text-amber-600 dark:text-amber-400' },
    delete: { icon: <Trash2 size={9} />,  wrap: 'bg-red-500/8 border-red-500/20 dark:bg-red-500/10',     icon_: 'text-red-600 dark:text-red-400' },
  }[op];
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded border text-[11px] ${styles.wrap}`}>
      <span className={styles.icon_}>{styles.icon}</span>
      {cat && <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: CATEGORY_COLOR[cat] ?? '#6b7280' }} />}
      {isTask && !cat && <span className="text-[8px] font-bold bg-muted text-muted-foreground px-1 rounded shrink-0">TASK</span>}
      <span className="truncate font-medium text-foreground">{label}</span>
    </div>
  );
}

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 mt-2">
      <AlertCircle size={14} className="text-destructive shrink-0 mt-0.5" />
      <p className="text-xs text-destructive leading-relaxed whitespace-pre-wrap">{message}</p>
    </div>
  );
}
