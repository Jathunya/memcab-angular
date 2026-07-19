import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Vercel serverless function (Node.js runtime). This is the ONLY place
 * GROQ_API_KEY is read -- it lives in Vercel's server-side environment
 * variables and is never sent to, or bundled into, the browser client.
 * See src/app/core/sentence.service.ts for the client-side caller.
 */

const POS_VALUES = ['noun', 'verb', 'adjective', 'phrase', 'adverb'] as const;
type PartOfSpeech = (typeof POS_VALUES)[number];

const GROQ_MODEL = 'llama-3.3-70b-versatile';
const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

interface CustomWordResult {
  term: string;
  thai: string;
  pronunciation: string;
  partOfSpeech: PartOfSpeech;
  sentence: string;
}

export default async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env['GROQ_API_KEY'];
  if (!apiKey) {
    // Distinct from a bad request: this means the Vercel env var isn't set,
    // an ops/config issue, not something the caller did wrong.
    console.error('[api/generate-sentence] GROQ_API_KEY is not set in this environment');
    res.status(500).json({ error: 'Sentence generation is not configured on the server.' });
    return;
  }

  const term = typeof req.body?.term === 'string' ? req.body.term.trim() : '';
  if (!term) {
    res.status(400).json({ error: 'A "term" string is required.' });
    return;
  }

  try {
    // A one-shot example plus explicit "never leave empty" guidance keeps the
    // free-tier Llama model from dropping the Thai-script field under strict
    // "Thai only" wording -- verified empirically against several test words.
    const prompt =
      `You are a Thai-English dictionary assistant. Given the English word "${term}", ` +
      `output ONLY a single valid JSON object (no markdown, no commentary) with exactly ` +
      `these fields: word, partOfSpeech, sentence, translation, pronunciation.\n\n` +
      `Field rules:\n` +
      `- word: the given English word, exactly as provided.\n` +
      `- partOfSpeech: one of noun, verb, adjective, adverb, phrase.\n` +
      `- sentence: one natural, high-quality English example sentence using the word.\n` +
      `- translation: the Thai word for it, written using actual Thai script characters ` +
      `(e.g. สวย, วิ่ง, แมว). This field must never be left empty.\n` +
      `- pronunciation: the dictionary-standard IPA (International Phonetic Alphabet) transcription ` +
      `of the ENGLISH word itself, wrapped in slashes (e.g. "/kaʊ/" for "cow", "/ˈbjuːtɪfəl/" for ` +
      `"beautiful").\n\n` +
      `Example for the word "beautiful":\n` +
      `{"word":"beautiful","partOfSpeech":"adjective","sentence":"The sunset was beautiful.",` +
      `"translation":"สวย","pronunciation":"/ˈbjuːtɪfəl/"}\n\n` +
      `Now respond with the JSON object for "${term}" only.`;

    const groqRes = await fetch(GROQ_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
      }),
    });

    if (!groqRes.ok) {
      const errBody = await groqRes.text().catch(() => '');
      console.error(`[api/generate-sentence] Groq request failed (${groqRes.status}): ${errBody}`);
      res.status(502).json({ error: 'Could not generate sentence. Please try again.' });
      return;
    }

    const data = await groqRes.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    if (!text) throw new Error('Empty Groq response');

    const parsed = JSON.parse(text);
    if (!parsed?.translation || !parsed?.sentence) throw new Error('Malformed Groq response');

    const partOfSpeech: PartOfSpeech = POS_VALUES.includes(parsed.partOfSpeech) ? parsed.partOfSpeech : 'noun';

    const result: CustomWordResult = {
      term,
      thai: parsed.translation,
      pronunciation: parsed.pronunciation ?? '',
      partOfSpeech,
      sentence: parsed.sentence,
    };

    res.status(200).json(result);
  } catch (err) {
    console.error('[api/generate-sentence] failed:', err);
    res.status(502).json({ error: 'Could not generate sentence. Please try again.' });
  }
}
