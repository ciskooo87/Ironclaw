export function getPublicOrigin(req: Request) {
  const proto = req.headers.get("x-forwarded-proto") || "https";
  const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || new URL(req.url).host;
  return `${proto}://${host}`;
}

export function publicUrl(req: Request, path: string) {
  return new URL(path, getPublicOrigin(req));
}
