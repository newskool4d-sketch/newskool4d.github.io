const worker = {
  async fetch(request, env) {
    if (!env || !env.ASSETS) {
      return new Response("Static asset binding is unavailable.", { status: 503 });
    }
    const url = new URL(request.url);
    const pathname = url.pathname === "/" ? "/index.html" : url.pathname;
    const assetUrl = new URL(`/static${pathname}`, request.url);
    return env.ASSETS.fetch(new Request(assetUrl, request));
  }
};

export default worker;
