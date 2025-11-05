// <docs-tag name="simple-workflow-example">
import { WorkflowEntrypoint, WorkflowEvent, WorkflowStep, WorkerEntrypoint } from 'cloudflare:workers';

interface Env {
	MY_WORKFLOW: Workflow;
	AI: Ai;
	RESULTS: KVNamespace;
}

interface NewsletterParams {
	interests: string[];
	sources: string[];
}

interface Article {
	title: string;
	url: string;
	source: string;
}

interface ScoredArticle extends Article {
	score: number;
	reasoning: string;
}

interface Newsletter {
	intro: string;
	articles: {
		title: string;
		url: string;
		summary: string;
		reason: string;
		source: string;
	}[];
	generatedAt: string;
}

// Create your own class that implements a Workflow
export class MyWorkflow extends WorkflowEntrypoint<Env> {
	// Define a run() method
	async run(event: WorkflowEvent<NewsletterParams>, step: WorkflowStep) {
		// Define one or more steps that optionally return state.
		const { interests, sources } = event.payload;

		const articles = await step.do('scrape-articles', async () => {
			console.log(`Scraping ${sources.length} sources...`);
			return await this.scrapeAllSources(sources);
		});

		console.log(`found ${articles.length} articles`);

		const scoredArticles = await step.do('score-articles', async () => {
			console.log(`Scoring ${articles.length} articles...`);
			return await this.scoreArticles(articles, interests);
		});

		const topArticles = await step.do('select-top', async () => {
			const sorted = scoredArticles
				.filter((a) => a.score >= 6)
				.sort((a, b) => b.score - a.score)
				.slice(0, 7);

			console.log(`Selected ${sorted.length} top articles`);
			return sorted;
		});

		const newsletter = await step.do('generate-newsletter', async () => {
			console.log('Generating newsletter...');
			return await this.generateNewsletter(topArticles, interests);
		});

		// Step 5: Store result in KV for retrieval
		await step.do("store-result", async () => {
			console.log(`Storing result in KV with key: workflow:${event.instanceId}`);
			await this.env.RESULTS.put(
				`workflow:${event.instanceId}`,
				JSON.stringify(newsletter),
				{ expirationTtl: 3600 } // Expire after 1 hour
			);
		});

		return newsletter;
	}

	private async scrapeSingleSource(url: string): Promise<Article[]> {
		try {
			const response = await fetch(url, {
				headers: {
					'User-Agent': 'Mozilla/5.0 (compatible; NewsletterBot/1.0)',
				},
			});

			if (!response.ok) {
				console.warn(`Failed to fetch ${url}: ${response.status}`);
			}

			const html = await response.text();

			const articles: Article[] = [];
			const articlePattern = /<a[^>]*href=["']([^"']*(?:article|story|post|news)[^"']*)["'][^>]*>([^<]+)<\/a>/gi;
			let match;

			while ((match = articlePattern.exec(html)) != null && articles.length < 20) {
				const articleUrl = this.normalizeUrl(match[1], url);
				const title = this.cleanText(match[2]);

				if (title.length > 20 && !articles.some((a) => a.url === articleUrl)) {
					articles.push({
						title,
						url: articleUrl,
						source: new URL(url).hostname,
					});
				}
			}

			const headlinePattern = /<h[123][^>]*>(?:<a[^>]*href=["']([^"']*)["'][^>]*>)?([^<]+)(?:<\/a>)?<\/h[123]>/gi;

			while ((match = headlinePattern.exec(html)) != null && articles.length < 20) {
				const articleUrl = match[1] ? this.normalizeUrl(match[1], url) : url;
				const title = this.cleanText(match[2]);

				if (title.length > 20 && !articles.some((a) => a.url === articleUrl || title === a.title)) {
					articles.push({
						title,
						url: articleUrl,
						source: new URL(url).hostname,
					});
				}
			}

			return articles;
		} catch (error) {
			console.error(`Error scraping ${url}:`, error);
			return [];
		}
	}

	private async scrapeAllSources(sources: string[]): Promise<Article[]> {
		const results = await Promise.all(sources.map((source) => this.scrapeSingleSource(source)));
		return results.flat();
	}

	private async scoreArticles(articles: Article[], interests: string[]): Promise<ScoredArticle[]> {
		const scored: ScoredArticle[] = [];

		const batchSize = 5;
		for (let i = 0; i < articles.length; i += batchSize) {
			const batch = articles.slice(i, i + batchSize);

			const batchPromises = batch.map(async (article) => {
				try {
					const prompt = `You are evaluating article relevance for a personalized newsletter.

User Interests: ${interests.join(', ')}

Article:
Title: ${article.title}
Source: ${article.source}

Rate this article's relevance to the user's interests on a scale of 1-10, where:
- 10 = Extremely relevant, must-read for this user
- 7-9 = Highly relevant
- 4-6 = Somewhat relevant
- 1-3 = Not relevant

Respond ONLY with valid JSON in this exact format:
{"score": 8, "reasoning": "Brief explanation of why this matters to the user"}`;

					const response = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct-awq', {
						messages: [
							{ role: 'system', content: 'You are a helpful assistant that rates article relevance. Always respond with valid JSON only.' },
							{ role: 'user', content: prompt },
						],
						max_tokens: 150,
					});

					const text = response.response || '';
					const jsonMatch = text.match(/\{[^}]+\}/);

					if (jsonMatch) {
						const parsed = JSON.parse(jsonMatch[0]);
						return {
							...article,
							score: parsed.score || 5,
							reasoning: parsed.reasoning || 'Relevant to your interests',
						};
					}

					return {
						...article,
						score: 5,
						reasoning: 'Could not determine relevance',
					};
				} catch (error) {
					console.error(`Error scoring article "${article.title}":`, error);
					return {
						...article,
						score: 5,
						reasoning: 'Scoring failed',
					};
				}
			});

			const batchResults = await Promise.all(batchPromises);
			scored.push(...batchResults);
		}
		return scored;
	}

	private async generateNewsletter(articles: ScoredArticle[], interests: string[]): Promise<Newsletter> {
		const intoPrompt = `Create a brief, friendly intro (2-3 sentences) for a personalized newsletter about ${interests.join(', ')}. 
Make it engaging and conversational. Don't use the word "curated".`;
		const introResponse = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
			messages: [{ role: 'user', content: intoPrompt }],
			max_tokens: 100,
		});

		const intro = introResponse.response || "Here are your personalized articles this week."

		const summaries = await Promise.all(
			articles.map(async (article) => {
				try {
					const summaryPrompt = `Summarize this article in 2-3 sentences for someone interested in ${interests.join(', ')}:

Title: ${article.title}
Source: ${article.source}

Make it engaging and explain why it matters.`;
					const summaryResponse = await this.env.AI.run('@cf/meta/llama-3.1-8b-instruct-fp8', {
						messages: [{ role: 'user', content: summaryPrompt }],
						max_tokens: 150,
					});

					return {
						title: article.title,
						url: article.url,
						summary: (summaryResponse.response || article.title).trim(),
						reason: article.reasoning,
						source: article.source
					};
				} catch (error) {
					console.error(`Failed summary generation for ${article.title}`, error)
					return {
						title: article.title,
						url: article.url,
						summary: article.title,
						reason: article.reasoning,
						source: article.source
					};
				}
			})
		);

		return {
			intro,
			articles: summaries,
			generatedAt: new Date().toISOString()
		}
	}

	private normalizeUrl(url: string, baseUrl: string): string {
		try {
			return new URL(url, baseUrl).href;
		} catch {
			return url;
		}
	}
	private cleanText(text: string): string {
		return text
			.replace(/<[^>]*>/g, '') // Remove HTML tags
			.replace(/&nbsp;/g, ' ')
			.replace(/&amp;/g, '&')
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&quot;/g, '"')
			.replace(/\s+/g, ' ')
			.trim();
	}
}
// </docs-tag name="simple-workflow-example">

export default class WorkflowsService extends WorkerEntrypoint<Env> {
	async fetch() {
		return new Response("Newsletter Workflow Service", {status: 200})
	}
	async createInstance(payload: any) {
		let instance = await this.env.MY_WORKFLOW.create({ params: payload });
		return { id: instance.id, status: "running" };
	}

	async getInstance(id: string) {
		const instance = await this.env.MY_WORKFLOW.get(id)
		const status = await instance.status()
		return {
			id: instance.id,
			status: status.status
		}
	}

	async getResult(id: string) {
		const instance = await this.env.MY_WORKFLOW.get(id)
		const status = await instance.status()
		if (status.status !== 'complete') {
			throw new Error(`Workflow ${id} is not complete. Status: ${String(status.status)}`)
		}
		const result = await this.env.RESULTS.get(`workflow:${instance.id}`, 'json')
		if (!result) {
          throw new Error('Workflow completed but result not found in storage');
        }
		return result
	}
}
