from langchain_openai import ChatOpenAI  # ✅ 使用 langchain-openai，完全绕开社区包
from langchain_core.prompts import ChatPromptTemplate
from backend.utils.prompt_templates import get_template
from dotenv import load_dotenv
import os

load_dotenv()

class Challenger:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="deepseek-chat",
            temperature=0.7,
            base_url="https://api.deepseek.com",
            api_key=os.getenv("DEEPSEEK_API_KEY")
        )
        self.prompt_template = get_template("challenger")
        
    async def generate_challenge(self, proposal):
        prompt = ChatPromptTemplate.from_template(self.prompt_template)
        chain = prompt | self.llm
        return chain.astream({
            "proposal": proposal,
            "input": "请对这个方案提出质疑"
        })
