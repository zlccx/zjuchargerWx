import AI_CONFIG from '@/config/ai'

function setApiKey(apiKey) {
  AI_CONFIG.apiKey = apiKey
}

function getApiKey() {
  return AI_CONFIG.apiKey
}

async function callAI(prompt, options = {}) {
  const { temperature = 0.7, maxTokens = 2000 } = options

  if (!AI_CONFIG.apiKey) {
    throw new Error('API Key未设置，请先调用setApiKey设置或在config/ai.js中配置')
  }

  if (!AI_CONFIG.assistantId) {
    throw new Error('智能体ID未设置，请在config/ai.js中配置')
  }

  try {
    console.log('开始调用AI API...');
    console.log('API地址:', AI_CONFIG.baseURL);
    console.log('智能体ID:', AI_CONFIG.assistantId);
    
    // 腾讯元气智能体API调用
    return new Promise((resolve, reject) => {
      wx.request({
        url: AI_CONFIG.baseURL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${AI_CONFIG.apiKey}`
        },
        data: {
          assistant_id: AI_CONFIG.assistantId,
          user_id: 'user_'+Date.now(), // 生成唯一的用户ID
          stream: false,
          messages: [
            {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: prompt
                }
              ]
            }
          ]
        },
        success: (response) => {
          console.log('API响应:', response);
          
          if (response.statusCode !== 200) {
            reject(new Error(`API请求失败: ${response.statusCode} - ${response.data?.error?.message || '未知错误'}`));
          } else {
            resolve(response.data);
          }
        },
        fail: (error) => {
          console.error('网络请求失败:', error);
          reject(new Error(`网络请求失败: ${error.errMsg || '未知错误'}`));
        },
        complete: () => {
          console.log('API调用完成');
        }
      });
    });
  } catch (error) {
    console.error('调用AI API失败:', error);
    console.error('错误详情:', error.stack);
    throw error
  }
}

async function getRecommendations(recommendationData) {
  const { userPreferences, stationUsageData = [], currentTime } = recommendationData

  const prompt = "请根据以下信息为用户推荐充电桩和充电时间：\n\n用户偏好：\n- 偏好时间段：" + JSON.stringify(userPreferences.preferredTimeSlots) + "\n- 偏好校区：" + JSON.stringify(userPreferences.preferredCampuses) + "\n- 常用充电桩：" + JSON.stringify(userPreferences.preferredStations) + "\n- 平均充电时长：" + userPreferences.avgChargingDuration + " 分钟\n- 总充电次数：" + userPreferences.totalChargingCount + "\n\n当前时间：\n- 时间：" + currentTime.hour + "点\n- 时段：" + currentTime.timeSlot + "\n- 日期：" + currentTime.date + "\n\n充电桩使用情况（近7天，按时间点统计）：\n" + (Array.isArray(stationUsageData) ? stationUsageData.slice(0, 10).map(station => "\n- " + station.stationName + "（" + station.campus + "）\n" + Object.entries(station.timePointData || {}).map(([timePoint, data]) => {
    const hour = Math.floor(timePoint);
    const minute = Math.round((timePoint - hour) * 60);
    const timeStr = hour + ":" + minute.toString().padStart(2, '0');
    return "  - " + timeStr + "：总量 " + data.total + "，空闲 " + data.available;
  }).join('\n')).join('\n') : '暂无数据') + "\n\n充电桩数据来源：请从 https://charger.philfan.cn/ 网站中选择具体的充电桩进行推荐。\n\n请提供以下格式的推荐结果（JSON格式）：\n{\n  \"recommendations\": [\n    {\n      \"stationId\": \"充电桩ID\",\n      \"stationName\": \"充电桩名称\",\n      \"campus\": \"校区\",\n      \"provider\": \"运营商\",\n      \"recommendedTime\": \"推荐时间（如：14:00）\",\n      \"recommendedTimeSlot\": \"推荐时段（morning/afternoon/evening/night）\",\n      \"reason\": \"推荐理由\",\n      \"score\": 评分（0-100之间的数字）\n    }\n  ],\n  \"reasoning\": \"整体推荐理由说明\"\n}\n\n要求：\n1. 根据用户偏好从 https://charger.philfan.cn/ 网站中选择3-5个具体的充电桩进行推荐\n2. 推荐时间要考虑当前时间和充电桩使用规律\n3. 推荐理由要具体说明为什么推荐这个充电桩和时间\n4. 评分要综合考虑用户偏好、充电桩可用性、使用规律等因素\n5. 只返回JSON格式的结果，不要有其他文字说明"

  try {
    const response = await callAI(prompt, { temperature: 0.7, maxTokens: 2000 })
    
    if (!response) {
      throw new Error('AI返回为空')
    }
    
    // 处理腾讯元气智能体的返回格式
    if (response.content) {
      const content = response.content
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      } else {
        throw new Error('AI返回的格式不正确')
      }
    } else if (response.choices && response.choices.length > 0) {
      // 兼容OpenAI格式
      const content = response.choices[0].message.content
      const jsonMatch = content.match(/\{[\s\S]*\}/)
      
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      } else {
        throw new Error('AI返回的格式不正确')
      }
    } else {
      throw new Error('AI返回的数据格式不正确')
    }
  } catch (error) {
    console.error('获取AI推荐失败:', error)
    throw error
  }
}

module.exports = {
  setApiKey,
  getApiKey,
  callAI,
  getRecommendations
}