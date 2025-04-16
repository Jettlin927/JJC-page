import os
import logging
import json
from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from langserve import add_routes
from agents.proposer import Proposer
from agents.challenger import Challenger
from agents.arbitrator import Arbitrator
from langchain_core.runnables import RunnableLambda
from sse_starlette.sse import EventSourceResponse
import asyncio
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

# 获取并设置 PYTHONPATH 环境变量
python_path = os.getenv('PYTHONPATH')
if python_path:
    os.environ['PYTHONPATH'] = python_path

logging.basicConfig(level=logging.DEBUG)

# 创建主应用
app = FastAPI()

# 创建自定义API路由
api_router = APIRouter()

# 添加CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # 明确指定前端域名
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# 添加根路径
@api_router.get("/")
async def root():
    return {
        "message": "Emperor Arena API is running",
        "docs": "/docs",
        "playgrounds": [
            "/proposer/playground",
            "/challenger/playground", 
            "/arbitrator/playground"
        ]
    }

from fastapi import HTTPException
from pydantic import BaseModel

class DebateRequest(BaseModel):
    topic: str
    proposer: str
    challenger: str
    arbitrator: str
    rounds: int = 3

class DebateSSEMessage(BaseModel):
    role: str
    content: str
    type: str = "message"

# 添加辩论接口
@api_router.get("/debate")
async def start_debate(request: Request):
    logging.info(f"收到辩论请求: {request.url}")
    # 设置SSE响应头
    headers = {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
        "Access-Control-Allow-Origin": "http://localhost:3000",
        "Access-Control-Allow-Credentials": "true"
    }
    
    topic = request.query_params.get("topic")
    proposer = request.query_params.get("proposer")
    challenger = request.query_params.get("challenger") 
    arbitrator = request.query_params.get("arbitrator")
    rounds = int(request.query_params.get("rounds", 3))
    
    logging.info(f"请求参数: topic={topic}, proposer={proposer}, challenger={challenger}, arbitrator={arbitrator}, rounds={rounds}")
    
    async def event_generator():
        try:
            # 发送初始连接成功消息
            yield f"data: {json.dumps({'type': 'connected', 'content': 'SSE连接已建立'})}\n\n"
            
            # 参数验证
            if not all([topic, proposer, challenger, arbitrator]):
                error_msg = json.dumps({
                    'type': 'error',
                    'content': '错误: 缺少必要参数(topic/proposer/challenger/arbitrator)'
                })
                logging.error(f"参数验证失败: {error_msg}")
                yield f"data: {error_msg}\n\n"
                return
                
            try:
                logging.info(f"Starting debate with topic: {topic}")
                logging.info(f"Participants: Proposer={proposer}, Challenger={challenger}, Arbitrator={arbitrator}")
                
                # 初始化agents
                proposer_agent = Proposer()
                challenger_agent = Challenger()
                arbitrator_agent = Arbitrator()
                
                # 初始化辩论历史记录
                debate_history = ""
                
                # 生成提案 - 类似ChatGPT的逐步展示
                proposal = ""
                # 如果有历史记录，将其作为上下文传递给proposer
                current_topic = topic + debate_history if debate_history else topic
                stream = await proposer_agent.generate_proposal(current_topic)
                async for chunk in stream:
                    if hasattr(chunk, 'content'):
                        proposal += chunk.content.strip()  # 累积完整的提案内容
                        msg = json.dumps({
                            'type': 'proposal',
                            'role': proposer,
                            'content': chunk.content
                        })
                        yield f"data: {msg}\n\n"
                        await asyncio.sleep(0.05)  # 更短的延迟实现更流畅效果
                    else:
                        error_msg = json.dumps({
                            'type': 'error',
                            'content': '错误: 无效的响应格式'
                        })
                        yield f"data: {error_msg}\n\n"
                        return
                
                # 确保提案完全生成
                if not proposal:
                    error_msg = json.dumps({
                        'type': 'error',
                        'content': '错误: 提案内容为空'
                    })
                    yield f"data: {error_msg}\n\n"
                    return
                    
                # 进行多轮辩论
                for _ in range(rounds):
                    # 生成质疑，传入完整的提案内容作为上下文
                    challenge = ""
                    stream = await challenger_agent.generate_challenge(proposal)
                    async for chunk in stream:
                        if hasattr(chunk, 'content'):
                            challenge += chunk.content.strip()  # 累积完整的质疑内容
                            msg = json.dumps({
                                'type': 'challenge',
                                'role': challenger,
                                'content': chunk.content
                            })
                            yield f"data: {msg}\n\n"
                            await asyncio.sleep(0.1)  # 添加延迟
                        else:
                            error_msg = json.dumps({
                                'type': 'error',
                                'content': '错误: 无效的响应格式'
                            })
                            yield f"data: {error_msg}\n\n"
                            return
                        
                    # 确保challenge完全生成后再开始arbitrator
                    if not challenge:
                        error_msg = json.dumps({
                            'type': 'error',
                            'content': '错误: 质疑内容为空'
                        })
                        yield f"data: {error_msg}\n\n"
                        return
                    
                    # 生成裁决，传入完整的提案和质疑内容作为上下文
                    judgement = ""
                    debate_context = {"proposal": proposal, "challenge": challenge}
                    stream = await arbitrator_agent.make_arbitrator(proposal, challenge)
                    async for chunk in stream:
                        if hasattr(chunk, 'content'):
                            judgement += chunk.content.strip()  # 累积完整的裁决内容
                            msg = json.dumps({
                                'type': 'judgement',
                                'role': arbitrator,
                                'content': chunk.content
                            })
                            yield f"data: {msg}\n\n"
                            await asyncio.sleep(0.05)  # 更短的延迟实现更流畅效果
                        else:
                            error_msg = json.dumps({
                                'type': 'error',
                                'content': '错误: 无效的响应格式'
                            })
                            yield f"data: {error_msg}\n\n"
                            return
                    
                    # 先发送暂停标记
                    pause_msg = json.dumps({
                        'type': 'pause',
                        'content': '等待用户确认继续'
                    })
                    yield f"data: {pause_msg}\n\n"
                    
                    # 更新辩论历史记录
                    debate_history += f"\n第{_+1}轮辩论:\n提案: {proposal}\n质疑: {challenge}\n裁决: {judgement}"
                    
                    # 发送轮次结束标记
                    round_end_msg = json.dumps({
                        'type': 'round_end',
                        'content': json.dumps({
                            'message': f'第{_+1}轮辩论结束',
                            'current_round': _+1,
                            'total_rounds': rounds
                        })
                    })
                    yield f"data: {round_end_msg}\n\n"
                        
            except Exception as e:
                error_msg = json.dumps({
                    'type': 'error',
                    'content': f'错误: {str(e)}'
                })
                yield f"data: {error_msg}\n\n"
                
            # 发送辩论结束标记
            end_msg = json.dumps({
                'type': 'debate_end',
                'content': '辩论结束'
            })
            yield f"data: {end_msg}\n\n"
            
            # 发送显式结束事件
            yield "event: end\n"
            yield "data: [DONE]\n\n"
        except Exception as e:
            logging.error(f"Event generator error: {str(e)}")
            error_msg = json.dumps({
                'type': 'error',
                'content': f'错误: {str(e)}'
            })
            yield f"data: {error_msg}\n\n"

    response = EventSourceResponse(event_generator(), headers=headers)
    response.ping_interval = 10  # 保持连接活跃
    return response

# 添加继续辩论的路由
@api_router.post("/debate/continue")
async def continue_debate(request: Request):
    try:
        data = await request.json()
        logging.info(f"收到继续辩论请求: {data}")
        return {"status": "success", "message": "继续信号已接收"}
    except Exception as e:
        logging.error(f"处理继续请求时出错: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

# 保留测试端点
@api_router.get("/test")
async def test():
    return {"message": "API is working with LangServe"}

# 注册自定义路由
app.include_router(api_router)

# 将agent转换为Runnable
proposer_runnable = RunnableLambda(lambda x: Proposer().generate_proposal(x["topic"]))
challenger_runnable = RunnableLambda(lambda x: Challenger().generate_challenge(x["proposal"]))
arbitrator_runnable = RunnableLambda(lambda x: Arbitrator().make_arbitrator(x["proposal"], x["challenge"]))

# 添加LangServe路由
add_routes(
    app,
    proposer_runnable,
    path="/proposer"
)

add_routes(
    app,
    challenger_runnable,
    path="/challenger"
)

add_routes(
    app,
    arbitrator_runnable,
    path="/arbitrator"
)
