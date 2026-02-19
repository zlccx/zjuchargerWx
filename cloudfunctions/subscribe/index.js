const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()
  const { templateId, stationIds } = event

  try {
    const { OPENID } = wxContext

    const now = new Date()
    const expireTime = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)

    const subscribeData = {
      _openid: OPENID,
      templateId: templateId,
      stationIds: stationIds || [],
      createTime: now,
      expireTime: expireTime,
      status: 'active'
    }

    const result = await db.collection('subscribes').add({
      data: subscribeData
    })

    return {
      success: true,
      _id: result._id,
      message: '订阅成功'
    }
  } catch (error) {
    console.error('订阅失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}
