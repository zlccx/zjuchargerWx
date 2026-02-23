const express = require('express');
const cors = require('cors');
const https = require('https');

const app = express();
const PORT = 3000;

// 允许跨域请求
app.use(cors());
// 解析JSON请求体
app.use(express.json());

// 统计数据
const stats = {
    launchCount: 0,
    stationClicks: {}
};

// 数据源URL
const DATA_SOURCE_URL = 'https://charger.philfan.cn/api/status';

// 历史站点数据存储
const historicalData = [];

// 定时请求数据源的时间间隔（1分半 = 90秒）
const INTERVAL_TIME = 90000;

// 1. 统计启动人数的接口
app.get('/api/launch', (req, res) => {
    stats.launchCount++;
    console.log(`小程序启动次数: ${stats.launchCount}`);
    res.status(200).json({
        success: true,
        message: '启动统计成功',
        count: stats.launchCount
    });
});

// 2. 统计站点点击人数的接口
app.post('/api/station-click', (req, res) => {
    const { stationId } = req.body;
    if (!stationId) {
        return res.status(400).json({
            success: false,
            message: '缺少站点ID'
        });
    }
    
    // 更新站点点击次数
    if (!stats.stationClicks[stationId]) {
        stats.stationClicks[stationId] = 0;
    }
    stats.stationClicks[stationId]++;
    
    console.log(`站点 ${stationId} 点击次数: ${stats.stationClicks[stationId]}`);
    res.status(200).json({
        success: true,
        message: '站点点击统计成功',
        stationId,
        count: stats.stationClicks[stationId]
    });
});

// 3. 代理数据源，返回充电桩状态数据
app.get('/api/status', (req, res) => {
    https.get(DATA_SOURCE_URL, (dataRes) => {
        let data = '';
        
        dataRes.on('data', (chunk) => {
            data += chunk;
        });
        
        dataRes.on('end', () => {
            try {
                const parsedData = JSON.parse(data);
                res.status(200).json(parsedData);
            } catch (error) {
                res.status(500).json({
                    success: false,
                    message: '解析数据源失败',
                    error: error.message
                });
            }
        });
    }).on('error', (error) => {
        res.status(500).json({
            success: false,
            message: '获取数据源失败',
            error: error.message
        });
    });
});

// 4. 获取统计数据的接口（用于查看统计结果）
app.get('/api/stats', (req, res) => {
    res.status(200).json({
        success: true,
        stats
    });
});

// 5. 获取历史数据的接口
app.get('/api/historical-data', (req, res) => {
    res.status(200).json({
        success: true,
        historicalData
    });
});

// 6. 获取出行建议的接口
app.get('/api/travel-suggestions', (req, res) => {
    try {
        const suggestions = generateTravelSuggestions();
        res.status(200).json({
            success: true,
            suggestions
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: '生成出行建议失败',
            error: error.message
        });
    }
});

// 智能分析算法 - 计算站点使用规律
const analyzeStationPatterns = () => {
    if (historicalData.length === 0) {
        return {};
    }
    
    // 获取最新的站点数据
    const latestData = historicalData[historicalData.length - 1].data;
    
    // 计算每个站点的统计数据
    const stationStats = {};
    
    // 遍历历史数据，计算每个站点的平均可用率和使用趋势
    historicalData.forEach(record => {
        const stations = record.data.stations || [];
        stations.forEach(station => {
            if (!stationStats[station.id]) {
                stationStats[station.id] = {
                    id: station.id,
                    name: station.name,
                    totalRecords: 0,
                    totalAvailable: 0,
                    totalCapacity: 0,
                    usageHistory: []
                };
            }
            
            const available = station.available || 0;
            const capacity = station.capacity || 0;
            const usageRate = capacity > 0 ? (capacity - available) / capacity : 0;
            
            stationStats[station.id].totalRecords++;
            stationStats[station.id].totalAvailable += available;
            stationStats[station.id].totalCapacity += capacity;
            stationStats[station.id].usageHistory.push({
                timestamp: record.timestamp,
                usageRate: usageRate
            });
        });
    });
    
    // 计算平均可用率和当前状态
    const analysisResult = Object.values(stationStats).map(stat => {
        const avgAvailableRate = stat.totalCapacity > 0 ? stat.totalAvailable / stat.totalCapacity : 0;
        
        // 计算使用趋势（简单的线性回归）
        let trend = 0;
        if (stat.usageHistory.length > 1) {
            const recentHistory = stat.usageHistory.slice(-10); // 最近10条记录
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            const n = recentHistory.length;
            
            recentHistory.forEach((record, index) => {
                const x = index;
                const y = record.usageRate;
                sumX += x;
                sumY += y;
                sumXY += x * y;
                sumX2 += x * x;
            });
            
            // 计算斜率（趋势）
            if (n * sumX2 - sumX * sumX !== 0) {
                trend = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            }
        }
        
        // 获取当前状态
        const currentStation = latestData.stations.find(s => s.id === stat.id);
        const currentAvailable = currentStation ? currentStation.available || 0 : 0;
        const currentCapacity = currentStation ? currentStation.capacity || 0 : 0;
        const currentUsageRate = currentCapacity > 0 ? (currentCapacity - currentAvailable) / currentCapacity : 0;
        
        return {
            id: stat.id,
            name: stat.name,
            currentAvailable,
            currentCapacity,
            currentUsageRate,
            avgAvailableRate,
            trend: trend,
            // 评分：可用率高、趋势向好的站点得分高
            score: avgAvailableRate * 0.6 + (1 + trend) * 0.4
        };
    });
    
    return {
        analysisTime: new Date().toISOString(),
        stationAnalysis: analysisResult
    };
};

// 生成出行建议
const generateTravelSuggestions = () => {
    const analysis = analyzeStationPatterns();
    const stationAnalysis = analysis.stationAnalysis;
    
    // 按评分排序，推荐前5个最佳站点
    const recommendedStations = stationAnalysis
        .sort((a, b) => b.score - a.score)
        .slice(0, 5);
    
    // 分析当前时间段的整体使用情况
    const currentHour = new Date().getHours();
    let timeAdvice = '';
    
    if (currentHour >= 7 && currentHour < 9) {
        timeAdvice = '当前是早高峰时段，建议选择评分较高的站点或错峰出行';
    } else if (currentHour >= 17 && currentHour < 19) {
        timeAdvice = '当前是晚高峰时段，充电桩使用可能较为紧张，建议提前规划';
    } else {
        timeAdvice = '当前时段充电桩使用相对宽松，可以根据需求选择站点';
    }
    
    return {
        analysisTime: analysis.analysisTime,
        timeAdvice,
        recommendedStations: recommendedStations.map(station => ({
            id: station.id,
            name: station.name,
            currentAvailable: station.currentAvailable,
            currentCapacity: station.currentCapacity,
            usageRate: station.currentUsageRate.toFixed(2),
            recommendationReason: station.trend > 0 
                ? '该站点可用率较高且呈上升趋势' 
                : '该站点可用率较高，适合当前使用'
        }))
    };
};

// 获取数据源并保存历史数据
const fetchDataSource = () => {
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
                historicalData.push({
                    timestamp,
                    data: parsedData
                });
                
                // 只保留最近24小时的数据（24小时 * 60分钟/小时 * 4次/分钟 = 5760次，每1分半请求一次）
                const MAX_HISTORY = 5760;
                if (historicalData.length > MAX_HISTORY) {
                    historicalData.shift();
                }
                
                console.log(`[${timestamp}] 获取数据源成功，当前历史数据量: ${historicalData.length}`);
            } catch (error) {
                console.error('解析数据源失败:', error.message);
            }
        });
    }).on('error', (error) => {
        console.error('获取数据源失败:', error.message);
    });
};

// 启动定时任务
setInterval(fetchDataSource, INTERVAL_TIME);

// 初始启动时立即获取一次数据
fetchDataSource();

app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('可用接口:');
    console.log('GET  /api/launch - 统计小程序启动次数');
    console.log('POST /api/station-click - 统计站点点击次数');
    console.log('GET  /api/status - 获取充电桩状态数据');
    console.log('GET  /api/stats - 查看统计数据');
    console.log('GET  /api/historical-data - 获取历史数据');
    console.log('GET  /api/travel-suggestions - 获取出行建议');
});