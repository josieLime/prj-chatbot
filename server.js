const express = require('express');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const API_KEY = process.env.GEMINI_API_KEY;
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.0-flash';
const SYSTEM_PROMPT =
  process.env.SYSTEM_PROMPT ||
  'Você é um assistente de IA útil, direto e amigável. Responda em português do Brasil.';

// Serve apenas o index.html (não expõe .env, node_modules, etc.)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/api/chat', async (req, res) => {
  try {
    if (!API_KEY) {
      return res
        .status(500)
        .json({ error: 'GEMINI_API_KEY não configurada. Crie um arquivo .env com sua chave.' });
    }

    const contents = Array.isArray(req.body && req.body.contents) ? req.body.contents : [];
    if (contents.length === 0) {
      return res.status(400).json({ error: 'Nenhuma mensagem enviada.' });
    }

    const url =
      'https://generativelanguage.googleapis.com/v1beta/models/' +
      MODEL +
      ':generateContent?key=' +
      API_KEY;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return res
        .status(response.status)
        .json({ error: (data.error && data.error.message) || 'Erro na API do Gemini.' });
    }

    const reply = (data.candidates &&
      data.candidates[0] &&
      data.candidates[0].content &&
      data.candidates[0].content.parts) 
      ? data.candidates[0].content.parts.map((p) => p.text).filter(Boolean).join('')
      : '';

    if (!reply) {
      return res.status(502).json({ error: 'O modelo não retornou uma resposta de texto.' });
    }

    res.json({ reply });
  } catch (err) {
    res.status(500).json({ error: err.message || 'Erro interno no servidor.' });
  }
});

app.listen(PORT, () => {
  console.log('Assistente IA rodando em http://localhost:' + PORT);
  if (!API_KEY) {
    console.warn('AVISO: GEMINI_API_KEY ausente. Copie .env.example para .env e preencha a chave.');
  }
});
