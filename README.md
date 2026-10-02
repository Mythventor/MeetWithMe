# MeetWithMe

A local React + Tailwind CSS recreation of When2meet's compact scheduling interface, without advertisements.

## Run locally

```sh
npm install
npm run dev
```

Open the local URL printed by Vite.

## Features

- Select specific dates or days of the week with a click, drag, or keyboard.
- Choose a time range and event time zone.
- Create events and add local participants.
- Drag across 15-minute availability cells and compare participants in a group heatmap.
- Reopen saved events from the home page. Events and responses persist in this browser's local storage.

There is no account system, server synchronization, or shared event service. Event URLs work only in the browser where the event was saved. All times use the event's selected time zone.

## Checks

```sh
npm run lint
npm run build
```

## Existing Firebase hosting

The repository retains its Firebase Hosting configuration for project `meetwithme-20260930` (MeetWithMe). To publish explicitly, sign in with the Firebase CLI and run `npm run deploy`; this builds before uploading `dist`. Local development does not require Firebase.

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
