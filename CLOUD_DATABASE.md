# 云数据库集合设计

## 1. subscribes（订阅记录集合）

存储用户的订阅消息授权信息

```javascript
{
  _id: String,              // 自动生成的唯一ID
  _openid: String,          // 用户openid
  templateId: String,       // 消息模板ID
  stationIds: Array,        // 订阅的充电桩ID列表
  createTime: Date,         // 创建时间
  expireTime: Date,         // 过期时间（7天后）
  status: String            // 状态：active/expired
}
```

## 2. stationHistory（充电桩状态历史集合）

存储充电桩的历史状态，用于检测状态变化

```javascript
{
  _id: String,              // 自动生成的唯一ID
  stationId: String,        // 充电桩ID（hash_id）
  _openid: String,          // 用户openid
  free: Number,             // 空闲数量
  total: Number,            // 总数量
  createTime: Date          // 记录时间
}
```

## 3. favoriteStations（收藏充电桩集合）

存储用户收藏的充电桩信息（可选，也可以用本地存储）

```javascript
{
  _id: String,              // 自动生成的唯一ID
  _openid: String,          // 用户openid
  station: Object,          // 充电桩完整信息
  createTime: Date          // 收藏时间
}
```

## 索引建议

### subscribes 集合
- `_openid` 索引：用于快速查询用户的订阅记录
- `expireTime` 索引：用于查询未过期的订阅
- 复合索引：`(_openid, status, expireTime)`

### stationHistory 集合
- `stationId` 索引：用于查询特定充电桩的历史
- `_openid` 索引：用于查询用户关注的充电桩历史
- 复合索引：`(stationId, _openid, createTime)`

## 数据库权限规则

```json
{
  "read": "auth.openid == doc._openid",
  "write": "auth.openid == doc._openid"
}
```

## 初始化数据

在云开发控制台手动创建以下集合：
1. subscribes
2. stationHistory
3. favoriteStations（可选）
