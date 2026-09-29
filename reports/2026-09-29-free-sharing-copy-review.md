# Free cookbook sharing: wording review

Use this checklist while reviewing the local app. Each entry includes the exact old and new wording. Structural-only spacing changes are omitted. The main implementation will append invitation, onboarding, settings, and error copy.

## /pricing

`src/app/pricing/page.tsx`

- [ ] Added Free feature: “Share your cookbook with up to 3 people as Family members”
- [ ] Plus feature before: “Share entire cookbooks with family and friends”
  After: “Share cookbooks with unlimited people, including Contributors”
- [ ] Added heading below plan cards: “A place at the table, even on Free”
- [ ] Added paragraph: “Share your free cookbook with 3 other people. You are not counted in that limit. Family members can browse recipes, react, and add notes and memories. They cannot add or edit recipes or manage members.”
- [ ] Added paragraph: “The cookbook owner’s plan sets the sharing limits. Guests only need a free account, and joining someone else’s cookbook does not use their allowance to create one of their own. Members and pending invitations count toward the limit. Canceling an invitation, letting it expire, or removing a member frees a spot.”
- [ ] Added paragraph: “With Plus, invite as many people as you like and choose Contributor access for anyone who will add recipes and edit their own.”

## /app/settings → See what Plus includes

`src/components/billing/PlusPlanDialog.tsx`

- [ ] Before: Share entire cookbooks with family and friends
  After: Share cookbooks with unlimited people, including Contributors

## /app/settings → Plan & billing

`src/components/billing/BillingCard.tsx`

- [ ] Before: One cookbook, 50 saved recipes, and 5 AI ideas per month.
  After: One cookbook, 50 saved recipes, sharing with up to 3 Family members, and 5 AI ideas per month.

## /app → welcome tour (replay in Settings)

`src/lib/guides/registry.ts`

- [ ] Before: Cooking with others? Open a cookbook and use Manage Members to share it, so everyone can add recipes, notes, and memories.
  After: Open your cookbook and use Manage Members to invite up to 3 people on Free. Family members can browse recipes, react, and add notes and memories.

- [ ] Before: Inside Manage Members, tap Add Someone, enter their email, and pick a role: Contributor (can add and edit recipes) or Family (can view, react, and add notes). They get an email invite.
  After: Inside Manage Members, tap Add Someone and enter their email. Free includes Family access. With Plus, you can also invite Contributors to add recipes and edit their own. They get an email invite.

## /guides/how-to-share-your-home-cooked-book; /guides/how-to-share-family-recipes; /guides/how-to-create-a-cookbook-as-a-family-gift

`src/lib/guides/editorial.ts`

- [ ] Before: The person who creates a cookbook is its Keeper. When inviting someone, choose Contributor or Family based on how they'd like to take part.
  After: The person who creates a cookbook is its Keeper. Free includes invitations for up to 3 people as Family members. With Plus, choose Contributor or Family based on how they'd like to take part.

- [ ] Before: You create a Sunday Suppers book, so you're its Keeper. Your sister wants to add her lasagna and update the instructions after testing it: invite her as a Contributor.
  After: You create a Sunday Suppers book, so you're its Keeper. Your sister wants to add her lasagna and update the instructions after testing it: with Plus, invite her as a Contributor.

- [ ] Before: The Keeper needs Home Cooked Plus to turn on cookbook sharing and send invitations. The people receiving invitations can accept them with a free Home Cooked account.
  After: Free lets you share your one cookbook with up to 3 other people as Family members; you are not counted in that limit. Plus includes unlimited sharing and Contributor invitations. The cookbook owner’s plan sets these limits. Recipients only need a free Home Cooked account, and joining a shared book does not use their allowance to create one of their own.

- [ ] Before: Open the cookbook's Members page and select Add Someone. Enter the person's email address, choose Contributor or Family, then select Add to this book. Home Cooked emails them an invitation.
  After: Open the cookbook's Members page and select Add Someone. Enter the person's email address. Free invitations use the Family role; with Plus, choose Contributor or Family. Select Send invitation and Home Cooked emails them an invitation.

- [ ] Before: Invitations expire after seven days. If someone hasn't joined,
  After: Invitations expire after seven days. Pending, unexpired invitations reserve a spot in your Free sharing limit. Canceling an invitation, letting it expire, or removing a member frees a spot. If someone hasn't joined,

- [ ] Before: Choose Contributor for someone who will add recipes. Choose Family for someone who wants to cook, react, and share memories. Both have a place in the book.
  After: Share with up to 3 Family members on Free so they can cook, react, and add notes and memories. Choose Plus to invite more people or Contributors who will add recipes.

- [ ] Before: Home Cooked supports both individual recipe sharing and, on the plan that includes it, invitations to a shared cookbook.
  After: Home Cooked supports individual recipe sharing and cookbook invitations on both plans: up to 3 Family members on Free, or unlimited people and Contributor access with Plus.

- [ ] Before: Home Cooked lets you create a cookbook, gather recipes and notes in one place, and share it with family on the plan that supports cookbook invitations.
  After: Home Cooked lets you create a cookbook, gather recipes and notes in one place, and share it with up to 3 Family members on Free. Plus adds unlimited sharing and Contributor access.

## Signup welcome email (HTML and plain text)

`src/lib/email/signupWelcomeTemplate.ts`

- [ ] Before: Invite the family or keep it private
  After: Invite up to 3 people as Family members for free, or keep it private

- [ ] Added plain-text email sentence: “Share your cookbook with up to 3 people as Family members for free, or keep it private.”

## Developer README (not displayed in app)

`README.md`

- [ ] Before: Read-only: browse recipes, add reactions and memories
  After: Browse recipes, react, and add notes and memories; cannot add or edit recipes or manage members

- [ ] Added README plan summary: “Free accounts can own one cookbook with up to 50 recipes and share it with up to 3 other people as Family members. Pending, unexpired invitations reserve a spot. Plus includes unlimited cookbook sharing and Contributor invitations. The owner’s plan controls sharing; recipients can join with free accounts without using their own cookbook allowance.”


## Cookbook → Members → Add Someone; onboarding /onboarding/add-member?bookId=…

- [ ] “{used} of 3 sharing spots used”
- [ ] “Free includes up to 3 other people with Family access. They can view recipes, react, and add notes and memories.”
- [ ] “Pending invitations reserve a spot. Cancel an invitation or remove a member to free one.”
- [ ] At capacity: “All sharing spots are in use.” (Send invitation disabled.)
- [ ] Upgrade link: “Get Plus to invite more people or Contributors”
- [ ] Loading failure: “Could not load cookbook sharing limits. Please refresh and try again.”
- [ ] Downgraded owner on another book: “Free sharing is available on your oldest cookbook. Existing members keep access to your other cookbooks. Upgrade to Plus to invite more people to those books.”
- [ ] Submit changed from “Add to this book” to “Send invitation”.
- [ ] Success changed to “We’ve invited {email}. They can access this book after accepting.”
- [ ] Free shows only the Family role; Plus also shows Contributor.

## Cookbook → Members

- [ ] “{used} of 3 sharing spots used, including pending invitations. Free invitations include Family access.”
- [ ] Downgraded owner on another book: “Free sharing is available on your oldest cookbook. Existing members keep access to this cookbook.”
- [ ] “Get Plus to invite more people or Contributors”

## Create cookbook; Cookbook → Settings → Sharing

- [ ] Create, Shared option: “Invite up to 3 people with Family access on Free, or more people and Contributors with Plus.”
- [ ] Settings, Shared option: “Free includes up to 3 people with Family access. Plus lets you invite more people and Contributors.”
- [ ] New cookbook banner: “Invite up to 3 people to view, react, and add memories on Free. Turn on sharing in settings when you’re ready.”

## Onboarding invitation screen

- [ ] “Invite family to browse recipes, react, and add notes and memories.”
- [ ] “Free includes up to 3 people with Family access. With Plus, invite more people and Contributors who can add recipes.”

## Invitation email and admin sharing

- [ ] Invitation email HTML: “Open the cookbook to browse recipes, react, and add notes and memories.”
- [ ] Invitation plain text: “Join as a {role} to browse recipes, react, and add notes and memories.”
- [ ] Admin Family hint: “View, react, and add notes and memories” (replaces “View only”).

## Local review setup

- Migration `029_free_cookbook_sharing.sql` is applied to the connected hosted database. You can review authenticated invitation flows locally. A separate database would also need this migration.
- Review Free at zero, two, and three occupied spots; pending invites count, expired/canceled invites do not.
- Review Plus with Contributor invitations; verify a Family recipient cannot add/edit recipes or manage members.
- Existing memberships survive downgrade. New Free sharing is limited to the oldest owned cookbook; joining a book never consumes the recipient’s owned-cookbook allowance.

## Server and database messages

These appear when an invitation or membership operation cannot proceed, including a stale page or a plan change.

- [ ] “Only the keeper can view sharing limits.”
- [ ] “Create a new invitation to change its cookbook or recipient.”
- [ ] “Turn on sharing for this cookbook before inviting members.”
- [ ] “Free sharing is available on your oldest cookbook. Existing members keep access to your other cookbooks. Upgrade to Plus to invite more people to those books.”
- [ ] “Free cookbooks can invite Family members only. The cookbook owner can upgrade to Plus to invite Contributors.”
- [ ] “This cookbook has used its 3 free sharing spots. Cancel a pending invitation, remove a member, or ask the owner to upgrade to Plus.”
- [ ] “Membership cannot be moved to another cookbook or person.”
- [ ] “The cookbook owner must remain its keeper.”
- [ ] “Sharing is turned off for this cookbook. Ask the keeper to turn it on before joining.”
- [ ] “Free sharing is available on the owner’s oldest cookbook. Ask the owner to upgrade to Plus to invite more people to this book.”
- [ ] “This cookbook has used its 3 free sharing spots. Ask the keeper to free a spot or upgrade to Plus.”
- [ ] “Please sign in or create an account to accept this invitation.”
- [ ] “This invitation is invalid or has expired.”
- [ ] “Sign in with the email address this invitation was sent to.”
- [ ] “This Contributor invitation needs Plus. Ask the keeper to send a Family invitation or upgrade to Plus.”
- [ ] “Cookbook ownership and creation date cannot be changed.”

- [ ] Ownership guard: “Cookbook ownership and creation date cannot be changed.”

## Validation

- `npm test`: 43 passed, including 10 sharing database tests.
- `npm run lint`, `npm run version:check`, `git diff --check`: passed.
- `npm run build -- --webpack`: passed. Default Turbopack build hit a Google Fonts resolver error.
- Migration 029 applied to connected hosted Supabase with user approval. Verified migration history, sharing functions, all three enforcement triggers, and authenticated-only invitation acceptance. Local Supabase is unavailable (Docker/Podman absent).
- Authenticated browser flows and independent concurrent database sessions still need verification.

## Punctuation follow-up

Em dashes were removed from the updated app screens, emails, and this checklist. Historical “Before” excerpts above use normalized punctuation.

- [ ] Admin sharing: “Invite people to a cookbook you keep. They choose to accept before it joins their shelf.”
- [ ] Invitation role guide, Keeper: “Full control: manages members, settings, and every recipe.”
- [ ] Signup email, code instructions: “Enter this code to finish setting up your cookbook, a place for the recipes, weeknight wins, and kitchen notes worth keeping.” The HTML greeting version starts with “Hi {first name}, enter”.
- [ ] Bookshelf welcome tour: “Open the Bookshelf to switch between cookbooks or start a new one. Find recipes, meal plans, groceries, and favorites in the main menu.”

## Hosted migration application

Applied only migration 029 in a transaction together with its migration-history record and a PostgREST schema reload notification. Older migrations 024 through 028 have missing history records despite existing prerequisite schema; they were not rerun or marked applied as part of this change.
