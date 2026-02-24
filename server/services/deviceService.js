const fs = require('fs');
const path = require('path');
const { DEVICE_LOCATIONS_FILE } = require('../config');

// 保存设备位置数据到文件
const saveDeviceLocationsToFile = (deviceLocations) => {
    try {
        const data = JSON.stringify(deviceLocations, null, 2);
        fs.writeFileSync(DEVICE_LOCATIONS_FILE, data);
        console.log(`[${new Date().toISOString()}] 设备位置数据已保存到文件`);
    } catch (error) {
        console.error('保存设备位置数据失败:', error.message);
    }
};

// 从文件加载设备位置数据
const loadDeviceLocationsFromFile = () => {
    try {
        if (fs.existsSync(DEVICE_LOCATIONS_FILE)) {
            const data = fs.readFileSync(DEVICE_LOCATIONS_FILE, 'utf8');
            const loadedData = JSON.parse(data);
            console.log(`[${new Date().toISOString()}] 从文件加载设备位置数据成功`);
            return loadedData;
        }
        return {};
    } catch (error) {
        console.error('加载设备位置数据失败:', error.message);
        return {};
    }
};

module.exports = {
    saveDeviceLocationsToFile,
    loadDeviceLocationsFromFile
};
