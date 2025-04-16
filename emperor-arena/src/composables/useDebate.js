import { useDebateStore } from '@/store/debateStore'
import { useTypingEffect } from '@/utils/typingEffect'
import { isProxy,reactive,isReactive,ref } from 'vue'

export const useDebate = () => {
  const store = useDebateStore()
  
  const { startTyping } = useTypingEffect()

  let currentEventSource = null

  const continueDebate = async () => {
    console.group('继续辩论调试信息')
    console.log('isLoading 类型:', typeof store.isLoading);
    console.log('当前状态:', {
      isLoading: store.isLoading.value,
      isPaused: store.isPaused.value,
      showContinue: store.showContinue.value
    })
    if (store.isPaused.value) {
      console.log('继续辩论: 设置isPaused为false')
      store.isPaused.value = false
      store.showContinue.value = false
      console.log('设置isLoading为true')
      store.isLoading.value = true
      console.log('状态更新后:', {
        isLoading: store.isLoading.value,
        isPaused: store.isPaused.value,
        showContinue: store.showContinue.value
      })

      try {
        // 发送继续信号
        console.log('发送继续信号...')
        const response = await fetch('/debate/continue', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'continue',
            topic: store.topic.value,
            proposer: store.selectedCharacters.proposer?.name,
            challenger: store.selectedCharacters.challenger?.name,
            arbitrator: store.selectedCharacters.arbitrator?.name
          })
        })

        if (!response.ok) {
          throw new Error('发送继续信号失败')
        }

        console.log('继续信号发送成功')
        // 重新开始辩论
        startDebate()
      } catch (error) {
        console.error('发送继续信号时出错:', error)
        store.error.value = '发送继续信号失败: ' + error.message
        store.isLoading.value = false
        store.isPaused.value = true
        store.showContinue.value = true
      }
    } else {
      console.log('未执行继续操作：isPaused为false')
    }
    console.groupEnd()
  }

  const resetDebate = () => {
    console.log('重置辩论状态')
    if (currentEventSource) {
      console.log('关闭事件源连接')
      currentEventSource.close()
      currentEventSource = null
    }
    if (store.typingInterval.value) {
      console.log('清理打字机定时器')
      clearInterval(store.typingInterval.value)
      store.typingInterval.value = null
    }
    store.isTyping.value = false
    
    store.debateResult.value = null
    store.isLoading.value = false
    store.error.value = null
    store.round.value = 0
    store.showContinue.value = false
    store.showReset.value = false
    store.isPaused.value = false
    // 保留selectedCharacters不变
  }

  const startDebate = () => {
    console.group('开始辩论调试信息')
    console.log('isLoading 类型:', typeof store.isLoading);
    console.log('isLoading 是响应式对象:', isReactive(store.isLoading));
    console.log('isLoading 是代理对象:', isProxy(store.isLoading));
    console.log('当前 isLoading 的值:', store.isLoading.value);
    console.log('selectedCharacters:', store.selectedCharacters);
    console.log('selectedCharacters 类型:', typeof store.selectedCharacters);
    console.log('selectedCharacters 是响应式对象:', isReactive(store.selectedCharacters));
    console.log('selectedCharacters 是代理对象:', isProxy(store.selectedCharacters));
    console.log('selectedCharacters 内容:', JSON.stringify(store.selectedCharacters, null, 2));
    
    store.isLoading.value = true;
    
    console.log('更新后的状态:', {
      isLoading: store.isLoading.value,
      round: store.round.value,
      maxRounds: store.maxRounds.value,
      selectedCharacters: JSON.stringify(store.selectedCharacters, null, 2)
    })

    if (store.round.value >= store.maxRounds.value) {
      store.error.value = `已达到最大辩论轮数 (${store.maxRounds.value}轮)`
      return
    }

    if (!store.selectedCharacters.proposer || !store.selectedCharacters.challenger || 
      !store.selectedCharacters.arbitrator) {
      console.error('角色选择不完整:', store.selectedCharacters)
      console.error('proposer:', store.selectedCharacters.proposer)
      console.error('challenger:', store.selectedCharacters.challenger)
      console.error('arbitrator:', store.selectedCharacters.arbitrator)
      store.error.value = '请填写辩论主题并选择所有角色'
      store.isLoading.value = false
      return
    }

    store.isLoading.value = true
    store.error.value = null
    if (!store.debateResult.value) {
      store.debateResult.value = { messages: [] }
    }
    
    const url = `/debate?topic=${encodeURIComponent(store.topic.value)}&proposer=${encodeURIComponent(store.selectedCharacters.proposer?.name || '')}&challenger=${encodeURIComponent(store.selectedCharacters.challenger?.name || '')}&arbitrator=${encodeURIComponent(store.selectedCharacters.arbitrator?.name || '')}`
    console.log('尝试连接SSE:', url)
    
    // 如果存在旧的连接，先关闭它
    if (currentEventSource) {
      console.log('关闭旧的SSE连接')
      currentEventSource.close()
      currentEventSource = null
    }

    // 创建新的连接
    try {
      console.log('创建新的EventSource实例')
      currentEventSource = new EventSource(url, { withCredentials: true })
      
      // 设置连接超时
      const connectionTimeout = setTimeout(() => {
        if (currentEventSource && currentEventSource.readyState !== EventSource.OPEN) {
          console.error('SSE连接超时')
          store.error.value = '连接服务器超时，请检查后端服务是否正常运行'
          store.isLoading.value = false
          if (currentEventSource) {
            currentEventSource.close()
            currentEventSource = null
          }
        }
      }, 20000) // 20秒超时

      currentEventSource.onopen = () => {
        console.group('SSE连接状态')
        console.log('EventSource连接已建立')
        console.log('连接状态:', {
          readyState: currentEventSource.readyState,
          withCredentials: currentEventSource.withCredentials,
          url: currentEventSource.url
        })
        clearTimeout(connectionTimeout)
        console.groupEnd()
      }

      currentEventSource.onerror = (e) => {
        console.group('SSE错误')
        console.error('EventSource错误:', e)
        console.error('错误详情:', {
          type: e.type,
          target: e.target,
          eventPhase: e.eventPhase,
          readyState: currentEventSource?.readyState
        })
        clearTimeout(connectionTimeout)
        store.error.value = '辩论连接出错: ' + (e.message || '未知错误')
        store.isLoading.value = false
        if (currentEventSource) {
          console.log('关闭错误的SSE连接')
          currentEventSource.close()
          currentEventSource = null
        }
        console.groupEnd()
      }

      currentEventSource.onmessage = async (event) => {
        console.group('收到SSE消息')
        console.log('原始消息数据:', event.data)
        
        if (event.data === '[DONE]') {
          console.log('收到结束标记[DONE]')
          currentEventSource.close()
          currentEventSource = null
          console.groupEnd()
          return
        }

        try {
          // 处理消息数据
          let jsonData = event.data
          // 如果消息包含 "data: " 前缀，移除它
          if (jsonData.startsWith('data: ')) {
            jsonData = jsonData.substring(6)
          }
          
          console.log('处理后的消息数据:', jsonData)
          const data = JSON.parse(jsonData)
          console.log('解析后的消息数据:', data)
          console.log('消息类型:', data.type)
          
          if (data.type === 'error') {
            console.error('收到错误消息:', data.content)
            store.error.value = data.content
            store.isLoading.value = false
            if (currentEventSource) {
              currentEventSource.close()
              currentEventSource = null
            }
            console.groupEnd()
            return
          }

          if (data.type === 'connected') {
            console.log('收到连接成功消息:', data.content)
            console.groupEnd()
            return
          }

          if (data.type === 'debate_end' || data.type === 'round_end' || data.type === 'pause') {
            console.log('收到控制消息:', data.type)
            handleCustomEvent({
              type: data.type,
              data: data.content
            })
            if (data.type === 'debate_end' || data.type === 'pause') {
              console.log('关闭SSE连接')
              if (currentEventSource) {
                currentEventSource.close()
                currentEventSource = null
              }
            }
            console.groupEnd()
            return
          }

          if (data.type === 'proposal' || data.type === 'challenge' || data.type === 'judgement') {
            console.log('收到辩论消息:', data.type)
            console.log('当前消息列表长度:', store.debateResult.value?.messages?.length || 0)
            
            if (!store.debateResult.value.messages) {
              console.log('初始化消息数组')
              store.debateResult.value.messages = [];
            }

            const existingMessage = store.debateResult.value.messages.find(
              msg => msg.round === store.round.value + 1 && msg.role === data.role
            );
            
            console.log('是否找到现有消息:', !!existingMessage)

            if (existingMessage) {
              console.log('更新现有消息')
              await startTyping(data.content, existingMessage);
            } else {
              console.log('创建新消息')
              const newMessage = {
                role: data.role,
                content: '',
                type: data.type,
                round: store.round.value + 1
              };
              console.log('新消息对象:', newMessage)
              store.debateResult.value.messages.push(newMessage);
              await startTyping(data.content, newMessage);
            }
            console.log('消息处理完成')
            console.groupEnd()
            return;
          }
        } catch (err) {
          console.error('JSON解析错误:', err)
          console.error('错误详情:', {
            name: err.name,
            message: err.message,
            stack: err.stack
          })
          store.error.value = '解析消息时出错: ' + err.message
          console.groupEnd()
          return
        }
      }
    } catch (error) {
      console.error('创建EventSource时出错:', error)
      store.error.value = '创建连接时出错: ' + error.message
      store.isLoading.value = false
      if (currentEventSource) {
        currentEventSource.close()
        currentEventSource = null
      }
    }
  }

  const handleCustomEvent = (event) => {
    console.group('处理自定义事件:', event.type)
    console.log('事件前状态:', {
      isLoading: store.isLoading.value,
      showContinue: store.showContinue.value,
      showReset: store.showReset.value,
      isPaused: store.isPaused.value,
      round: store.round.value,
      maxRounds: store.maxRounds.value
    })

    switch(event.type) {
      case 'pause':
        console.log('处理暂停事件')
        store.isLoading.value = false
        store.showContinue.value = true
        store.showReset.value = true
        store.isPaused.value = true
        break
      case 'round_end':
        console.log('处理回合结束事件')
        try {
          const data = JSON.parse(event.data.content)
          store.round.value = data.current_round
          store.maxRounds.value = data.total_rounds
          console.log('更新轮次:', data.current_round, '/', data.total_rounds)
        } catch {
          store.round.value++
          console.log('默认增加轮次:', store.round.value)
        }
        store.showReset.value = true
        store.isLoading.value = false
        break
      case 'debate_end':
        console.log('处理辩论结束事件')
        store.showContinue.value = false
        store.showReset.value = true
        store.isLoading.value = false
        store.isPaused.value = false
        if (currentEventSource) {
          console.log('关闭事件源连接')
          currentEventSource.close()
          currentEventSource = null
        }
        store.round.value++
        break
    }

    console.log('事件后状态:', {
      isLoading: store.isLoading.value,
      showContinue: store.showContinue.value,
      showReset: store.showReset.value,
      isPaused: store.isPaused.value,
      round: store.round.value,
      maxRounds: store.maxRounds.value
    })
    console.groupEnd()
  }

  return {
    continueDebate,
    resetDebate,
    startDebate,
    handleCustomEvent
  }
}
