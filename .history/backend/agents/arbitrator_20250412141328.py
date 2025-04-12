from langchain_openai import ChatOpenAI  # ✅ 使用 langchain-openai，完全绕开社区包
from langchain_core.prompts import ChatPromptTemplate
from backend.utils.prompt_templates import get_template
from dotenv import load_dotenv
import os

load_dotenv()

class Arbitrator:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="deepseek-chat",
            temperature=0.5,  # 更低的温度以获得更客观的裁决
            base_url="https://api.deepseek.com",
            api_key=os.getenv("DEEPSEEK_API_KEY")
        )
        self.prompt_template = get_template("arbitrator")
        
    async def make_arbitrator(self, proposal, challenge):
        prompt = ChatPromptTemplate.from_template(self.prompt_template)
        chain = prompt | self.llm
        return chain.astream({
            "proposal": proposal,
            "challenge": challenge,
            "input": "请做出最终裁决"
        })
