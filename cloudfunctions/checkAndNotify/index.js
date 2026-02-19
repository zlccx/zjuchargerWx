const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  console.log('开始定时检测充电桩状态')

  try {
    const checkResult = await cloud.callFunction({
      name: 'checkStationStatus'
    })

    if (!checkResult.result.success) {
      console.error('检测充电桩状态失败:', checkResult.result.message)
      return {
        success: false,
        message: '检测失败: ' + checkResult.result.message
      }
    }

    const notifications = checkResult.result.notifications

    if (notifications.length === 0) {
      console.log('没有需要发送的提醒')
      return {
        success: true,
        message: '检测完成，无需发送提醒'
      }
    }

    console.log('发现', notifications.length, '个需要发送的提醒')

    const sendResult = await cloud.callFunction({
      name: 'sendNotification',
      data: {
        notifications: notifications
      }
    })

    if (!sendResult.result.success) {
      console.error('发送订阅消息失败:', sendResult.result.message)
      return {
        success: false,
        message: '发送失败: ' + sendResult.result.message
      }
    }

    console.log('定时检测完成，成功发送', sendResult.result.results.filter(r => r.success).length, '条消息')

    return {
      success: true,
      checkedCount: notifications.length,
      sentCount: sendResult.result.results.filter(r => r.success).length,
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
