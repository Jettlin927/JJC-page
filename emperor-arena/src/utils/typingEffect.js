export const useTypingEffect = () => {
  const startTyping = async (text, targetMessage) => {
    console.log('开始打字效果，文本长度:', text.length)
    
    // 保存当前内容
    const currentContent = targetMessage.content
    
    try {
      // 使用异步循环逐字显示文本
      for (let i = 0; i < text.length; i++) {
        targetMessage.content = currentContent + text.substring(0, i + 1)
        // 使用Promise和setTimeout创建延迟
        await new Promise(resolve => setTimeout(resolve, 30))
      }
    } finally {
      console.log('打字效果完成')
    }
  }

  return {
    startTyping
  }
}
