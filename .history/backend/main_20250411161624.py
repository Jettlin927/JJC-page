import os
os.environ["PYDANTIC_V1_FORCE_DISABLE"] = "1"
import logging
from fastapi import FastAPI, APIRouter, Request
from fastapi.middleware.cors import CORSMiddleware
from langserve import add_routes
from .agents.proposer import Proposer
from .agents.challenger import Challenger
from .agents.arbitrator import Arbitrator
from langchain_core.runnables import RunnableLambda
from sse_starlette.sse import EventSourceResponse
import asyncio

logging.basicConfig(level=logging.DEBUG)

# 创建主应用
app = FastAPI()

# 创建自定义API路由
api_router = APIRouter()

# 添加CORS配置
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
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
    topic = request.query_params.get("topic")
    proposer = request.query_params.get("proposer")
    challenger = request.query_params.get("challenger") 
    arbitrator = request.query_params.get("arbitrator")
    rounds = int(request.query_params.get("rounds", 3))
    async def event_generator():
        # 参数验证
        if not all([topic, proposer, challenger, arbitrator]):
            yield DebateSSEMessage(
                role="system",
                content="错误: 缺少必要参数(topic/proposer/challenger/arbitrator)",
                type="error"
            ).model_dump_json()
            return
            
        try:
            print(f"Starting debate with topic: {topic}")
            print(f"Participants: Proposer={proposer}, Challenger={challenger}, Arbitrator={arbitrator}")
            
            # 初始化agents并记录
            logging.info("Initializing agents...")
            try:
                proposer_agent = Proposer()
                challenger_agent = Challenger()
                arbitrator_agent = Arbitrator()
                logging.info("Agents initialized successfully")
            except Exception as e:
                logging.error(f"Agent initialization failed: {str(e)}")
                raise
            
            # 生成提案 - 类似ChatGPT的逐步展示
            proposal = ""
            accumulated = ""
            stream = await proposer_agent.generate_proposal(topic)
            async for chunk in stream:
                if hasattr(chunk, 'content'):
                    yield DebateSSEMessage(
                        role=proposer,
                        content=chunk.content,  # ❗只发本次新内容
                        type="proposal"
                    ).model_dump_json()
                    await asyncio.sleep(0.05)  # 更短的延迟实现更流畅效果
                else:
                    yield DebateSSEMessage(
                        role="system",
                        content=f"错误: 无效的响应格式",
                        type="error"
                    ).model_dump_json()
                
            # 进行多轮辩论
            for _ in range(rounds):
                challenge = ""
                stream = await challenger_agent.generate_challenge(proposal)
                async for chunk in stream:
                    if hasattr(chunk, 'content'):
                        yield DebateSSEMessage(
                            role=challenger,
                            content=chunk.content,  # ❗只发本次新内容
                            type="challenge"
                        ).model_dump_json()
                        await asyncio.sleep(0.1)  # 添加延迟
                    else:
                        yield DebateSSEMessage(
                            role="system",
                            content=f"错误: 无效的响应格式",
                            type="error"
                        ).model_dump_json()
                    
                try:
                    stream = await arbitrator_agent.make_arbitrator(proposal, challenge)
                    async for chunk in stream:
                        if hasattr(chunk, 'content'):
                            yield DebateSSEMessage(
                                role=arbitrator,
                                content=chunk.content,
                                type="judgment"
                            ).model_dump_json()
                            await asyncio.sleep(0.1)  # 增加延迟确保稳定性
                        else:
                            yield DebateSSEMessage(
                                role="system",
                                content=f"错误: 无效的响应格式",
                                type="error"
                            ).model_dump_json()
                except Exception as e:
                    yield DebateSSEMessage(
                        role="system",
                        content=f"仲裁错误: {str(e)}",
                        type="error"
                    ).model_dump_json()
                # 发送辩论轮次结束标记
                yield DebateSSEMessage(
                    role="system",
                    content=f"第{_+1}轮辩论结束",
                    type="round_end"
                ).model_dump_json()
                # 发送暂停标记
                yield DebateSSEMessage(
                    role="system",
                    content="等待用户确认继续",
                    type="pause"
                ).model_dump_json()
                break  # 暂停当前轮次
                    
        except Exception as e:
            yield DebateSSEMessage(
                role="system",
                content=f"错误: {str(e)}",
                type="error"
            ).model_dump_json()
        # 发送辩论结束标记
        yield DebateSSEMessage(
            role="system",
            content="辩论结束",
            type="debate_end"
        ).model_dump_json()
        # 发送显式结束事件
        return

    response = EventSourceResponse(
        event_generator(),
        ping_interval=5,  # 更频繁的ping保持连接
        ping_message_factory=lambda: "[PING]",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # 禁用代理缓冲
            "Access-Control-Allow-Origin": "*", #允许前端请求
        }
    )
    return response

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
