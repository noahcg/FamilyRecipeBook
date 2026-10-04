import { createAccountDeletionEmail } from "@/lib/email/accountDeletionTemplate";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new Response("Not found", { status: 404 });
  }

  const origin = new URL(request.url).origin;
  const { html } = createAccountDeletionEmail({
    recipeCount: 12,
    archiveFilename: "home-cooked-recipe-archive-2026-10-02.json.gz",
    logoUrl: `${origin}/images/homecooked.png`,
  });

  return new Response(html, {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}
