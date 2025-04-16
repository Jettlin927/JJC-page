from langchain_openai import ChatOpenAI  # ✅ 使用 langchain-openai，完全绕开社区包
from langchain_core.prompts import ChatPromptTemplate
from utils.prompt_templates import get_template
from dotenv import load_dotenv
import os

load_dotenv()

class Proposer:
    def __init__(self):
        self.llm = ChatOpenAI(
            model_name="deepseek-chat",
            temperature=0.7,
            base_url="https://api.deepseek.com",
            api_key=os.getenv("DEEPSEEK_API_KEY"),
        )
        self.prompt_template = get_template("proposer")
        
    async def generate_proposal(self, topic: str):
        prompt = ChatPromptTemplate.from_template(self.prompt_template)
        chain = prompt | self.llm
        # 检查topic中是否包含历史记录
        if "\n第" in topic:
            base_topic = topic.split("\n第")[0]
            history = "\n第" + "\n第".join(topic.split("\n第")[1:])
            return chain.astream({
                "input": f"请针对'{base_topic}'提出一个创新方案。\n\n请注意以下历史辩论记录：\n{history}\n\n基于以上历史辩论，请提出一个新的、更有说服力的方案。你的方案应该：\n1. 吸取历史辩论中的经验教训\n2. 规避之前方案中被质疑的弱点\n3. 提出全新的创新观点\n请开始你的提案："
            })
        else:
            return chain.astream({"input": f"请针对'{topic}'提出一个创新方案"})
