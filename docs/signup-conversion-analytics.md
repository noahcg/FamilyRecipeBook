# Signup conversion measurement

Home Cooked counts public visitors in Vercel Web Analytics and completed new
sign-ins in the admin console. Enable Web Analytics for the Vercel project before
deploying this release. The browser script sends page views only for the public
home, sign-in, pricing, privacy, terms, our-story, and guide pages. Query strings
are removed. Private app, invitation, and shared-recipe URLs are excluded.
The app also sends only its origin as the referrer, so navigating from a private
page to a public page cannot reveal the private path through analytics.

Apply `037_signup_conversion_tracking.sql` in staging before deploying the app
there, then follow the launch runbook for production migration approval and
release. The migration stores its application time. Only accounts created after
that time enter the completed-signup count. A successful email code, email link,
or Google callback records the account once. Code requests alone do not count.
The table stores the user ID for deduplication and is restricted to server-side
access; it does not contain email or recipe content.

In Vercel Analytics, filter to the production environment and use the same date
range as the admin console's tracking start date. Compare unique public visitors
with completed signups to see a rough conversion trend. The two counts are
aggregate measures, not a linked visitor journey: returning visitors, multiple
devices, blocked analytics scripts, and accounts created from invitations can
affect the ratio. Do not subtract them to claim an exact number of people who
left without signing in.
