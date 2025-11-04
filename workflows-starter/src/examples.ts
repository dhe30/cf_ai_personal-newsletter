// <docs-tag name="simple-workflow-example">
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep, WorkerEntrypoint } from 'cloudflare:workers';

interface Env {
	MY_WORKFLOW: Workflow;
}

interface NewsletterParams {
	interests: string[];
	sources: string[];
};

interface Article {
	title: string;
	url: string;
	source: string;
}

interface ScoredAricle extends Article {
	score: number;
	reasoning: string;
}

// Create your own class that implements a Workflow
export class MyWorkflow extends WorkflowEntrypoint<Env> {
	// Define a run() method
	async run(event: WorkflowEvent<NewsletterParams>, step: WorkflowStep) {
		// Define one or more steps that optionally return state.
		const { interests, sources } = event.payload

		const articles = await step.do("scrape-articles", async () => {
			console.log(`Scraping ${sources.length} sources...`)
			return await this.scrapeAllSources(sources)
		})

		console.log(`found ${articles.length} articles`)

		const scoredArticles = await step.do("score-articles", async () => {
			console.log(`Scoring ${articles.length} articles...`)
			return await this.scoreArticles(articles, interests)
		})
	}

	private async scrapeAllSources(sources:string[]): Promise<Article[]> {
		return new Promise(() => {})
	}

	private async scoreArticles(articles: Article[], interests: string[]): Promise<ScoredAricle[]> {
		return new Promise(() => {})
	}
}
// </docs-tag name="simple-workflow-example">

export default class WorkflowsService extends WorkerEntrypoint<Env> {
  async createInstance(payload: any) {
    let instance = await this.env.MY_WORKFLOW.create({ params: payload });
    return { id: instance.id };
  }
}
