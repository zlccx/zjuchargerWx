const path = require('path');

// 服务器端口
const PORT = 3000;

// 数据源URL
const DATA_SOURCE_URL = 'https://charger.philfan.cn/api/status';

// 定位数据文件路径
const DEVICE_LOCATIONS_FILE = path.join(__dirname, 'device_locations.json');

// 统计数据文件路径
const STATS_FILE = path.join(__dirname, 'stats.json');

// 定期保存数据到文件的时间间隔（10分钟 = 600秒）
const SAVE_INTERVAL = 600000;

// 定时请求数据源的时间间隔（1分半 = 90秒）
const INTERVAL_TIME = 90000;

module.exports = {
    PORT,
    DATA_SOURCE_URL,
    DEVICE_LOCATIONS_FILE,
    STATS_FILE,
    SAVE_INTERVAL,
    INTERVAL_TIME
};
