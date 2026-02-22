import axios from 'axios';
import fs from 'fs';

const testAPI = async () => {
    try {
        console.log('测试API调用：2024年最新的AI技术趋势是什么？');
        
        const response = await axios.post('http://localhost:3003/api/chat', {
            messages: [
                { role: 'user', content: '2024年最新的AI技术趋势是什么？' }
            ]
        }, {
            responseType: 'stream'
        });

        console.log('API调用成功！响应状态：', response.status);
        
        let fullResponse = '';
        response.data.on('data', (chunk) => {
            const chunkStr = chunk.toString();
            fullResponse += chunkStr;
            const lines = chunkStr.split('\n');
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    try {
                        const data = line.slice(6).trim();
                        if (data === '[DONE]') {
                            console.log('结束');
                        } else if (data) {
                            const parsed = JSON.parse(data);
                            if (parsed.choices && parsed.choices[0]?.delta?.content) {
                                process.stdout.write(parsed.choices[0].delta.content);
                            }
                        }
                    } catch (error) {
                        // 忽略解析错误
                    }
                }
            }
        });

        response.data.on('end', () => {
            console.log('\n');
            console.log('响应已完成');
            
            // 保存完整响应到文件
            fs.writeFileSync('test-response.txt', fullResponse, 'utf8');
            console.log('完整响应已保存到 test-response.txt');
        });

    } catch (error) {
        console.error('API调用失败：', error.message);
        if (error.response) {
            console.error('响应状态：', error.response.status);
            if (typeof error.response.data === 'string') {
                console.error('响应数据：', error.response.data);
            } else {
                console.error('响应数据：', JSON.stringify(error.response.data, null, 2));
            }
        }
    }
};

testAPI();
