const express = require('express');
const router = express.Router();
const { calculateFittedLocation } = require('../utils/locationUtils');

// 7. 提交设备位置的接口
router.post('/submit-device-location', (req, res) => {
    const { deviceId, stationId, latitude, longitude, timestamp } = req.body;
    
    console.log('收到位置提交请求:', req.body);
    
    if (!deviceId || latitude === undefined || longitude === undefined) {
        return res.status(400).json({
            success: false,
            message: '缺少必要参数: deviceId, latitude, longitude'
        });
    }
    
    // 初始化设备位置数据结构
    if (!req.app.locals.deviceLocations[deviceId]) {
        req.app.locals.deviceLocations[deviceId] = {
            deviceId,
            stationId,
            locations: []
        };
    }
    
    // 添加新的位置数据
    req.app.locals.deviceLocations[deviceId].locations.push({
        latitude,
        longitude,
        timestamp: timestamp || new Date().toISOString()
    });
    
    // 计算拟合后的位置
    const fittedLocation = calculateFittedLocation(req.app.locals.deviceLocations[deviceId].locations);
    
    // 更新设备的拟合位置
    req.app.locals.deviceLocations[deviceId].fittedLocation = fittedLocation;
    
    res.status(200).json({
        success: true,
        message: '位置提交成功',
        fittedLocation,
        locationCount: req.app.locals.deviceLocations[deviceId].locations.length
    });
});

// 8. 获取设备位置的接口
router.get('/device-locations', (req, res) => {
    res.status(200).json({
        success: true,
        deviceLocations: req.app.locals.deviceLocations
    });
});

// 9. 获取特定设备位置的接口（用于前端获取最新设备定位数据）
router.post('/get-device-locations', (req, res) => {
    const { stationId, deviceIds } = req.body;
    
    console.log('收到获取设备位置请求:', { stationId, deviceIds });
    
    // 转换设备位置数据为前端期望的格式
    const locations = Object.values(req.app.locals.deviceLocations)
        .filter(deviceLoc => {
            // 如果提供了deviceIds，只返回指定设备的数据
            if (deviceIds && deviceIds.length > 0) {
                return deviceIds.includes(deviceLoc.deviceId);
            }
            return true;
        })
        .map(deviceLoc => {
            // 使用拟合后的位置（如果有），否则使用最后一个位置
            const location = deviceLoc.fittedLocation || 
                           deviceLoc.locations[deviceLoc.locations.length - 1] || 
                           { latitude: null, longitude: null };
            
            return {
                deviceId: deviceLoc.deviceId,
                stationId: deviceLoc.stationId,
                latitude: location.latitude,
                longitude: location.longitude,
                timestamp: location.timestamp
            };
        });
    
    res.status(200).json({
        success: true,
        locations: locations
    });
});

module.exports = router;
