interface WorkflowService {
  createInstance(params: { interests: string[]; sources: string[] }): Promise<{
    id: string;
    status: string;
  }>;
  getInstance(id: string): Promise<{
    id: string;
    status: string;
  }>;
  getResult(id: string): Promise<any>;
}

interface Env {
  WORKFLOW_SERVICE: WorkflowService
}

interface GenerateRequest {
  interests: string[];
  sources: string[];
}

export const  onRequestPost: PagesFunction<Env> = async (context) => {
  try {
    const body = await context.request.json() as GenerateRequest
    if (!body.interests || !Array.isArray(body.interests) || body.interests.length === 0) {
      return Response.json(
        { error: 'Please provide at least one interest' },
        { status: 400 }
      )
    }
    if (!body.sources || !Array.isArray(body.sources) || body.sources.length === 0) {
      return Response.json(
        { error: 'Please provide at least one source' },
        { status: 400 }
      )
    }
    for (const source of body.sources) {
      try {
        new URL(source)
      } catch {
        return Response.json(
          { error: `Invlaid URL ${source}` },
          { status: 400 }
        )
      }
    }

    console.log(`Creating workflow instance for interests ${body.interests.join(', ')}`)
    console.log(`Sources: ${body.sources.join(', ')}`)
    
    const run = await context.env.WORKFLOW_SERVICE.createInstance({
      interests: body.interests,
      sources: body.sources
    });

    const instanceId = run.id
    console.log(`Workflow instance created: ${instanceId}`)

    const maxAttempts = 60
    let attempts = 0

    while (attempts < maxAttempts) {
      await new Promise(resolve => setTimeout(resolve, 2000))
      attempts++

      try {
        const instance = await (context.env.WORKFLOW_SERVICE.getInstance(instanceId))
        const status = instance.status
        if (status === 'complete') {
          console.log(`Workflow compelted after ${attempts * 2} seconds`)
          const result = await (context.env.WORKFLOW_SERVICE.getResult(instanceId))
          return new Response(JSON.stringify(result), {
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache'
            }
          })
        }

        if (status === 'failed' || status === 'terminated') {
          console.error(`Workflow failed with status: ${status}`);
          return Response.json(
            { error: 'Newsletter generation failed. Please try again.' },
            { status: 500 }
          );
        }

        // Status is still 'running', continue polling
        console.log(`Workflow still running... (attempt ${attempts}/${maxAttempts}, status: ${status})`);
      } catch (error) {
        console.error('Error checking workflow status', error)
      }
    }

    return Response.json(
      {
        error: 'Newsletter generation is taking longer than expected. Please try again with fewer sources.',
        instanceId
      }, 
      { status: 504 }
    );
  } catch (error) {
    console.error('Error on generate endpoint:', error)
    return Response.json(
      { error: 'Failed to generate newsletter. Please try again.' }, 
      { status: 504 }
    );
  }
}
