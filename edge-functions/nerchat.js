export function onRequest({ request }) {
    const url = new URL(request.url);
    const target = new URL('https://nerchat-doc.neboer.site');
    target.pathname = url.pathname.slice('/nerchat'.length) || '/';
    target.search = url.search;
    return new Response(null, {
        status: 308,
        headers: { Location: target.href, 'Cache-Control': 'public, max-age=3600' },
    });
}
