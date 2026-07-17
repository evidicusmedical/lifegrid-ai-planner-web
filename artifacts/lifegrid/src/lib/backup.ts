import { AppDataContextType } from '../context/AppDataContext';
import { exportFilename } from './exportFilenames';

/** Uses the existing serialized backup from AppDataContext and its filename convention. */
export const downloadCurrentBackup = (app: Pick<AppDataContextType, 'exportBackup' | 'activeCalendar' | 'recordBackup'>) => {
  const blob = new Blob([app.exportBackup()], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = exportFilename('json_backup', app.activeCalendar.name);
  a.click();
  URL.revokeObjectURL(url);
  app.recordBackup();
};
