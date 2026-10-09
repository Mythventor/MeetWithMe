# MeetWithMe

A React + Tailwind CSS recreation of When2meet's compact scheduling interface, without advertisements.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Features

- Select specific dates or days of the week with a click, drag, or keyboard.
- Choose a time range and event time zone.
- Create shared events and invite participants with a link.
- Drag across 15-minute availability cells and compare participants in a group heatmap.
- Reopen events from the home page. Shared events and responses persist in Firestore.

No account form is required. Anonymous browser identities protect each participant’s response. Older local-only events remain in browser storage. All times use the event’s selected time zone, with local time-zone views.

## Checks

```sh
npm run lint
npm run build
```

## Existing Firebase hosting

The repository retains its Firebase Hosting configuration for project `meetwithme-20260930` (MeetWithMe). To publish explicitly, sign in with the Firebase CLI and run `npm run deploy`; this builds before uploading `dist`. Shared events use the configured Firebase backend during local development too.

## Automatic deployment with GitHub Actions

`.github/workflows/firebase-hosting.yml` deploys every push to `main` to the live
Firebase Hosting site. You can also run it manually from GitHub's Actions tab on
`main`. It uses Node.js 24, installs locked dependencies with `npm ci`, runs lint
and build checks, then deploys to `meetwithme-20260930`. Production deploys are
serialized to avoid simultaneous releases.

The repository Actions secret `FIREBASE_SERVICE_ACCOUNT_MEETWITHME_20260930`
is configured with a dedicated service account JSON key. The account
`github-hosting-deploy@meetwithme-20260930.iam.gserviceaccount.com` has Firebase
Hosting Admin and Service Usage Consumer roles on `meetwithme-20260930`.
Keep replacement keys in GitHub Actions secrets; never commit them here.

## Best meeting times

Recommendations update as availability changes. Choose a duration (15–240 minutes)
to rank every same-day start time by the number of participants available for the
entire meeting. Only the top three choices are shown. Equal scores use date and
then start time. Empty responses count in the total but never
imply availability. Windows with zero attendees are omitted.

Times use the event's wall-clock time zone. The current availability model does
not distinguish repeated hours during daylight-saving transitions, and these
recommendations are not absolute calendar timestamps. No window crosses midnight.

Run `npm test` for boundary, malformed-data, and randomized oracle checks. The
GitHub deployment workflow also runs this suite before deployment.
## Time-zone planner

Event times are anchored to the organizer's IANA time zone. Participants can switch
between local zones without moving saved availability using a compact selector.
Grid cells show local times and date changes. The display zone
is remembered on this device. Weekday polls use an explicit reference week;
conversion can change in a different week because of daylight saving.

Existing event and response keys remain compatible. Event wall times that are
missing or repeated during daylight-saving transitions are disabled explicitly,
rather than silently mapped to the wrong instant. This version does not offer both
occurrences of a repeated hour. Responses still use browser-local storage.

Time-zone checks: `node --test src/timezones.test.js`.
Browser regression (with the dev server running): `npx playwright test`.
Install the test browser once with `npx playwright install chromium`.

## Shared events

New events are saved to Cloud Firestore and use `#event/<random-id>` links. Use
**Copy link** to share the production URL. Anyone with the link can read the
names and availability. Participants join without an account form; Firebase
Anonymous Authentication assigns a persistent browser identity. Only that
identity can edit its response. Clearing browser data, private browsing, or
switching devices creates a new identity; there is no recovery or name-based
claiming of someone else's response.

Existing local events are preserved and stay local. New events require an
internet connection. Responses update live and are saved after a short debounce;
wait for the saving message to clear before closing the page. Separate participants
have separate documents so their concurrent writes do not overwrite each other.

The public Firebase web configuration is in `src/firebase.js`. No admin/service
account key belongs in client code. Rules deny event enumeration, freeze event
metadata after creation, and validate response owners and allowed time slots.
Firestore is in `us-central1` and Anonymous sign-in must be enabled in Firebase.

### Backend checks and deployment

```sh
npm test
npm run lint
npm run build
# Requires Firebase CLI and Java 21+; runs against a demo emulator, not live data:
npm run test:rules
# Deploy rules/indexes with an authorized local Firebase account:
firebase deploy --only firestore --project meetwithme-20260930
```

GitHub Actions runs app tests and Firestore emulator tests before deploying Hosting.
Its existing Hosting credential does not deploy Firestore rules; deploy rule changes
explicitly using the command above. `tests/live-sharing.mjs` is a manual live smoke
test that creates a test event; it cleans up its responses and anonymous identities,
but leaves the immutable event for admin cleanup. Do not run it in routine CI.

Firebase SDK app internals are pinned together in npm overrides to avoid duplicate
app registries. The gRPC override includes the upstream certificate-validation fix.
