/**
 * App version.
 *
 * Shown in the You tab and used by the update banner. Bump it whenever the app
 * changes and the service worker VERSION changes with it — a stale installed copy
 * is invisible to everyone otherwise, which is exactly how the drums feature
 * shipped without anyone being able to find it.
 */

export const APP_VERSION = '5';
export const APP_BUILD = '2026-11-08';

export const VERSION_LABEL = `v${APP_VERSION} · ${APP_BUILD}`;
