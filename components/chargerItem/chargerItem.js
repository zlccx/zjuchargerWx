Component({
    properties: {
        item: {
            type: Object,
            value: {}
        }
    },
    
    methods: {
        onCardClick(e) {
            // 直接从组件属性中获取stationId
            const stationId = this.properties.item.hash_id;
            
            // 统计URL变量
            const countURL = '127.0.0.1';
            
            // 统计站点点击次数
            wx.request({
                url: `http://${countURL}:3000/api/station-click`,
                method: 'POST',
                data: {
                    stationId: stationId
                },
                success: (res) => {
                    console.log('站点点击统计成功:', res.data);
                },
                fail: (err) => {
                    console.error('站点点击统计失败:', err);
                }
            });
        }
    }
})