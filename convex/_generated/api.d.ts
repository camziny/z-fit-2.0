/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";
import type * as crons from "../crons.js";
import type * as exercises from "../exercises.js";
import type * as groups from "../groups.js";
import type * as leaderboard from "../leaderboard.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_stats from "../lib/stats.js";
import type * as media from "../media.js";
import type * as notifications from "../notifications.js";
import type * as notificationsActions from "../notificationsActions.js";
import type * as seedData from "../seedData.js";
import type * as sessions from "../sessions.js";
import type * as stats from "../stats.js";
import type * as templates from "../templates.js";
import type * as users from "../users.js";

/**
 * A utility for referencing Convex functions in your app's API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
declare const fullApi: ApiFromModules<{
  crons: typeof crons;
  exercises: typeof exercises;
  groups: typeof groups;
  leaderboard: typeof leaderboard;
  "lib/auth": typeof lib_auth;
  "lib/stats": typeof lib_stats;
  media: typeof media;
  notifications: typeof notifications;
  notificationsActions: typeof notificationsActions;
  seedData: typeof seedData;
  sessions: typeof sessions;
  stats: typeof stats;
  templates: typeof templates;
  users: typeof users;
}>;
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;
