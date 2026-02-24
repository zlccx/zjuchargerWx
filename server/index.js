const express = require('express');
const cors = require('cors');

// 加载配置
const { PORT, SAVE_INTERVAL, INTERVAL_TIME } = require('./config');

// 加载服务
const { fetchDataSource } = require('./services/dataService');
const { saveDeviceLocationsToFile, loadDeviceLocationsFromFile } = require('./services/deviceService');
const { saveStatsToFile, loadStatsFromFile } = require('./services/statsService');

// 加载路由
const statsRoutes = require('./routes/stats');
const dataRoutes = require('./routes/data');
const deviceRoutes = require('./routes/devices');

// 初始化Express应用
const app = express();

// 配置中间件
app.use(cors());
app.use(express.json());

// 初始化应用状态
app.locals.stats = loadStatsFromFile();
app.locals.historicalData = [];
app.locals.deviceLocations = loadDeviceLocationsFromFile();

// 注册路由
app.use('/api', statsRoutes);
app.use('/api', dataRoutes);
app.use('/api', deviceRoutes);

// 启动定时任务
setInterval(() => fetchDataSource(app), INTERVAL_TIME);
setInterval(() => saveDeviceLocationsToFile(app.locals.deviceLocations), SAVE_INTERVAL);
setInterval(() => saveStatsToFile(app.locals.stats), SAVE_INTERVAL);

// 初始启动时立即获取一次数据
fetchDataSource(app);

// 启动服务器
app.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log('可用接口:');
    console.log('GET  /api/launch - 统计小程序启动次数');
    console.log('POST /api/station-click - 统计站点点击次数');
    console.log('GET  /api/status - 获取充电桩状态数据');
    console.log('GET  /api/stats - 查看统计数据');
    console.log('GET  /api/historical-data - 获取历史数据');
    console.log('GET  /api/travel-suggestions - 获取出行建议');
    console.log('POST /api/submit-device-location - 提交设备位置');
    console.log('GET  /api/device-locations - 获取设备位置数据');
});

// 处理进程退出事件
const handleExit = () => {
    saveDeviceLocationsToFile(app.locals.deviceLocations);
    saveStatsToFile(app.locals.stats);
    process.exit();
};

process.on('exit', () => {
    saveDeviceLocationsToFile(app.locals.deviceLocations);
    saveStatsToFile(app.locals.stats);
});
process.on('SIGINT', handleExit);
process.on('SIGTERM', handleExit);
