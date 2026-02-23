import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import axios from 'axios';
import AbortController from 'abort-controller';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ message: 'AIchat Backend Server is running!' });
});

app.post('/api/chat', async (req, res) => {
  const abortSignal = req.abortSignal;

  try {
    const { messages, thinking } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Invalid messages format' });
    }

    const API_KEY = process.env.ZHIPU_API_KEY;
    const API_URL = process.env.ZHIPU_API_URL || 'https://open.bigmodel.cn/api/paas/v4/chat/completions';
    const MODEL = process.env.ZHIPU_MODEL || 'GLM-4.7-Flash';

    if (!API_KEY || API_KEY === 'your_api_key_here') {
      return res.status(500).json({ error: 'API key not configured' });
    }

    const systemMessage = {
      role: 'system',
      content: '你是由WStella基于智谱GLM-4.7大模型开发的AI对话程序，名字叫哈基米AI，你能尽可能完美的回应用户的要求，对话风格比较口语化，不会过于正式和严肃。你能进行有效的思考，而不会陷入过度推理的无限循环，对于不知道的事情直接表达不知道即可，不要捏造事实。请简洁的进行对话，除非是你认为有必要详细回复。'
    };

    const payload = {
      model: MODEL,
      messages: [systemMessage, ...messages],
      stream: true,
      max_tokens: 4096
    };

    if (thinking) {
      payload.reasoning_effort = 'high';
    }

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');

    const controller = new AbortController();
    const abortHandler = () => {
      controller.abort();
      res.write('data: [DONE]\n\n');
      res.end();
    };

    if (abortSignal) {
      abortSignal.addEventListener('abort', abortHandler);
    }

    const response = await axios({
      method: 'POST',
      url: API_URL,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      data: payload,
      responseType: 'stream',
      signal: controller.signal
    });

    response.data.on('data', (chunk) => {
      const lines = chunk.toString().split('\n');
      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') {
            res.write('data: [DONE]\n\n');
          } else if (data.trim()) {
            try {
              JSON.parse(data);
              res.write(`data: ${data}\n\n`);
            } catch {
              // skip invalid JSON
            }
          }
        }
      }
    });

    response.data.on('end', () => {
      if (abortSignal) {
        abortSignal.removeEventListener('abort', abortHandler);
      }
      res.end();
    });

    response.data.on('error', (error) => {
      if (abortSignal) {
        abortSignal.removeEventListener('abort', abortHandler);
      }
      console.error('Stream error:', error);
      res.write(`data: ${JSON.stringify({ error: '流式传输错误，请重试' })}\n\n`);
      res.end();
    });

    req.on('close', () => {
      controller.abort();
      if (abortSignal) {
        abortSignal.removeEventListener('abort', abortHandler);
      }
    });

  } catch (error) {
    if (error.name === 'AbortError' || error.code === 'ERR_CANCELED') {
      console.log('Request canceled by client');
      return;
    }

    console.error('Error in chat API:', error);
    let errorMessage = '服务器错误，请稍后重试';
    
    if (error.response) {
      if (error.response.status === 401) {
        errorMessage = 'API密钥无效，请检查配置';
      } else if (error.response.status === 429) {
        errorMessage = '请求过于频繁，请稍后再试';
      } else if (error.response.status === 503) {
        errorMessage = '服务暂时不可用，请稍后重试';
      } else {
        errorMessage = error.response.data?.error?.message || error.message || errorMessage;
      }
    } else if (error.request) {
      errorMessage = '无法连接到API服务，请检查网络连接';
    } else {
      errorMessage = error.message || errorMessage;
    }
    
    res.write(`data: ${JSON.stringify({ error: errorMessage })}\n\n`);
    res.end();
  }
});

app.get('/api/weather', async (req, res) => {
  try {
    const { city } = req.query;
    const API_KEY = process.env.SENIVERSE_API_KEY;

    if (!API_KEY) {
      return res.status(500).json({ error: '天气API密钥未配置' });
    }

    if (!city) {
      return res.status(400).json({ error: '请输入城市名称' });
    }

    const [nowResponse, dailyResponse] = await Promise.all([
      axios.get('https://api.seniverse.com/v3/weather/now.json', {
        params: {
          key: API_KEY,
          location: city,
          language: 'zh-Hans',
          unit: 'c'
        }
      }),
      axios.get('https://api.seniverse.com/v3/weather/daily.json', {
        params: {
          key: API_KEY,
          location: city,
          language: 'zh-Hans',
          unit: 'c',
          days: 3
        }
      })
    ]);

    const result = {
      ...nowResponse.data,
      results: nowResponse.data.results.map((item, index) => ({
        ...item,
        daily: dailyResponse.data.results[index]?.daily || []
      }))
    };

    res.json(result);
  } catch (error) {
    console.error('天气API错误:', error);
    if (error.response) {
      res.status(error.response.status).json({ 
        error: error.response.data?.status || '获取天气失败，请检查城市名称' 
      });
    } else {
      res.status(500).json({ error: '网络错误，请稍后重试' });
    }
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
