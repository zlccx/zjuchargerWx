const fs = require('fs');
const path = require('path');
const { STATS_FILE } = require('../config');

// 保存统计数据到文件
const saveStatsToFile = (stats) => {
    try {
        const data = JSON.stringify(stats, null, 2);
        fs.writeFileSync(STATS_FILE, data);
        console.log(`[${new Date().toISOString()}] 统计数据已保存到文件`);
    } catch (error) {
        console.error('保存统计数据失败:', error.message);
    }
};

// 从文件加载统计数据
const loadStatsFromFile = () => {
    try {
        if (fs.existsSync(STATS_FILE)) {
            const data = fs.readFileSync(STATS_FILE, 'utf8');
            const loadedData = JSON.parse(data);
            console.log(`[${new Date().toISOString()}] 从文件加载统计数据成功`);
            return loadedData;
        }
        // 如果文件不存在，返回默认的统计数据结构
        return {
            launchCount: 0,
            stationClicks: {}
        };
    } catch (error) {
        console.error('加载统计数据失败:', error.message);
        // 加载失败时返回默认的统计数据结构
        return {
            launchCount: 0,
            stationClicks: {}
        };
    }
};

module.exports = {
    saveStatsToFile,
    loadStatsFromFile
};