# AI Newsletter Curator [[deployed demo](https://personal-newsletter.pages.dev/)]

An intelligent newsletter curation system that uses AI to gather the most relevant articles from your favorite news sources based on your interests.

## Features

- **Multi-Source Aggregation**: Scrape and collect articles from provided sources
- **Personalized Curation**: AI analyzes articles based on your specific interests
- **Newsletter Generation**: Gather most relevant articles in a newsletter format, with summaries
- **Relevance Scoring**: Articles are ranked by how relevant they are to your interests

## Next Steps

- [ ] Scheduled weekly newsletter generation with Cron Triggers
- [ ] User authentication and profiles
- [ ] Save preferences (interests/sources) in database
- [ ] RSS feed support for easier source management
- [ ] Web search integration for trending topics
- [ ] Chat interface for interest discovery

## Architecture

This application is built on Cloudflare's edge platform:

- **Frontend**: React (Cloudflare Pages)
- **Backend API**: Cloudflare Pages Functions
- **Workflow Engine**: Cloudflare Workflows (Worker)
- **AI**: Cloudflare Workers AI (Llama 3.1)
- **Storage**: Cloudflare KV (for workflow results)

### Project Structure

```
pages/
├── functions/                  # Pages Functions (API endpoints)
│   └── api/
│       ├── generate.ts        # Main newsletter generation endpoint
│       └── send-email.ts      # Email sending endpoint (optional)
├── src/                        # Frontend source
│   └── App.jsx                # Main React app
├── public/                     # Static assets
├── dist/                       # Build output
├── wrangler.jsonc             # Pages configuration
└── .dev.vars                  # Local environment variables (not committed)
```
```
workflows-starter/              # Cloudflare Worker
├── src/       
│   └── index.ts                # Workflow logic
└── wrangler.jsonc              # Worker configuration     
```
## Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`

## Setup

### 1. Clone the Repository

```bash
git clone git@github.com:dhe30/cf_ai_personal-newsletter.git
cd cf_ai_personal-newsletter
```

### 2. Initialize Workflows-starter and Create KV Namespace

```bash
cd ./workflows-starter
npm install
npx wrangler kv namespace create RESULTS
```

Copy the namespace ID and update `workflows-starter/wrangler.jsonc`:

```jsonc
{
  "kv_namespaces": [
    {
      "binding": "RESULTS",
      "id": "YOUR_NAMESPACE_ID_HERE"
    }
  ]
}
```

### 3. Initialize Pages and Set Up Environment Variables

Create a `.dev.vars` file in the pages directory:

```bash
cd ./pages
npm install
```
```bash
# .dev.vars (for local development)
RESEND_API_KEY=re_your_resend_api_key_here
```

**Important**: Make sure `.dev.vars` is included in `.gitignore` to avoid committing secrets!

### 4. Configure Production Secrets

Set secrets in Cloudflare Dashboard for production:

```bash
# Or via CLI
npx wrangler secret put RESEND_API_KEY --name personal-newsletter
```

### 5. Deploy the Workflow Worker

```bash
cd ../workerflow-starer
npx wrangler deploy
```

### 6. Update Pages Configuration

Ensure `wrangler.jsonc` in pages has the correct service binding:

```jsonc
{
  "services": [
    {
      "binding": "WORKFLOW_SERVICE",
      "service": "newsletter-workflow-worker"
    }
  ]
}
```

## Development

### Run Frontend Dev Server

```bash
cd ../pages
npm run dev
# Runs on http://localhost:5173 (or your configured port)
```

### Run Workflow Worker Locally

In a separate terminal:

```bash
cd ../workflows-starter
npx wrangler dev --port 8787
```

### Run Pages Functions with Service Binding

In another terminal:

```bash
cd ../pages
npx wrangler pages dev ./dist --proxy=5173 --service WORKFLOW_SERVICE=newsletter-workflow-worker
```

## Deployment

### Deploy Workflow Worker in ./workflows-starter

```bash
npx wrangler deploy
```

### Build and Deploy Pages in ./pages

```bash
npm run build
npx wrangler pages deploy ./dist
```

## Configuration

### Workflow Worker (`workers/newsletter-workflow/wrangler.jsonc`)

```jsonc
{
  "name": "newsletter-workflow-worker",
  "main": "src/index.ts",
  "compatibility_date": "2025-11-01",
  "ai": {
    "binding": "AI"
  },
  "kv_namespaces": [
    {
      "binding": "RESULTS",
      "id": "YOUR_KV_NAMESPACE_ID"
    }
  ],
  "workflows": [
    {
      "name": "workflows-starter",
      "binding": "MY_WORKFLOW",
      "class_name": "MyWorkflow"
	}
  ],
}
```

### Pages Application (`wrangler.jsonc`)

```jsonc
{
  "name": "personal-newsletter",
  "compatibility_date": "2025-11-01",
  "pages_build_output_dir": "./dist",
  "services": [
    {
      "binding": "WORKFLOW_SERVICE",
      "service": "newsletter-workflow-worker"
    }
  ]
}
```

## API Endpoints

### `POST /api/generate`

Generate a personalized newsletter.

**Request Body:**
```json
{
  "interests": ["AI", "startups", "climate tech"],
  "sources": [
    "https://techcrunch.com",
    "https://theverge.com"
  ]
}
```

**Response:**
```json
{
  "intro": "Here's your personalized tech news...",
  "articles": [
    {
      "title": "Article Title",
      "url": "https://...",
      "summary": "AI-generated summary...",
      "reason": "Why this matters to you...",
      "source": "techcrunch.com"
    }
  ],
  "generatedAt": "2025-11-06T..."
}
```

**Processing Time**: ~15 seconds

### `POST /api/send-email` (Optional)

Send generated newsletter via email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "newsletter": { /* newsletter object */ }
}
```

## Cloudlfare Workflow Logic

1. **User Input**: User provides interests and news source URLs
2. **Workflow Triggered**: Pages Function calls the Workflow Worker
3. **Article Scraping**: Workflow fetches HTML from each source and extracts articles
4. **AI Scoring**: Each article is scored 1-10 for relevance to user interests
5. **Top Selection**: Top 5-7 articles are selected
6. **AI Summarization**: AI generates personalized summaries and explanations
7. **Result Storage**: Newsletter is stored in KV for retrieval
8. **Response**: Newsletter is returned to the user

## Troubleshooting

### "Workflow timeout"

- Some news sites may be slow or block scrapers
- Try with fewer sources (2-3 max for testing)
- Check Cloudflare Workers logs for errors

### "No articles found"

- The news site structure may not match scraping patterns
- Try different news sources
- Check console logs for scraping errors

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | API key for Resend email service | Optional (only for email feature) |
