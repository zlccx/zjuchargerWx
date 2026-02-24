# AI充电桩推荐功能 - 快速接入指南

## 快速接入步骤

### 第一步：获取DeepSeek API Key

1. 访问 https://platform.deepseek.com/
2. 注册账号并登录
3. 在控制台获取API Key

### 第二步：配置API Key

打开 `config/ai.js` 文件，将你的API Key填入 apiKey 字段：

```javascript
const AI_CONFIG = {
  baseURL: 'https://api.deepseek.com/v1',
  model: 'deepseek-chat',
  apiKey: 'your-deepseek-api-key-here'  // 在这里填入你的API Key
}
```

### 第三步：部署云函数

在微信开发者工具中：
1. 右键点击 `cloudfunctions` 文件夹
2. 选择"上传并部署：云端安装依赖"
3. 依次部署以下云函数：
   - `recordChargingHistory`
   - `getRecommendationData`
   - `saveRecommendation`

### 第四步：创建数据库集合

在微信云开发控制台：
1. 创建 `chargingHistory` 集合
2. 创建 `aiRecommendations` 集合
3. 设置权限为"所有用户可读，仅创建者可写"

### 第五步：测试功能

1. 在用户页面设置充电偏好（时间段、校区）
2. 访问一些充电桩页面以收集数据
3. 点击首页或用户页面的"AI智能推荐"
4. 查看推荐结果

## 功能说明

### 1. 用户偏好设置

用户可以在用户页面设置：
- **充电时间偏好**：上午、下午、晚上、夜间
- **充电地点偏好**：紫金港、玉泉、西溪、华家池、之江

### 2. 数据收集

系统会自动收集：
- 用户访问的充电桩记录
- 充电时间段分布
- 充电地点偏好
- 充电桩使用情况

### 3. AI推荐

AI会根据以下因素进行推荐：
- 用户的时间偏好
- 用户的地点偏好
- 充电桩的使用规律
- 当前时间段
- 历史充电数据

---

## 详细文档

### 功能概述

本项目已实现AI充电桩推荐功能，可以根据用户的充电偏好和充电桩使用情况智能推荐充电桩和充电时间。

### 已实现的功能

#### 1. 用户偏好数据收集
- **充电时间偏好**：用户可以选择偏好的充电时段（上午、下午、晚上、夜间）
- **充电地点偏好**：用户可以选择偏好的校区（紫金港、玉泉、西溪、华家池、之江）
- **充电历史记录**：自动记录用户的充电行为（访问充电桩、充电时长等）

#### 2. 充电桩使用情况追踪
- **时段分布**：记录每个充电桩在不同时段的使用频率
- **使用趋势**：追踪充电桩的使用规律
- **历史数据**：保存最近30天的充电桩使用数据

#### 3. 数据接口

##### `getRecommendationData` - 获取推荐数据
**功能**：获取AI推荐所需的所有数据

**调用方式**：
```javascript
wx.cloud.callFunction({
    name: 'getRecommendationData',
    data: { days: 30 }
}).then(res => {
    console.log(res.result.data);
});
```

**返回数据结构**：
```json
{
  "success": true,
  "data": {
    "userInfo": {
      "openid": "用户openid"
    },
    "userPreferences": {
      "preferredTimeSlots": {
        "morning": 5,
        "afternoon": 3,
        "evening": 2,
        "night": 1
      },
      "preferredCampuses": {
        "紫金港校区": 8,
        "玉泉校区": 3
      },
      "preferredStations": {
        "station1": {
          "stationId": "station1",
          "stationName": "充电桩名称",
          "count": 5
        }
      },
      "avgChargingDuration": 45.5,
      "totalChargingCount": 11,
      "totalChargingDuration": 500
    },
    "stationUsageData": [
      {
        "stationId": "station1",
        "stationName": "充电桩名称",
        "campus": "紫金港校区",
        "provider": "运营商",
        "totalCount": 100,
        "timeSlotDistribution": {
          "morning": 30,
          "afternoon": 40,
          "evening": 20,
          "night": 10
        },
        "hourlyDistribution": {
          "8": 15,
          "9": 20,
          "10": 18
        },
        "avgDuration": 45.0,
        "totalDuration": 4500,
        "recentUsage": [
          {
            "date": "2026-02-23",
            "hour": 14,
            "timeSlot": "afternoon",
            "duration": 45
          }
        ]
      }
    ],
    "currentTime": {
      "hour": 14,
      "timeSlot": "afternoon",
      "date": "2026-02-23"
    },
    "dataTimeRange": {
      "startDate": "2026-01-24T00:00:00.000Z",
      "endDate": "2026-02-23T00:00:00.000Z",
      "days": 30
    }
  }
}
```

##### `recordChargingHistory` - 记录充电历史
**功能**：记录用户的充电行为

**调用方式**：
```javascript
wx.cloud.callFunction({
    name: 'recordChargingHistory',
    data: {
        action: 'add',
        stationId: 'station1',
        stationName: '充电桩名称',
        campus: '紫金港校区',
        provider: '运营商',
        chargingDuration: 60,
        chargingTime: '2026-02-23T14:00:00.000Z'
    }
});
```

**支持的action**：
- `add`: 添加充电记录
- `get`: 获取用户充电历史
- `getStationUsage`: 获取充电桩使用情况
- `getUserPreferences`: 获取用户偏好

##### `saveRecommendation` - 保存推荐结果
**功能**：保存AI生成的推荐结果

**调用方式**：
```javascript
wx.cloud.callFunction({
    name: 'saveRecommendation',
    data: {
        recommendations: [
            {
                "stationId": "station1",
                "stationName": "充电桩名称",
                "campus": "紫金港校区",
                "provider": "运营商",
                "recommendedTime": "14:00",
                "recommendedTimeSlot": "afternoon",
                "reason": "推荐理由",
                "score": 85
            }
        ],
        "reasoning": "整体推荐理由说明"
    }
});
```

### AI接入方式

#### 方式一：使用小程序端直接调用（推荐）

1. **获取DeepSeek API Key**
   - 访问 https://platform.deepseek.com/
   - 注册账号并获取API Key

2. **配置API Key**
   在小程序中设置API Key：
   ```javascript
   import { setApiKey } from '@/utils/ai';
   
   setApiKey('your-deepseek-api-key');
   ```

3. **调用AI推荐**
   ```javascript
   import { getRecommendations } from '@/utils/ai';
   
   async function getAIRecommendation() {
       try {
           const data = await wx.cloud.callFunction({
               name: 'getRecommendationData',
               data: { days: 30 }
           });
           
           const recommendations = await getRecommendations(data.result.data);
           console.log(recommendations);
           
           // 保存推荐结果
           await wx.cloud.callFunction({
               name: 'saveRecommendation',
               data: recommendations
           });
       } catch (error) {
           console.error('获取推荐失败:', error);
       }
   }
   ```

#### 方式二：使用云函数调用（更安全）

1. **创建新的云函数** `callAI`

2. **云函数代码**：
```javascript
const cloud = require('wx-server-sdk')
const https = require('https')

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
})

exports.main = async (event, context) => {
  const { recommendationData, apiKey } = event

  const prompt = `
请根据以下信息为用户推荐充电桩和充电时间：
${JSON.stringify(recommendationData, null, 2)}

请提供以下格式的推荐结果（JSON格式）：
{
  "recommendations": [
    {
      "stationId": "充电桩ID",
      "stationName": "充电桩名称",
      "campus": "校区",
      "provider": "运营商",
      "recommendedTime": "推荐时间",
      "recommendedTimeSlot": "推荐时段",
      "reason": "推荐理由",
      "score": 评分
    }
  ],
  "reasoning": "整体推荐理由说明"
}
`

  const options = {
    hostname: 'api.deepseek.com',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    }
  }

  return new Promise((resolve, reject) => {
    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => {
        data += chunk
      })
      res.on('end', () => {
        try {
          const response = JSON.parse(data)
          const content = response.choices[0].message.content
          const jsonMatch = content.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            resolve({
              success: true,
              recommendations: JSON.parse(jsonMatch[0])
            })
          } else {
            reject(new Error('AI返回格式不正确'))
          }
        } catch (error) {
          reject(error)
        }
      })
    })

    req.on('error', reject)
    req.write(JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        {
          role: 'system',
          content: '你是一个专业的充电桩推荐助手'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    }))
    req.end()
  })
}
```

3. **调用云函数**：
```javascript
wx.cloud.callFunction({
    name: 'callAI',
    data: {
        recommendationData: data,
        apiKey: 'your-deepseek-api-key'
    }
}).then(res => {
    console.log(res.result.recommendations);
});
```

#### 方式三：使用外部服务器（最灵活）

1. **在你的服务器上创建AI接口**

2. **示例代码（Node.js）**：
```javascript
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json());

app.post('/api/ai-recommendation', async (req, res) => {
    const { recommendationData, apiKey } = req.body;

    const prompt = `
请根据以下信息为用户推荐充电桩和充电时间：
${JSON.stringify(recommendationData, null, 2)}
`;

    try {
        const response = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: 'deepseek-chat',
            messages: [
                {
                    role: 'system',
                    content: '你是一个专业的充电桩推荐助手'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_tokens: 2000
        }, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`
            }
        });

        const content = response.data.choices[0].message.content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        
        if (jsonMatch) {
            res.json({
                success: true,
                recommendations: JSON.parse(jsonMatch[0])
            });
        } else {
            res.status(400).json({
                success: false,
                message: 'AI返回格式不正确'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

app.listen(3001, () => {
    console.log('AI推荐服务运行在 http://localhost:3001');
});
```

3. **小程序调用**：
```javascript
wx.request({
    url: 'https://your-server.com/api/ai-recommendation',
    method: 'POST',
    data: {
        recommendationData: data,
        apiKey: 'your-deepseek-api-key'
    },
    success: (res) => {
        console.log(res.data.recommendations);
    }
});
```

### AI Prompt 优化建议

#### 基础Prompt
```
请根据以下信息为用户推荐充电桩和充电时间：

用户偏好：
- 偏好时间段：{userPreferences.preferredTimeSlots}
- 偏好校区：{userPreferences.preferredCampuses}
- 平均充电时长：{userPreferences.avgChargingDuration} 分钟

充电桩使用情况：
{stationUsageData}

请提供3-5个推荐，包含充电桩、推荐时间和推荐理由。
```

#### 优化Prompt（考虑更多因素）
```
你是一个专业的充电桩推荐助手。请根据以下信息为用户推荐充电桩和充电时间：

【用户信息】
- 偏好时间段：{userPreferences.preferredTimeSlots}
- 偏好校区：{userPreferences.preferredCampuses}
- 常用充电桩：{userPreferences.preferredStations}
- 平均充电时长：{userPreferences.avgChargingDuration} 分钟
- 总充电次数：{userPreferences.totalChargingCount}

【当前时间】
- 当前时间：{currentTime.hour}点
- 当前时段：{currentTime.timeSlot}

【充电池使用情况】
{stationUsageData}

【推荐要求】
1. 推荐用户偏好校区的充电桩
2. 推荐时间要符合用户偏好的时段
3. 考虑充电桩的使用规律，推荐使用率相对较低的时间段
4. 推荐理由要具体说明为什么推荐这个充电桩和时间
5. 评分综合考虑：用户偏好匹配度（40%）、充电桩可用性（30%）、使用规律（30%）

【返回格式】
{
  "recommendations": [
    {
      "stationId": "充电桩ID",
      "stationName": "充电桩名称",
      "campus": "校区",
      "provider": "运营商",
      "recommendedTime": "推荐时间（如：14:00）",
      "recommendedTimeSlot": "推荐时段（morning/afternoon/evening/night）",
      "reason": "推荐理由（100字以内）",
      "score": 评分（0-100）
    }
  ],
  "reasoning": "整体推荐理由说明（200字以内）"
}

只返回JSON格式，不要有其他文字。
```

### 数据库集合说明

#### `chargingHistory` - 充电历史记录
```javascript
{
  _openid: "用户openid",
  stationId: "充电桩ID",
  stationName: "充电桩名称",
  campus: "校区",
  provider: "运营商",
  chargingDuration: 60,
  chargingTime: "2026-02-23T14:00:00.000Z",
  timestamp: Date对象,
  date: "2026-02-23",
  hour: 14,
  timeSlot: "afternoon"
}
```

#### `aiRecommendations` - AI推荐记录
```javascript
{
  _openid: "用户openid",
  recommendations: [...],
  reasoning: "推荐理由",
  timestamp: Date对象,
  createdAt: "2026-02-23T14:00:00.000Z"
}
```

### 注意事项

1. **API Key安全**：不要将API Key提交到代码仓库，使用环境变量或配置文件
2. **数据隐私**：确保用户数据的安全存储和传输
3. **成本控制**：DeepSeek API按使用量计费，注意控制调用频率
4. **错误处理**：添加完善的错误处理和用户提示
5. **性能优化**：考虑缓存推荐结果，避免频繁调用AI API

### 扩展功能建议

1. **实时数据**：结合充电桩实时状态进行推荐
2. **多因素考虑**：加入天气、节假日等因素
3. **个性化优化**：根据用户反馈不断优化推荐算法
4. **推荐解释**：提供更详细的推荐理由和可视化展示
5. **批量推荐**：支持为多个用户同时生成推荐

### 技术支持

如有问题，请参考：
- DeepSeek API文档：https://platform.deepseek.com/docs
- 微信云开发文档：https://developers.weixin.qq.com/miniprogram/dev/wxcloud/basis/getting-started.html