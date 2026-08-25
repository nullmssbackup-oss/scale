export default {
  async fetch(request: Request, env: any) {
    return new Response('Worker OK', { status: 200 });
  }
};
