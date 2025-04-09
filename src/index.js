// index.js

export default {
  async fetch(request, env) {
    // const url = new URL(request.url);
    // 	switch (url.pathname) {
    // 		case '/message':
    // 			return new Response('Hello, World!');
    // 		case '/random':
    // 			return new Response(crypto.randomUUID());
    // 		default:
    // 			return new Response('Not Found', { status: 404 });
    // 	}

    return env.ASSETS.fetch(request);
  },
};
