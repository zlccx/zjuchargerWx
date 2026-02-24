const https = require('https');
const { DATA_SOURCE_URL } = require('../config');

// 获取数据源并保存历史数据
const fetchDataSource = (app) => {
    https.get(DATA_SOURCE_URL, (dataRes) => {
        let data = '';
        
        dataRes.on('data', (chunk) => {
            data += chunk;
        });
        
        dataRes.on('end', () => {
            try {
                const parsedData = JSON.parse(data);
                const timestamp = new Date().toISOString();
                
                // 保存历史数据，包含时间戳
                app.locals.historicalData.push({
                    timestamp,
                    data: parsedData
                });
                
                // 只保留最近24小时的数据（24小时 * 60分钟/小时 * 4次/分钟 = 5760次，每1分半请求一次）
                const MAX_HISTORY = 5760;
                if (app.locals.historicalData.length > MAX_HISTORY) {
                    app.locals.historicalData.shift();
                }
                
                console.log(`[${timestamp}] 获取数据源成功，当前历史数据量: ${app.locals.historicalData.length}`);
            } catch (error) {
                console.error('解析数据源失败:', error.message);
            }
        });
    }).on('error', (error) => {
        console.error('获取数据源失败:', error.message);
    });
};

module.exports = {
    fetchDataSource
};
