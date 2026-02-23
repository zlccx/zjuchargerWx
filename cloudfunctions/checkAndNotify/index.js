const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

let accessTokenCache = {
  token: null,
  expireTime: 0
}

const getAccessToken = async () => {
  try {
    const now = Date.now()
    
    if (accessTokenCache.token && now < accessTokenCache.expireTime) {
      console.log('使用缓存的 access_token')
      return accessTokenCache.token
    }
    
    console.log('获取新的 access_token')
    
    const result = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid: process.env.WX_APPID,
        secret: process.env.WX_APPSECRET
      }
    })
    
    if (result.data.access_token) {
      accessTokenCache.token = result.data.access_token
      accessTokenCache.expireTime = now + (result.data.expires_in - 300) * 1000
      console.log('access_token 获取成功')
      return result.data.access_token
    } else {
      throw new Error('获取 access_token 失败: ' + JSON.stringify(result.data))
    }
  } catch (error) {
    console.error('获取 access_token 异常:', error)
    throw error
  }
}

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
      
      const accessToken = await getAccessToken()
      
      const result = await axios.post(
        `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`,
        {
          touser,
          template_id: templateId,
          page,
          miniprogram_state: 'developer',
          lang: 'zh_CN',
          data
        }
      )
      
      if (result.data.errcode === 0) {
        console.log('订阅消息发送成功:', result.data)
        return result.data
      } else {
        throw new Error(`发送订阅消息失败: errcode=${result.data.errcode}, errmsg=${result.data.errmsg}`)
      }
    } catch (error) {
      console.error('发送订阅消息失败，错误详情:', JSON.stringify({
        message: error.message,
        errCode: error.errCode,
        errMsg: error.errMsg,
        stack: error.stack
      }, null, 2))
      
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
          if (historyStatus.data.length > 0) {
            // 存在历史记录，更新它
            const historyId = historyStatus.data[0]._id
            await db.collection('stationHistory').doc(historyId).update({
              data: {
                free: station.free,
                total: station.total,
                createTime: new Date()
              }
            })
            console.log('历史状态已更新:', stationId, _openid)
          } else {
            // 不存在历史记录，添加新记录
            await db.collection('stationHistory').add({
              data: {
                stationId: stationId,
                _openid: _openid,
                free: station.free,
                total: station.total,
                createTime: new Date()
              }
            })
            console.log('历史状态已添加:', stationId, _openid)
          }
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