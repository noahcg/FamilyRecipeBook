import { NextResponse, type NextRequest } from "next/server";
import { unsubscribeByToken } from "@/lib/actions/marketing";
import { getAppBaseUrl } from "@/lib/email/sendEmail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Context {
  params: Promise<{ token: string }>;
}

// RFC 8058 one-click unsubscribe: mail clients POST here from the
// List-Unsubscribe header. Return 200 with no redirect.
export async function POST(_req: NextRequest, { params }: Context) {
  const { token } = await params;
  await unsubscribeByToken(token);
  return new NextResponse(null, { status: 200 });
}

// A human (or a client that follows List-Unsubscribe as a link) lands here via
// GET — unsubscribe, then send them to the friendly confirmation page.
export async function GET(_req: NextRequest, { params }: Context) {
  const { token } = await params;
  await unsubscribeByToken(token);
  return NextResponse.redirect(`${getAppBaseUrl()}/unsubscribe/${token}`);
}
