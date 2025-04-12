import { useDebateStore } from '@/store/debateStore'
import { useTypingEffect } from '@/utils/typingEffect'

export const useDebate = () => {
  const {
    typingText,
    typingInterval,
    isTyping,
    topic,
    debateResult,
    isLoading,
    error,
    round,
    maxRounds,
    showContinue,
    showReset,
    isPaused,
    selectedCharacters
  } = useDebateStore()

  const { startTyping } = useTypingEffect()

  let currentEventSource = null

  const continueDebate = () => {
    if (isPaused) {
      isPaused.value = false
      showContinue.value = false
      isLoading.value = true
      startDebate()
    }
  }

  const resetDebate = () => {
    console.log('重置辩论状态')
    if (currentEventSource) {
      console.log('关闭事件源连接')
      currentEventSource.close()
      currentEventSource = null
    }
    if (typingInterval.value) {
      console.log('清理打字机定时器')
      clearInterval(typingInterval.value)
      typingInterval.value = null
    }
    isTyping.value = false
    
    debateResult.value = null
    isLoading.value = false
    error.value = null
    round.value = 0
    showContinue.value = false
    showReset.value = false
    isPaused.value = false
  }

  const startDebate = () => {
    if (round.value >= maxRounds) {
      error.value = `已达到最大辩论轮数 (${maxRounds}轮)`
      return
    }
    
    if (currentEventSource) {
      currentEventSource.close()
    }

    if (!topic.value || !selectedCharacters.value.proposer || 
        !selectedCharacters.value.challenger || !selectedCharacters.value.arbitrator) {
      error.value = '请填写辩论主题并选择所有角色'
      return
    }

    isLoading.value = true
    error.value = null
    if (!debateResult.value) {
      debateResult.value = { messages: [] }
    }
    
    if (currentEventSource) {
      currentEventSource.close()
    }

    currentEventSource = new EventSource(`http://localhost:8000/debate?topic=${encodeURIComponent(topic.value)}&proposer=${encodeURIComponent(selectedCharacters.value.proposer.name)}&challenger=${encodeURIComponent(selectedCharacters.value.challenger.name)}&arbitrator=${encodeURIComponent(selectedCharacters.value.arbitrator.name)}`)

    currentEventSource.onmessage = async (event) => {
      if (event.data === '[DONE]') {
        currentEventSource.close()
        currentEventSource = null
        return
      }

      try {
        const data = JSON.parse(event.data)
        if (data.type === 'error') {
          error.value = data.content
          isLoading.value = false
          if (currentEventSource) {
            currentEventSource.close()
            currentEventSource = null
          }
          return
        }

        if (data.type === 'debate_end' || data.type === 'round_end' || data.type === 'pause') {
          handleCustomEvent({
            type: data.type,
            data: data.content
          })
          if (data.type === 'debate_end' || data.type === 'pause') {
            if (currentEventSource) {
              currentEventSource.close()
              currentEventSource = null
            }
          }
          return
        }

        if (data.type === 'proposal' || data.type === 'challenge' || data.type === 'judgement') {
          if (!debateResult.value.messages) {
            debateResult.value.messages = [];
          }

          const existingMessage = debateResult.value.messages.find(
            msg => msg.round === round.value + 1 && msg.role === data.role
          );

          if (existingMessage) {
            await startTyping(data.content, existingMessage);
          } else {
            const newMessage = {
              role: data.role,
              content: '',
              type: data.type,
              round: round.value + 1
            };
            debateResult.value.messages.push(newMessage);
            await startTyping(data.content, newMessage);
          }
          return;
        }
      } catch (err) {
        console.error('JSON解析错误:', err)
        error.value = '解析消息时出错: ' + err.message
        return
      }
    }

    currentEventSource.onerror = () => {
      error.value = '辩论连接出错，请检查参数是否正确'
      isLoading.value = false
      if (currentEventSource) {
        currentEventSource.close()
        currentEventSource = null
      }
    }
  }

  const handleCustomEvent = (event) => {
    switch(event.type) {
      case 'pause':
        isLoading.value = false
        showContinue.value = true
        showReset.value = true
        isPaused.value = true
        break
      case 'round_end':
        try {
          const data = JSON.parse(event.data.content)
          round.value = data.current_round
          maxRounds.value = data.total_rounds
        } catch {
          round.value++
        }
        showReset.value = true
        isLoading.value = false
        break
      case 'debate_end':
        showContinue.value = false
        showReset.value = true
        isLoading.value = false
        isPaused.value = false
        if (currentEventSource) {
          currentEventSource.close()
          currentEventSource = null
        }
        round.value++
        break
    }
  }

  return {
    continueDebate,
    resetDebate,
    startDebate,
    handleCustomEvent
  }
}
