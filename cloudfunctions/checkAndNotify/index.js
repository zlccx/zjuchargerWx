const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 优化：使用Promise.all并行处理，提高执行速度
const getStationHistory = async (stationId, openid) => {
  try {
    const result = await db.collection('stationHistory')
      .where({
        stationId: stationId,
        _openid: openid
      })
      .orderBy('createTime', 'desc')
      .limit(1)
      .get()
    return result.data.length > 0 ? result.data[0] : null
  } catch (error) {
    console.error('获取历史状态失败:', error)
    return null
  }
}

const updateStationHistory = async (stationId, openid, free, total) => {
  try {
    await db.collection('stationHistory').add({
      data: {
        stationId: stationId,
        _openid: openid,
        free: free,
        total: total,
        createTime: new Date()
      }
    })
  } catch (error) {
    console.error('更新历史状态失败:', error)
  }
}

exports.main = async (event, context) => {
  console.log('开始定时检测充电桩状态')

  try {
    // 1. 获取充电桩状态（设置超时时间）
    const statusResponse = await axios.get('https://charger.philfan.cn/api/status', {
      timeout: 1500 // 1.5秒超时
    })
    const currentStations = statusResponse.data.stations
    
    // 2. 获取订阅记录
    const activeSubscribes = await db.collection('subscribes')
      .where({
        status: 'active',
        expireTime: db.command.gt(new Date())
      })
      .get()
    
    if (activeSubscribes.data.length === 0) {
      console.log('没有活跃的订阅')
      return {
        success: true,
        message: '没有活跃的订阅'
      }
    }
    
    const notifications = []
    const historyPromises = []
    
    // 3. 并行处理每个订阅
    for (const subscribe of activeSubscribes.data) {
      const { _openid, stationIds, templateId } = subscribe
      
      for (const stationId of stationIds) {
        const currentStation = currentStations.find(s => s.hash_id === stationId)
        if (!currentStation) continue
        
        // 并行获取历史状态
        historyPromises.push(
          (async () => {
            const historyStatus = await getStationHistory(stationId, _openid)
            
            // 检查是否从全忙变为有空
            if (historyStatus && historyStatus.free === 0 && currentStation.free > 0) {
              notifications.push({
                openid: _openid,
                templateId: templateId,
                stationId: stationId,
                stationName: currentStation.name,
                freeCount: currentStation.free,
                totalCount: currentStation.total
              })
            }
            
            // 更新历史状态
            await updateStationHistory(stationId, _openid, currentStation.free, currentStation.total)
          })()
        )
      }
    }
    
    // 等待所有并行任务完成
    await Promise.all(historyPromises)
    
    if (notifications.length === 0) {
      console.log('没有需要发送的提醒')
      return {
        success: true,
        message: '检测完成，无需发送提醒'
      }
    }
    
    console.log('发现', notifications.length, '个需要发送的提醒')
    
    // 4. 发送通知
    const sendResults = []
    for (const notification of notifications) {
      try {
        const result = await cloud.openapi.subscribeMessage.send({
          touser: notification.openid,
          templateId: notification.templateId,
          page: 'pages/index/index',
          data: {
            date1: {
              value: new Date().toLocaleString('zh-CN', {
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
              })
            },
            thing2: {
              value: `${notification.stationName}（空闲${notification.freeCount}/${notification.totalCount}）`
            }
          }
        })
        sendResults.push({ success: true, stationName: notification.stationName })
      } catch (error) {
        console.error('发送通知失败:', error)
        sendResults.push({ success: false, stationName: notification.stationName, error: error.message })
      }
    }
    
    console.log('定时检测完成，成功发送', sendResults.filter(r => r.success).length, '条消息')
    
    return {
      success: true,
      checkedCount: notifications.length,
      sentCount: sendResults.filter(r => r.success).length,
      message: '定时检测完成'
    }
  } catch (error) {
    console.error('定时检测失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}