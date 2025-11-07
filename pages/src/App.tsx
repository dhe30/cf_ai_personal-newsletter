import { useState } from 'react';
import { Sparkles, Plus, X, Mail, Loader, ExternalLink, TrendingUp } from 'lucide-react';
import "./App.css"
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

const NewsletterGenerator = () => {
  const [interests, setInterests] = useState<string[]>([]);
  const [interestInput, setInterestInput] = useState('');
  const [sources, setSources] = useState<string[]>([]);
  const [sourceInput, setSourceInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [newsletter, setNewsletter] = useState<Newsletter | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');

  // Add interest tag
  const addInterest = () => {
    if (interestInput.trim() && !interests.includes(interestInput.trim())) {
      setInterests([...interests, interestInput.trim()]);
      setInterestInput('');
    }
  };

  // Remove interest tag
  const removeInterest = (interest: string) => {
    setInterests(interests.filter(i => i !== interest));
  };

  // Add source URL
  const addSource = () => {
    const url = sourceInput.trim();
    if (url && !sources.includes(url)) {
      // Basic URL validation
      try {
        new URL(url);
        setSources([...sources, url]);
        setSourceInput('');
        setError(null);
      } catch {
        setError('Please enter a valid URL (including https://)');
      }
    }
  };

  // Remove source URL
  const removeSource = (source: string) => {
    setSources(sources.filter(s => s !== source));
  };

  // Load example data
  const loadExample = () => {
    setInterests(['AI', 'startups', 'climate tech']);
    setSources([
      'https://techcrunch.com',
      'https://theverge.com',
      'https://arstechnica.com'
    ]);
    setError(null);
  };

  // Generate newsletter
  const generateNewsletter = async () => {
    if (interests.length === 0) {
      setError('Please add at least one interest');
      return;
    }
    if (sources.length === 0) {
      setError('Please add at least one news source');
      return;
    }

    setLoading(true);
    setError(null);
    setNewsletter(null);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          interests,
          sources
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate newsletter');
      }

      setNewsletter(data);
    } catch (err) {
      setError('Something went wrong. Please try again.');
      console.log(err)
    } finally {
      setLoading(false);
    }
  };

  async function sendEmail() {
    try {
      const response = await fetch('/api/send-email', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          newsletter
        })
      })

      if (!response.ok) {
        throw new Error('Failed to send email');
      }
    } catch (err) {
      console.log(err)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3">
            <Mail className="w-10 h-10 text-indigo-600" />
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900">
              AI Newsletter Generator
            </h1>
          </div>
          <p className="text-gray-600 text-lg">
            Let AI handpick the best, most relevant articles from your favorite sources - in a weekly newsletter!
          </p>
        </div>

        {/* Main Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 mb-6">
          {/* Interests Section */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              Your Interests
            </label>
            <p className="text-sm text-gray-600 mb-3">
              What topics do you want to stay updated on?
            </p>
            
            <div className="flex gap-2 mb-3">
              <input
                type="text"
                value={interestInput}
                onChange={(e) => setInterestInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addInterest()}
                placeholder="e.g., AI, startups, climate tech"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <button
                onClick={addInterest}
                className="px-4 py-2 !bg-indigo-600 text-white rounded-lg !hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {interests.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1 bg-indigo-100 text-indigo-800 rounded-full flex items-center gap-2"
                  >
                    {interest}
                    <button
                      onClick={() => removeInterest(interest)}
                      className="!hover:text-indigo-600  !bg-indigo-100"
                    >
                      <X className="w-4 h-4 p-0 bg-indigo-100" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Sources Section */}
          <div className="mb-8">
            <label className="block text-lg font-semibold text-gray-900 mb-3">
              News Sources
            </label>
            <p className="text-sm text-gray-600 mb-3">
              Add URLs to news sites you want articles from
            </p>
            
            <div className="flex gap-2 mb-3">
              <input
                type="url"
                value={sourceInput}
                onChange={(e) => setSourceInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addSource()}
                placeholder="https://techcrunch.com"
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none"
              />
              <button
                onClick={addSource}
                className="px-4 py-2 !bg-indigo-600 text-white rounded-lg !hover:bg-indigo-700 transition-colors flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Add
              </button>
            </div>

            {sources.length > 0 && (
              <div className="space-y-2">
                {sources.map((source) => (
                  <div
                    key={source}
                    className="px-3 py-2 bg-gray-50 rounded-lg flex items-center justify-between"
                  >
                    <span className="text-sm text-gray-700 truncate">{source}</span>
                    <button
                      onClick={() => removeSource(source)}
                      className="ml-2 text-gray-400 hover:text-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={generateNewsletter}
              disabled={loading || interests.length === 0 || sources.length === 0}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-lg hover:from-indigo-700 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  Generating... (30-60s)
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Generate Newsletter
                </>
              )}
            </button>
            
            <button
              onClick={loadExample}
              disabled={loading}
              className="px-6 py-3 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
            >
              Load Example
            </button>
          </div>
        </div>

        {/* Newsletter Preview */}
        {newsletter && (
          <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8 animate-fade-in">
            <div className="flex items-center justify-between gap-3 mb-6">
              <div className='flex items-center justify-between mb-6'>
                <TrendingUp className="w-6 h-6 text-green-600" />
                <h2 className="text-2xl font-bold text-gray-900">Your Personalized Newsletter</h2>
              </div>
              <div className="mb-4">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 mr-2"
                />
                <button
                  onClick={sendEmail}
                  className="px-6 py-2 !bg-green-600 text-white rounded-lg !hover:bg-green-700"
                >
                  Email Me This
                </button>
              </div>
            </div>

            {/* Intro */}
            <div className="mb-8 p-4 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-lg border border-indigo-100">
              <p className="text-gray-800 leading-relaxed">{newsletter?.intro}</p>
            </div>

            {/* Articles */}
            <div className="space-y-6">
              {newsletter?.articles.map((article, index) => (
                <div
                  key={index}
                  className="border-l-4 border-indigo-500 pl-4 pb-6 border-b border-gray-100 last:border-b-0"
                >
                  <div className="flex items-start justify-between gap-4 mb-2">
                    <h3 className="text-xl font-semibold text-gray-900 hover:text-indigo-600 transition-colors">
                      <a
                        href={article.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2"
                      >
                        {article.title}
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </h3>
                  </div>
                  
                  <p className="text-sm text-gray-500 mb-3">{article.source}</p>
                  
                  <p className="text-gray-700 leading-relaxed mb-3">
                    {article.summary}
                  </p>
                  
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-900">
                      <strong>Why this matters:</strong> {article.reason}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Timestamp */}
            <div className="mt-6 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
              Generated on {new Date(newsletter?.generatedAt || '').toLocaleString()}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewsletterGenerator;