export async function onRequest(context: {
  request: Request;
  env: Record<string, unknown>;
  params: Record<string, string>;
}) {
  const run = await context.env.WORKFLOW_SERVICE.createRun({ name: "Daniel" });
  return new Response(`Workflow started: ${run.id}`);
}
