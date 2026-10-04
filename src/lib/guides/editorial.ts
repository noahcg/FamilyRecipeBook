export type GuideSection = {
  id: string;
  heading: string;
  paragraphs: string[];
  bullets?: string[];
};

export type EditorialGuide = {
  slug: string;
  title: string;
  description: string;
  seoTitle: string;
  metaDescription: string;
  pinterestDescription: string;
  sections: GuideSection[];
  callout: string;
  quote: string;
  related: string[];
};

type GuideSeed = Omit<EditorialGuide, "seoTitle" | "pinterestDescription" | "related">;

const guide = (seed: GuideSeed): EditorialGuide => ({
  ...seed,
  seoTitle: seed.title,
  pinterestDescription: seed.description,
  related: [],
});

export const guides: EditorialGuide[] = [
  guide({
    slug: "how-to-share-your-home-cooked-book",
    title: "Sharing Your Home Cooked Book & Understanding Roles",
    description: "Invite people into your cookbook with confidence. Learn what Keepers, Contributors, and Family members can do, and choose the right role for each person.",
    metaDescription: "Learn how to share a Home Cooked cookbook, invite members, and choose between Keeper, Contributor, and Family roles.",
    sections: [
      {
        id: "a-book-to-share",
        heading: "One cookbook, a place for everyone",
        paragraphs: [
          "Sharing a Home Cooked book gives the people you invite a common place to find recipes, cook from them, and add memories. Some people will bring new recipes. Others will simply want to make an old favorite and leave a note. Roles make room for both.",
          "Each role belongs to a particular cookbook. You can be the Keeper of your own book and a Family member in someone else's. Inviting someone to one book doesn't give them access to your other books, and choosing Shared doesn't make the cookbook public.",
        ],
      },
      {
        id: "choose-a-role",
        heading: "Which role should you choose?",
        paragraphs: ["The person who creates a cookbook is its Keeper. Free includes invitations for up to 3 people as Family members. With Plus, choose Contributor or Family based on how they'd like to take part."],
        bullets: [
          "Keeper: looks after the whole book. Keepers manage cookbook settings, invite and remove members, and add, edit, or delete any recipe. They can also react and add notes and memories.",
          "Contributor: helps the collection grow. Contributors can view the book, add recipes, and edit or delete recipes they added. They can react and add notes and memories, but can't edit someone else's recipe or manage members and book settings.",
          "Family: enjoys the collection and its stories. Family members can view recipes, react, and add notes and memories. They can't add or edit recipes or manage the cookbook.",
        ],
      },
      {
        id: "roles-in-everyday-use",
        heading: "A simple example",
        paragraphs: [
          "You create a Sunday Suppers book, so you're its Keeper. Your sister wants to add her lasagna and update the instructions after testing it: with Plus, invite her as a Contributor. Your dad wants to cook from the book and leave a memory about Sunday lunches: invite him as Family.",
          "If your sister spots a missing ingredient in a recipe you added, she can leave a note for you. As Keeper, you can make the correction. Being a Contributor doesn't mean being able to rewrite everyone else's recipes.",
        ],
      },
      {
        id: "turn-on-sharing",
        heading: "First, turn on sharing for your book",
        paragraphs: [
          "Free lets you share your one cookbook with up to 3 other people as Family members; you are not counted in that limit. Plus includes unlimited sharing and Contributor invitations. The cookbook owner’s plan sets these limits. Recipients only need a free Home Cooked account, and joining a shared book does not use their allowance to create one of their own.",
          "Open the cookbook you want to share and go to its settings. Choose Shared, then select Save sharing. This lets you invite people into that cookbook. They won't become members until they accept an invitation.",
        ],
      },
      {
        id: "invite-someone",
        heading: "Send an invitation",
        paragraphs: [
          "Open the cookbook's Members page and select Add Someone. Enter the person's email address. Free invitations use the Family role; with Plus, choose Contributor or Family. Select Send invitation and Home Cooked emails them an invitation.",
          "Ask them to open the invitation and sign in or create an account using the same email address you invited. After they accept, they'll have access to that book's recipes with the role you chose.",
          "Invitations expire after seven days. Pending, unexpired invitations reserve a spot in your Free sharing limit. Canceling an invitation, letting it expire, or removing a member frees a spot. If someone hasn't joined, check the pending invitations on Members and confirm the email address with them. If an invitation has expired, send a new one. If it went to the wrong address, cancel the pending invitation and send a new one.",
        ],
      },
      {
        id: "manage-shared-access",
        heading: "Keep track of who has access",
        paragraphs: [
          "The Members page groups people by role so you can see who's looking after the book, who's contributing recipes, and who's joining as Family. As Keeper, you can cancel a pending invitation or open a member's profile to remove their access to the book.",
          "To make the cookbook private again, first remove non-Keeper members and cancel pending invitations. Then return to the cookbook's settings, choose Private, and select Save sharing.",
        ],
      },
      {
        id: "share-a-recipe-or-a-book",
        heading: "A recipe link or a whole cookbook?",
        paragraphs: [
          "Invite someone to the book when you want them to browse the collection and take part over time. Their role determines what they can do inside it.",
          "If someone only wants one dish, use that recipe's sharing option instead. A shared recipe link doesn't make its recipient a cookbook member or assign them a role. Only share a link with content you're comfortable passing along, since a recipient can forward it.",
        ],
      },
    ],
    callout: "Share with up to 3 Family members on Free so they can cook, react, and add notes and memories. Choose Plus to invite more people or Contributors who will add recipes.",
    quote: "Everyone can bring something to the table, even when they aren't bringing a new recipe.",
  }),
  guide({
    slug: "how-to-create-a-digital-family-cookbook",
    title: "How to Create a Digital Family Cookbook",
    description: "Bring scattered recipes, family stories, and everyday favorites together in a digital cookbook that can keep growing with the people who use it.",
    metaDescription: "Create a digital family cookbook by gathering recipes, preserving their stories, organizing useful sections, and sharing a collection that can grow over time.",
    sections: [
      {
        id: "before-it-is-a-cookbook",
        heading: "A family cookbook begins before it looks like one",
        paragraphs: [
          "A family cookbook rarely begins with a tidy table of contents. It begins with a recipe card pushed to the back of a drawer, a screenshot someone meant to sort, or a dish one relative makes from memory. Another recipe may be folded inside an old cookbook, while the version everyone actually uses lives in a text thread. None of these pieces looks like a collection on its own.",
          "Bring them together and a pattern starts to appear. There are the meals that show up every week, the cake requested for every birthday, and the dishes that belong to a particular person or season. Creating a digital family cookbook is the work of noticing that pattern, then giving it a home without polishing away the details that made the recipes worth keeping.",
        ],
      },
      {
        id: "give-it-a-purpose",
        heading: "Give the collection a reason to exist",
        paragraphs: [
          "Before collecting everything, decide what this cookbook is meant to hold. It might be the dependable food your household cooks now, the recipes from one side of the family, or a starter collection for someone moving into a kitchen of their own. A clear purpose gives you a way to say yes to the recipes that belong and not yet to the ones that can wait.",
          "The purpose doesn't need to sound important. A book called The Dinners We Actually Make may become more useful than an ambitious family archive. A collection centered on one grandparent may naturally include a holiday menu, a favorite sandwich, and the cookies that were always waiting in a tin. The shape should come from the life around the food.",
          "Think about the person who will open the cookbook on a busy evening. What will they hope to find? What would they be disappointed to lose? Those questions are more helpful than trying to decide how many recipes a proper cookbook should contain.",
        ],
      },
      {
        id: "find-the-recipes",
        heading: "Start with the recipes that already have a history",
        paragraphs: [
          "The first gathering pass should be generous and uncomplicated. Ask relatives to send what they already have in whatever form is easiest. A clear phone photo is better than waiting months for someone to type a card. A link, PDF, voice note, or rough list of ingredients can all enter the same temporary inbox while you work out what each item needs.",
          "Recipes often hide in places that don't feel like archives. Check the notes app where someone copied a sauce, the bookmarks folder named Recipes, the email with a subject line like Mom's rolls, and the notebook that also contains grocery totals and phone numbers. The goal at this stage isn't to edit. It's to make the scattered pieces visible.",
        ],
        bullets: [
          "Handwritten cards, notebooks, and loose clippings",
          "Screenshots, bookmarked websites, saved posts, and PDFs",
          "Email threads, text messages, and shared family folders",
          "Recipes a relative still makes from memory",
        ],
      },
      {
        id: "ask-for-context",
        heading: "Ask for the details no recipe file can hold",
        paragraphs: [
          "A list of ingredients can tell you how to make a dish, but it can't always tell you why the dish stayed. When someone contributes a recipe, ask who taught it to them, when they tend to make it, and whether their version differs from the one they received. A sentence or two is usually enough to keep a recipe connected to a person and a place.",
          "Specific questions are easier to answer than a request for the whole story. Ask what pan they use, what the dough should feel like, or what always appears beside the dish on the table. Someone may remember that the original recipe called for margarine, that an uncle doubled the pepper, or that the pie was served cold the next morning. These small facts make the directions more useful and the cookbook more recognizable.",
          "Record attribution even when the history is incomplete. From Aunt Lena, adapted over the years is more honest and more meaningful than leaving the source blank. If a recipe came from a published creator or website, keep the creator name and source link with it rather than presenting the work as a family original.",
        ],
      },
      {
        id: "make-it-readable",
        heading: "Make the recipes readable without erasing their personality",
        paragraphs: [
          "Family recipes are often written for cooks who already know what happens next. A card may say bake until done, add enough flour, or use the usual pan. Those phrases belong to the recipe's history, but a new cook may need more help. Keep the original wording in a note or image, then add a clearly labeled clarification when you can verify one.",
          "Consistency helps readers trust the collection. Choose a familiar order for ingredients, write temperatures and measurements the same way, and break long methods into readable stages. If one recipe calls the same ingredient by three names, pick a clear term for the working version. These edits should make the recipe easier to cook, not make every contributor sound like the same person.",
          "When something is uncertain, say so. Needs testing, small can in the original, or timing added after a family test are useful editorial notes. Guessing silently creates a polished recipe that may no longer be true. A good digital cookbook can hold both the evidence and the practical version side by side.",
        ],
      },
      {
        id: "shape-the-book",
        heading: "Shape the cookbook around real meals",
        paragraphs: [
          "Sections should help someone decide what to cook. Begin with broad names people already use, such as Weeknight Dinners, Baking, Holidays, Breakfast, and Family Favorites. Add a narrower section only when several recipes genuinely belong together. Too many categories turn browsing into a filing exercise.",
          "Recipe titles need the same balance of clarity and character. Grandma's Chicken may be meaningful to the family, but Grandma's Lemon Chicken with Potatoes will be easier to find later. Keep affectionate names, then add enough description to make search and browsing work. Consistent naming also makes duplicate versions easier to notice.",
          "Look at the cookbook as a whole before calling it finished. Is there a long stretch of desserts but no main dish anyone cooks? Are three versions of the same casserole competing for attention? Keep the version people use, attach the earlier one when its history matters, and leave room for the collection to reflect ordinary meals as well as celebrations.",
        ],
      },
      {
        id: "keep-it-living",
        heading: "Let the cookbook stay a little unfinished",
        paragraphs: [
          "The most useful family cookbook isn't frozen on the day it's assembled. Recipes change when someone discovers the right pan size, takes a helpful photo, or writes down the timing that used to live only in memory. Invite those corrections and additions. They are signs that the collection is being cooked from rather than merely admired.",
          "Sharing can happen gradually. Start with the people who contributed recipes or are most likely to use them. Ask them to check names, ingredients, and family details. Their corrections may reveal another version or another story, which is easier to handle when the cookbook is understood as a living collection.",
          "Home Cooked is organized around cookbooks rather than a single endless recipe feed. It gives recipes, notes, photos, and source details one place to live, then lets you share an individual recipe or invite family into a cookbook when that suits the collection. The technology should stay in the background. The real measure of success is whether someone can find the dish they remember and cook it again.",
        ],
      },
    ],
    callout: "Begin with the recipes people would miss this week. A small cookbook that gets used is more valuable than a perfect archive that never feels finished.",
    quote: "A family cookbook becomes meaningful when the recipes return to the table.",
  }),
  guide({
    slug: "how-to-preserve-family-recipes",
    title: "How to Preserve Family Recipes for Future Generations",
    description: "Protect family recipes, record the knowledge around them, and keep the collection useful enough to be cooked from for years to come.",
    metaDescription: "Preserve family recipes through careful gathering, attribution, digitization, backups, and a collection future generations can actually use.",
    sections: [
      {
        id: "recipes-disappear-quietly",
        heading: "Family recipes usually disappear quietly",
        paragraphs: [
          "A recipe doesn't have to be thrown away to be lost. It can remain in a box nobody opens, on a phone that no longer turns on, or in the memory of the only person who knows that a written teaspoon really means a heaping spoon from the silverware drawer. The paper may survive while the knowledge around it fades.",
          "Preservation begins by recognizing those fragile places. The goal isn't simply to make a scan of every card. It's to protect the original, record what people know, and create a version that another cook can understand. A recipe stays alive when it can still take part in an ordinary meal.",
        ],
      },
      {
        id: "notice-what-is-at-risk",
        heading: "Notice which recipes are carrying the most risk",
        paragraphs: [
          "Start with the recipes that depend on one person, one object, or one aging piece of technology. A holiday bread made entirely by feel may be more urgent than a clearly written cookie recipe with several copies. A notebook with loose pages deserves attention before a modern file that already lives in a shared folder.",
          "Make a simple inventory with the recipe name, its current location, the person connected to it, and what still needs to be learned. This isn't a cataloging project for its own sake. It's a way to see that the soup is written down but the dumplings aren't, or that the cake card exists but nobody knows which frosting was always used.",
          "Ask family members what they would be sad not to know how to make. Their answers may be surprisingly ordinary: a salad dressing, Sunday eggs, or the way rice was seasoned. Preservation shouldn't be limited to impressive recipes. Weeknight routines often carry the clearest memory of how a household actually ate.",
        ],
      },
      {
        id: "ask-while-you-can",
        heading: "Ask while the small answers are still available",
        paragraphs: [
          "A conversation can preserve what a camera can't. Sit with the person who knows the recipe and ask them to talk through it as if you were making it tomorrow. Where did it come from? What does the dough look like when it's ready? Which ingredient do they always change? The useful details tend to appear while discussing the act of cooking.",
          "Open questions invite stories, but practical questions make the recipe usable. Ask about pan size, heat level, timing, substitutions, and the visual cues that replace a timer. If the cook measures by hand, note what that handful looks like. If two relatives remember the recipe differently, record both accounts instead of forcing a false certainty.",
          "Keep attribution close to the recipe. Include the name of the writer or cook, who taught them, and how the recipe changed if that is known. A future reader should be able to tell the difference between an original card, a family adaptation, and a recipe saved from a published source.",
        ],
      },
      {
        id: "protect-the-original",
        heading: "Protect the object as well as the information",
        paragraphs: [
          "Handle fragile cards with clean, dry hands on a clear surface. Avoid tape, glue, aggressive erasing, or attempts to flatten a brittle fold. Store paper away from direct sun, kitchen steam, and damp basements. An acid-free sleeve or box can protect an important card without changing it.",
          "Photograph or scan the entire object, including the back, edges, stains, and notes in the margins. Use soft, even light and keep the camera parallel so the writing stays readable. Capture an overview first, then take closer images if the ink is faint. A filename that includes the recipe and person is much more useful than a folder full of anonymous camera numbers.",
          "The marks on a card aren't clutter. A crossed-out measurement may show how the recipe evolved. A grease spot may reveal which side was held against the bowl. Preserve a clean digital image before making any adjustment for readability, and keep that original file unchanged.",
        ],
      },
      {
        id: "create-a-usable-copy",
        heading: "Create a copy someone can cook from",
        paragraphs: [
          "Transcription turns an image into a searchable, practical recipe. Copy the wording faithfully first. Then create a working version with ingredients in a consistent order and directions broken into clear stages. Keep editorial additions separate from the original language so the reader can see what was written and what was learned later.",
          "Don't invent missing knowledge. If the oven temperature is absent, mark it as unknown until someone can test the recipe. If the card says one box, retain the phrase and add the package size only when it has been confirmed. Honest uncertainty is safer and more useful than confidence that came from a guess.",
          "A preserved recipe should include enough context to be found again. Add the person, occasion, source, and any familiar alternate name. Someone searching for Christmas potatoes may not remember that the card itself says Company Casserole.",
        ],
      },
      {
        id: "more-than-one-copy",
        heading: "Make sure more than one person can find it",
        paragraphs: [
          "Digital files aren't automatically permanent. Keep at least one backup in a different service or location, and check occasionally that the files still open. Use clear folders and names that another person can understand without you standing beside them. One password, one device, or one knowledgeable relative should never be the entire archive.",
          "Share copies with the people who will value and use them. A relative may correct a name, identify handwriting, or contribute the missing second page. Shared access turns preservation into a family practice instead of leaving one person responsible for everything.",
          "A tool such as Home Cooked can become the usable layer of the archive by placing typed recipes, notes, images, and source details inside organized cookbooks. Keep the original files backed up separately. The cookbook is where the preserved knowledge can return to the kitchen, collect tested notes, and remain part of family life.",
        ],
      },
    ],
    callout: "When a measurement is uncertain, write what the original says and mark what needs testing. Don't replace a family member's voice with a guess.",
    quote: "Preservation works best when the recipe can still be cooked, questioned, and shared.",
  }),
  guide({
    slug: "how-to-organize-recipes-into-a-personal-cookbook",
    title: "How to Organize Recipes Into a Personal Cookbook",
    description: "Turn a scattered recipe collection into an intentional cookbook that reflects how you cook and makes favorites easier to find.",
    metaDescription: "Organize recipes into a personal cookbook with a clear purpose, practical sections, consistent names, and a simple approach to duplicates and upkeep.",
    sections: [
      {
        id: "collection-or-cookbook",
        heading: "A collection isn't quite the same as a cookbook",
        paragraphs: [
          "Most people already have a recipe collection. It may be split between browser bookmarks, photos, index cards, saved posts, and a few dishes that never needed written directions. The collection grows whenever something looks good. A cookbook begins when you decide which of those recipes belong together and how you want to return to them.",
          "That distinction is useful because it removes the pressure to organize everything you've ever saved. A personal cookbook can be selective. It can hold the food you make now, the meals you're learning, or the recipes connected to a particular season or household. Its point of view is what makes it feel like a book rather than storage.",
        ],
      },
      {
        id: "choose-a-point-of-view",
        heading: "Let the way you cook define the book",
        paragraphs: [
          "Begin by naming the job the cookbook should do. You might want one dependable place for weeknight meals, a baking book that records your adjustments, or a family collection that combines several relatives' recipes. The answer will determine what belongs, which sections are useful, and how much context each recipe needs.",
          "A narrow point of view isn't a permanent limitation. It's a way to make the first version coherent. Recipes that don't fit can stay in a separate list until another cookbook earns its own identity. A recipe you've never made might belong in Ideas, while the soup you cooked three times this winter has already earned a place.",
          "If the boundaries still feel unclear, imagine handing the cookbook to someone else. Could you explain in one sentence what they would find inside? That sentence is a practical editorial test. It can prevent a focused collection from becoming another place where every interesting link goes to disappear.",
        ],
      },
      {
        id: "gather-before-sorting",
        heading: "Bring the scattered pieces into view",
        paragraphs: [
          "Organization is difficult when the recipes remain hidden in separate systems. Create a temporary gathering place and bring in enough information to recognize each item: title, source, format, and a quick note about whether you use it. Don't stop to perfect every recipe during this pass.",
          "You'll probably find clusters before you create categories. Several tomato sauces may be variations of one idea. A group of recipes may all come from the same summer or the same relative. Notice those relationships, but resist building an elaborate structure too soon. The collection should tell you what sections it needs.",
          "This is also the moment to separate reliable recipes from possibilities. A personal cookbook is easier to trust when tested favorites don't compete with fifty things you might make someday. Keep an ideas area for the possibilities, then move a recipe into the cookbook after it has a real place in your cooking.",
        ],
      },
      {
        id: "sections-that-help",
        heading: "Use sections that answer an everyday question",
        paragraphs: [
          "Good categories shorten the distance between I need dinner and Here is the recipe. Use words you naturally say, such as Quick Dinners, Baking, Breakfast, Soups, or Holidays. If you regularly think by season, person, or occasion, those can work too. The right structure is the one you can predict without studying it.",
          "Avoid a category for every difference. A dozen sections with one recipe each usually create more searching, not less. Start broad, then split a section when it becomes crowded enough to slow you down. A recipe can carry useful details such as vegetarian or freezer-friendly without requiring a separate cookbook section for each label.",
          "Every recipe should have one obvious home, even if it could fit elsewhere. Put cornbread where you'd look first, not in every category that can make an argument for it. Search and secondary labels can handle the overlap; the main structure should remain calm.",
        ],
      },
      {
        id: "names-and-duplicates",
        heading: "Give every recipe a name you can recognize",
        paragraphs: [
          "Consistent titles make browsing easier and expose duplicates. Decide whether the dish, the person, or the occasion comes first, then use that pattern most of the time. A title such as Aunt June's Corn Pudding keeps the family connection while still telling a new reader what the recipe is.",
          "Duplicates aren't always mistakes. Two cards may record different stages in a recipe's life, or one may contain the adjustments your household actually uses. Choose a working version, then keep the older source as an attachment or note when its history matters. If two recipes are truly the same, remove the extra copy so future edits don't split in different directions.",
          "Use the same restraint with recipe formatting. Familiar units, a stable ingredient order, and clear directions reduce friction. Preserve unusual phrasing in a story or source note when it carries the cook's voice. Organization should make personality easier to notice, not wipe it away.",
        ],
      },
      {
        id: "maintain-through-use",
        heading: "Maintain the cookbook by cooking from it",
        paragraphs: [
          "A personal cookbook improves at the stove. When you notice that the timing is optimistic or that the sauce needs more salt, add the note while the experience is fresh. Remove a recipe that repeatedly disappoints you. Add a photo when it will help someone recognize the finished dish.",
          "A short review every few months is usually enough. Look for recipes still sitting in the wrong section, titles that are hard to search, and several versions competing for attention. Small corrections keep the structure healthy without turning the cookbook into a permanent administration project.",
          "Home Cooked takes a book-first approach, so recipes can belong to intentional cookbooks instead of one undifferentiated feed. Categories, notes, source details, and sharing all support the structure you chose. The value comes from the editorial decision you made first: what this cookbook is for and why these recipes belong together.",
        ],
      },
    ],
    callout: "If you wouldn't know where to look for a recipe on a busy Tuesday, the structure is probably more complicated than it needs to be.",
    quote: "A personal cookbook is shaped as much by what you leave out as by what you keep.",
  }),
  guide({
    slug: "how-to-turn-old-recipe-cards-into-a-digital-cookbook",
    title: "How to Turn Old Recipe Cards Into a Digital Cookbook",
    description: "Transform handwritten recipe cards into a readable digital cookbook while keeping their original language, marks, and family context intact.",
    metaDescription: "Turn old recipe cards into a digital cookbook through careful sorting, photography, transcription, clarification, attribution, and organization.",
    sections: [
      {
        id: "cards-as-objects",
        heading: "The card is part of the recipe",
        paragraphs: [
          "An old recipe card carries more than instructions. Its handwriting may identify the cook before a name does. The softened corners show how often it was handled, and a note squeezed into the margin may record the change that made the recipe work. Even a stain can help a family recognize the card they remember seeing on the counter.",
          "Turning those cards into a digital cookbook shouldn't mean choosing between the object and a clean transcription. Preserve both. The image keeps the evidence and personality of the original; the typed recipe gives a new cook something searchable and readable enough to use.",
        ],
      },
      {
        id: "sort-without-overthinking",
        heading: "Begin with a gentle sorting pass",
        paragraphs: [
          "Clear a dry table and sort the cards into manageable groups. You might group them by person, meal, approximate age, or physical condition. Set aside torn cards, faint pencil, and loose multi-page recipes for extra attention. The purpose is to create a workable order, not decide which recipes deserve to survive.",
          "Notice duplicates and related pieces without discarding anything. Two nearly identical cards may reveal a substitution or a later revision. An unlabeled scrap may match the handwriting and ingredients on another card. Keep uncertain pieces together until you have enough context to identify them.",
          "Give each card a simple reference number in a separate tracking note. That number can connect the physical card, image files, transcription, and family comments without writing on the original. A basic record now prevents confusion when dozens of similar files begin to accumulate.",
        ],
      },
      {
        id: "photograph-every-clue",
        heading: "Photograph every side and every clue",
        paragraphs: [
          "Use bright, indirect light and place the card on a plain surface. Hold the camera parallel to avoid stretched corners, fill the frame without cutting off edges, and check the image at full size before moving on. A phone camera is often enough when the light is even and the focus is sharp.",
          "Capture the back even when it appears blank. Faint pencil, an old price, or a second set of directions can be easy to miss. Photograph envelopes, clipped notes, and inserts that belong with the recipe. If the writing is very light, take a second closer image rather than editing the only copy beyond recognition.",
          "Keep the untouched image and make a separate adjusted copy if contrast or cropping improves readability. Use filenames that another person can understand, such as reference number, recipe name, and contributor. Camera roll numbers alone won't help when someone is looking for the original biscuit card years later.",
        ],
      },
      {
        id: "transcribe-what-is-there",
        heading: "Transcribe what the cook actually wrote",
        paragraphs: [
          "Start with a faithful transcription before making the recipe modern or complete. Preserve unusual spellings, abbreviations, and phrases such as a slow oven or butter the size of an egg. Mark words you can't read rather than quietly replacing them with what seems likely.",
          "Then create a practical working version. Expand familiar abbreviations, arrange ingredients in the order they are used, and break a dense paragraph into clear directions. Put every addition in an editor's note or tested note. The reader should always be able to tell the difference between the card and later guidance.",
          "Missing instructions require patience. Look for another family copy, ask someone who remembers the dish, or test the recipe in a small batch. An unexplained oven temperature should remain an open question until there is evidence. A digital cookbook gains trust by being honest about what is known.",
        ],
      },
      {
        id: "keep-voice-and-context",
        heading: "Keep the shorthand, quirks, and person nearby",
        paragraphs: [
          "Some phrases are worth preserving even after they have been clarified. Mix until it looks right may frustrate a beginner, but it also reveals how the original cook worked. Keep the phrase, then add what you observed: glossy and thick enough to fall slowly from the spoon, for example.",
          "Record who wrote the card, who used it, and how it entered the family. If the recipe was copied from a newspaper, community cookbook, or food package, include that source when known. Attribution gives the card an honest history and can help explain language or measurements that belong to another era.",
          "Ask relatives to look at the images. Handwriting can trigger recognition, and someone may remember that the crossed-out sugar amount was a permanent family adjustment. Those responses belong with the recipe because they turn an isolated object into part of a larger story.",
        ],
      },
      {
        id: "build-the-digital-book",
        heading: "Give the cards a cookbook people can browse",
        paragraphs: [
          "A folder of scans is valuable, but it isn't yet an easy cookbook. Give each recipe a searchable title, connect it to its original image, and organize the working versions into a few clear sections. The structure might follow meals, contributors, branches of a family, or the order of the original box.",
          "Keep backups of the original images outside the cookbook, and share copies with another trusted person. The digital book should make discovery easier without becoming the only place the source files exist. Good preservation uses more than one copy and more than one person who knows where to look.",
          "Home Cooked can hold the readable recipe, source details, private attachments, and family notes together inside a cookbook. That pairing lets someone admire the handwriting and still make the casserole without guessing. The card remains an object worth caring for, while the recipe returns to use.",
        ],
      },
    ],
    callout: "Never correct the only copy of a transcription. Preserve what the card says, then place verified clarification beside it as a separate note.",
    quote: "The image preserves the card. The transcription helps the recipe keep cooking.",
  }),
  guide({
    slug: "how-to-share-family-recipes",
    title: "How to Share Family Recipes With Relatives",
    description: "Bring recipes from different relatives into a collection that keeps sources clear, stays useful, and can improve as the family contributes.",
    metaDescription: "Share family recipes with relatives by gathering versions, preserving attribution, organizing useful collections, and keeping shared recipes current.",
    sections: [
      {
        id: "recipes-live-with-different-people",
        heading: "The family collection is already divided among people",
        paragraphs: [
          "One relative has the handwritten pie recipe. Someone else knows the casserole everyone remembers from Thanksgiving, but has never written it down. A cousin saved a phone photo of the rolls, and three people are certain their version of the sauce is the original. Sharing family recipes often begins by admitting that no single person has the whole collection.",
          "That isn't a problem to solve by choosing one keeper of the truth. It's an invitation to build a clearer shared record. The aim is to gather what exists, preserve who contributed it, and give relatives a version they can actually find and use.",
        ],
      },
      {
        id: "make-a-specific-request",
        heading: "Ask for one recipe and one memory",
        paragraphs: [
          "A broad request for all the family recipes can feel like homework. A specific invitation is easier: send the chicken dish you make for birthdays, or photograph the cookie card in your mother's handwriting. Give people a simple way to respond by text, email, photo, voice note, or link.",
          "Ask for one small piece of context with the recipe. Who made it? When did it usually appear? Is there a change the contributor always makes? These questions produce details that a bare ingredient list can't recover later, and they help relatives feel that their knowledge matters as much as the file itself.",
          "Set a reasonable first boundary. A holiday collection or a book of one person's recipes can be easier to complete than an attempt to gather everything at once. Early results also make it easier for other relatives to understand the project and join in.",
        ],
      },
      {
        id: "identify-the-versions",
        heading: "Let different versions explain themselves",
        paragraphs: [
          "When two relatives send the same recipe, compare before merging. One version may have the original wording while another contains the changes everyone now expects. Dates, handwriting, source notes, and ingredient differences can help establish how the recipe traveled.",
          "Choose a clear working version when the family needs one, but keep meaningful alternatives connected to it. Label a variation by person or place instead of calling another relative wrong. Aunt Rosa's Sunday version and the smaller weeknight batch can coexist when the distinction helps a cook choose.",
          "If nobody knows which version came first, say that. Family memory is allowed to be incomplete. A short note about the disagreement is more honest than inventing a definitive history, and it may prompt someone else to recognize the missing piece.",
        ],
      },
      {
        id: "organize-before-sharing",
        heading: "Give the recipes enough order to be welcoming",
        paragraphs: [
          "A folder full of attachments may technically be shared, but it places all the work on the recipient. Before inviting the family in, give recipes recognizable titles, readable ingredients, and a few broad sections. Keep source names and original images attached so the cleanup doesn't erase where anything came from.",
          "Think about the difference between sharing one recipe and sharing a collection. A link to a single soup is useful when someone asks what to make tonight. A cookbook is better when the recipes belong together, such as holiday baking, meals from a grandparent, or the dependable food of one household.",
          "Add enough context for someone outside the original kitchen. The right pan, a realistic yield, and a cue for doneness can matter more than polished prose. Shared recipes succeed when relatives don't need a private translation to cook them.",
        ],
      },
      {
        id: "share-with-care",
        heading: "Respect the people behind the recipes",
        paragraphs: [
          "Family recipes can contain private stories, personal photographs, or work copied from a published source. Ask before sharing sensitive material widely, and honor the contributor's preferred attribution. A family collection doesn't automatically need to be public to be meaningful.",
          "When a recipe came from a living creator, website, or published work, keep the source and link. Share your family notes and adaptations without presenting someone else's work as your own. Good attribution is both respectful and useful when a reader wants the original technique or context.",
          "Explain how updates will work. If several people can contribute, decide whether corrections replace the working recipe or appear as notes. A little clarity prevents the shared collection from splitting into another round of competing copies.",
        ],
      },
      {
        id: "keep-the-door-open",
        heading: "Keep the door open after the first share",
        paragraphs: [
          "The first version will cause people to remember more. Someone will notice a missing salad, recognize a card, or finally explain what a vague instruction meant. Make it easy to send those additions, and keep a small record of what changed so contributors know their corrections were heard.",
          "Home Cooked supports individual recipe sharing and cookbook invitations on both plans: up to 3 Family members on Free, or unlimited people and Contributor access with Plus. That makes it possible to answer a quick request without exposing an entire collection, or to give relatives a common home where recipes, memories, and notes can grow together.",
          "The best shared collection doesn't prove who remembered everything correctly. It gives the family a dependable place to bring what each person knows. Over time, that place becomes more useful because the recipes are cooked, questioned, and improved together.",
        ],
      },
    ],
    callout: "A specific request gets better answers than a broad one. Ask for one recipe, one source, and one detail the next cook should know.",
    quote: "A shared recipe carries farther when its source and story travel with it.",
  }),
  guide({
    slug: "how-to-organize-saved-recipes",
    title: "How to Organize Recipes Saved From Around the Internet",
    description: "Turn screenshots, bookmarks, saved posts, and open tabs into a useful recipe collection without losing the creators and sources behind them.",
    metaDescription: "Organize recipes saved from the internet by gathering links, removing duplicates, preserving sources, grouping by use, and maintaining a practical collection.",
    sections: [
      {
        id: "saved-is-not-found",
        heading: "Saved doesn't always mean findable",
        paragraphs: [
          "It's easy to save a recipe online. It takes one tap to bookmark a page, capture a screenshot, pin an image, or send a link to yourself. The trouble appears later, usually around dinner, when you remember the promising noodle dish but not whether it lives in a browser folder, a message, or the camera roll between vacation photos.",
          "An online recipe collection becomes useful when saving is followed by a small editorial decision. Why did this recipe matter? Where would you look for it? Have you cooked it, or is it still an idea? Answering those questions turns a pile of possibilities into something you can return to.",
        ],
      },
      {
        id: "empty-the-inboxes",
        heading: "Gather the digital breadcrumbs in one place",
        paragraphs: [
          "Begin with a temporary inbox. Move bookmarks, screenshots, PDFs, notes, saved posts, and links from text messages into one review list. Don't build categories while you gather; switching between collecting and filing makes both jobs slower.",
          "Keep enough information to identify the source. A screenshot of ingredients without the creator's name or method may be impossible to reconnect later. When you can, return to the original page and save the title, creator, and link. If the page is already gone, note what you know instead of treating the image as complete.",
          "Include open tabs and messages that have become unofficial storage. The aim isn't to preserve every passing interest. It's to see the true size of the collection so you can decide which recipes deserve a dependable home.",
        ],
        bullets: [
          "Browser bookmarks and open tabs",
          "Screenshots, saved posts, and Pinterest boards",
          "PDFs, newsletters, notes, and email links",
          "Recipes sent through texts and group chats",
        ],
      },
      {
        id: "decide-what-to-keep",
        heading: "Keep a reason with every recipe",
        paragraphs: [
          "A useful filter is simple: have you made it, do you genuinely plan to make it, or can you explain why it belongs? A recipe saved because it looked good for three seconds doesn't need the same status as the soup you've cooked four times. Let some links go without turning the review into a moral judgment about waste.",
          "Separate tested recipes from ideas. The tested ones can enter a cookbook with your notes and adjustments. The possibilities can wait in a smaller to-try list. This distinction prevents an inspiring backlog from crowding out the food you already trust.",
          "Notice duplicates by looking past slightly different titles. Five versions of crispy potatoes may represent one ongoing search. Keep the most promising source or the version that worked, then record what you liked rather than saving every near match forever.",
        ],
      },
      {
        id: "protect-the-source",
        heading: "Treat the source as part of the recipe",
        paragraphs: [
          "Online recipes belong to the people who created and published them. Keep the creator's name and original link with your private notes, and return to the source when you cook. Don't remove attribution or republish protected work as though it were your own.",
          "Source details are practical as well as respectful. The original page may contain technique photos, a video, substitutions, comments, or corrections that don't fit in a saved screenshot. A good record lets you find that context again.",
          "If you adapt a recipe for your household, label the changes clearly. Your notes about less sugar, a different pan, or a shorter baking time can be valuable without obscuring the creator whose work gave you the starting point.",
        ],
      },
      {
        id: "organize-by-use",
        heading: "Organize for the moment you'll need it",
        paragraphs: [
          "Group recipes by the decisions you actually make. Weeknight Dinners, Weekend Projects, Baking, Packed Lunches, and Holiday Ideas may be more useful than a strict taxonomy of cuisines and techniques. A collection should support cooking, not demonstrate how finely you can classify it.",
          "Use clear titles and a consistent naming pattern. If the original headline is long or vague, keep the source title in the record and add a practical name you'll recognize. The phrase that helps you search may be the ingredient, the occasion, or the person who first sent the link.",
          "Home Cooked can import recipes from supported websites and files for private use, then organize them alongside recipes you write yourself. Review every import for accuracy and preserve its source. Importing saves typing; it doesn't replace the judgment that turns a saved page into part of your cookbook.",
        ],
      },
      {
        id: "small-maintenance",
        heading: "Use a small maintenance rhythm",
        paragraphs: [
          "Online collections become chaotic because saving is instant and reviewing is postponed. Give the inbox ten minutes after you cook. Add the recipe if it worked, include the note you'll need next time, and delete the screenshots or extra tabs that no longer serve a purpose.",
          "Once in a while, scan for broken links, duplicate ideas, and recipes that have waited untouched for a year. Keep a source copy or your own lawful notes where appropriate, but accept that not every inspiration needs permanent storage.",
          "The goal isn't a perfectly empty inbox. It's a collection where the good recipes are easier to find than the forgotten ones. When the structure reflects your real cooking, saving becomes the beginning of a decision instead of the end of one.",
        ],
      },
    ],
    callout: "Before saving another recipe, add one line about why you want it. That reason will be more useful later than another anonymous screenshot.",
    quote: "A useful online collection remembers why a recipe mattered, not only where it was found.",
  }),
  guide({
    slug: "how-to-create-a-cookbook-as-a-family-gift",
    title: "How to Create a Cookbook as a Family Gift",
    description: "Create a warm, useful family gift by bringing recipes together with the people, photographs, and everyday memories that give them meaning.",
    metaDescription: "Create a family cookbook gift with a thoughtful theme, contributed recipes, personal context, careful editing, and simple digital sharing.",
    sections: [
      {
        id: "gift-is-in-the-context",
        heading: "The gift is in the context, not the recipe count",
        paragraphs: [
          "A family cookbook becomes a gift when it feels unmistakably meant for someone. The recipes matter, but so do the names beside them, the photograph of a familiar table, and the note explaining why a simple cake appeared at every birthday. Twenty well-chosen recipes can feel more generous than a hundred gathered without a point of view.",
          "Begin with the recipient rather than the archive. Think about what they cook now, what part of family life they miss, and which dishes they may want to carry into a new home or new stage of life. The collection should be useful enough to open on a Tuesday and personal enough to feel different from any other cookbook.",
        ],
      },
      {
        id: "choose-the-shape",
        heading: "Choose an occasion and a gentle theme",
        paragraphs: [
          "The occasion can suggest the shape of the book. A graduation gift might collect the meals someone grew up eating. A new parent may appreciate the family's easiest dinners. An anniversary collection might follow celebrations across the years. The theme doesn't need to appear in every title, but it should guide what belongs.",
          "Keep the idea narrow enough to finish. The recipes from Dad's Sunday table is clearer than everything our family has ever cooked. A focused theme makes omissions feel intentional, and it helps relatives understand what kind of contribution to send.",
          "Write a one-sentence promise for the cookbook. This book gathers the food that made our summer visits feel like home is specific enough to guide recipe choices, photographs, and the opening note. If an item doesn't support that promise, save it for another collection.",
        ],
      },
      {
        id: "invite-contributions",
        heading: "Invite relatives to contribute without assigning homework",
        paragraphs: [
          "Ask each person for one recipe and one memory. A small request is more likely to be answered than an open call for stories. Offer examples: the breakfast Grandpa made, the dip that always disappeared first, or the dish you learned after moving away.",
          "Let people respond in the form they already have. A photo of a card, a voice note, a copied email, or a link can all be useful. Follow up with specific questions about unclear amounts, names, or occasions. Those short conversations often supply the detail that makes the gift feel alive.",
          "Keep track of attribution as contributions arrive. Record who sent the recipe, whose version it is, and any published source. If two relatives contribute variations, present them honestly or choose a working version with a note about the other.",
        ],
      },
      {
        id: "edit-for-the-recipient",
        heading: "Edit for the person who will cook from it",
        paragraphs: [
          "A cherished recipe can still be difficult to follow. Read every entry as though the recipient has never watched it being made. Add pan sizes, temperatures, yields, and cues for doneness when they can be verified. Separate ingredients into useful groups and put them in the order they appear in the method.",
          "Preserve personality in the right place. Keep the phrase stir until it looks right, then add a tested description without deleting the original voice. A story note can hold the joke, nickname, or family shorthand while the directions remain clear enough for a first attempt.",
          "Photographs should contribute recognition or context. A useful image might show the finished dish, the handwritten source, the cook who made it, or the table where it usually appeared. A few meaningful photographs are better than decoration added simply to fill space.",
        ],
      },
      {
        id: "arrange-an-inviting-book",
        heading: "Arrange an inviting path through the collection",
        paragraphs: [
          "Open with a short note that explains why these recipes were chosen. Then use sections that fit the theme, such as Sunday Suppers, Birthday Baking, Food for the Freezer, or Recipes Everyone Asked For. A handful of dependable dishes near the beginning gives the recipient an easy place to enter.",
          "Vary the rhythm. A longer story can sit beside a recipe that needs only one sentence of context. Leave room for an ordinary favorite that may not look impressive but carries a clear memory. The book should feel edited, not mechanically filled.",
          "Read the collection from beginning to end before sharing it. Check spelling of names, confirm private stories are appropriate to include, and ask another relative to test the directions that concern you. Careful editing is part of the gift because it shows respect for both the recipient and the contributors.",
        ],
      },
      {
        id: "keep-growing",
        heading: "Let the gift keep growing after the occasion",
        paragraphs: [
          "A digital family cookbook can continue after the day it's given. The recipient can add a photograph after making a recipe, record a substitution that worked, or contribute the dish that becomes part of their own household. That ongoing use gives the collection a life beyond the occasion.",
          "Home Cooked lets you create a cookbook, gather recipes and notes in one place, and share it with up to 3 Family members on Free. Plus adds unlimited sharing and Contributor access. You can also share an individual recipe when that is all someone needs. The platform is most useful when it supports the relationships already present in the gift rather than turning the collection into an advertisement.",
          "End with an invitation, not a claim that the book is complete. Ask the recipient to cook from it, question it, and add what comes next. A family gift becomes more meaningful when it makes room for the person receiving it to become part of the story.",
        ],
      },
    ],
    callout: "Ask each contributor for one recipe and one detail the recipient wouldn't know. Small prompts make a richer gift than a broad request for family memories.",
    quote: "The most personal cookbook gift leaves room for the recipient's own kitchen.",
  }),
  guide({
    slug: "how-to-digitize-a-family-recipe-collection",
    title: "How to Digitize a Family Recipe Collection",
    description: "Build a careful digital archive that preserves original recipe materials while turning their contents into a collection people can search and use.",
    metaDescription: "Digitize a family recipe collection with an inventory, careful photography, transcription, naming, attribution, organization, backups, and practical access.",
    sections: [
      {
        id: "more-than-scanning",
        heading: "Digitizing is more than making pictures of paper",
        paragraphs: [
          "A folder of scans can preserve the appearance of a recipe collection while leaving its contents almost as difficult to use as before. The files may have names such as IMG_4382, the backs of cards may be missing, and nobody knows whether the blurry page belongs to the cookie recipe beside it. The paper has been copied, but the collection hasn't been translated into something people can navigate.",
          "A useful digitization project has two parts. It captures the original materials faithfully, and it creates enough structure for someone to find, understand, and cook from them. The work is slower than pressing a scan button, but it prevents a physical mystery from becoming a digital one.",
        ],
      },
      {
        id: "inventory-first",
        heading: "Take inventory before choosing a workflow",
        paragraphs: [
          "Look at the formats, locations, and condition of the collection. Count boxes loosely rather than card by card. Note notebooks, clippings, folders, computer files, and recipes that still live only in someone's memory. Fragile pages and unusual sizes may need a different setup from modern index cards.",
          "Create a tracking sheet with a reference number, recipe name if known, source or person, physical location, and status. The status might be not captured, photographed, transcribed, needs review, or complete. Keep the system simple enough to update while working.",
          "Choose a first batch that is meaningful and manageable. Ten recipes from one notebook can teach you more about lighting, filenames, and transcription than an ambitious attempt to process every box at once. Use what you learn to improve the workflow before the collection grows.",
        ],
      },
      {
        id: "capture-consistently",
        heading: "Create clear, consistent digital originals",
        paragraphs: [
          "For photographs, use indirect daylight or two even light sources and keep the camera parallel to the page. Include the full object and a small border around it. For scans, choose enough resolution to read faint handwriting and small type. Review the first few files on a larger screen before continuing.",
          "Capture fronts, backs, inserts, envelopes, and neighboring pages when the relationship matters. If a notebook recipe continues without a heading, include the page before it for context. Don't rely on memory to reconnect loose parts later.",
          "Preserve an untouched master file. Cropped, brightened, or compressed copies can be useful for everyday viewing, but they shouldn't replace the best original capture. Use a consistent filename that includes the tracking number and a recognizable recipe or contributor name.",
        ],
        bullets: [
          "Capture the whole object before taking detail images",
          "Check focus and legibility at full size",
          "Keep front, back, and related inserts together",
          "Save an untouched master before editing a copy",
        ],
      },
      {
        id: "transcribe-for-use",
        heading: "Transcribe the recipes people want to cook",
        paragraphs: [
          "Not every captured item needs immediate transcription. Prioritize the recipes family members request, the cards that are hardest to read, and the dishes most likely to be cooked. A searchable title and short description can make the remaining images discoverable while detailed transcription continues over time.",
          "Type what the source says before normalizing it. Preserve original language in a source note, then create a working ingredient list and method. Flag unreadable words and missing facts. If you verify a pan size or timing through testing, identify that information as a later addition.",
          "Use text recognition as a starting point only. Decorative type, faded ink, fractions, and handwriting can produce confident errors. Compare every imported line with the image, especially quantities, temperatures, and words that could change the result.",
        ],
      },
      {
        id: "name-and-connect",
        heading: "Name files so the relationships survive",
        paragraphs: [
          "A good filename is helpful, but metadata carries the richer connections. Record the recipe title, contributor, original source, approximate date when known, and any family occasion. Link the transcription to the master images through the same reference number.",
          "Keep a record of uncertainty. Unknown writer, date estimated from notebook, or second page may be missing are valuable facts. They prevent a future reader from treating a guess as history and give relatives a clear question they may be able to answer.",
          "Organize working recipes into broad cookbook sections rather than copying the exact order of a storage box unless that order has meaning. The physical archive and the usable cookbook can have different structures as long as the connection between them remains clear.",
        ],
      },
      {
        id: "back-up-and-invite-use",
        heading: "Back up the archive, then invite people to use it",
        paragraphs: [
          "Keep more than one copy of the master files, with at least one in a different service or physical location. Check that backups complete and files open. Give another trusted person enough information to find the archive without relying on your device or account alone.",
          "Then make the collection approachable. Home Cooked can hold readable recipes, notes, source information, and original attachments inside organized cookbooks. Family members can browse the usable version while the master archive remains protected and backed up elsewhere.",
          "Usage is part of preservation. When someone cooks a recipe, they may identify a missing instruction, add a photo, or remember the person who made it. Build a way to return those discoveries to the record. A digitization project succeeds when it produces not only safer files, but a collection people understand well enough to keep alive.",
        ],
      },
    ],
    callout: "Test the entire workflow on one small batch. A clear naming mistake is easy to fix after ten recipes and exhausting to fix after five hundred.",
    quote: "The archive protects the source. The cookbook makes the source useful.",
  }),
  guide({
    slug: "how-to-build-your-own-recipe-book-online",
    title: "How to Build Your Own Recipe Book Online",
    description: "Create an online recipe book with a clear purpose, thoughtful structure, and enough flexibility to keep changing as you cook.",
    metaDescription: "Build your own recipe book online by choosing a purpose, selecting recipes, creating useful sections, adding context, and maintaining a living cookbook.",
    sections: [
      {
        id: "beyond-an-online-pile",
        heading: "An online pile of recipes isn't yet a recipe book",
        paragraphs: [
          "The internet makes it possible to collect recipes faster than anyone can cook them. Links accumulate, screenshots disappear into the camera roll, and typed family recipes sit beside saved ideas with no clear relationship. Putting those items online solves the storage problem, but not the question of what kind of book they make together.",
          "A recipe book has a point of view. It contains choices about what belongs, how a reader moves through the collection, and which details deserve to stay with each dish. Building one online gives you room to revise those choices without losing the feeling of a coherent book.",
        ],
      },
      {
        id: "decide-what-book-is-for",
        heading: "Begin with the book you want to open",
        paragraphs: [
          "Imagine the moment when you'll use the recipe book. You may be planning dinner, baking through family favorites, collecting food for a new household, or recording your own most reliable dishes. That moment should guide the first group of recipes.",
          "Give the book a working title and a short description. These don't need to be clever. Weeknight Food We Trust gives you a clearer editorial boundary than My Recipes. A focused beginning makes it easier to choose sections and easier to notice when an interesting recipe belongs somewhere else.",
          "Start with recipes you know or have a strong reason to keep. A small book that reflects your real cooking will teach you what the structure needs. You can add ambitious projects later without allowing them to bury the meals that brought you there.",
        ],
      },
      {
        id: "select-and-shape",
        heading: "Select recipes that can live well together",
        paragraphs: [
          "Gather from every relevant source, including cards, documents, websites, messages, and your own notes. Preserve attribution as you go. Then look across the group for repetition, gaps, and natural relationships before deciding on the final shape.",
          "A recipe deserves a place when it supports the purpose of the book. Tested favorites can sit in the main collection; possibilities can wait in an ideas list. When several versions compete, choose the one you use and keep meaningful alternatives as notes rather than forcing the reader to compare them every time.",
          "Don't worry about reaching a certain number. A recipe book feels complete when it gives the reader a satisfying set of choices, not when it crosses an arbitrary total. Ten excellent baking recipes can form a stronger book than sixty unrelated saves.",
        ],
      },
      {
        id: "build-clear-sections",
        heading: "Create a table of contents for real life",
        paragraphs: [
          "Online tools make it tempting to create endless tags, but the main sections should remain easy to scan. Choose categories based on how you decide what to cook: Quick Dinners, Slow Weekends, Baking, Breakfast, or Celebrations. A section earns its place when it helps several recipes become easier to find.",
          "Name recipes consistently and descriptively. Keep a family nickname when it matters, then add the words a new reader might search. A title such as Green Cake may be beloved, but Green Cake with Pistachio and Citrus gives the online book more useful information without discarding the familiar name.",
          "Use secondary details for overlap. A vegetarian soup can live in Soups while a label records that it's meatless. The table of contents stays calm, and search can still surface the qualities that matter in a particular moment.",
        ],
      },
      {
        id: "give-recipes-a-consistent-shape",
        heading: "Give every recipe a familiar shape",
        paragraphs: [
          "Consistency reduces the effort of cooking from a screen. Put ingredients in the order they are used, divide long recipes into sensible groups, and write steps that can be followed with messy hands and divided attention. Include servings, timing, and source information when known.",
          "Uniform structure doesn't require uniform voice. Keep the note about who taught you the dish, the photograph from the first attempt, and the phrase everyone in the family uses. Practical formatting creates space for those details because the reader no longer has to struggle with the basics.",
          "Online recipes can be corrected as you learn. Add the pan size you forgot, revise the timing after a new oven, or record the substitution that became permanent. Keep important changes visible so the book reflects experience rather than quietly rewriting it.",
        ],
      },
      {
        id: "a-living-cookbook",
        heading: "Treat editability as part of the cookbook",
        paragraphs: [
          "A living recipe book is allowed to change without losing its identity. Review it while cooking, not only while organizing. Remove recipes that never work, promote ideas that become favorites, and add the story that someone finally remembered over dinner.",
          "Home Cooked is built around this book-first idea. You can create distinct cookbooks, organize recipes within them, add notes and images, and share a recipe or invite family into a cookbook when appropriate. The result can feel like an intentional book while retaining the flexibility of an online collection.",
          "The best online recipe book becomes easier to recognize over time. Its sections reflect how you cook, its recipes carry the details you need, and its history remains visible in notes and sources. Technology keeps the pages editable; your choices are what make them a book.",
        ],
      },
    ],
    callout: "Name the recipe book before you organize it. A clear title can settle dozens of smaller decisions about what belongs.",
    quote: "The format may be online, but the book still needs a point of view.",
  }),
  guide({
    slug: "how-to-preserve-handwritten-family-recipes",
    title: "How to Preserve Grandma’s Handwritten Recipes",
    description: "Protect handwritten recipes from grandparents, parents, relatives, and friends while preserving both the original artifact and a version people can cook from.",
    metaDescription: "Preserve handwritten family recipes through safe handling, careful photography, faithful transcription, practical clarification, attribution, and sharing.",
    sections: [
      {
        id: "handwriting-in-the-kitchen",
        heading: "Sometimes the handwriting is what you recognize first",
        paragraphs: [
          "Maybe the recipe is only six lines long. There's a butter stain in one corner, a measurement crossed out twice, and a note in the margin that becomes smaller as it runs out of room. Before reading the title, you know whose handwriting it is. The card feels familiar because it spent years in a kitchen you remember.",
          "The phrase Grandma's handwritten recipes is familiar, but these objects may come from a grandfather, parent, aunt, neighbor, friend, or anyone whose food became part of your life. Preserving them means caring for two things at once: the physical evidence of that person and the practical knowledge needed to make the dish again.",
        ],
      },
      {
        id: "handle-with-care",
        heading: "Give the original a safe place to rest",
        paragraphs: [
          "Move fragile recipes away from heat, moisture, direct sunlight, and kitchen grease. Handle them with clean, dry hands on a clear surface. Don't tape a tear, erase a mark, or press a brittle fold flat. Conservation should stabilize the object rather than make it look new.",
          "Use an acid-free sleeve, folder, or box sized so the card doesn't bend. Keep related pages and envelopes together without forcing them into contact with adhesive. If a document is badly damaged or unusually valuable, a local archivist or conservator can advise you before an attempted repair causes more harm.",
          "Write identifying information in a separate record rather than on the card. A simple reference number can connect the physical object to its photographs, transcription, and story. This becomes especially useful when several cards share the same title or handwriting.",
        ],
      },
      {
        id: "make-a-faithful-image",
        heading: "Photograph the card before trying to interpret it",
        paragraphs: [
          "Place the recipe on a plain surface in soft, even light. Keep the camera directly above it, include every edge, and check the focus on the smallest writing. Photograph the back and any insert, even if it seems blank at first. Faint pencil and old impressions can hide until the image is enlarged.",
          "Take an overall image before close details. If the ink is faded, make a second copy with careful contrast adjustments while preserving the untouched original file. Don't crop away stains, torn edges, crossed-out lines, or notes simply because they aren't part of the formal instructions.",
          "Use filenames that connect the image to a person and recipe when known. Back up the files in more than one place and share a copy with another trusted family member. A digital image is only safer than the card when people can still locate and open it.",
        ],
      },
      {
        id: "transcribe-with-humility",
        heading: "Transcribe with patience and a little humility",
        paragraphs: [
          "Begin by typing exactly what you can read. Keep original spelling, abbreviations, and punctuation in the source transcription. Use brackets or a note for uncertain words. The temptation to fix the recipe while copying it can make it impossible to know later what the writer actually said.",
          "Old instructions often assume a shared kitchen vocabulary. A moderate oven, one package, or bake until done may once have been perfectly clear. Keep that wording, then add modern guidance separately when it can be verified through packaging history, another family copy, or a careful test.",
          "Handwriting recognition software can help with typed clippings, but it shouldn't be trusted with family script, fractions, or stained paper without review. Compare every quantity and temperature with the image. One confident transcription error can change both the recipe and the record.",
        ],
      },
      {
        id: "preserve-the-quirks",
        heading: "Preserve the quirks without making a new cook guess",
        paragraphs: [
          "The unusual parts often carry the most personality. A crossed-out ingredient shows revision. A repeated underline may reveal what the cook considered important. A phrase such as just enough milk records judgment that was learned by sight and touch rather than a measuring cup.",
          "Keep those elements in the image and source note, then build a clear working recipe beside them. Ingredients can be reordered for use, missing steps can be labeled as questions, and tested guidance can describe texture or timing. The practical version should help someone cook without pretending the original was more precise than it was.",
          "If family members disagree about a detail, preserve the disagreement. One person may remember walnuts while another insists the cake never had them. Label variations by contributor or occasion. A recipe with a visible history is more trustworthy than a seamless version created by hiding uncertainty.",
        ],
      },
      {
        id: "record-the-person",
        heading: "Write down the person before the story thins out",
        paragraphs: [
          "Record the writer's full name, their relationship to the family, and who used the card. Ask where the recipe came from and when it usually appeared. A few concrete details, such as the blue bowl used for mixing or the neighbor who first brought the dish, can locate the recipe in a life without turning the note into a grand tribute.",
          "Include published sources when known. Many handwritten cards were copied from newspapers, food packages, community collections, or friends. Attribution doesn't make a recipe less personal. It shows how the recipe entered the household and what happened to it there.",
          "Invite others to look at the card. The handwriting, paper, or phrasing may prompt recognition that the recipe title alone didn't. Record those memories with names and dates so future readers can distinguish recollection from fact.",
        ],
      },
      {
        id: "return-it-to-use",
        heading: "Let the recipe leave the box without replacing the card",
        paragraphs: [
          "Organize the typed recipe, original images, attribution, and notes in a collection people can browse. Use a searchable title while retaining the familiar family name. Place the recipe in the section where someone is most likely to look for it, and keep backups of the original files outside the working cookbook.",
          "Home Cooked can bring the practical recipe and its private source attachments together, then make the recipe or cookbook available to family when you choose. A relative can cook from the clear version while still seeing the handwriting that gave it context.",
          "Digitizing a handwritten recipe isn't a way to retire the original or declare the work complete. It's a way to let the knowledge travel while the card remains safely cared for. The recipe has been preserved when someone can read it, understand where it came from, and put it back on the table.",
        ],
      },
    ],
    callout: "Preserve the source transcription before adding clarity. Future cooks should be able to see what was written and what was learned later.",
    quote: "The card keeps the handwriting. The cookbook keeps the recipe in motion.",
  }),
  guide({
    slug: "how-to-set-up-your-first-home-cooked-book",
    title: "How to Set Up Your First Home Cooked Book",
    description: "Create a cookbook with a clear purpose, choose privacy and sharing settings that fit your household, and make a welcoming home for the recipes you use.",
    metaDescription: "Set up your first Home Cooked cookbook with a useful name, description, cover, privacy choice, and a simple plan for its first recipes.",
    sections: [
      {
        id: "start-with-one-purpose",
        heading: "Start with one useful purpose",
        paragraphs: [
          "Your first cookbook does not need to hold every recipe you have ever saved. Give it one job: the dinners your household relies on, a collection of baking projects, the recipes from a relative, or the meals you want to pass to someone starting out. A clear purpose makes the first choices easier and leaves room for another book later.",
          "Choose a title that you will recognize at a glance. A family name, occasion, or practical promise can all work: The Ramirez Table, Weeknight Keepers, or Dad's Baking Notes. The title can be warm and personal, but adding a little context helps everyone know what belongs there.",
        ],
      },
      {
        id: "create-the-book",
        heading: "Create the book and give it a little context",
        paragraphs: [
          "From your bookshelf, choose to create a cookbook. Add a title, then use the optional description to explain what the book is for. A short description is enough: Recipes we make when everyone is home, or Mom's cards and the versions we cook now. It gives future contributors a useful starting point.",
          "Choose a cover color that makes the book easy to spot in your bookshelf. The cover is not a permanent editorial decision; it is simply a visual cue that helps the collection feel distinct when you have more than one book.",
        ],
      },
      {
        id: "private-or-shared",
        heading: "Choose Private or Shared with confidence",
        paragraphs: [
          "Choose Private if you want to collect, edit, or test recipes on your own first. Only you can access a private cookbook until you turn sharing on. You can make it Shared later from the book's settings, so private is a good default when you are still deciding what the collection should become.",
          "Choose Shared if you are ready to invite specific people into this particular book. Sharing does not make the book public, and an invitation to one cookbook does not open your other cookbooks. On Free, invite up to three people as Family members. Plus supports unlimited Family invitations and Contributor invitations for people who will add recipes and edit their own.",
        ],
      },
      {
        id: "add-a-first-few-recipes",
        heading: "Add a small, useful first set",
        paragraphs: [
          "Begin with recipes that someone would genuinely look for this week. One reliable dinner, a favorite breakfast, a dessert everyone requests, or a dish connected to the book's purpose is enough to establish the collection. You can enter them by hand, copy and paste recipe text, or start from photos and files when that is the clearest source.",
          "Do not wait until every detail is perfect. A recipe can begin with the information you know, then improve after you cook it or ask a relative a question. Add a source, note, or story when it matters, especially when the recipe came from someone else's card, website, or memory.",
        ],
      },
      {
        id: "shape-it-through-use",
        heading: "Let use shape the book",
        paragraphs: [
          "After adding a few recipes, notice how you look for them. Create or refine categories around real decisions such as Quick Dinners, Baking, Breakfast, or Holidays. Keep them broad at first. A category should make a recipe easier to find, not create another filing task.",
          "Return to the book after you cook from it. Correct timing, add a photo, record a substitution, or write down the note that explains why the recipe matters. A Home Cooked book is meant to stay alive through cooking, not to be finished before anyone can use it.",
        ],
      },
    ],
    callout: "Choose Private when you are still collecting. You can turn on sharing later, and sharing one cookbook never makes your other books visible.",
    quote: "A first cookbook only needs a clear purpose and one recipe worth finding again.",
  }),
  guide({
    slug: "how-to-add-your-first-recipe-to-home-cooked",
    title: "How to Add Your First Recipe to Home Cooked",
    description: "Choose the easiest way to bring in a favorite recipe, review what was imported, and save a version that is clear enough to cook and personal enough to keep.",
    metaDescription: "Add your first recipe to Home Cooked by using manual entry, copy and paste, recipe-card photos, or supported files, then review and save the details.",
    sections: [
      {
        id: "choose-an-easy-first-recipe",
        heading: "Choose an easy first recipe",
        paragraphs: [
          "Start with a dish you know well enough to recognize when something is missing. It might be a weeknight favorite, a handwritten family recipe, or a trusted recipe you saved online. The best first recipe is not necessarily the most impressive one; it is one you will be glad to find again.",
          "Open the cookbook where the recipe belongs and choose to add a recipe. If you have more than one cookbook, take a moment to confirm the destination before you begin. A recipe can be moved later, but putting it in its natural home makes it easier to return to from the start.",
        ],
      },
      {
        id: "pick-an-entry-method",
        heading: "Pick the entry method that matches the source",
        paragraphs: [
          "Manual entry works well when you are writing down a recipe from memory or cleaning up a short, reliable source. Add the title, ingredients, directions, and the practical details you know. You can add ingredient rows and instruction steps as you go, so there is no need to force a recipe into one long note.",
          "Copy and paste is useful for recipe text you already have in a note, message, or webpage. Review the parsed result before saving. For recipe cards, clippings, or pages you want to preserve visually, use photo import. Supported recipe files can also be imported when they already contain recipe data. Choose the method that preserves the original with the least retyping, then review every important detail yourself.",
        ],
      },
      {
        id: "review-imports-carefully",
        heading: "Review imported recipes before they become your working version",
        paragraphs: [
          "Importing can save time, but it cannot know whether a handwritten fraction, a stained line, or a family abbreviation was read correctly. Compare titles, quantities, units, temperatures, and steps against the original. Treat an import as a draft, especially when the source is handwritten or photographed in low light.",
          "Keep a helpful photo with the recipe when it shows the finished dish or preserves a meaningful card. If the source came from another cook, cookbook, or website, record the source name or link. A clear source note makes the recipe more trustworthy and helps a future reader understand where it came from.",
        ],
      },
      {
        id: "make-it-cookable",
        heading: "Make the recipe easy to cook",
        paragraphs: [
          "Use a title that tells you what you are looking at. Grandma's chicken is meaningful, but Grandma's Lemon Chicken with Potatoes is easier to browse and search. Add preparation time, cooking time, servings, a category, and tags when they will help you choose the recipe later; these details can wait if you do not know them yet.",
          "Write ingredients in the order a cook will use them and split directions into clear steps. If the original says bake until done, preserve that wording in a note or story, then add a tested clarification when you have one. It is better to label an uncertainty than to make a confident guess.",
        ],
      },
      {
        id: "save-and-return",
        heading: "Save a useful first version, then return after cooking",
        paragraphs: [
          "Save once the recipe has enough information for someone to attempt it. You do not need a professional photo or a complete family history before it belongs in the book. The first saved version gives you a place to collect the missing details instead of losing them in a separate note.",
          "The next time you cook it, update what you learn: a more accurate timing, the pan size, a substitution that worked, or the story someone remembered. Notes and memories let the recipe keep its history without crowding the instructions. Each revision can make the next cook's experience easier.",
        ],
      },
    ],
    callout: "An imported recipe is a starting point, not proof. Review every quantity, temperature, and instruction against the source before relying on it.",
    quote: "The first version gets the recipe safely into the book. Cooking it is how the recipe becomes truly useful.",
  }),
  guide({
    slug: "how-to-plan-meals-and-build-a-grocery-list-in-home-cooked",
    title: "How to Plan Meals and Build a Grocery List in Home Cooked",
    description: "Plan the week from recipes you already trust, send their ingredients to a grocery list, and keep the last-minute items in one practical place.",
    metaDescription: "Use Home Cooked to plan meals for the week, assign recipes to meal slots, import planned ingredients into a grocery list, and shop from a shared list.",
    sections: [
      {
        id: "begin-with-the-week-you-have",
        heading: "Begin with the week you actually have",
        paragraphs: [
          "Meal planning works best when it responds to the week in front of you, not an ideal one. Look at the nights you will be home, the ingredients you already have, and the meals that are realistic to cook. Start with a few dependable recipes rather than trying to assign every meal at once.",
          "Open Meal Plan from the app navigation. The planner can draw from recipes across your cookbooks, so it is useful when your week includes a family favorite from one book and a weeknight recipe from another. Use the previous and next controls to view a different week, or return to the current week when you are ready to plan now.",
        ],
      },
      {
        id: "assign-meals",
        heading: "Assign recipes to the days and meal slots that fit",
        paragraphs: [
          "Choose a meal slot on a day, then search or browse for the recipe you want. Add only what is helpful: dinner for three busy nights may be enough, while a weekend might deserve breakfast or a larger project. Change or remove a planned recipe as the week changes; the plan is a working tool, not a commitment.",
          "Prefer recipes with complete ingredient lists when you plan to send them to groceries. A recipe with a useful title and clear ingredients is enough to start; notes, photos, and extra details can make it easier to choose, but they are not required for planning.",
        ],
      },
      {
        id: "send-ingredients-to-groceries",
        heading: "Send this week's ingredients to your grocery list",
        paragraphs: [
          "When your current week's meals are set, choose Add to grocery list in the meal planner. You can also open Groceries and choose Import from meal plan. Home Cooked reads the ingredients from the planned recipes and adds items that are not already on your list.",
          "The import reports what it added and avoids adding an identical item already on the list. It is still worth reviewing the result: pantry staples may already be on hand, and separate recipes can need more of the same ingredient than their individual list entries suggest. Add a manual item whenever your plan depends on something that is not part of a recipe.",
        ],
      },
      {
        id: "keep-the-list-practical",
        heading: "Keep the grocery list practical at the store",
        paragraphs: [
          "The grocery list groups items by familiar store sections, making it easier to work through a shop without constantly rearranging the list. Add one-off needs with the quick-add field, then check items off as they go into the cart. Clear checked items after a trip, or clear the full list only when you are certain you no longer need it.",
          "The list remains useful when your connection is unreliable. Changes made while offline are kept on your device and sync when you reconnect. Before relying on a shared or newly imported list, give it a moment to sync so the latest changes are reflected.",
        ],
      },
      {
        id: "adjust-without-starting-over",
        heading: "Adjust the plan without starting over",
        paragraphs: [
          "Dinner plans change. If you swap a meal after importing, update the plan and review the grocery list rather than assuming it has been rebuilt automatically. Remove or check off items you no longer need, then import the current week's plan again when you want to bring in ingredients that are still missing. Existing matching items are skipped.",
          "Over time, use the planner to notice which recipes genuinely work for your household. A modest plan that produces a calmer grocery trip is more valuable than a perfectly filled calendar you abandon by Wednesday.",
        ],
      },
    ],
    callout: "Importing from the meal plan adds missing ingredients; it does not replace a quick review of what you already have or what has changed since you planned.",
    quote: "A good meal plan makes room for real life and still answers the question: what are we eating tonight?",
  }),
];

guides.forEach((item, index) => {
  item.related = [guides[(index + 1) % guides.length].slug, guides[(index + 3) % guides.length].slug, guides[(index + 6) % guides.length].slug];
});

export const guideBySlug = new Map(guides.map((item) => [item.slug, item]));
