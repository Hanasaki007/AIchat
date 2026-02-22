import axios from 'axios';

async function testAPI() {
  try {
    console.log('正在测试API...');
    
    const response = await axios.post('http://localhost:3003/api/chat', {
      messages: [
        { role: 'user', content: '2024年最新的AI技术趋势是什么？' }
      ]
    }, {
      responseType: 'text'
    });

    console.log('API调用成功！');
    console.log('响应状态：', response.status);
    console.log('响应内容长度：', response.data.length, '字符');
    console.log('前200个字符：');
    console.log(response.data.substring(0, 200));
    console.log('...');
    
  } catch (error) {
    console.error('API调用失败：', error.message);
    if (error.response) {
      console.error('响应状态：', error.response.status);
      console.error('响应数据：', error.response.data);
    }
  }
}

testAPI();
