import React, { useState, useEffect } from 'react';
import { useAppData } from '../context/AppDataContext';
import {
  generatePlanningPrompt,
  generateImportPrompt,
  generateImagePrompt,
  generateOnboardingPrompt,
  parseAIUpdate,
  ParsedUpdate,
  PromptType,
  PROMPT_TYPES,
  CATEGORY_COLOR,
  estimateTokens,
  COMPACT_THRESHOLD_TOKENS,
} from '../lib/aiPrompt';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { toISODate } from '../lib/format';
import {
  Copy, Check, Upload, AlertCircle, CheckCircle2,
  ArrowRight, Plus, PenLine, Trash2,
  ExternalLink, ChevronRight, RotateCcw, Download, FileUp,
} from 'lucide-react';

type Mode = 'choose' | 'optimize' | 'import' | 'onboard';
type ImportSource = 'text' | 'image';
type DateRangePreset = 'next14' | 'next30' | 'next90' | 'full' | 'custom';

// Persist the in-progress AI exchange so switching to ChatGPT/Claude and back
// (which reloads the Safari tab on iPhone) does not wipe the prompt or the
// response the user is mid-way through pasting.
const DRAFT_KEY = 'lifegrid_ai_draft_v1';
const DRAFT_TTL_MS = 72 * 60 * 60 * 1000; // forget half-finished exchanges after 3 days
interface Draft {
  mode: Mode; rawInput: string; prompt: string; importJson: string;
  promptType: PromptType; useRange: boolean; rangeStart: string; rangeEnd: string;
  rangePreset: DateRangePreset; includeTasks: boolean; includePeople: boolean; includeCompletedTasks: boolean; includeProjectsTags: boolean;
  importSource: ImportSource; savedAt: number;
}
const loadDraft = (): Partial<Draft> => {
  try {
    const d = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? '{}');
    if (!d.savedAt || Date.now() - d.savedAt > DRAFT_TTL_MS) {
      localStorage.removeItem(DRAFT_KEY);
      return {};
    }
    return d;
  } catch { return {}; }
};

const AI_LINKS = [
  { name: 'ChatGPT', url: 'https://chat.openai.com', color: '#10a37f' },
  { name: 'Claude', url: 'https://claude.ai', color: '#d97706' },
  { name: 'Gemini', url: 'https://gemini.google.com', color: '#4285f4' },
];

const addDays = (d: Date, n: number) => { const c = new Date(d); c.setDate(c.getDate() + n); return c; };

export const AIView = () => {
  const appData = useAppData();
  const hasData = appData.events.length > 0 || appData.tasks.length > 0;

  const draft = React.useRef(loadDraft()).current;

  const [mode, setMode] = useState<Mode>(draft.mode ?? 'choose');
  const [rawInput, setRawInput] = useState(draft.rawInput ?? '');
  const [prompt, setPrompt] = useState(draft.prompt ?? '');
  const [copied, setCopied] = useState(false);
  const [importJson, setImportJson] = useState(draft.importJson ?? '');
  const [preview, setPreview] = useState<ParsedUpdate | null>(null);
  const [error, setError] = useState<string | null>(null);

  // LifeGrid Admin prompt options
  const [promptType, setPromptType] = useState<PromptType>(draft.promptType ?? 'compact');
  const [rangePreset, setRangePreset] = useState<DateRangePreset>(draft.rangePreset ?? 'next30');
  const [useRange, setUseRange] = useState(draft.useRange ?? true);
  const [rangeStart, setRangeStart] = useState(draft.rangeStart ?? toISODate(new Date()));
  const [rangeEnd, setRangeEnd] = useState(draft.rangeEnd ?? toISODate(addDays(new Date(), 30)));
  const [includeTasks, setIncludeTasks] = useState(draft.includeTasks ?? true);
  const [includePeople, setIncludePeople] = useState(draft.includePeople ?? true);
  const [includeCompletedTasks, setIncludeCompletedTasks] = useState(draft.includeCompletedTasks ?? false);
  const [includeProjectsTags, setIncludeProjectsTags] = useState(draft.includeProjectsTags ?? true);

  // Import: text paste vs. photo/screenshot upload to the AI
  const [importSource, setImportSource] = useState<ImportSource>(draft.importSource ?? 'text');

  // Apply-to-new-version toggle
  const [applyAsVersion, setApplyAsVersion] = useState(false);
  const [versionName, setVersionName] = useState('');

  // Prompt size estimate
  const [promptTokens, setPromptTokens] = useState<number | null>(null);

  // Keep the draft in sync so an app-switch on mobile never loses progress.
  // Only persist once there's real work in flight — keeps storage clean and
  // makes "clear draft" semantics exact.
  useEffect(() => {
    const hasWork = mode !== 'choose' || rawInput.trim() || prompt || importJson.trim();
    try {
      if (!hasWork) { localStorage.removeItem(DRAFT_KEY); return; }
      const d: Draft = { mode, rawInput, prompt, importJson, promptType, useRange, rangeStart, rangeEnd, rangePreset, includeTasks, includePeople, includeCompletedTasks, includeProjectsTags, importSource, savedAt: Date.now() };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
    } catch { /* quota */ }
  }, [mode, rawInput, prompt, importJson, promptType, useRange, rangeStart, rangeEnd, rangePreset, includeTasks, includePeople, includeCompletedTasks, includeProjectsTags, importSource]);

  const buildPrompt = () => {
    if (mode === 'optimize')
      return generatePlanningPrompt(appData, {
        promptType,
        focusStart: useRange ? rangeStart : null,
        focusEnd: useRange ? rangeEnd : null,
        includeTasks,
        includePeople,
        includeCompletedTasks,
        includeProjectsTags,
      });
    if (mode === 'import')
      return importSource === 'image' ? generateImagePrompt(appData) : generateImportPrompt(rawInput, appData);
    if (mode === 'onboard') return generateOnboardingPrompt(appData);
    return '';
  };

  const handleCopyPrompt = async () => {
    if (mode === 'import' && importSource === 'text' && !rawInput.trim()) {
      toast.error('Paste your schedule data first', { description: 'Add it in Step 1 before generating the prompt.' });
      return;
    }
    const p = buildPrompt();
    if (useRange && mode === 'optimize' && rangeStart > rangeEnd) {
      toast.error('Invalid date range', { description: 'The start date must be on or before the end date.' });
      return;
    }
    setPrompt(p);
    setPromptTokens(estimateTokens(p));
    try {
      await navigator.clipboard.writeText(p);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
      toast.success('Prompt copied to clipboard', { description: 'Paste it into ChatGPT, Claude, or Gemini.' });
    } catch {
      toast.error('Clipboard blocked', { description: 'Use the download or text box below instead.' });
    }
  };

  const handleDownloadPrompt = () => {
    const p = prompt || buildPrompt();
    if (!p) { toast.error('Generate the prompt first'); return; }
    const blob = new Blob([p], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lifegrid-prompt-${mode}-${toISODate(new Date())}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Prompt downloaded', { description: 'Upload the .txt to your AI, or open and copy it.' });
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      setImportJson(text);
      setError(null);
      setPreview(null);
      setPreview(parseAIUpdate(text, appData.categories, appData));
      toast.success('File loaded', { description: `${file.name} parsed — review the changes below.` });
    } catch (err: any) {
      setError(err.message ?? 'Could not read that file.');
    } finally {
      e.target.value = '';
    }
  };

  const handlePreview = () => {
    setError(null);
    setPreview(null);
    try {
      if (!importJson.trim()) throw new Error('Paste the AI response first.');
      setPreview(parseAIUpdate(importJson, appData.categories, appData));
    } catch (e: any) {
      setError(e.message ?? 'Could not parse the response.');
    }
  };

  const handleApply = () => {
    if (!preview) return;
    if (applyAsVersion && !versionName.trim()) {
      toast.error('Name the new version', { description: 'Enter a name to save these changes as a separate calendar version.' });
      return;
    }
    try {
      appData.applyImportUpdate(preview, applyAsVersion ? { newVersionName: versionName.trim() } : undefined);
      const add = (preview.projects?.add.length ?? 0) + (preview.events?.add.length ?? 0) + (preview.tasks?.add.length ?? 0);
      const upd = (preview.projects?.update.length ?? 0) + (preview.events?.update.length ?? 0) + (preview.tasks?.update.length ?? 0);
      const del = (preview.projects?.delete.length ?? 0) + (preview.events?.delete.length ?? 0) + (preview.tasks?.delete.length ?? 0);
      toast.success(applyAsVersion ? `New version "${versionName.trim()}" created!` : 'Schedule updated!', {
        description: [add && `+${add} added`, upd && `~${upd} updated`, del && `−${del} removed`].filter(Boolean).join('  '),
      });
      reset();
    } catch { setError('Failed to apply — please try again.'); }
  };

  const reset = () => {
    setMode('choose'); setRawInput(''); setPrompt(''); setImportJson('');
    setPreview(null); setError(null); setCopied(false);
    setApplyAsVersion(false); setVersionName(''); setImportSource('text');
    setPromptType('compact'); setRangePreset('next30'); setUseRange(true); setRangeStart(toISODate(new Date())); setRangeEnd(toISODate(addDays(new Date(), 30)));
    setIncludeTasks(true); setIncludePeople(true); setIncludeCompletedTasks(false); setIncludeProjectsTags(true);
    try { localStorage.removeItem(DRAFT_KEY); } catch { /* */ }
  };

  const applyDatePreset = (preset: DateRangePreset) => {
    const start = toISODate(new Date());
    const setWindow = (days: number) => {
      setUseRange(true);
      setRangeStart(start);
      setRangeEnd(toISODate(addDays(new Date(), days)));
    };
    setRangePreset(preset);
    setPrompt('');
    setCopied(false);
    setPromptTokens(null);
    if (preset === 'next14') setWindow(14);
    if (preset === 'next30') setWindow(30);
    if (preset === 'next90') setWindow(90);
    if (preset === 'full') setUseRange(false);
    if (preset === 'custom') setUseRange(true);
  };

  // ── Reusable apply-as-version control + diff ──
  const renderPreviewBlock = () =>
    preview && (
      <div className="mt-2 space-y-2">
        <VersionToggle
          on={applyAsVersion} setOn={setApplyAsVersion}
          name={versionName} setName={setVersionName}
        />
        <DiffPreview
          preview={preview}
          applyLabel={applyAsVersion ? 'Create Version' : undefined}
          onApply={handleApply}
          onCancel={() => { setPreview(null); setImportJson(''); setError(null); }}
        />
      </div>
    );

  // ─── MODE: CHOOSE ───────────────────────────────────────────────────────────
  if (mode === 'choose') {
    return (
      <div className="flex flex-col h-full bg-background overflow-y-auto">
        <Header title="AI Planner" subtitle="Works with any AI — ChatGPT, Claude, Gemini, and more" />

        <div className="p-4 space-y-3 pb-24">
          <div className="bg-card border border-border rounded-xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-foreground">How it works</p>
            </div>
            <div className="flex items-start p-3 gap-0">
              {[
                { n: '1', label: 'Select LifeGrid context to share' },
                { n: '2', label: 'Copy the prompt to your preferred AI/LLM' },
                { n: '3', label: 'Ask it to analyze, plan, draft, or propose changes' },
                { n: '4', label: 'Ask for raw JSON and paste it back' },
              ].map((step, i) => (
                <React.Fragment key={i}>
                  <div className="flex flex-col items-center text-center flex-1 px-1">
                    <div className="w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center mb-1.5">{step.n}</div>
                    <p className="text-[10px] text-muted-foreground leading-tight">{step.label}</p>
                  </div>
                  {i < 3 && <ArrowRight size={12} className="text-muted-foreground/40 mt-3 shrink-0" />}
                </React.Fragment>
              ))}
            </div>
          </div>

          <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider pt-1">Choose a task</p>

          {hasData && (
            <ModeCard
              emoji="🧭"
              title="Copy LifeGrid Admin Prompt"
              description="Share selected LifeGrid context so your preferred AI can analyze, coordinate, prioritize, draft messages, or prepare JSON changes."
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

          <ModeCard
            emoji="✨"
            title="Build a starter schedule"
            description={hasData ? "Generate a sample schedule as a new calendar version to explore or reset your planner." : "Starting fresh? Get a realistic example schedule to kickstart your planner."}
            tag={hasData ? "Creates new version" : "New to LifeGrid"}
            tagColor={hasData ? "text-violet-600 dark:text-violet-400 bg-violet-500/10" : "text-violet-600 dark:text-violet-400 bg-violet-500/10"}
            onClick={() => setMode('onboard')}
          />

          {/* Quick paste / upload shortcut */}
          <div className="pt-2">
            <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Already have AI output?</p>
            <div className="bg-card border border-border rounded-xl p-3 space-y-2">
              <p className="text-xs text-muted-foreground">Skip the flow — paste JSON or upload a file:</p>
              <Textarea
                value={importJson}
                onChange={e => { setImportJson(e.target.value); setError(null); setPreview(null); }}
                placeholder={'Paste AI JSON response here...\n\n{"events":{"add":[...],"update":[],"delete":[]},"tasks":{...}}'}
                className="font-mono text-[11px] h-28 bg-muted/20 resize-none"
                data-testid="input-direct-paste"
              />
              <div className="flex gap-2">
                <label className="flex-1">
                  <input type="file" accept=".txt,.json,application/json,text/plain" className="hidden" onChange={handleFileUpload} data-testid="input-file-upload" />
                  <span className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer">
                    <FileUp size={13} /> Upload file
                  </span>
                </label>
                {importJson.trim() && !preview && (
                  <Button onClick={handlePreview} size="sm" variant="secondary" className="flex-1 gap-2">
                    <Upload size={13} /> Preview
                  </Button>
                )}
              </div>
              {error && <ErrorBanner message={error} />}
              {renderPreviewBlock()}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── SHARED FLOW ────────────────────────────────────────────────────────────
  const modeConfig = {
    optimize: { title: 'Copy LifeGrid Admin Prompt', emoji: '🧭', promptLabel: 'Copy LifeGrid Admin Prompt' },
    import: { title: 'Import a calendar', emoji: '📥', promptLabel: 'Generate import prompt' },
    onboard: { title: 'Build starter schedule', emoji: '✨', promptLabel: 'Generate starter prompt' },
  }[mode as 'optimize' | 'import' | 'onboard'];

  const promptReady = mode === 'import' && importSource === 'text' ? rawInput.trim().length > 0 : true;
  const responseStep = mode === 'onboard' ? 2 : 3;

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

        {/* ── ADMIN PROMPT: range, inclusions, then tucked-away focused modes ── */}
        {mode === 'optimize' && (
          <StepBlock number={1} title="Choose date range and context">
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Choose what LifeGrid context to include, copy the prompt into any AI, then ask it to plan, analyze, prioritize, coordinate, or draft messages. When ready, ask the AI: <strong className="text-foreground">Output the final LifeGrid raw JSON patch only.</strong>
            </p>

            <Label className="text-xs font-semibold">Date range</Label>
            <div className="grid grid-cols-2 gap-2 mt-2">
              {[
                ['next14', 'Next 14 days'],
                ['next30', 'Next 30 days'],
                ['next90', 'Next 90 days'],
                ['full', 'Full selected calendar'],
                ['custom', 'Custom range'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  onClick={() => applyDatePreset(id as DateRangePreset)}
                  className={`text-left p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                    rangePreset === id ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'
                  }`}
                  data-testid={`range-${id}`}
                >
                  {label}
                </button>
              ))}
            </div>

            {useRange && (
              <div className="grid grid-cols-2 gap-2 mt-2 animate-in fade-in">
                <div>
                  <Label className="text-[10px] text-muted-foreground">From</Label>
                  <Input type="date" value={rangeStart} onChange={e => { setRangePreset('custom'); setRangeStart(e.target.value); setPrompt(''); }} className="h-9 text-xs" data-testid="input-range-start" />
                </div>
                <div>
                  <Label className="text-[10px] text-muted-foreground">To</Label>
                  <Input type="date" value={rangeEnd} onChange={e => { setRangePreset('custom'); setRangeEnd(e.target.value); setPrompt(''); }} className="h-9 text-xs" data-testid="input-range-end" />
                </div>
              </div>
            )}

            <div className="mt-4 pt-3 border-t border-border/50 space-y-3">
              <Label className="text-xs font-semibold">Include</Label>
              <ToggleRow label="Tasks" description="Incomplete tasks are included by default." checked={includeTasks} onChange={setIncludeTasks} />
              <ToggleRow label="People availability" description="Shared person schedules for the selected range." checked={includePeople} onChange={setIncludePeople} />
              <ToggleRow label="Completed tasks" description="Off by default to keep prompts smaller." checked={includeCompletedTasks} onChange={setIncludeCompletedTasks} disabled={!includeTasks} />
              <ToggleRow label="Projects / tags" description="Include tag/category list, saved order, and project structure." checked={includeProjectsTags} onChange={setIncludeProjectsTags} />
            </div>

            <details className="group mt-4 pt-3 border-t border-border/50">
              <summary className="text-xs font-semibold text-primary cursor-pointer list-none flex items-center gap-1">
                <ChevronRight size={12} className="group-open:rotate-90 transition-transform" />
                Advanced options: focused prompt modes
              </summary>
              <div className="grid grid-cols-2 gap-2 mt-3">
                {PROMPT_TYPES.map(pt => {
                  const on = promptType === pt.id;
                  return (
                    <button
                      key={pt.id}
                      onClick={() => { setPromptType(pt.id); setPrompt(''); setCopied(false); setPromptTokens(null); }}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        on ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'
                      }`}
                      data-testid={`prompt-type-${pt.id}`}
                    >
                      <div className="flex items-center gap-1.5 mb-0.5 flex-wrap">
                        <span className="text-sm">{pt.emoji}</span>
                        <span className="text-xs font-semibold">{pt.title}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground leading-tight">{pt.description}</p>
                    </button>
                  );
                })}
              </div>
            </details>
          </StepBlock>
        )}

        {/* ── IMPORT: choose source, then raw input (text only) ── */}
        {mode === 'import' && (
          <StepBlock number={1} title="What are you importing from?">
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={() => { setImportSource('text'); setPrompt(''); setCopied(false); }}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  importSource === 'text' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'
                }`}
                data-testid="import-source-text"
              >
                <div className="flex items-center gap-1.5 mb-0.5"><span className="text-sm">📝</span><span className="text-xs font-semibold">Paste text / file</span></div>
                <p className="text-[10px] text-muted-foreground leading-tight">iCal, CSV, an export, or typed-out plans.</p>
              </button>
              <button
                onClick={() => { setImportSource('image'); setPrompt(''); setCopied(false); }}
                className={`text-left p-2.5 rounded-lg border transition-all ${
                  importSource === 'image' ? 'border-primary bg-primary/5 ring-1 ring-primary/30' : 'border-border hover:border-primary/40'
                }`}
                data-testid="import-source-image"
              >
                <div className="flex items-center gap-1.5 mb-0.5"><span className="text-sm">📷</span><span className="text-xs font-semibold">Photos / screenshots</span></div>
                <p className="text-[10px] text-muted-foreground leading-tight">Upload the images to the AI itself.</p>
              </button>
            </div>

            {importSource === 'text' ? (
              <>
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
              </>
            ) : (
              <div className="rounded-lg bg-primary/5 border border-primary/20 p-3 space-y-2">
                <p className="text-xs font-semibold text-foreground">How photo import works</p>
                <ol className="text-[11px] text-muted-foreground leading-relaxed space-y-1 list-decimal list-inside">
                  <li>Generate &amp; copy the prompt below.</li>
                  <li>Open ChatGPT, Claude, or Gemini and paste the prompt.</li>
                  <li><strong className="text-foreground">Attach your schedule photos/screenshots</strong> to that same AI chat and send.</li>
                  <li>Copy the AI's JSON reply and paste it back here in the last step.</li>
                </ol>
                <p className="text-[10px] text-muted-foreground">The images go straight to the AI — you don't upload them here.</p>
              </div>
            )}
          </StepBlock>
        )}

        {/* ── Generate prompt ── */}
        <StepBlock
          number={mode === 'optimize' ? 2 : mode === 'import' ? 2 : 1}
          title="Copy or download the prompt"
        >
          {mode === 'optimize' && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Copies one comprehensive LifeGrid Admin prompt with your selected date range and data controls. Large calendars can take external AI models longer to process.
            </p>
          )}
          {mode === 'import' && importSource === 'text' && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              This wraps your pasted data in a prompt that tells the AI exactly how to reformat it.
            </p>
          )}
          {mode === 'import' && importSource === 'image' && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Copy this prompt, paste it into an AI, then <strong className="text-foreground">attach your schedule photos</strong> to that chat. The AI reads the images and replies with JSON.
            </p>
          )}
          {mode === 'onboard' && (
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              This asks the AI to generate a realistic starter schedule.
            </p>
          )}

          <Button onClick={handleCopyPrompt} disabled={!promptReady} className="w-full gap-2 h-11" data-testid="button-copy-prompt">
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? 'Copied!' : modeConfig.promptLabel}
          </Button>

          {/* Prompt size estimate */}
          {promptTokens !== null && (
            <div className={`flex items-center gap-2 mt-1.5 px-1 ${promptTokens > COMPACT_THRESHOLD_TOKENS ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground'}`}>
              <span className="text-[10px]">
                ~{promptTokens.toLocaleString()} tokens · {Math.round(prompt.length / 1000)}k chars
              </span>
              {promptTokens > COMPACT_THRESHOLD_TOKENS && (
                <span className="text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded-full">
                  Large — narrow the range or turn off extra context
                </span>
              )}
            </div>
          )}

          {prompt && (
            <Button onClick={handleDownloadPrompt} variant="outline" className="w-full gap-2 mt-2 h-10" data-testid="button-download-prompt">
              <Download size={14} /> Download as .txt
            </Button>
          )}

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
                Paste the prompt, ask for planning/drafting help, and when ready ask: "Output the final LifeGrid raw JSON patch only." Paste/upload that response in Step {responseStep} below.
              </p>

              <details className="group">
                <summary className="text-[10px] font-semibold text-primary cursor-pointer list-none flex items-center gap-1">
                  <ChevronRight size={10} className="group-open:rotate-90 transition-transform" />
                  Preview prompt text ({prompt.length.toLocaleString()} chars)
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

        {/* ── Paste/upload AI response — ALWAYS visible so returning from the
             AI app (which reloads Safari) never leaves you with nowhere to paste ── */}
        <StepBlock number={responseStep} title="Paste or upload the AI response">
            <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
              Copy the <strong className="text-foreground">entire response</strong> from the AI and paste it below, or upload a saved file. The app extracts the JSON automatically.
            </p>
            <Textarea
              value={importJson}
              onChange={e => { setImportJson(e.target.value); setError(null); setPreview(null); }}
              placeholder={"Paste the full AI response here.\n\nThe app handles:\n  • Pure JSON output\n  • JSON wrapped in ```code blocks```\n  • JSON mixed with analysis text\n  • Common AI formatting quirks (trailing commas, etc.)"}
              className="font-mono text-[11px] h-44 bg-muted/20 resize-none"
              data-testid="input-ai-response"
            />
            <div className="flex gap-2 mt-2">
              <label className="flex-1">
                <input type="file" accept=".txt,.json,application/json,text/plain" className="hidden" onChange={handleFileUpload} data-testid="input-file-upload-flow" />
                <span className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border text-[11px] font-semibold text-foreground hover:bg-muted transition-colors cursor-pointer">
                  <FileUp size={13} /> Upload file
                </span>
              </label>
              {importJson.trim() && !preview && (
                <Button onClick={handlePreview} variant="secondary" className="flex-1 gap-2" data-testid="button-preview">
                  <Upload size={14} /> Preview Changes
                </Button>
              )}
            </div>
            {error && <ErrorBanner message={error} />}
            {renderPreviewBlock()}
        </StepBlock>
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

function ToggleRow({ label, description, checked, onChange, disabled = false }: {
  label: string; description: string; checked: boolean; onChange: (checked: boolean) => void; disabled?: boolean;
}) {
  return (
    <div className={`flex items-center justify-between gap-3 ${disabled ? 'opacity-50' : ''}`}>
      <div className="min-w-0">
        <p className="text-xs font-semibold text-foreground">{label}</p>
        <p className="text-[10px] text-muted-foreground leading-tight">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} disabled={disabled} />
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

function VersionToggle({ on, setOn, name, setName }: {
  on: boolean; setOn: (v: boolean) => void; name: string; setName: (v: string) => void;
}) {
  return (
    <div className="bg-muted/30 border border-border rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div>
          <Label className="text-xs font-semibold">Save as a new version</Label>
          <p className="text-[10px] text-muted-foreground">Keep your current calendar untouched and apply into a copy.</p>
        </div>
        <Switch checked={on} onCheckedChange={setOn} data-testid="switch-version" />
      </div>
      {on && (
        <Input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="New version name (e.g. AI Plan v2)"
          className="h-9 text-xs mt-2"
          data-testid="input-version-name"
        />
      )}
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

function DiffPreview({ preview, onApply, onCancel, applyLabel }: {
  preview: ParsedUpdate; onApply: () => void; onCancel: () => void; applyLabel?: string;
}) {
  const prjAdd = preview.projects?.add ?? [];
  const prjUpdate = preview.projects?.update ?? [];
  const prjDelete = preview.projects?.delete ?? [];
  const evtAdd = preview.events?.add ?? [];
  const evtUpdate = preview.events?.update ?? [];
  const evtDelete = preview.events?.delete ?? [];
  const tskAdd = preview.tasks?.add ?? [];
  const tskUpdate = preview.tasks?.update ?? [];
  const tskDelete = preview.tasks?.delete ?? [];
  const completed = preview.completedTaskIds ?? [];
  const notes = preview.patchNotes ?? [];
  const mergeProposals = preview.transformationProposals?.mergeIntoDayType ?? [];
  const convertProposals = preview.transformationProposals?.convertTimedBlockToTask ?? [];
  const candidateDeletes = preview.transformationProposals?.candidateDeletes ?? [];
  const reviewItems = preview.reviewItems?.add ?? [];
  const reviewOnlyTotal = mergeProposals.length + convertProposals.length + candidateDeletes.length + reviewItems.length;
  const total = prjAdd.length + prjUpdate.length + prjDelete.length +
    evtAdd.length + evtUpdate.length + evtDelete.length +
    tskAdd.length + tskUpdate.length + tskDelete.length;
  const warnings = preview.warnings ?? [];

  const summaryParts = [
    (prjAdd.length + evtAdd.length + tskAdd.length) > 0 && `+${prjAdd.length + evtAdd.length + tskAdd.length} added`,
    (prjUpdate.length + evtUpdate.length + tskUpdate.length) > 0 && `~${prjUpdate.length + evtUpdate.length + tskUpdate.length} updated`,
    completed.length > 0 && `✓${completed.length} completed`,
    (prjDelete.length + evtDelete.length + tskDelete.length) > 0 && `−${prjDelete.length + evtDelete.length + tskDelete.length} removed`,
    reviewOnlyTotal > 0 && `${reviewOnlyTotal} review-only`,
  ].filter(Boolean);

  return (
    <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2.5 space-y-1">
          <p className="text-[10px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
            ⚠️ {warnings.length} warning{warnings.length !== 1 ? 's' : ''} — review before applying
          </p>
          {warnings.map((w, i) => (
            <p key={i} className="text-[10px] text-amber-700 dark:text-amber-400">{w}</p>
          ))}
        </div>
      )}
      {notes.length > 0 && (
        <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-2.5 space-y-1">
          <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide">AI notes</p>
          {notes.map((n, i) => (
            <p key={i} className="text-[10px] text-blue-700 dark:text-blue-400">{n}</p>
          ))}
        </div>
      )}

      {reviewOnlyTotal > 0 && (
        <div className="bg-violet-500/10 border border-violet-500/30 rounded-lg p-2.5 space-y-1">
          <p className="text-[10px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide">
            Review-only AI reorganization proposals — not applied
          </p>
          <p className="text-[10px] text-violet-700 dark:text-violet-400">
            {mergeProposals.length} merge into day-type · {convertProposals.length} convert to task · {candidateDeletes.length} candidate delete · {reviewItems.length} review item{reviewItems.length !== 1 ? 's' : ''}
          </p>
          {candidateDeletes.length > 0 && (
            <p className="text-[10px] text-violet-700 dark:text-violet-400">Candidate deletes are review evidence only and are never auto-applied.</p>
          )}
        </div>
      )}
      <div className="bg-card border border-border rounded-xl overflow-hidden">
        <div className="px-3 py-2 bg-muted/20 border-b border-border flex items-center gap-2 flex-wrap">
          <CheckCircle2 size={13} className="text-green-500" />
          <span className="text-xs font-semibold">{total} change{total !== 1 ? 's' : ''} ready to apply</span>
          {summaryParts.length > 0 && (
            <span className="text-[10px] text-muted-foreground ml-1">{summaryParts.join('  ')}</span>
          )}
        </div>
        <div className="p-3 space-y-1 max-h-60 overflow-y-auto">
          {prjAdd.map((p, i) => <DiffRow key={`pa${i}`} op="add" label={`Project: ${p.name}`} cat={undefined} />)}
          {prjUpdate.map((p, i) => <DiffRow key={`pu${i}`} op="update" label={`Update project: ${(p as any).name ?? p.id}`} />)}
          {prjDelete.map((id, i) => <DiffRow key={`pd${i}`} op="delete" label={`Remove project: ${String(id).slice(0, 20)}`} />)}
          {evtAdd.map((e, i) => <DiffRow key={`ea${i}`} op="add" label={`${e.date} — ${e.title}`} cat={e.category} />)}
          {evtUpdate.map((e, i) => <DiffRow key={`eu${i}`} op="update" label={`Update: ${(e as any).title ?? e.id}`} />)}
          {evtDelete.map((id, i) => <DiffRow key={`ed${i}`} op="delete" label={`Remove event: ${String(id).slice(0, 20)}`} />)}
          {tskAdd.map((t, i) => <DiffRow key={`ta${i}`} op="add" label={`Task: ${t.name}`} cat={t.category} isTask />)}
          {tskUpdate.map((t, i) => (
            <DiffRow
              key={`tu${i}`}
              op="update"
              label={completed.includes(t.id) ? `Complete task: ${t.id}` : `Update task: ${(t as any).name ?? t.id}`}
              isTask
            />
          ))}
          {tskDelete.map((id, i) => <DiffRow key={`td${i}`} op="delete" label={`Remove task: ${String(id).slice(0, 20)}`} isTask />)}
          {total === 0 && reviewOnlyTotal === 0 && <p className="text-xs text-center text-muted-foreground py-2">No changes found in the response.</p>}
          {total === 0 && reviewOnlyTotal > 0 && <p className="text-xs text-center text-muted-foreground py-2">No direct changes to apply. Review-only proposals were parsed but require a future confirmation flow.</p>}
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
          {applyLabel ?? `Apply ${total > 0 ? `${total} ` : ''}Change${total !== 1 ? 's' : ''}`}
        </Button>
      </div>
    </div>
  );
}

function DiffRow({ op, label, cat, isTask }: {
  op: 'add' | 'update' | 'delete'; label: string; cat?: string; isTask?: boolean;
}) {
  const { categories } = useAppData();
  const color = cat ? (categories.find(c => c.id === cat)?.color ?? CATEGORY_COLOR[cat] ?? '#6b7280') : undefined;
  const styles = {
    add: { icon: <Plus size={9} />, wrap: 'bg-green-500/8 border-green-500/20 dark:bg-green-500/10', icon_: 'text-green-600 dark:text-green-400' },
    update: { icon: <PenLine size={9} />, wrap: 'bg-amber-500/8 border-amber-500/20 dark:bg-amber-500/10', icon_: 'text-amber-600 dark:text-amber-400' },
    delete: { icon: <Trash2 size={9} />, wrap: 'bg-red-500/8 border-red-500/20 dark:bg-red-500/10', icon_: 'text-red-600 dark:text-red-400' },
  }[op];
  return (
    <div className={`flex items-center gap-2 px-2 py-1 rounded border text-[11px] ${styles.wrap}`}>
      <span className={styles.icon_}>{styles.icon}</span>
      {color && <span className="w-2 h-2 rounded-sm shrink-0" style={{ background: color }} />}
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
