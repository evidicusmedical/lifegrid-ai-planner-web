import { AppDataContextType } from '../context/AppDataContext';

const safeFilenamePart = (value: string) => value.replace(/[^a-z0-9_-]+/gi, '-').replace(/^-+|-+$/g, '') || 'calendar';
const timestamp = (date = new Date()) => ({
  date: date.toISOString().slice(0, 10),
  time: date.toTimeString().slice(0, 8).replace(/:/g, '-'),
});

/** Uses the existing serialized backup from AppDataContext and its filename convention. */
export const downloadCurrentBackup = (app: Pick<AppDataContextType, 'exportBackup' | 'activeCalendar' | 'recordBackup'>) => {
  const blob = new Blob([app.exportBackup()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const ts = timestamp();
  a.download = `lifegrid_json_backup_${safeFilenamePart(app.activeCalendar.name)}_${ts.date}_${ts.time}.json`;
  a.click();
  URL.revokeObjectURL(url);
  app.recordBackup();
};
