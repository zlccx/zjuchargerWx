const cloud = require('wx-server-sdk')
const axios = require('axios')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

// 获取 access_token
async function getAccessToken() {
  try {
    // 从环境变量或配置中获取 appid 和 secret
    const appid = process.env.WX_APPID || cloud.getWXContext().APPID
    const secret = process.env.WX_SECRET
    
    if (!appid || !secret) {
      throw new Error('缺少小程序 appid 或 secret 配置')
    }
    
    const response = await axios.get('https://api.weixin.qq.com/cgi-bin/token', {
      params: {
        grant_type: 'client_credential',
        appid: appid,
        secret: secret
      }
    })
    
    if (response.data.errcode) {
      throw new Error(`获取 access_token 失败: ${response.data.errmsg}`)
    }
    
    return response.data.access_token
  } catch (error) {
    console.error('获取 access_token 失败:', error)
    throw error
  }
}

// 发送订阅消息
async function sendSubscribeMessage(openid, templateId, page, data) {
  try {
    const accessToken = await getAccessToken()
    const url = `https://api.weixin.qq.com/cgi-bin/message/subscribe/send?access_token=${accessToken}`
    
    const response = await axios.post(url, {
      touser: openid,
      template_id: templateId,
      page: page,
      data: data
    })
    
    return response.data
  } catch (error) {
    console.error('发送订阅消息失败:', error)
    throw error
  }
}

// 获取充电桩历史状态
async function getStationHistory(stationId, openid) {
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
    console.error('获取充电桩历史状态失败:', error)
    return null
  }
}

// 更新充电桩历史状态
async function updateStationHistory(stationId, openid, free, total) {
  try {
    console.log('开始更新历史状态:', stationId, openid, free, total)
    
    const existingHistory = await db.collection('stationHistory')
      .where({
        stationId: stationId,
        _openid: openid
      })
      .get()
    
    console.log('找到历史记录:', existingHistory.data.length, '条')
    
    if (existingHistory.data.length > 0) {
      console.log('更新现有记录:', existingHistory.data[0]._id)
      const updateResult = await db.collection('stationHistory')
        .doc(existingHistory.data[0]._id)
        .update({
          data: {
            free: free,
            total: total,
            createTime: new Date()
          }
        })
      console.log('更新结果:', updateResult)
    } else {
      console.log('添加新记录')
      const addResult = await db.collection('stationHistory').add({
        data: {
          stationId: stationId,
          _openid: openid,
          free: free,
          total: total,
          createTime: new Date()
        }
      })
      console.log('添加结果:', addResult)
    }
    
    console.log('历史状态更新成功')
  } catch (error) {
    console.error('更新充电桩历史状态失败:', error)
    throw error
  }
}

exports.main = async (event, context) => {
  try {
    console.log('开始定时检测充电桩状态')
    
    // 1. 获取充电桩状态
    let currentStations = []
    try {
      const statusResponse = await axios.get('https://charger.philfan.cn/api/status')
      currentStations = statusResponse.data.stations
      console.log('获取充电桩状态成功，共', currentStations.length, '个充电桩')
    } catch (error) {
      console.error('获取充电桩状态失败:', error)
      return {
        success: true,
        message: '未获取到充电桩数据'
      }
    }
    
    if (currentStations.length === 0) {
      console.log('未获取到充电桩数据')
      return {
        success: true,
        message: '未获取到充电桩数据'
      }
    }
    
    // 2. 获取活跃的订阅
    const subscribes = await db.collection('subscribes')
      .where({
        status: 'active',
        expireTime: db.command.gt(new Date())
      })
      .get()
    
    if (subscribes.data.length === 0) {
      console.log('没有活跃的订阅')
      return {
        success: true,
        message: '没有活跃的订阅'
      }
    }
    
    console.log('找到', subscribes.data.length, '个活跃订阅')
    
    // 3. 检测状态变化
    const notifications = []
    
    for (const subscribe of subscribes.data) {
      const { _openid, templateId, stationIds } = subscribe
      
      console.log('处理订阅:', _openid, stationIds)
      
      for (const stationId of stationIds) {
        const station = currentStations.find(s => s.hash_id === stationId)
        
        if (station) {
          console.log('找到充电桩:', stationId, station.name, '空闲', station.free, '/', station.total)
          
          const historyStatus = await getStationHistory(stationId, _openid)
          
          if (historyStatus) {
            console.log('历史状态:', historyStatus.free, '/', historyStatus.total)
          } else {
            console.log('没有历史状态记录')
          }
          
          // 如果历史状态是全忙，当前状态有空，发送提醒
          if (historyStatus && historyStatus.free === 0 && station.free > 0) {
            console.log('状态变化：全忙 -> 有空，需要发送提醒')
            notifications.push({
              openid: _openid,
              templateId: templateId,
              stationId: stationId,
              stationName: station.name,
              freeCount: station.free,
              totalCount: station.total
            })
          } else {
            console.log('无需发送提醒')
          }
          
          // 更新历史状态
          await updateStationHistory(stationId, _openid, station.free, station.total)
        } else {
          console.log('未找到充电桩:', stationId)
        }
      }
    }
    
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
        const result = await sendSubscribeMessage(
          notification.openid,
          notification.templateId,
          'pages/index/index',
          {
            time1: {
              value: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, '')
            },
            thing2: {
              value: `${notification.stationName}（空闲${notification.freeCount}/${notification.totalCount}）`
            }
          }
        )
        
        if (result.errcode === 0) {
          sendResults.push({ success: true, stationName: notification.stationName })
        } else {
          console.error('发送订阅消息返回错误:', result)
          sendResults.push({ success: false, stationName: notification.stationName, error: result.errmsg })
        }
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
