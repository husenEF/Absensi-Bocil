/*
 * The last service worker this address will ever serve.
 *
 * ClassSync used to live at /Absensi-Bocil/ and registered a
 * stale-while-revalidate worker there. That worker is why this file has to
 * exist: it answers navigations from its own cache first, so once the
 * repository was renamed and /Absensi-Bocil/ started returning 404, every
 * installed phone would have gone on serving the old shell indefinitely. The
 * background revalidate fails, the failure is swallowed, and the teacher sees
 * an app that simply never updates again — no error, no clue.
 *
 * A browser re-fetches its worker script on navigation and byte-compares it,
 * so replacing the script is the one lever that still reaches those installs.
 * This one takes over and then dismantles itself.
 */

const NEW_URL = 'https://husenef.github.io/classsync/';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Take over the pages the previous worker was controlling, so they can
      // be sent on. `navigate()` is only allowed on a controlled client.
      await self.clients.claim();

      const windows = await self.clients.matchAll({type: 'window'});
      await Promise.all(
        windows.map((client) => client.navigate(NEW_URL).catch(() => {})),
      );

      // Deliberately no `caches.delete()`. Cache Storage is keyed by origin,
      // not by path, and the app's new home is on this same github.io origin
      // under the same `classsync-shell-v<version>` name — so a blanket
      // delete would reach across and wipe the offline shell of the very
      // install this worker is sending people to. The caches left behind
      // belong to a registration that no longer exists, so they serve nobody.
      await self.registration.unregister();
    })(),
  );
});

/*
 * No fetch handler, on purpose. With none registered every request falls
 * through to the network, which is what stops the cached old shell from being
 * served the moment this worker activates.
 */
