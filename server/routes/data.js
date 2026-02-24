const express = require('express');
const router = express.Router();
const https = require('https');
const { DATA_SOURCE_URL } = require('../config');

// 3. 代理数据源，返回充电桩状态数据
router.get('/status', (req, res) => {
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

// 5. 获取历史数据的接口
router.get('/historical-data', (req, res) => {
    res.status(200).json({
        success: true,
        historicalData: req.app.locals.historicalData
    });
});

// 6. 获取出行建议的接口
router.get('/travel-suggestions', (req, res) => {
    try {
        const { generateTravelSuggestions } = require('../services/analysisService');
        const suggestions = generateTravelSuggestions(req.app.locals.historicalData);
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

module.exports = router;
