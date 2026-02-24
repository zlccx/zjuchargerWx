// 智能分析算法 - 计算站点使用规律
const analyzeStationPatterns = (historicalData) => {
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
const generateTravelSuggestions = (historicalData) => {
    const analysis = analyzeStationPatterns(historicalData);
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

module.exports = {
    analyzeStationPatterns,
    generateTravelSuggestions
};
