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
  steps: { title: string; body: string }[];
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
    slug: "how-to-create-a-digital-family-cookbook",
    title: "How to Create a Digital Family Cookbook",
    description: "Turn scattered recipes, handwritten cards, and family favorites into a collection your family can keep, use, and share.",
    metaDescription: "A practical, thoughtful guide to gathering, organizing, and sharing a digital family cookbook.",
    steps: [
      { title: "Decide what the book is for", body: "A cookbook can be a working weeknight collection, a record of one side of the family, or a gift. A clear purpose makes the next choices much easier." },
      { title: "Gather before you edit", body: "Ask relatives for cards, notebooks, screenshots, links, PDFs, and the recipes they make from memory. Make a simple holding list so nothing is lost in the sorting." },
      { title: "Give recipes a consistent shape", body: "Use one title style, familiar measurements, and clear numbered directions. Keep an original phrase when it carries meaning, but add a practical clarification beside it." },
      { title: "Build useful sections", body: "Start broad: everyday meals, baking, holidays, and favorites. Categories should help someone decide what to cook, not make them guess where a recipe belongs." },
      { title: "Keep the story with the dish", body: "A short note about who made it, when it appeared, or why it matters can be more valuable than a polished introduction." },
      { title: "Share a living collection", body: "Give family a way to use the book, correct a detail, and add a favorite. A cookbook grows stronger when it is opened in ordinary life." },
    ],
    sections: [
      { id: "start-with-a-purpose", heading: "Start with a purpose, not a pile", paragraphs: ["The fastest way to make a family cookbook feel overwhelming is to begin with every recipe you have ever saved. Instead, name the collection you are making. It might be the meals your children ask for, the baking that shows up at holidays, or the recipes that belonged to a particular person.", "That decision does not exclude anything forever. It gives you a kind first edition: a useful boundary and a reason to choose one recipe over another. Keep a separate ‘later’ list for discoveries that do not fit yet."], bullets: ["Who is most likely to use this cookbook?", "What occasions or meals should it make easier?", "What would make someone glad this collection exists in five years?"] },
      { id: "collect-with-care", heading: "Collect recipes with a little context", paragraphs: ["Invite contributions in the format people already have. Some relatives will send a photo of a flour-dusted card; others will text an ingredient list or share a link. Ask for the source, the person associated with it, and any small note they want saved.", "Do not wait for perfect information. A recipe with a note that says ‘amount of cinnamon was never written down’ is still worth preserving. You can mark a question to test later rather than silently guessing."], bullets: ["Photograph both sides of a recipe card.", "Record the original source or creator when known.", "Save a link for online recipes instead of republishing a creator’s work without permission."] },
      { id: "organize-the-book", heading: "Organize for the way people cook", paragraphs: ["A good structure is recognizable at a glance. Begin with a small set of sections, then add a category only when it earns its place. The goal is retrieval: someone should be able to find a soup or birthday cake without remembering your filing system.", "Titles matter more than they seem. ‘Aunt Lena’s Sunday Sauce’ tells a story, while a helpful subtitle or note can say what it is: tomato sauce for a crowd. Searchable, consistent names make a shared collection much easier to maintain."], bullets: ["Use familiar categories before highly specific tags.", "Choose one version when duplicates are truly the same.", "Keep a recipe in the section where you would look for it first."] },
      { id: "make-it-living", heading: "Make room for the cookbook to grow", paragraphs: ["A digital cookbook is useful because it can change without losing its history. Add tested notes, a better timing detail, or a photo from the first time a grandchild made the recipe. When a recipe has versions, label them honestly rather than replacing a cherished original without a trace.", "Home Cooked is built around this book-first approach: create a private cookbook, add and organize recipes, and share a whole cookbook with family when that is right for you. It is one way to keep recipes together without turning them into a pile of disconnected saves." ] },
    ],
    callout: "Begin with the recipes people would miss this week. A small cookbook that gets used is more valuable than a perfect archive that stays unfinished.",
    quote: "A family cookbook is not only a record of what was cooked. It is an invitation to cook it again.",
  }),
  guide({
    slug: "how-to-preserve-family-recipes",
    title: "How to Preserve Family Recipes for Future Generations",
    description: "A practical way to collect family recipes, protect the originals, and keep their stories usable for years to come.",
    metaDescription: "Learn how to preserve family recipes with clear records, careful digitization, backups, and shared access.",
    steps: [
      { title: "Find the recipes at risk", body: "Look beyond the recipe box: notebooks, email threads, old cookbooks, and a relative’s memory all count." },
      { title: "Ask while you can", body: "A short conversation can capture a name, a substitution, or a story that no scan will reveal." },
      { title: "Protect the original", body: "Handle cards gently, photograph them in even light, and store them away from heat, moisture, and direct sun." },
      { title: "Create a readable copy", body: "Transcribe the recipe faithfully, flagging uncertain measurements instead of making them up." },
      { title: "Keep more than one copy", body: "Save the digital files in more than one trusted place and let another family member know where they are." },
      { title: "Return it to the kitchen", body: "A preserved recipe should still be easy to find, cook, and pass along." },
    ],
    sections: [
      { id: "why-recipes-disappear", heading: "Why recipes disappear", paragraphs: ["Recipes rarely vanish in a single dramatic moment. They get tucked into a move, saved on an old phone, or remembered by one person who assumes everyone else knows the details. Preservation begins by noticing those fragile places.", "Make an inventory before digitizing. It can be as plain as a note with the recipe name, where it lives, and who knows its history. That list helps you see what has not yet been copied or explained." ] },
      { id: "record-the-provenance", heading: "Record the person and the story", paragraphs: ["Write down what you know: who wrote it, who taught it, where it was served, and whether it changed over time. Attribution is not a formality. It keeps a recipe connected to the person whose hands and judgment made it special.", "Ask open questions. ‘What did you serve with this?’ often gets a richer answer than ‘What year is this from?’ A voice memo or a few lines in a recipe note can preserve the details that formal directions leave out." ] },
      { id: "make-digital-copies", heading: "Digitize without erasing the original", paragraphs: ["Use daylight or soft, even light and photograph the full card before taking close-ups. Include the back, margins, and handwritten notes. A scan or photo is a historical copy; a transcription is the practical copy you will actually cook from.", "When instructions are unclear, keep the original wording and add a separate tested note. That preserves the evidence while helping a new cook succeed. Keep filenames simple and consistent so original images remain easy to reconnect with the recipe." ] },
      { id: "keep-it-available", heading: "Back up and share a usable collection", paragraphs: ["Files only help if someone can locate them. Keep a backup in a separate service or drive, review it occasionally, and share access or instructions with a trusted person. Avoid one password or one device becoming the whole archive.", "Home Cooked can be the usable layer of that work: recipes can live in a cookbook with notes and original attachments, then be shared with invited family. The physical card and its image remain important; the digital recipe makes the knowledge easier to keep alive." ] },
    ],
    callout: "When a measurement is uncertain, write ‘to taste’ or ‘needs testing’ rather than replacing a family member’s voice with a guess.",
    quote: "The most durable recipe collection is one that more than one person knows how to open and use.",
  }),
  guide({
    slug: "how-to-organize-recipes-into-a-personal-cookbook",
    title: "How to Organize Recipes Into a Personal Cookbook",
    description: "Bring scattered favorites together in a personal cookbook that is simple to browse and satisfying to use.",
    metaDescription: "Organize scattered recipes into a personal cookbook with practical categories, consistent names, and less clutter.",
    steps: [
      { title: "Make one collection point", body: "Bring links, cards, files, and notes into one temporary list before deciding what belongs." },
      { title: "Choose a point of view", body: "Build around the meals you make, a season, an occasion, or a person—not every recipe on the internet." },
      { title: "Use a few clear sections", body: "Categories should make browsing easier: dinner, baking, sides, drinks, and celebrations are a strong start." },
      { title: "Name things consistently", body: "A familiar format makes duplicates and favorites easier to spot." },
      { title: "Remove the nearly-same copies", body: "Keep the version you actually use and leave a note about where another version came from if it matters." },
      { title: "Review it while cooking", body: "A cookbook improves when it is revised in response to real meals, not imagined perfection." },
    ],
    sections: [
      { id: "choose-what-belongs", heading: "Decide what belongs in this book", paragraphs: ["A personal cookbook does not need to be comprehensive. Its value comes from its point of view: the dishes you reach for, the recipes you are learning, or a collection for a particular household. Let the book have an edge.", "If a recipe is only a possibility, keep it in a separate ‘to try’ list. Once it earns a place through use, move it into the cookbook with a quick note about what you liked." ] },
      { id: "categories-that-work", heading: "Use categories that work in a real kitchen", paragraphs: ["Over-categorization makes browsing feel like homework. Start with the broad sections you naturally say out loud. A recipe can have a few useful labels, but it should still have one obvious home.", "Consistency is a quiet form of hospitality. Decide whether titles lead with the dish, the person, or the occasion. Use clear ingredient amounts and directions so a recipe does not require decoding when dinner is already underway." ] },
      { id: "keep-the-good-version", heading: "Keep the good version—and its history", paragraphs: ["Duplicates are often evidence of a recipe’s life: one version may be a grandmother’s card and another a version you adjusted for your own oven. Keep the one you cook from as the working recipe, then preserve the older source as a note or attachment when it matters.", "Home Cooked lets a collection behave like a cookbook rather than an endless saved list. Put recipes in cookbooks, organize them with categories, and add the personal details that explain why each one stayed." ] },
    ],
    callout: "If you would not know where to look for a recipe on a busy Tuesday, its category is probably too clever.",
    quote: "Organization is successful when it gets out of the way of cooking.",
  }),
  guide({
    slug: "how-to-turn-old-recipe-cards-into-a-digital-cookbook",
    title: "How to Turn Old Recipe Cards Into a Digital Cookbook",
    description: "Turn a box of handwritten recipe cards into a readable, searchable cookbook while keeping the originals close.",
    metaDescription: "A careful workflow for photographing, transcribing, and organizing old recipe cards into a digital cookbook.",
    steps: [
      { title: "Sort before you scan", body: "Group cards by person, meal, or condition and set aside duplicates or loose fragments to revisit." },
      { title: "Photograph every side", body: "Use even light and capture the full card, including margins, stains, and back-side notes." },
      { title: "Transcribe with restraint", body: "Copy the recipe as written, including unusual names or phrasing that carries meaning." },
      { title: "Mark questions clearly", body: "An unclear ‘small can’ or missing oven temperature should be a note to test, not an invented fact." },
      { title: "Create a working version", body: "Add modern timing or measurements in a labeled note while keeping the source intact." },
      { title: "Place it in a real cookbook", body: "Use sections and names that will help family find and cook the cards again." },
    ],
    sections: [
      { id: "prepare-the-cards", heading: "Prepare the cards before you digitize", paragraphs: ["Do a quick sorting pass first. You are not deciding what is worthy; you are making a manageable order. Put fragile, unusual, or multi-page cards together and avoid using tape, adhesive, or aggressive cleaning on originals.", "For each card, note who wrote it if you know. A simple number in a tracking list can connect the image file, transcription, and physical card without writing on the original." ] },
      { id: "capture-and-transcribe", heading: "Capture the handwriting and the recipe", paragraphs: ["A phone camera is often enough when the card lies flat in bright indirect light. Keep the camera parallel to the surface and check that the handwriting is sharp. Capture both sides even when one looks blank; a note may be easy to miss.", "Transcription should serve the cook without pretending the original was more precise than it is. Preserve the original spelling or shorthand in the source image, then use a clear modern ingredient list and directions in the working version." ] },
      { id: "keep-the-connection", heading: "Keep the original connected to the useful copy", paragraphs: ["The best digital cookbook does not force a choice between heritage and practicality. Pair each typed recipe with its original photo, a credit, and a short note about its place in the family. That lets someone admire the handwriting and still make the casserole correctly.", "In Home Cooked, a recipe can include a readable working entry and private original attachments, all inside a cookbook. That is useful when a box of cards needs to become something the family can actually browse and cook from." ] },
    ],
    callout: "Photograph the back of every card. The most revealing instruction is often ‘bake until it smells right’ in a corner.",
    quote: "A typed recipe makes dinner possible; the original card explains why it matters.",
  }),
  guide({
    slug: "how-to-share-family-recipes",
    title: "How to Share Family Recipes With Relatives",
    description: "Share recipes in a way that keeps context intact, respects contributors, and makes them easy for relatives to use.",
    metaDescription: "Practical guidance for sharing family recipes with relatives without creating confusing, fragmented copies.",
    steps: [
      { title: "Ask about context", body: "Check who created a recipe, whether it is theirs to share, and what credit or story should travel with it." },
      { title: "Choose the right scope", body: "Share one recipe for an immediate request, or a collection when the recipes belong together." },
      { title: "Give it a clear name", body: "A title, source, and short note help a shared recipe stay recognizable after it leaves your phone." },
      { title: "Avoid competing copies", body: "Link or invite people to one living version instead of repeatedly emailing different attachments." },
      { title: "Make it cookable", body: "Include servings, timing, and clear steps, plus a note for a family shorthand or substitution." },
      { title: "Welcome corrections", body: "A shared recipe should have a graceful path for someone to say, ‘Mom always used less sugar.’" },
    ],
    sections: [
      { id: "share-with-permission", heading: "Share with permission and context", paragraphs: ["Family recipes are often generous gifts, but they can still have an author, a source, or a private story. When possible, ask before sharing widely and include the attribution the contributor prefers. This is especially important for recipes adapted from a living creator or copied from a published source.", "A note about who made the dish and when it showed up gives recipients more than instructions. It also prevents a recipe from becoming anonymous as it is passed along." ] },
      { id: "one-home", heading: "Give the recipe one dependable home", paragraphs: ["Fragmented copies create quiet confusion. One relative has the pre-oven-temperature version, another has a screenshot, and nobody knows which one was tested last. Keep a working source that can be updated, then share a link or an invitation to that source.", "Individual recipes are useful for a quick request. A cookbook is better when the recipes belong together, such as holiday baking or a parent’s favorites. The collection supplies context and makes the next recipe easier to discover." ] },
      { id: "make-sharing-useful", heading: "Make sharing useful, not merely sentimental", paragraphs: ["Before sending a recipe, read it as someone who has never watched it being made. Add oven temperature, reasonable quantities, and a cue for when it is done. Keep family language in a note instead of leaving a new cook stranded by it.", "Home Cooked supports sharing individual recipes and, on Plus, inviting people into a shared cookbook. That can keep a family collection together while allowing the people who use it to add notes and memories over time." ] },
    ],
    callout: "The kindest sharing format is the one a relative can find again six months from now.",
    quote: "Recipes travel best when their names, makers, and useful details travel with them.",
  }),
  guide({
    slug: "how-to-organize-saved-recipes",
    title: "How to Organize Recipes Saved From Around the Internet",
    description: "Move beyond screenshots and browser bookmarks with a calmer, more intentional system for saved online recipes.",
    metaDescription: "Organize online saved recipes without losing sources, duplicating favorites, or building an unusable bookmark pile.",
    steps: [
      { title: "Empty the inbox", body: "Gather bookmarks, screenshots, open tabs, and messages into one review list." },
      { title: "Keep the source", body: "For each recipe you keep, save the creator and link rather than copying protected work for public redistribution." },
      { title: "Choose what deserves a place", body: "A recipe worth keeping is one you made, intend to make, or can explain why you saved." },
      { title: "Name and group consistently", body: "Use clear names and broad cookbook sections that match how you decide what to cook." },
      { title: "Spot duplicates", body: "Keep one trusted banana bread or weeknight chili as the default and archive the rest of the comparison." },
      { title: "Give it a small maintenance rhythm", body: "A ten-minute review after cooking is easier than an annual cleanup of hundreds of saves." },
    ],
    sections: [
      { id: "the-screenshot-problem", heading: "Solve the screenshot and bookmark problem", paragraphs: ["Screenshots are excellent at capturing a moment and terrible at helping you cook later. They lose the source, hide the ingredients in an image, and pile up beside unrelated photos. Browser bookmarks are better, but still ask you to remember why a link mattered.", "Start with a temporary inbox. Do not try to organize as you gather. The first win is seeing everything in one place, then deciding whether a save is a recipe, inspiration, or something you no longer need." ] },
      { id: "respect-the-source", heading: "Keep source attribution with online recipes", paragraphs: ["Recipes published online belong to their creators. Keep the creator name and source link, and use the original site when you cook. If you make personal notes or a private adaptation, label it as such rather than presenting it as your own public recipe.", "This habit is useful even apart from copyright. A source link takes you back to the technique, video, comments, and updates that made the recipe work in the first place." ] },
      { id: "build-a-working-library", heading: "Build a working library, not an endless dump", paragraphs: ["Group saved recipes by how they help you decide: weeknight dinners, projects, baking, or a cookbook for a particular season. Use a ‘to try’ area so untested possibilities do not crowd out reliable favorites.", "Home Cooked can import recipes from supported websites and files for a private cookbook, then help you organize the results alongside recipes you write yourself. Review every import, keep source context, and let the collection reflect the recipes you actually return to." ] },
    ],
    callout: "A source link is part of a recipe’s identity. Keep it beside your notes, not buried in a browser history.",
    quote: "The goal is not to save more recipes. It is to make the good ones easier to cook.",
  }),
  guide({
    slug: "how-to-create-a-cookbook-as-a-family-gift",
    title: "How to Create a Cookbook as a Family Gift",
    description: "Make a personal cookbook gift that feels generous, useful, and true to the people and meals it celebrates.",
    metaDescription: "Create a meaningful family cookbook gift by choosing a theme, collecting recipes, and preserving stories with care.",
    steps: [
      { title: "Start with the recipient", body: "A cookbook for a new cook, a grandparent, or a graduating child needs a different point of view." },
      { title: "Choose a small, warm theme", body: "Think ‘the dinners we made together’ rather than trying to document every dish the family knows." },
      { title: "Invite contributions early", body: "Ask relatives for one recipe and one memory so the request feels manageable." },
      { title: "Edit for a new cook", body: "Standardize the practical parts while keeping the original voice in a note or story." },
      { title: "Arrange a clear beginning", body: "Sections, an opening note, and a few dependable recipes make the gift easy to enter." },
      { title: "Share it in a useful form", body: "A digital cookbook can be shared and revisited; choose any printed presentation separately and honestly." },
    ],
    sections: [
      { id: "choose-the-gift", heading: "Choose a gift with a point of view", paragraphs: ["The most moving cookbook gifts are specific. A collection of Sunday dinners, the recipes that made a childhood home feel familiar, or a starter set for someone leaving home will feel more complete than a giant archive.", "Let the recipient shape the choices. A person who rarely bakes may treasure the family’s weeknight meals more than every holiday cookie. Include recipes they can make now, with a few aspirational ones for later." ] },
      { id: "gather-stories", heading: "Gather stories without making it a burden", paragraphs: ["Ask each contributor for one recipe, who they learned it from, and a memory or serving suggestion. Small prompts produce more responses than an open-ended request to ‘write something.’ Keep their wording where it has personality.", "For practical editing, add missing temperatures, clarify quantities, and test a few essential recipes. When you modernize a detail, show that it is an editor’s note rather than pretending it appeared on the original card." ] },
      { id: "make-it-last", heading: "Give the gift a life after the occasion", paragraphs: ["A digital cookbook is especially good for a living gift: recipients can cook from it, add a photo, and discover a recipe they did not notice on the first read. Home Cooked lets you create a cookbook and share it with family on the plan that supports cookbook sharing.", "If you decide to create a printed version, treat that as a separate presentation choice. Home Cooked does not currently offer professional cookbook printing, so avoid promising a print workflow that is not there." ] },
    ],
    callout: "A gift cookbook does not need every family recipe. It needs the recipes that say, ‘I thought you would want these.’",
    quote: "The best family gift is one that keeps becoming part of ordinary life.",
  }),
  guide({
    slug: "how-to-digitize-a-family-recipe-collection",
    title: "How to Digitize a Family Recipe Collection",
    description: "A practical digitization plan for recipe boxes, notebooks, clippings, and files—without losing what makes them personal.",
    metaDescription: "Digitize a family recipe collection with an inventory, careful captures, consistent names, useful metadata, and backups.",
    steps: [
      { title: "Inventory first", body: "Count formats and locations so you can work in batches instead of chasing every item at once." },
      { title: "Sort into manageable groups", body: "Use source, person, or condition to make a box of recipes feel like a series of small jobs." },
      { title: "Capture originals clearly", body: "Photograph or scan cards, pages, and clippings in even light, including notes and backs." },
      { title: "Transcribe what you will cook", body: "Create searchable entries for the recipes you want to use while retaining the original image." },
      { title: "Name and describe consistently", body: "Use a simple filename, source, person, and recipe name so files remain understandable later." },
      { title: "Back up and make it usable", body: "Keep copies in separate places and organize the practical recipes where family can find them." },
    ],
    sections: [
      { id: "make-an-inventory", heading: "Make a realistic inventory", paragraphs: ["Inventory is not busywork; it is permission to work in stages. List boxes, binders, old files, and people who hold recipes. Note the formats you have: cards, notebook pages, clippings, PDFs, emails, or photos.", "Choose a first batch that is small enough to finish. Ten cards from one person is a better beginning than promising yourself you will digitize a lifetime of material in a weekend." ] },
      { id: "capture-and-name", heading: "Capture and name files so they stay useful", paragraphs: ["Use stable, descriptive names such as ‘Maya-Rivera_Apple-Cake_card-front.jpg’ rather than camera defaults. Keep original images untouched, and use a separate transcription for a working recipe. Consistent names make it possible to search or hand the archive to someone else.", "Metadata can stay modest: creator or source, approximate date if known, dish, and a sentence of context. Do not let an elaborate cataloging scheme become a reason to postpone the actual preservation." ] },
      { id: "turn-archive-into-cookbook", heading: "Turn the archive into something people use", paragraphs: ["An archive protects material; a cookbook helps people cook. Select the recipes that are complete enough to transcribe, organize them into familiar sections, and leave a note where testing is needed. Keep scans available as the source record.", "Home Cooked can hold a usable recipe collection in cookbooks, including organized recipes and private originals. It is not a replacement for a full archival strategy, but it can be the inviting front door to the recipes your family wants to make." ] },
    ],
    callout: "Digitization succeeds when each finished batch is both backed up and easy for another person to understand.",
    quote: "Preserving a collection is not just making files—it is making the knowledge findable.",
  }),
  guide({
    slug: "how-to-build-your-own-recipe-book-online",
    title: "How to Build Your Own Recipe Book Online",
    description: "Build an online recipe book that has a purpose, a useful structure, and enough flexibility to grow with your cooking.",
    metaDescription: "Build your own recipe book online with a clear purpose, helpful sections, consistent formatting, and easy sharing.",
    steps: [
      { title: "Define the book", body: "Choose what it will collect and who it will serve before you begin adding recipes." },
      { title: "Gather with intention", body: "Bring together dependable recipes, sources, and personal notes rather than every fleeting idea." },
      { title: "Choose a browseable structure", body: "Use sections that answer a cooking question: What is for dinner? What can I bake?" },
      { title: "Standardize the practical details", body: "Clear ingredients and directions make the book more welcoming for its future readers." },
      { title: "Add the parts only you know", body: "Stories, adjustments, and photos turn a saved recipe into your recipe book." },
      { title: "Keep it editable and shareable", body: "The advantage of online is a book that can be corrected, expanded, and shared without starting over." },
    ],
    sections: [
      { id: "book-not-folder", heading: "Make a book, not just a folder", paragraphs: ["Saving recipes online is easy. Building a recipe book is different: you make choices about what belongs together, how a reader moves through it, and which details should be remembered. That intention is what turns a collection into a book.", "Start with a modest thesis. It may be ‘the meals I can make without a grocery run’ or ‘family favorites worth teaching my kids.’ The thesis can evolve, but it gives the first pages a welcome sense of shape." ] },
      { id: "give-it-structure", heading: "Give the book a structure people can use", paragraphs: ["Sections should feel natural to someone opening the book for the first time. A few broad categories and consistent titles usually beat a dense tagging system. Keep ingredients, yields, and directions in a predictable order so every recipe feels familiar.", "Add context where it changes how someone cooks: a photo of the intended texture, a note about a preferred pan, or why a recipe belongs to a particular person. These are the details a plain bookmark cannot hold well." ] },
      { id: "keep-it-open", heading: "Keep the book open to revision", paragraphs: ["A recipe book should not become frozen the moment it is organized. Make room for notes after you cook, sources for recipes you adapted, and clearer directions when you learn something. A dated note can show how a recipe changed without losing its earlier form.", "Home Cooked’s cookbook model is designed for that book-first workflow: create a cookbook, organize recipes, and invite family to a shared book when you want to keep it together. It is a different experience from saving links in an unstructured list." ] },
    ],
    callout: "The useful difference between a recipe book and a saved folder is the care you put into what belongs together.",
    quote: "A recipe book becomes personal through the choices around the recipes.",
  }),
  guide({
    slug: "how-to-preserve-handwritten-family-recipes",
    title: "How to Preserve Grandma’s Handwritten Recipes",
    description: "Preserve handwritten recipes from grandparents, relatives, and friends while keeping their voice, quirks, and practical instructions intact.",
    metaDescription: "Preserve handwritten family recipes through careful handling, photography, transcription, context, and shared digital copies.",
    steps: [
      { title: "Handle originals gently", body: "Keep food, tape, and harsh light away; work on a clean, flat surface and take your time." },
      { title: "Capture the handwriting", body: "Photograph or scan every side in even light so the writing survives as an image, not only as text." },
      { title: "Create a readable transcription", body: "Type the recipe in a format someone new to it can follow, while keeping the original wording available." },
      { title: "Keep the quirks", body: "A crossed-out line, a ‘pinch,’ or a familiar phrase can belong in the story even when it needs clarification." },
      { title: "Record what it means", body: "Write down who made it, who taught it, and when it appeared at the table." },
      { title: "Share copies, not only the original", body: "Give family a practical digital recipe and let the physical card remain safely cared for." },
    ],
    sections: [
      { id: "protect-the-card", heading: "Protect the card before you perfect it", paragraphs: ["A stained card, uneven handwriting, and a folded corner are not defects to erase. They are part of the object’s history. Work on a clean surface, handle it with dry hands, and avoid tape, lamination, or cleaning methods that can do more harm than good.", "Photograph the card before any sorting. Use indirect light, keep your phone parallel to the card, and take extra close-ups if a pencil note is faint. Capture every side and any loose insert that belongs with it." ] },
      { id: "transcribe-with-respect", heading: "Transcribe with respect for the original", paragraphs: ["A readable transcription is a gift to the next cook, especially when the original assumes knowledge that is no longer obvious. Add a temperature, a pan size, or a tested timing cue in an editor’s note when you can verify it.", "Keep the original language alongside that practical version. ‘Enough flour to make a soft dough’ may need testing, but it also tells you how an experienced cook worked. Preserve the phrase and record what your test showed instead of rewriting history." ] },
      { id: "save-the-story", heading: "Save the story with the handwriting", paragraphs: ["The word ‘Grandma’s’ is common search language, but handwritten recipes can come from a parent, neighbor, friend, or anyone who fed us. Record the person’s name, the occasion, and what the recipe meant. A few sentences now can answer questions nobody will be able to ask later.", "Home Cooked can hold the usable typed recipe, its notes, and private original attachments in a cookbook you share with family. That gives the handwriting a protected place while helping the recipe remain part of the meals ahead." ] },
    ],
    callout: "Do not ‘correct’ a handwritten original. Make a separate working copy for clarity and let the card remain itself.",
    quote: "Handwriting holds a cook’s presence; a clear transcription helps that presence stay in the kitchen.",
  }),
];

guides.forEach((item, index) => {
  item.related = [guides[(index + 1) % guides.length].slug, guides[(index + 3) % guides.length].slug, guides[(index + 6) % guides.length].slug];
});

export const guideBySlug = new Map(guides.map((item) => [item.slug, item]));
