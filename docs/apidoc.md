# Snail API Document

## API 概览
- [SSR] 服务端渲染
	- [New Task](#创建任务)
	- [Get Task](#查询任务)
	- [Sync request](#同步请求)
- [Screenshot] 网页截图
	- [New Task](#创建任务)
	- [Get Task](#查询任务)
	- [Sync request](#同步请求)
- [PDF] 生成PDF
	- [New Task](#创建任务)
	- [Get Task](#查询任务)
	- [Sync request](#同步请求)
- [resList] 提取资源
	- [New Task](#创建任务)
	- [Get Task](#查询任务)
	- [Sync request](#同步请求)
- [Trace] 性能跟踪
	- [New Task](#创建任务)
	- [Get Task](#查询任务)
	- [Sync request](#同步请求)
- [Coverage] JS和CSS代码覆盖率
	- [New Task](#创建任务)
	- [Get Task](#查询任务)
	- [Sync request](#同步请求)
- [Lighthouse] 生成Lighthouse报告
	- [New Task](#创建任务)
	- [Get Task](#查询任务)
	- [Sync request](#同步请求)

## 全局请求示例

### 创建任务
>	GET /:method/new

##### 请求参数
| Name  | Type | Required | Default    | Description              |
|-------|------|----------|------------|--------------------------|
| url			  | String | Yes |  -        | 目标URL				           |
| device    | string | No  | pc        | 模拟的设备类型，pc / mobile |
| viewport  | string | No  | 800,600,2 | 浏览器尺寸，3个数据依次为width、height、scale |
| userAgent	| string | No  | false     | 自定义UA		               |
| timeout   | number | No  | 5000      | 超时时间，单位为毫秒        |
| hasLazy	  | string | No  | false     | 目标URL有懒加载实现		     |
| extend	  | string | No  | false     | 获取扩展响应，值为true的时候会返回headers、cookies、localStorage、sessionStorage字段		 |
| callback	| string | No  | false     | 回调地址，无则不会回调，需要主动查询		 |
| referer	  | string | No  | false     | 自定义Referer		         |
| direct    | string | No  | false     | 为true则不遵循API输出规范，直接输出目标数据 |

##### 响应参数
| Name      | Type    | Required | Description |
|-----------|---------|-----|------------------|
| success   | boolean | Yes | 成功/失败标志      |
| taskId    | string  | No  | 任务创建成功时返回  |
| error     | string  | No  | 任务创建失败时返回  |

##### 请求示例
```
curl -i -X GET http://localhost:18181/ssr/new
  -H 'Content-Type: application/json' \
  -d '{ "url": "https://www.baidu.com/" }'
```

##### 成功响应
```
HTTP/1.1 200 OK
{
  "success": true,
  "taskId": "1f6e2b4b-1968-4a64-b33f-5b75671d8d48"
}
```

##### 失败响应
```
HTTP/1.1 200 OK
{
  "success": false,
  "error": "Error messages."
}
```

------------

### 查询任务
>	GET /:method/get

##### 请求参数
| Name   | Type   | Required | Description  |
|--------|--------|----------|--------------|
| taskId | String	|    Yes   |  taskId	  	|

##### 响应参数
| Name      | Type    | Required | Description  |
|-----------|---------|-----|-----------------|
| success   | boolean | Yes | 成功/失败标志 |
| error     | string  | No  | 失败时返回错误信息		 |
| status  	| string  | No  | 任务状态，具体说明请参考[Task status](#task-status)		  |
| data      | object  | No  | 成功时的数据，请参考[data字段数据结构](#data字段数据结构)	 |

##### 成功响应
```
HTTP/1.1 200 OK
{
  "success": true,
  "status": "waiting"
}
```

##### 失败响应
```
HTTP/1.1 200 OK
{
  "success": false,
  "error": "error messages"
}
```

------------

### 同步请求
>	GET /:method/fetch

##### 请求参数
同 [New Task](#请求参数)

##### 响应参数
| Name      | Type    | Required | Description  |
|-----------|---------|-----|-----------------|
| success   | boolean | Yes | 成功/失败标志 |
| error     | string  | No  | 失败时返回错误信息		 |
| data      | object  | No  | 成功时的数据，请参考[data字段数据结构](#data字段数据结构)	 |

##### 成功响应
```
HTTP/1.1 200 OK
{
  "success": true,
  "status": "completed",
  "data": {
    "httpCode": 200,
    "body": "",
    "cookies": [],
    "header": {},
    "localStorage": {},
    "sessionStorage": {}
  }
}
```

##### 失败响应
```
HTTP/1.1 200 OK
{
  "success": false,
  "error": "error messages"
}
```
------------

#### Task status
| Name      | Description            |
|-----------|------------------------|
| none      | 任务不存在或已过期清除     |
| waiting   | 任务在排队等待执行        |
| doing     | 任务执行中               |
| completed | 任务执行完毕             |
| failed    | 任务执行完毕，但执行出错   |

#### data字段数据结构
| Name           | Type   | Required | Description     |
|----------------|--------|----------|-----------------|
| httpCode       | number | Yes | 目标URL响应的http状态码 |
| body           | string | Yes | 响应的内容体           |
| cookie         | array  | No  | 响应的cookies `[{}]`  |
| localStorage   | object | No  | 响应的localStorage    |
| sessionStorage | object | No  | 响应的sessionStorage  |
| headers        | object | No  | 响应的http头          |

## API列表
```
GET /ssr/new
GET /ssr/get
GET /ssr/fetch
GET /screenshot/new
GET /screenshot/get
GET /screenshot/fetch
GET /pdf/new
GET /pdf/get
GET /pdf/fetch
GET /resList/new
GET /resList/get
GET /resList/fetch
GET /trace/new
GET /trace/get
GET /trace/fetch
GET /coverage/new
GET /coverage/get
GET /coverage/fetch
GET /lighthouse/new
GET /lighthouse/get
GET /lighthouse/fetch
```

## 测试用例
- [Paw 格式](/docs/SnailAPI.paw.json)
- [Postman 格式](/docs/SnailAPI.postman.json)
