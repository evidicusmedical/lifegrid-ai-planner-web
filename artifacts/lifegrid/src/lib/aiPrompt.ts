import { AppData } from '../types';

export const generateAIPrompt = (data: AppData): string => {
  const dateStr = new Date().toISOString().split('T')[0];

  return `You are my AI life planner. Here is my current schedule data. Today is ${dateStr}.

### EVENTS
${JSON.stringify(data.events, null, 2)}

### TASKS
${JSON.stringify(data.tasks, null, 2)}

### PEOPLE AVAILABILITY
${JSON.stringify(data.personEvents, null, 2)}

Please suggest schedule optimizations, flag conflicts, identify overloaded weeks, and return proposed changes as JSON in the exact format described at the end of this prompt.

EXPECTED JSON FORMAT:
{
  "events": {
    "add": [ /* new Event objects */ ],
    "update": [ /* { id: "existing-id", ...fieldsToUpdate } */ ],
    "delete": [ /* "existing-id-1", "existing-id-2" */ ]
  },
  "tasks": {
    "add": [ /* new Task objects */ ],
    "update": [ /* { id: "existing-id", ...fieldsToUpdate } */ ],
    "delete": [ /* "existing-id" */ ]
  }
}`;
};

export const parseAIUpdate = (jsonStr: string) => {
  try {
    const data = JSON.parse(jsonStr);
    return data;
  } catch (e) {
    throw new Error("Invalid JSON format");
  }
};
