// functions/api/send-email.ts
import { Resend } from 'resend';

// move to types file later
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

interface emailType {
    email: string;
    newsletter: Newsletter
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { email, newsletter } = await context.request.json() as emailType;
  const key = context.env.RESEND_API_KEY  // Local: .dev.vars
  const resend = new Resend(key);
  
  const html = `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h1>Your Personalized Newsletter</h1>
      <p>${newsletter.intro}</p>
      ${newsletter.articles.map(article => `
        <div style="margin: 20px 0; padding: 15px; border-left: 4px solid #4F46E5;">
          <h2><a href="${article.url}">${article.title}</a></h2>
          <p style="color: #666; font-size: 14px;">${article.source}</p>
          <p>${article.summary}</p>
          <p style="background: #EEF2FF; padding: 10px; border-radius: 5px;">
            <strong>Why this matters:</strong> ${article.reason}
          </p>
        </div>
      `).join('')}
    </div>
  `;
  
  await resend.emails.send({
    from: 'newsletter@artichokes.tech',
    to: email,
    subject: 'Your AI-Curated Newsletter',
    html
  });
  
  return Response.json({ success: true });
};