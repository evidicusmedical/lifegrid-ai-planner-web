import { AppData } from '../types';

export const defaultData: AppData = {
  events: [
    // ── January ──
    { id: crypto.randomUUID(), date: '2026-01-01', title: "New Year's Day", category: 'family', startTime: null, endTime: null, color: '#ef4444', notes: "Family brunch at home" },
    { id: crypto.randomUUID(), date: '2026-01-05', title: 'Gym Kickoff', category: 'health', startTime: '07:00', endTime: '08:00', color: '#10b981', notes: null },
    { id: crypto.randomUUID(), date: '2026-01-05', title: 'Team Kickoff Call', category: 'work', startTime: '10:00', endTime: '11:30', color: '#2563eb', notes: '2026 planning session' },
    { id: crypto.randomUUID(), date: '2026-01-12', title: 'Dentist', category: 'health', startTime: '09:00', endTime: null, color: '#10b981', notes: null },
    { id: crypto.randomUUID(), date: '2026-01-19', title: 'MLK Day', category: 'personal', startTime: null, endTime: null, color: '#7c3aed', notes: null },
    { id: crypto.randomUUID(), date: '2026-01-20', title: 'Q1 Strategy Review', category: 'work', startTime: '14:00', endTime: '16:00', color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-01-24', title: 'Date Night', category: 'family', startTime: '19:00', endTime: null, color: '#ef4444', notes: 'Italian restaurant reservation' },

    // ── February ──
    { id: crypto.randomUUID(), date: '2026-02-02', title: "Groundhog Day - Super Bowl Watch", category: 'family', startTime: '17:00', endTime: null, color: '#ef4444', notes: null },
    { id: crypto.randomUUID(), date: '2026-02-09', title: 'Blood Work', category: 'health', startTime: '08:30', endTime: null, color: '#10b981', notes: 'Fasted labs' },
    { id: crypto.randomUUID(), date: '2026-02-14', title: "Valentine's Dinner", category: 'family', startTime: '19:30', endTime: null, color: '#ef4444', notes: 'Nobu reservation' },
    { id: crypto.randomUUID(), date: '2026-02-14', title: 'Send Flowers', category: 'personal', startTime: '09:00', endTime: null, color: '#7c3aed', notes: null },
    { id: crypto.randomUUID(), date: '2026-02-20', title: 'Presidents Day Off', category: 'personal', startTime: null, endTime: null, color: '#7c3aed', notes: null },
    { id: crypto.randomUUID(), date: '2026-02-23', title: 'Ski Trip - Day 1', category: 'travel', startTime: '06:00', endTime: null, color: '#d97706', notes: 'Vail, CO' },
    { id: crypto.randomUUID(), date: '2026-02-24', title: 'Ski Trip - Day 2', category: 'travel', startTime: null, endTime: null, color: '#d97706', notes: null },
    { id: crypto.randomUUID(), date: '2026-02-25', title: 'Ski Trip - Day 3', category: 'travel', startTime: null, endTime: null, color: '#d97706', notes: null },

    // ── March ──
    { id: crypto.randomUUID(), date: '2026-03-02', title: 'Quarterly Board Prep', category: 'work', startTime: '09:00', endTime: '17:00', color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-03-08', title: "Women's Day Brunch", category: 'family', startTime: '11:00', endTime: null, color: '#ef4444', notes: null },
    { id: crypto.randomUUID(), date: '2026-03-15', title: 'Half Marathon', category: 'health', startTime: '07:00', endTime: null, color: '#10b981', notes: 'Austin TX' },
    { id: crypto.randomUUID(), date: '2026-03-17', title: "St. Patrick's Day", category: 'personal', startTime: '18:00', endTime: null, color: '#7c3aed', notes: null },
    { id: crypto.randomUUID(), date: '2026-03-20', title: 'Spring Equinox Hike', category: 'personal', startTime: '07:30', endTime: null, color: '#7c3aed', notes: null },
    { id: crypto.randomUUID(), date: '2026-03-27', title: 'Car Service', category: 'personal', startTime: '10:00', endTime: null, color: '#7c3aed', notes: null },
    { id: crypto.randomUUID(), date: '2026-03-27', title: 'Dinner with Parents', category: 'family', startTime: '18:30', endTime: null, color: '#ef4444', notes: null },

    // ── April ──
    { id: crypto.randomUUID(), date: '2026-04-01', title: 'Q1 Wrap / Q2 Kickoff', category: 'work', startTime: '09:00', endTime: null, color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-04-03', title: 'Annual Physical', category: 'health', startTime: '09:30', endTime: null, color: '#10b981', notes: 'Full workup' },
    { id: crypto.randomUUID(), date: '2026-04-05', title: 'Easter Sunday', category: 'family', startTime: '11:00', endTime: null, color: '#ef4444', notes: null },
    { id: crypto.randomUUID(), date: '2026-04-15', title: 'Tax Day', category: 'personal', startTime: null, endTime: null, color: '#7c3aed', notes: 'File returns' },
    { id: crypto.randomUUID(), date: '2026-04-18', title: 'Team Offsite - Day 1', category: 'work', startTime: '08:00', endTime: null, color: '#2563eb', notes: 'Nashville TN' },
    { id: crypto.randomUUID(), date: '2026-04-19', title: 'Team Offsite - Day 2', category: 'work', startTime: null, endTime: null, color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-04-25', title: 'Anniversary Celebration', category: 'family', startTime: '19:00', endTime: null, color: '#ef4444', notes: null },

    // ── May ──
    { id: crypto.randomUUID(), date: '2026-05-01', title: 'Eye Exam', category: 'health', startTime: '14:00', endTime: null, color: '#10b981', notes: null },
    { id: crypto.randomUUID(), date: '2026-05-10', title: "Mother's Day Brunch", category: 'family', startTime: '11:00', endTime: null, color: '#ef4444', notes: 'Reserve table for 6' },
    { id: crypto.randomUUID(), date: '2026-05-15', title: 'Bike Ride Charity Event', category: 'health', startTime: '08:00', endTime: null, color: '#10b981', notes: '50 mile route' },
    { id: crypto.randomUUID(), date: '2026-05-15', title: 'Evening Gala', category: 'work', startTime: '18:30', endTime: null, color: '#2563eb', notes: 'Company charity event' },
    { id: crypto.randomUUID(), date: '2026-05-22', title: 'Weekend Camping', category: 'personal', startTime: '14:00', endTime: null, color: '#7c3aed', notes: 'Big Bend NP' },
    { id: crypto.randomUUID(), date: '2026-05-25', title: 'Memorial Day BBQ', category: 'family', startTime: '13:00', endTime: null, color: '#ef4444', notes: null },

    // ── June ──
    { id: crypto.randomUUID(), date: '2026-06-08', title: 'Flight to NYC', category: 'travel', startTime: '07:00', endTime: null, color: '#d97706', notes: 'UA 1234, Terminal B' },
    { id: crypto.randomUUID(), date: '2026-06-09', title: 'NYC Conference', category: 'work', startTime: '09:00', endTime: '18:00', color: '#2563eb', notes: 'Day 1' },
    { id: crypto.randomUUID(), date: '2026-06-09', title: 'Team Dinner', category: 'work', startTime: '19:30', endTime: null, color: '#2563eb', notes: 'Per Se restaurant' },
    { id: crypto.randomUUID(), date: '2026-06-10', title: 'NYC Conference', category: 'work', startTime: '09:00', endTime: '18:00', color: '#2563eb', notes: 'Day 2' },
    { id: crypto.randomUUID(), date: '2026-06-11', title: 'NYC Conference', category: 'work', startTime: '09:00', endTime: '18:00', color: '#2563eb', notes: 'Day 3' },
    { id: crypto.randomUUID(), date: '2026-06-12', title: 'Flight Home', category: 'travel', startTime: '16:00', endTime: null, color: '#d97706', notes: null },
    { id: crypto.randomUUID(), date: '2026-06-18', title: 'Derm Appt', category: 'health', startTime: '09:30', endTime: null, color: '#10b981', notes: 'Annual skin check' },
    { id: crypto.randomUUID(), date: '2026-06-19', title: 'Juneteenth', category: 'personal', startTime: null, endTime: null, color: '#7c3aed', notes: null },
    { id: crypto.randomUUID(), date: '2026-06-21', title: 'Summer Solstice Hike', category: 'personal', startTime: '07:00', endTime: null, color: '#7c3aed', notes: null },
    { id: crypto.randomUUID(), date: '2026-06-28', title: 'Couples Therapy', category: 'personal', startTime: '16:00', endTime: null, color: '#7c3aed', notes: null },

    // ── July ──
    { id: crypto.randomUUID(), date: '2026-07-04', title: '4th of July BBQ', category: 'family', startTime: '14:00', endTime: null, color: '#ef4444', notes: 'Smiths backyard' },
    { id: crypto.randomUUID(), date: '2026-07-04', title: 'Fireworks Downtown', category: 'family', startTime: '21:00', endTime: null, color: '#ef4444', notes: null },
    { id: crypto.randomUUID(), date: '2026-07-10', title: 'Dermatology Follow-up', category: 'health', startTime: '11:00', endTime: null, color: '#10b981', notes: null },
    { id: crypto.randomUUID(), date: '2026-07-14', title: 'Q3 Planning', category: 'work', startTime: '10:00', endTime: '12:00', color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-07-14', title: 'Lunch w/ Investors', category: 'work', startTime: '13:00', endTime: '14:30', color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-07-20', title: 'Family Reunion', category: 'family', startTime: '12:00', endTime: null, color: '#ef4444', notes: 'Lake house' },
    { id: crypto.randomUUID(), date: '2026-07-25', title: 'Vegas Weekend', category: 'travel', startTime: '10:00', endTime: null, color: '#d97706', notes: null },
    { id: crypto.randomUUID(), date: '2026-07-26', title: 'Vegas Day 2', category: 'travel', startTime: null, endTime: null, color: '#d97706', notes: null },
    { id: crypto.randomUUID(), date: '2026-07-27', title: 'Vegas Day 3', category: 'travel', startTime: null, endTime: null, color: '#d97706', notes: null },

    // ── August ──
    { id: crypto.randomUUID(), date: '2026-08-01', title: 'Anniversary Dinner', category: 'family', startTime: '19:00', endTime: null, color: '#ef4444', notes: 'Nobu reservation' },
    { id: crypto.randomUUID(), date: '2026-08-06', title: 'Back-to-School Night', category: 'family', startTime: '18:30', endTime: null, color: '#ef4444', notes: null },
    { id: crypto.randomUUID(), date: '2026-08-10', title: 'Dentist Appt', category: 'health', startTime: '11:00', endTime: null, color: '#10b981', notes: null },
    { id: crypto.randomUUID(), date: '2026-08-15', title: 'Half-year Review', category: 'work', startTime: '09:00', endTime: null, color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-08-15', title: 'Team Happy Hour', category: 'work', startTime: '17:00', endTime: null, color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-08-22', title: 'Beach Weekend - Depart', category: 'travel', startTime: '08:00', endTime: null, color: '#d97706', notes: 'Gulf Shores AL' },
    { id: crypto.randomUUID(), date: '2026-08-23', title: 'Beach Day', category: 'travel', startTime: null, endTime: null, color: '#d97706', notes: null },
    { id: crypto.randomUUID(), date: '2026-08-24', title: 'Beach Day 2 / Return', category: 'travel', startTime: null, endTime: null, color: '#d97706', notes: null },

    // ── September ──
    { id: crypto.randomUUID(), date: '2026-09-07', title: 'Labor Day BBQ', category: 'family', startTime: '14:00', endTime: null, color: '#ef4444', notes: null },
    { id: crypto.randomUUID(), date: '2026-09-10', title: 'Q4 Budget Planning', category: 'work', startTime: '09:00', endTime: '17:00', color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-09-15', title: 'Performance Review', category: 'work', startTime: '14:00', endTime: null, color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-09-19', title: 'Wedding - Day 1', category: 'personal', startTime: '15:00', endTime: null, color: '#7c3aed', notes: "Jake & Sarah's wedding" },
    { id: crypto.randomUUID(), date: '2026-09-20', title: 'Wedding - Day 2', category: 'personal', startTime: '12:00', endTime: null, color: '#7c3aed', notes: null },
    { id: crypto.randomUUID(), date: '2026-09-26', title: 'Fall Hike', category: 'personal', startTime: '07:00', endTime: null, color: '#7c3aed', notes: null },

    // ── October ──
    { id: crypto.randomUUID(), date: '2026-10-01', title: 'Q3 Close / Earnings', category: 'work', startTime: '08:00', endTime: null, color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-10-10', title: 'Eye Doctor', category: 'health', startTime: '10:00', endTime: null, color: '#10b981', notes: 'Pick up new glasses' },
    { id: crypto.randomUUID(), date: '2026-10-15', title: 'File Tax Extension', category: 'personal', startTime: null, endTime: null, color: '#7c3aed', notes: 'DEADLINE' },
    { id: crypto.randomUUID(), date: '2026-10-17', title: 'Pumpkin Patch', category: 'family', startTime: '10:00', endTime: null, color: '#ef4444', notes: null },
    { id: crypto.randomUUID(), date: '2026-10-24', title: "Fall Gala", category: 'work', startTime: '18:00', endTime: null, color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-10-31', title: 'Halloween', category: 'family', startTime: '17:00', endTime: null, color: '#ef4444', notes: null },
    { id: crypto.randomUUID(), date: '2026-10-31', title: 'Costume Party', category: 'personal', startTime: '20:00', endTime: null, color: '#7c3aed', notes: null },

    // ── November ──
    { id: crypto.randomUUID(), date: '2026-11-03', title: 'NYC Business Trip', category: 'travel', startTime: '07:30', endTime: null, color: '#d97706', notes: null },
    { id: crypto.randomUUID(), date: '2026-11-04', title: 'NYC Meetings', category: 'work', startTime: '09:00', endTime: '18:00', color: '#2563eb', notes: null },
    { id: crypto.randomUUID(), date: '2026-11-05', title: 'Return Flight', category: 'travel', startTime: '15:00', endTime: null, color: '#d97706', notes: null },
    { id: crypto.randomUUID(), date: '2026-11-11', title: "Veterans Day", category: 'personal', startTime: null, endTime: null, color: '#7c3aed', notes: null },
    { id: crypto.randomUUID(), date: '2026-11-20', title: 'Thanksgiving Travel', category: 'travel', startTime: '12:00', endTime: null, color: '#d97706', notes: 'Drive to parents' },
    { id: crypto.randomUUID(), date: '2026-11-26', title: 'Thanksgiving', category: 'family', startTime: '14:00', endTime: null, color: '#ef4444', notes: null },
    { id: crypto.randomUUID(), date: '2026-11-26', title: 'Turkey Trot 5K', category: 'health', startTime: '08:00', endTime: null, color: '#10b981', notes: null },
    { id: crypto.randomUUID(), date: '2026-11-28', title: 'Return Home', category: 'travel', startTime: '11:00', endTime: null, color: '#d97706', notes: null },

    // ── December ──
    { id: crypto.randomUUID(), date: '2026-12-01', title: 'Year-End Planning', category: 'work', startTime: '09:00', endTime: null, color: '#2563eb', notes: 'OKR review' },
    { id: crypto.randomUUID(), date: '2026-12-11', title: 'Holiday Party', category: 'work', startTime: '18:00', endTime: null, color: '#2563eb', notes: 'Office rooftop' },
    { id: crypto.randomUUID(), date: '2026-12-18', title: 'Christmas Shopping', category: 'personal', startTime: '10:00', endTime: null, color: '#7c3aed', notes: null },
    { id: crypto.randomUUID(), date: '2026-12-24', title: 'Christmas Eve', category: 'family', startTime: '17:00', endTime: null, color: '#ef4444', notes: 'Church + family dinner' },
    { id: crypto.randomUUID(), date: '2026-12-25', title: 'Christmas Day', category: 'family', startTime: null, endTime: null, color: '#ef4444', notes: null },
    { id: crypto.randomUUID(), date: '2026-12-31', title: "New Year's Eve Party", category: 'personal', startTime: '20:00', endTime: null, color: '#7c3aed', notes: null },
    { id: crypto.randomUUID(), date: '2026-12-31', title: 'Year-End Review', category: 'work', startTime: '10:00', endTime: null, color: '#2563eb', notes: 'Personal reflection' },
  ],

  tasks: [
    { id: crypto.randomUUID(), name: 'Renew Passport', category: 'personal', dueDate: '2026-07-01', status: 'todo', owner: 'Me', nextAction: 'Gather documents and photos', notes: 'Expires Aug 2026 — do ASAP', priority: 'urgent' },
    { id: crypto.randomUUID(), name: 'Book Anniversary Hotel', category: 'family', dueDate: '2026-07-15', status: 'todo', owner: 'Me', nextAction: 'Check The Grand availability', notes: null, priority: 'high' },
    { id: crypto.randomUUID(), name: 'Q3 Budget Review', category: 'work', dueDate: '2026-07-31', status: 'in-progress', owner: 'Me', nextAction: 'Pull actuals from finance team', notes: null, priority: 'high' },
    { id: crypto.randomUUID(), name: 'Schedule Car Service', category: 'personal', dueDate: '2026-06-30', status: 'todo', owner: 'Me', nextAction: 'Call Audi dealership', notes: '60k mile service overdue', priority: 'medium' },
    { id: crypto.randomUUID(), name: 'Plan Summer Vacation', category: 'travel', dueDate: '2026-06-20', status: 'in-progress', owner: 'Me', nextAction: 'Research flights to Europe', notes: 'Italy vs Greece debate', priority: 'medium' },
    { id: crypto.randomUUID(), name: 'File Tax Extension', category: 'personal', dueDate: '2026-10-15', status: 'todo', owner: 'Me', nextAction: 'Send docs to accountant', notes: null, priority: 'low' },
    { id: crypto.randomUUID(), name: 'Hire Senior Engineer', category: 'work', dueDate: '2026-08-01', status: 'in-progress', owner: 'Me', nextAction: 'Review 3 final candidates', notes: '2 open reqs on the team', priority: 'high' },
    { id: crypto.randomUUID(), name: 'Remodel Kitchen', category: 'personal', dueDate: '2026-09-01', status: 'blocked', owner: 'Wife', nextAction: 'Finalize contractor bids', notes: 'Waiting on permits', priority: 'medium' },
    { id: crypto.randomUUID(), name: 'Estate Planning Review', category: 'personal', dueDate: '2026-11-01', status: 'todo', owner: 'Me', nextAction: 'Schedule meeting with attorney', notes: 'Update will + beneficiaries', priority: 'medium' },
    { id: crypto.randomUUID(), name: 'Publish Q3 Report', category: 'work', dueDate: '2026-10-07', status: 'todo', owner: 'Me', nextAction: 'Draft executive summary', notes: null, priority: 'high' },
  ],

  personEvents: [
    { id: crypto.randomUUID(), person: 'wife', date: '2026-06-12', title: 'Book Club', notes: null, color: '#8b5cf6' },
    { id: crypto.randomUUID(), person: 'wife', date: '2026-06-20', title: 'Yoga Retreat', notes: '3-day retreat, no phone', color: '#10b981' },
    { id: crypto.randomUUID(), person: 'wife', date: '2026-07-10', title: 'Girls Trip to Napa', notes: '4 nights', color: '#d97706' },
    { id: crypto.randomUUID(), person: 'wife', date: '2026-07-13', title: 'Return from Napa', notes: null, color: '#d97706' },
    { id: crypto.randomUUID(), person: 'wife', date: '2026-08-05', title: 'Work Conference', notes: 'Chicago — 2 nights', color: '#2563eb' },
    { id: crypto.randomUUID(), person: 'wife', date: '2026-09-12', title: 'Spa Day with Mom', notes: null, color: '#ec4899' },
    { id: crypto.randomUUID(), person: 'wife', date: '2026-10-03', title: 'Book Club', notes: null, color: '#8b5cf6' },
    { id: crypto.randomUUID(), person: 'wife', date: '2026-11-20', title: 'Hair Appt', notes: null, color: '#ec4899' },
    { id: crypto.randomUUID(), person: 'shared', date: '2026-06-28', title: 'Couples Therapy', notes: null, color: '#8b5cf6' },
    { id: crypto.randomUUID(), person: 'shared', date: '2026-07-04', title: '4th of July BBQ', notes: null, color: '#ef4444' },
    { id: crypto.randomUUID(), person: 'shared', date: '2026-08-01', title: 'Anniversary Dinner', notes: null, color: '#ef4444' },
    { id: crypto.randomUUID(), person: 'shared', date: '2026-08-22', title: 'Beach Weekend', notes: 'Gulf Shores', color: '#d97706' },
    { id: crypto.randomUUID(), person: 'shared', date: '2026-09-19', title: "Jake & Sarah's Wedding", notes: null, color: '#8b5cf6' },
    { id: crypto.randomUUID(), person: 'shared', date: '2026-11-26', title: 'Thanksgiving', notes: null, color: '#ef4444' },
    { id: crypto.randomUUID(), person: 'shared', date: '2026-12-24', title: 'Christmas Eve', notes: null, color: '#ef4444' },
    { id: crypto.randomUUID(), person: 'shared', date: '2026-12-25', title: 'Christmas Day', notes: null, color: '#ef4444' },
  ],
};
