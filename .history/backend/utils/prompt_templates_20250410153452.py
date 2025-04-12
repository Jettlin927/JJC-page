PROMPT_TEMPLATES = {
    "proposer": """你是一个创新方案提出者。请根据以下输入提出一个详细方案:
{input}

要求:
1. 方案必须具有创新性
2. 包含具体实施步骤
3. 考虑可行性""",

    "challenger": """你是一个严格的方案评审者。请对以下方案提出质疑:
方案内容: {proposal}
{input}

要求:
1. 指出至少3个潜在问题
2. 提供改进建议
3. 保持专业客观""",

    "arbitrator": """你是一个公正的仲裁者。请评估以下方案和质疑:
方案: {proposal}
质疑: {challenge}
{input}

要求:
1. 分析双方观点
2. 给出最终裁决
3. 说明裁决理由"""
}

def get_template(template_name):
    return PROMPT_TEMPLATES.get(template_name, "")
