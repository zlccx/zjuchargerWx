const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const formatDate = (date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    const hours = String(date.getHours()).padStart(2, '0')
    const minutes = String(date.getMinutes()).padStart(2, '0')
    const seconds = String(date.getSeconds()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  }

  const sendSubscribeMessage = async (touser, templateId, page, data) => {
    try {
      console.log('尝试发送订阅消息:', { touser, templateId, page, data })
      
      const result = await cloud.openapi.subscribeMessage.send({
        touser,
        templateId,
        page,
        data
      })
      
      console.log('订阅消息发送成功:', result)
      return result
    } catch (error) {
      console.error('发送订阅消息失败，错误详情:', JSON.stringify({
        message: error.message,
        errCode: error.errCode,
        errMsg: error.errMsg,
        stack: error.stack
      }, null, 2))
      
      if (error.errCode === -501007 || error.errMsg.includes('Invalid wxCloudApiToken')) {
        console.error('检测到 wxCloudApiToken 错误，定时触发器可能无法直接调用微信开放接口')
        console.error('建议：使用小程序端触发云函数，或者使用 HTTP API 直接调用微信接口')
        console.error('当前错误将被忽略，继续处理下一个通知')
        return null
      }
      
      throw error
    }
  }

  try {
    console.log('开始定时检测充电桩状态')
    
    // 1. 获取充电桩状态
    const statusResponse = await axios.get('https://charger.philfan.cn/api/status')
    const currentStations = statusResponse.data.stations
    
    if (!currentStations || currentStations.length === 0) {
      console.log('未获取到充电桩数据')
      return { success: true, message: '未获取到充电桩数据' }
    }
    
    console.log('获取充电桩状态成功，共', currentStations.length, '个充电桩')
    
    // 2. 获取活跃的订阅
    const subscribes = await db.collection('subscribes')
      .where({
        status: 'active',
        expireTime: db.command.gt(new Date())
      })
      .get()
    
    if (subscribes.data.length === 0) {
      console.log('没有活跃的订阅')
      return { success: true, message: '没有活跃的订阅' }
    }
    
    console.log('找到', subscribes.data.length, '个活跃订阅')
    
    // 3. 检测状态变化并发送提醒
    const notifications = []
    
    for (const subscribe of subscribes.data) {
      const { _openid, templateId, stationIds } = subscribe
      
      console.log('处理订阅:', _openid, stationIds)
      
      for (const stationId of stationIds) {
        const station = currentStations.find(s => s.hash_id === stationId)
        
        if (station) {
          console.log('找到充电桩:', stationId, station.name, '空闲', station.free, '/', station.total)
          
          // 查找历史状态
          const historyStatus = await db.collection('stationHistory')
            .where({
              stationId: stationId,
              _openid: _openid
            })
            .orderBy('createTime', 'desc')
            .limit(1)
            .get()
          
          const lastHistory = historyStatus.data[0]
          
          console.log('历史状态:', lastHistory ? `free: ${lastHistory.free}` : '无历史记录')
          console.log('当前状态:', `free: ${station.free}, total: ${station.total}`)
          
          // 如果历史状态是全忙，当前状态有空，发送提醒
          if (lastHistory && lastHistory.free === 0 && station.free > 0) {
            console.log('状态变化：全忙 -> 有空，需要发送提醒')
            notifications.push({
              openid: _openid,
              templateId: templateId,
              stationName: station.name,
              freeCount: station.free,
              totalCount: station.total
            })
          } else {
            console.log('无需发送提醒：', 
              lastHistory ? 
              `历史状态 free: ${lastHistory.free}, 当前状态 free: ${station.free}` : 
              '无历史记录'
            )
          }
          
          // 更新历史状态
          await db.collection('stationHistory').add({
            data: {
              stationId: stationId,
              _openid: _openid,
              free: station.free,
              total: station.total,
              createTime: new Date()
            }
          })
        } else {
          console.log('未找到充电桩:', stationId)
        }
      }
    }
    
    if (notifications.length === 0) {
      console.log('没有需要发送的提醒')
      return { success: true, message: '检测完成，无需发送提醒' }
    }
    
    console.log('发现', notifications.length, '个需要发送的提醒')
    
    // 4. 发送通知
    let sentCount = 0
    if (notifications.length > 0) {
      console.log('准备发送通知，通知列表:', JSON.stringify(notifications, null, 2))
      
      for (const notification of notifications) {
        try {
          console.log('开始发送通知:', notification)
          const result = await sendSubscribeMessage(
            notification.openid,
            notification.templateId,
            'pages/index/index',
            {
              time1: { 
                value: formatDate(new Date())
              },
              thing2: { value: `${notification.stationName}（空闲${notification.freeCount}/${notification.totalCount}）` }
            }
          )
          console.log('发送成功:', notification.stationName, result)
          sentCount++
        } catch (error) {
          console.error('发送通知失败:', notification.stationName, error)
        }
      }
    }
    
    console.log('定时检测完成，已发送', sentCount, '条通知')
    
    return {
      success: true,
      checkedCount: notifications.length,
      sentCount: sentCount,
      message: '定时检测完成，通知已发送'
    }
  } catch (error) {
    console.error('定时检测失败:', error)
    return { success: false, message: error.message }
  }
}