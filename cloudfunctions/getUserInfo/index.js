const cloud = require('wx-server-sdk')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

const db = cloud.database()

exports.main = async (event, context) => {
  const wxContext = cloud.getWXContext()

  try {
    const { OPENID } = wxContext

    const subscribeResult = await db.collection('subscribes')
      .where({
        _openid: OPENID,
        status: 'active',
        expireTime: db.command.gt(new Date())
      })
      .get()

    return {
      success: true,
      openid: OPENID,
      subscribes: subscribeResult.data,
      message: '获取用户信息成功'
    }
  } catch (error) {
    console.error('获取用户信息失败:', error)
    return {
      success: false,
      message: error.message
    }
  }
}
