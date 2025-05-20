const express = require('express');
const multer = require('multer');
const fs = require('fs');
const speech = require('@google-cloud/speech');
const axios = require('axios');
const path = require('path');

const app = express();
const port = process.env.PORT || 8080;

process.env.GOOGLE_APPLICATION_CREDENTIALS = path.join(__dirname, 'keys', 'speech-key.json');

const upload = multer({ dest: 'uploads/' });
const client = new speech.SpeechClient();

app.post('/transcribe', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send('No file uploaded.');

  const filePath = req.file.path;
  const fileBytes = fs.readFileSync(filePath).toString('base64');

  const audio = { content: fileBytes };
  const config = {
    encoding: 'WEBM_OPUS',
    sampleRateHertz: 48000,
    languageCode: 'ar-SA'
  };

  const request = { audio, config };

  try {
    const [response] = await client.recognize(request);
    const transcription = response.results.map(r => r.alternatives[0].transcript).join('\n');

    const webhookUrl = 'https://n8n.srv828152.hstgr.cloud/webhook/invoke_agent';
    const webhookRes = await axios.post(webhookUrl, {
      chatInput: transcription,
      sessionId: 'gcloud-voice'
    });

    res.json({
      transcript: transcription,
      rag_response: webhookRes.data
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Error processing audio');
  } finally {
    fs.unlinkSync(filePath);
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});