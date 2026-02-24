const express = require('express');
const router = express.Router();

// 1. 统计启动人数的接口
router.get('/launch', (req, res) => {
    req.app.locals.stats.launchCount++;
    console.log(`小程序启动次数: ${req.app.locals.stats.launchCount}`);
    res.status(200).json({
        success: true,
        message: '启动统计成功',
        count: req.app.locals.stats.launchCount
    });
});

// 2. 统计站点点击人数的接口
router.post('/station-click', (req, res) => {
    const { stationId } = req.body;
    if (!stationId) {
        return res.status(400).json({
            success: false,
            message: '缺少站点ID'
        });
    }
    
    // 更新站点点击次数
    if (!req.app.locals.stats.stationClicks[stationId]) {
        req.app.locals.stats.stationClicks[stationId] = 0;
    }
    req.app.locals.stats.stationClicks[stationId]++;
    
    console.log(`站点 ${stationId} 点击次数: ${req.app.locals.stats.stationClicks[stationId]}`);
    res.status(200).json({
        success: true,
        message: '站点点击统计成功',
        stationId,
        count: req.app.locals.stats.stationClicks[stationId]
    });
});

// 4. 获取统计数据的接口（用于查看统计结果）
router.get('/stats', (req, res) => {
    res.status(200).json({
        success: true,
        stats: req.app.locals.stats
    });
});

module.exports = router;
