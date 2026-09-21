# Release Guide — Build & Submit to the App Stores

Human-run checklist for building **What Should We Watch** with EAS and submitting to
the **Apple App Store** and **Google Play**. Every step here needs an Expo account,
Apple/Google credentials, or network access, so none of it is automated — run it
yourself in order.

## App identifiers (this app)

| | Value |
|---|---|
| App name | What Should We Watch |
| Slug | `what-should-we-watch` |
| Version | `0.1.0` |
| iOS bundle identifier | `co.manali.wsww` |
| Android package | `co.manali.wsww` |
| Expo SDK | 57 (React Native 0.86) |

All commands below are run from `apps/mobile/`.

---

## 0. Prerequisites (one time)

- A paid **Apple Developer** account (Team) with access to App Store Connect.
- A **Google Play Console** developer account.
- An **Expo** account (free) that will own the EAS project.
- Node 20+ and the EAS CLI:
  ```sh
  npm install --global eas-cli
  eas --version   # must satisfy the ">= 12.0.0" pin in eas.json
  ```

## 1. Log in to EAS

```sh
eas login
eas whoami
```

## 2. Initialize the EAS project (populates the project ID)

`app.json` intentionally has **no** `extra.eas.projectId` — it must not be
fabricated. Running `eas init` creates the project on Expo's servers and writes the
real `projectId` (and owner) into `app.json`:

```sh
eas init
```

Commit the resulting `app.json` change. Because `eas.json` sets
`cli.appVersionSource: "remote"`, EAS is the source of truth for
`ios.buildNumber` / `android.versionCode`; the values in `app.json` are only the
initial seeds.

## 3. Configure signing credentials

EAS can generate and store both platforms' signing credentials for you:

```sh
eas credentials
```

- **iOS**: let EAS create the Distribution Certificate and Provisioning Profile (or
  supply your own). Uses the Apple account and the `co.manali.wsww` App ID.
- **Android**: let EAS generate the upload keystore (or supply an existing one). Keep
  a secure backup of the keystore — losing it blocks future Play updates.

## 4. Clerk Dashboard — production Apple Sign In

The app uses `expo-apple-authentication` + `@clerk/expo` with
`usesAppleSignIn: true`. Configure the **production** Clerk instance (not just dev):

1. Clerk Dashboard → **SSO Connections** → enable **Apple**.
2. Under **Native Application**, set the **Apple App ID** =
   `<App ID Prefix>.<bundle id>` → `<YOUR_TEAM_ID>.co.manali.wsww`
   (the App ID Prefix is normally your Apple **Team ID**). This is what enables the
   native "Sign in with Apple" flow on device.
3. **Only if** you also use a hosted / web OAuth flow: create an Apple **Services ID**,
   generate a **Sign in with Apple key** (`.p8`), and enter the Services ID, Key ID,
   Team ID, and key into the Clerk Apple connection. The native-only path (step 2)
   does not need this.
4. Ensure the app is built with the **production** Clerk Publishable Key
   (`pk_live_…`) via your environment/secret configuration, not the dev key.

## 5. Build

Profiles are defined in `eas.json`:

- **development** — dev client, internal distribution (native modules such as
  `expo-apple-authentication` run on a physical device):
  ```sh
  eas build --profile development --platform ios      # or android / all
  ```
- **preview** — internal distribution: directly-installable ad-hoc / APK builds for
  your own testers (`ios.simulator: false`, Android APK). This is **not** TestFlight —
  TestFlight builds come from the **production** (store) profile, uploaded via
  `eas submit` (§6):
  ```sh
  eas build --profile preview --platform all
  ```
- **production** — store distribution, `autoIncrement: true` (EAS bumps the remote
  build number each build):
  ```sh
  eas build --profile production --platform ios
  eas build --profile production --platform android
  ```

## 6. Submit — Apple App Store

1. In **App Store Connect** → **Apps** → **+** → create the app record for bundle id
   `co.manali.wsww` (choose the name, primary language, and SKU).
2. Copy the **Apple ID** shown under **App Information → General Information** — this is
   the numeric `ascAppId`.
3. Fill the placeholders in `eas.json` under `submit.production.ios`:
   - `appleId` → your Apple ID email.
   - `ascAppId` → the numeric App Store Connect Apple ID from step 2.
   - `appleTeamId` → your 10-character Apple Developer Team ID
     (Apple Developer → Membership).
4. Submit the production build (uploads to TestFlight, then you promote to App Store):
   ```sh
   eas submit --profile production --platform ios
   ```
5. In App Store Connect, add store metadata, screenshots, and the privacy details,
   attach the build, and submit for review.

## 7. Submit — Google Play

1. In **Google Play Console** → **Create app** → set the app name and package
   `co.manali.wsww`. You must upload a first build to the chosen track before the
   listing can go live.
2. Set up API access so `eas submit` can upload on your behalf:
   1. In **Google Cloud Console**, enable the **Google Play Android Developer API**
      for the project, and create a **service account** (download its **JSON key**).
   2. In **Play Console → Setup → API access**, link that Google Cloud project and
      grant the service account access.
   3. In **Play Console → Users and permissions**, add the service account and give it
      at least *Release to testing tracks* / *Release to production* (app or
      account-level) permissions.
   4. Save the JSON key as `apps/mobile/play-service-account.json`.
   - This file is **git-ignored** — never commit it.
   - `eas.json` → `submit.production.android.serviceAccountKeyPath` already points at
     `./play-service-account.json`; `track` is set to `internal`.
3. Submit the production `.aab` to the internal track:
   ```sh
   eas submit --profile production --platform android
   ```
4. Promote from **internal** → closed/open testing → production in Play Console when
   ready (or change `track` in `eas.json` for later submissions).

## 8. Version bumps for later releases

With `appVersionSource: "remote"`, `autoIncrement` handles `buildNumber` /
`versionCode` automatically on each production build. Bump the human-facing
**version** (e.g. `0.1.0` → `0.2.0`) in `app.json` when you ship a new release.

---

## Notes

- **Privacy / account deletion (Apple Guideline 5.1.1(v))** is handled in-app: the
  Account screen's **Delete account** control runs Clerk's real `user.delete()` (shipped
  in the guest-mode / account work), so no additional store configuration is required
  for that requirement. Confirm the flow is present in the build you submit.
- `ITSAppUsesNonExemptEncryption` is already set to `false` in `app.json`, so no export
  compliance questionnaire is needed at submit time.
- Credential placeholders live in `eas.json` (`REPLACE_ME_*`) and the Play key path.
  Replace them before running `eas submit`; do not commit real credential values.
