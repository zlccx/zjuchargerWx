// pages/detailPlus/detailPlus.js
Page({
    /**
     * 页面的初始数据
     */
    data: {
        station: {},
        devices: [],
        markers: [],
        selectedDevice: null
    },

    /**
     * 生命周期函数--监听页面加载
     */
    onLoad(options) {
        // 获取从上一个页面传递过来的站点数据
        const stationData = JSON.parse(options.station);
        
        this.setData({
            station: stationData
        });
        
        // 提取设备列表
        this.extractDevices();
        
        // 获取最新设备定位数据
        this.fetchLatestDeviceLocations();
        
        // 初始化地图标记
        this.initMapMarkers();
    },

    // 提取设备列表
    extractDevices: function() {
        const station = this.data.station;
        const devidsMsg = station.devidsMsg || {};
        
        // 将devidsMsg对象转换为数组，并添加站点名称等信息
        const devices = Object.values(devidsMsg).map(device => {
            return {
                ...device,
                name: `${station.name} - 设备 ${device.id}`,
                campus_name: station.campus_name,
                provider: station.provider
            };
        });
        
        this.setData({
            devices: devices
        });
    },

    // 初始化地图标记
    initMapMarkers: function() {
        const station = this.data.station;
        const devices = this.data.devices;
        
        // 初始化标记数组，先添加站点标记
        let markers = [{
            id: 0,
            latitude: station.lat,
            longitude: station.lon,
            title: station.name,
            width: 40,
            height: 40,
            iconPath: '/imgs/marker.png',
            zIndex: 1
        }];
        
        // 添加有定位信息的设备标记
        devices.forEach((device, index) => {
            if (device.lat && device.lon) {
                markers.push({
                    id: index + 1,
                    latitude: device.lat,
                    longitude: device.lon,
                    title: device.name,
                    width: 35,
                    height: 35,
                    iconPath: '/imgs/marker.png',
                    zIndex: 2
                });
            }
        });
        
        this.setData({
            markers: markers
        });
    },

    // 设备点击事件处理
    onDeviceClick: function(e) {
        const device = e.detail.item;
        
        this.setData({
            selectedDevice: device
        });
        
        // 如果设备有定位信息，在地图上显示标记
        if (device.lat && device.lon) {
            // 检查是否已有该设备的标记
            let markers = [...this.data.markers];
            const existingMarkerIndex = markers.findIndex(marker => marker.id === device.id);
            
            if (existingMarkerIndex === -1) {
                // 添加新标记
                markers.push({
                    id: parseInt(device.id),
                    latitude: device.lat,
                    longitude: device.lon,
                    title: device.name,
                    width: 35,
                    height: 35,
                    iconPath: '/imgs/marker.png',
                    zIndex: 3
                });
            } else {
                // 更新现有标记的zIndex，使其显示在最上层
                markers[existingMarkerIndex].zIndex = 3;
            }
            
            this.setData({
                markers: markers
            });
            
            // 缩放地图到设备位置
            wx.createMapContext('map').includePoints({
                points: markers.map(marker => ({
                    latitude: marker.latitude,
                    longitude: marker.longitude
                })),
                padding: [100, 50, 100, 50]
            });
        } else {
            // 设备没有定位信息，显示提示
            wx.showToast({
                title: '该设备暂无定位信息',
                icon: 'none',
                duration: 1500
            });
        }
    },

    // 地图标记点击事件处理
    onMarkerTap: function(e) {
        const markerId = e.markerId;
        const devices = this.data.devices;
        
        // 查找对应的设备
        const device = devices.find(device => device.id === markerId);
        
        if (device) {
            this.setData({
                selectedDevice: device
            });
        }
    },

    // 打开导航
    openNavigation: function() {
        const selectedDevice = this.data.selectedDevice;
        const station = this.data.station;
        
        // 如果有选中设备且有定位信息，导航到设备位置
        if (selectedDevice && selectedDevice.lat && selectedDevice.lon) {
            wx.openLocation({
                latitude: selectedDevice.lat,
                longitude: selectedDevice.lon,
                name: selectedDevice.name,
                address: selectedDevice.campus_name || '',
                scale: 18
            });
        } else {
            // 否则导航到站点位置
            wx.openLocation({
                latitude: station.lat,
                longitude: station.lon,
                name: station.name,
                address: station.campus_name || '',
                scale: 18
            });
        }
    },
    
    // 获取最新设备定位数据
    fetchLatestDeviceLocations: function() {
        const station = this.data.station;
        
        // 发送请求获取最新设备定位数据
        wx.request({
            url: 'http://localhost:3000/api/get-device-locations',
            method: 'POST',
            data: {
                stationId: station.id || 'unknown',
                deviceIds: this.data.devices.map(device => device.id)
            },
            success: (res) => {
                console.log('获取最新设备定位数据成功:', res);
                if (res.data.success) {
                    // 更新设备定位信息
                    const updatedDevices = this.data.devices.map(device => {
                        const latestLocation = res.data.locations.find(loc => loc.deviceId === device.id);
                        if (latestLocation) {
                            return {
                                ...device,
                                lat: latestLocation.latitude,
                                lon: latestLocation.longitude
                            };
                        }
                        return device;
                    });
                    
                    this.setData({
                        devices: updatedDevices
                    });
                    
                    // 重新初始化地图标记
                    this.initMapMarkers();
                }
            },
            fail: (error) => {
                console.error('获取最新设备定位数据失败:', error);
                // 如果获取失败，不影响页面正常显示，只是使用初始数据
            },
            complete: () => {
                // 确保地图标记总是被初始化，即使获取失败
                this.initMapMarkers();
            }
        });
    },
    
    // 提交位置
    submitLocation: function() {
        const selectedDevice = this.data.selectedDevice;
        
        if (!selectedDevice) {
            wx.showToast({
                title: '请先选择一个设备',
                icon: 'none',
                duration: 1500
            });
            return;
        }
        
        // 提示用户确保在设备位置上
        wx.showModal({
            title: '提交位置确认',
            content: '请确保您正在该设备的位置上，以免混乱数据。提交后，您的定位将作为该设备的定位之一进行拟合。',
            success: (res) => {
                if (res.confirm) {
                    // 获取用户当前位置
                    wx.getLocation({
                        type: 'gcj02',
                        altitude: true,
                        success: (locationRes) => {
                            const { latitude, longitude } = locationRes;
                            
                            // 发送位置数据到后端
                            console.log('准备发送位置数据:', {
                                deviceId: selectedDevice.id,
                                stationId: this.data.station.id,
                                latitude: latitude,
                                longitude: longitude
                            });
                            
                            wx.request({
                                url: 'http://localhost:3000/api/submit-device-location',
                                method: 'POST',
                                data: {
                                    deviceId: selectedDevice.id,
                                    stationId: this.data.station.id || 'unknown',
                                    latitude: latitude,
                                    longitude: longitude,
                                    timestamp: new Date().toISOString()
                                },
                                success: (res) => {
                                    console.log('位置提交响应:', res);
                                    if (res.data.success) {
                                        wx.showToast({
                                            title: '位置提交成功',
                                            icon: 'success',
                                            duration: 1500
                                        });
                                        
                                        // 更新设备定位信息
                                        const updatedDevice = {
                                            ...selectedDevice,
                                            lat: res.data.fittedLocation.latitude,
                                            lon: res.data.fittedLocation.longitude
                                        };
                                        
                                        // 更新设备列表中的设备信息
                                        const updatedDevices = this.data.devices.map(device => {
                                            if (device.id === selectedDevice.id) {
                                                return updatedDevice;
                                            }
                                            return device;
                                        });
                                        
                                        this.setData({
                                            selectedDevice: updatedDevice,
                                            devices: updatedDevices
                                        });
                                        
                                        // 重新初始化地图标记
                                        this.initMapMarkers();
                                    } else {
                                        console.error('位置提交失败:', res.data.message);
                                        wx.showToast({
                                            title: '位置提交失败: ' + res.data.message,
                                            icon: 'none',
                                            duration: 2000
                                        });
                                    }
                                },
                                fail: (error) => {
                                    console.error('位置提交网络失败:', error);
                                    wx.showToast({
                                        title: '网络请求失败，请检查连接',
                                        icon: 'none',
                                        duration: 2000
                                    });
                                }
                            });
                        },
                        fail: (error) => {
                            console.error('获取位置失败:', error);
                            wx.showToast({
                                title: '获取位置失败，请检查权限',
                                icon: 'none',
                                duration: 1500
                            });
                        }
                    });
                }
            }
        });
    },

    /**
     * 生命周期函数--监听页面初次渲染完成
     */
    onReady() {

    },

    /**
     * 生命周期函数--监听页面显示
     */
    onShow() {

    },

    /**
     * 生命周期函数--监听页面隐藏
     */
    onHide() {

    },

    /**
     * 生命周期函数--监听页面卸载
     */
    onUnload() {

    },

    /**
     * 页面相关事件处理函数--监听用户下拉动作
     */
    onPullDownRefresh() {

    },

    /**
     * 页面上拉触底事件的处理函数
     */
    onReachBottom() {

    },

    /**
     * 用户点击右上角分享
     */
    onShareAppMessage() {

    }
})