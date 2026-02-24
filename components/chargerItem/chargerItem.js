Component({
    properties: {
        item: {
            type: Object,
            value: {}
        },
        selected: {
            type: Boolean,
            value: false
        }
    },

    methods: {
        onCardClick(e) {
            // 获取当前点击的设备/站点信息
            const item = this.properties.item;

            // 统计URL变量
            const countURL = '127.0.0.1';

            // 统计点击次数，区分站点和设备
            const id = item.hash_id || item.id;
            const type = item.hash_id ? 'station' : 'device';
            if (type === 'station') {
                wx.request({
                    url: `http://${countURL}:3000/api/${type}-click`,
                    method: 'POST',
                    data: {
                        [type + 'Id']: id
                    },
                    success: (res) => {
                        console.log(`${type}点击统计成功:`, res.data);
                    },
                    fail: (err) => {
                        console.error(`${type}点击统计失败:`, err);
                    }
                });
            }

            // 触发自定义事件，通知父组件
            this.triggerEvent('cardtap', { item: item });
        }
    }
})