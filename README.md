# AI Newsletter Generator

An intelligent newsletter curation system that uses AI to analyze and summarize articles from your favorite news sources based on your interests.

## Features

- **Personalized Curation**: AI analyzes articles based on your specific interests
- **Multi-Source Aggregation**: Scrape and collect articles from multiple news websites
- **AI Summaries**: Get concise, personalized summaries of each article
- **Relevance Scoring**: Articles are ranked by how relevant they are to your interests

## 🏗️ Architecture

This application is built on Cloudflare's edge platform:

- **Frontend**: React (Cloudflare Pages)
- **Backend API**: Cloudflare Pages Functions
- **Workflow Engine**: Cloudflare Workflows (Worker)
- **AI**: Cloudflare Workers AI (Llama 3.1)
- **Storage**: Cloudflare KV (for workflow results)

### Project Structure

```
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
├── newsletter-workflow/       # Cloudflare Worker
│   ├── src/   
│   │    └── index.ts/         # Workflow logic
│   └── wrangler.jsonc         # Worker configuration
│       
```
## 📋 Prerequisites

- Node.js 18+
- npm or yarn
- Cloudflare account
- Wrangler CLI: `npm install -g wrangler`

## 🛠️ Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd <your-repo-name>
npm install
```

### 2. Create KV Namespace

```bash
npx wrangler kv namespace create RESULTS
```

Copy the namespace ID and update `workers/newsletter-workflow/wrangler.jsonc`:

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

### 3. Set Up Environment Variables

Create a `.dev.vars` file in the root directory:

```bash
# .dev.vars (for local development)
RESEND_API_KEY=re_your_resend_api_key_here
```

**Important**: Add `.dev.vars` to `.gitignore` to avoid committing secrets!

### 4. Configure Production Secrets

Set secrets in Cloudflare Dashboard for production:

```bash
# Or via CLI
npx wrangler secret put RESEND_API_KEY --name personal-newsletter
```

### 5. Deploy the Workflow Worker

```bash
cd workers/newsletter-workflow
npx wrangler deploy
cd ../..
```

### 6. Update Pages Configuration

Ensure `wrangler.jsonc` in the root has the correct service binding:

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

## 🚀 Development

### Run Frontend Dev Server

```bash
npm run dev
# Runs on http://localhost:5173 (or your configured port)
```

### Run Workflow Worker Locally

In a separate terminal:

```bash
cd workers/newsletter-workflow
npx wrangler dev --port 8787
```

### Run Pages Functions with Service Binding

In another terminal:

```bash
npx wrangler pages dev ./dist --proxy=5173 --service WORKFLOW_SERVICE=newsletter-workflow-worker@local
```

The `@local` suffix connects to your locally running workflow worker.

### Full Local Development

For convenience, you can run all services with a script. Add to `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:workflow": "cd workers/newsletter-workflow && npx wrangler dev --port 8787",
    "dev:pages": "npx wrangler pages dev ./dist --proxy=5173 --service WORKFLOW_SERVICE=newsletter-workflow-worker@local",
    "build": "vite build",
    "deploy:workflow": "cd workers/newsletter-workflow && npx wrangler deploy",
    "deploy:pages": "npm run build && npx wrangler pages deploy ./dist",
    "deploy": "npm run deploy:workflow && npm run deploy:pages"
  }
}
```

Then run in separate terminals:
```bash
npm run dev            # Terminal 1: Frontend
npm run dev:workflow   # Terminal 2: Workflow worker
npm run dev:pages      # Terminal 3: Pages functions
```

## 📦 Deployment

### Deploy Workflow Worker

```bash
npm run deploy:workflow
```

### Build and Deploy Pages

```bash
npm run build
npm run deploy:pages
```

Or deploy both:

```bash
npm run deploy
```

## 🔧 Configuration

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
      "name": "newsletter-workflow",
      "binding": "NEWSLETTER_WORKFLOW",
      "class_name": "NewsletterWorkflow"
    }
  ]
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

## 🔌 API Endpoints

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

**Processing Time**: ~30-60 seconds

### `POST /api/send-email` (Optional)

Send generated newsletter via email.

**Request Body:**
```json
{
  "email": "user@example.com",
  "newsletter": { /* newsletter object */ }
}
```

## 🧪 Testing

### Test the Workflow Locally

```bash
curl -X POST http://localhost:8788/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "interests": ["AI", "technology"],
    "sources": ["https://techcrunch.com"]
  }'
```

### Test in Production

```bash
curl -X POST https://your-app.pages.dev/api/generate \
  -H "Content-Type: application/json" \
  -d '{
    "interests": ["AI"],
    "sources": ["https://techcrunch.com"]
  }'
```

## 🎯 How It Works

1. **User Input**: User provides interests and news source URLs
2. **Workflow Triggered**: Pages Function calls the Workflow Worker
3. **Article Scraping**: Workflow fetches HTML from each source and extracts articles
4. **AI Scoring**: Each article is scored 1-10 for relevance to user interests
5. **Top Selection**: Top 5-7 articles are selected
6. **AI Summarization**: AI generates personalized summaries and explanations
7. **Result Storage**: Newsletter is stored in KV for retrieval
8. **Response**: Newsletter is returned to the user

## 🐛 Troubleshooting

### "RESEND_API_KEY not found"

- Ensure `.dev.vars` exists in root directory
- Check for conflicting secrets store bindings in `wrangler.jsonc`
- Verify the variable is set correctly: `RESEND_API_KEY=re_...`

### "Workflow Service not found"

- Deploy the workflow worker first: `npm run deploy:workflow`
- For local dev, ensure worker is running: `npm run dev:workflow`
- Check service binding name matches in both configs

### "Workflow timeout"

- Some news sites may be slow or block scrapers
- Try with fewer sources (2-3 max for testing)
- Check Cloudflare Workers logs for errors

### "No articles found"

- The news site structure may not match scraping patterns
- Try different news sources
- Check console logs for scraping errors

## 📝 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `RESEND_API_KEY` | API key for Resend email service | Optional (only for email feature) |

## 🔐 Security Notes

- Never commit `.dev.vars` to git
- Use Cloudflare Dashboard for production secrets
- API keys should be set as secrets, not plain variables
- Consider rate limiting the API endpoint in production

## 🚧 Future Enhancements

- [ ] User authentication and profiles
- [ ] Save preferences (interests/sources) in database
- [ ] Scheduled weekly newsletter generation with Cron Triggers
- [ ] RSS feed support for easier source management
- [ ] Web search integration for trending topics
- [ ] Chat interface for interest discovery
- [ ] Email templates with better design
- [ ] Article deduplication
- [ ] Reading history tracking

## 📄 License

[Your License Here]

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📧 Contact

[Your Contact Info]

---

Built with ❤️ using Cloudflare Workers, Workers AI, and React