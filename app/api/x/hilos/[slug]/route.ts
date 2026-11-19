import { decideXThread, validToken } from "@/lib/x-threads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** "Publicar ya" and "Descartar" buttons on the phone alert (signed links, POST only). */
export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const url = new URL(request.url);
  const action = url.searchParams.get("accion");
  if (!validToken(slug, url.searchParams.get("t"))) return new Response("Link inválido", { status: 403 });
  if (action !== "publicar" && action !== "descartar") return new Response("Acción inválida", { status: 400 });
  try {
    return new Response(await decideXThread(slug, action));
  } catch (error) {
    return new Response(error instanceof Error ? error.message : String(error), { status: 500 });
  }
}
