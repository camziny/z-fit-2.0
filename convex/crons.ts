import { cronJobs } from 'convex/server';
import { internal } from './_generated/api';

const crons = cronJobs();

crons.hourly(
  'weekly group recap',
  { minuteUTC: 0 },
  internal.notifications.sendWeeklyRecaps
);

export default crons;
