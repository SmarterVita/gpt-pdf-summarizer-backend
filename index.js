const express = require('express');
const multer = require('multer');
const axios = require('axios');
const fs = require('fs');
const cors = require('cors');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
app.use(cors());
const upload = multer({ dest: 'uploads/' });

const openai = axios.create({
  baseURL: 'https://api.openai.com/v1',
  headers: {
    'Authorization': 'Bearer sk-proj-a3nhL7t56hrJ1rV2UTCL8pgjvRz0MyouyqIZJmQ7b3xVpHdxSxAbkWN0XQ1_G_i0N8S9fnhzT3bLbfJRDQUyNSu9XNKUe1Ez5lH9W0MrCokiQiFLWgeDu2LQoyo_PZ0Vxv7VvgV4XWhbw-mjjfc60YA'
  }
});

const ASSISTANT_ID = 'asst_LNsiNX2btYZ36HhfgKrywLht';

app.post('/api/summarize', upload.single('file'), async (req, res) => {
  try {
    const filePath = req.file.path;
    const fileStream = fs.createReadStream(filePath);

    const form = new FormData();
    form.append('file', fileStream);
    form.append('purpose', 'assistants');

    const fileUploadRes = await axios.post('https://api.openai.com/v1/files', form, {
      headers: {
        ...form.getHeaders(),
        'Authorization': 'Bearer sk-proj-a3nhL7t56hrJ1rV2UTCL8pgjvRz0MyouyqIZJmQ7b3xVpHdxSxAbkWN0XQ1_G_i0N8S9fnhzT3bLbfJRDQUyNSu9XNKUe1Ez5lH9W0MrCokiQiFLWgeDu2LQoyo_PZ0Vxv7VvgV4XWhbw-mjjfc60YA'
      }
    });
    const fileId = fileUploadRes.data.id;

    const thread = await openai.post('/threads');
    const threadId = thread.data.id;

    const run = await openai.post(`/threads/${threadId}/runs`, {
      assistant_id: ASSISTANT_ID,
      file_ids: [fileId],
      instructions: 'Summarize this PDF holistically as a functional MD would.'
    });
    const runId = run.data.id;

    let status;
    do {
      await new Promise(r => setTimeout(r, 2000));
      const check = await openai.get(`/threads/${threadId}/runs/${runId}`);
      status = check.data.status;
    } while (status !== 'completed');

    const messages = await openai.get(`/threads/${threadId}/messages`);
    const content = messages.data.data[0].content[0].text.value;

    fs.unlinkSync(filePath);
    res.send(content);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).send('Failed to summarize PDF');
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

