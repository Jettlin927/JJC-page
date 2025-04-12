<script setup>
import { ref, nextTick } from 'vue'
import axios from 'axios'
import SelectionPanel from './components/SelectionPanel.vue'

const title = ref('帝王竞技场')
const topic = ref('')
const debateResult = ref(null)
const isLoading = ref(false)
const error = ref(null)
const round = ref(0)
const maxRounds = 5
const showContinue = ref(false)
const showReset = ref(false)
const isPaused = ref(false)

const characters = ref([
  {
    id: 1,
    name: '秦始皇',
    description: '统一六国的第一位皇帝',
    image: '/images/qinshihuang.jpg'
  },
  {
    id: 2, 
    name: '汉武帝',
    description: '开创汉武盛世的伟大帝王',
    image: '/images/hanwudi.jpg'
  },
  {
    id: 3,
    name: '唐太宗',
    description: '贞观之治的开创者',
    image: '/images/tangtaizong.jpg'
  }
])

const selectedCharacters = ref({
  proposer: null,
  challenger: null,
  arbitrator: null
})

const continueDebate = () => {
  if (isPaused.value) {
    isPaused.value = false
    showContinue.value = false
    isLoading.value = true
    startDebate()
  }
}

let currentEventSource = null

const resetDebate = () => {
  if (currentEventSource) {
    currentEventSource.close()
    currentEventSource = null
  }
  
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
  debateResult.value = { messages: [] }
  
  if (currentEventSource) {
    currentEventSource.close()
  }

  currentEventSource = new EventSource(`http://localhost:8000/debate?topic=${encodeURIComponent(topic.value)}&proposer=${encodeURIComponent(selectedCharacters.value.proposer.name)}&challenger=${encodeURIComponent(selectedCharacters.value.challenger.name)}&arbitrator=${encodeURIComponent(selectedCharacters.value.arbitrator.name)}`)

  currentEventSource.onmessage = null
  currentEventSource.onerror = null

    const messageHandler = (event) => {
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
          currentEventSource.close()
          currentEventSource = null
          return
        }

        // 处理系统控制事件
        if (data.type === 'pause' || data.type === 'round_end' || data.type === 'debate_end') {
          handleCustomEvent({
            type: data.type,
            data: data.content
          })
          if (data.type === 'pause' || data.type === 'round_end') {
            if (currentEventSource) {
              currentEventSource.removeEventListener('message', messageHandler)
              currentEventSource.close()
              currentEventSource = null
            }
          }
          return
        }

        // 处理辩论内容事件
        if (data.type === 'proposal' || data.type === 'challenge' || data.type === 'judgement') {
          // 查找相同角色和类型的最后一条消息
          const lastMessageIndex = debateResult.value.messages.findLastIndex(msg => 
            msg.role === data.role && msg.type === data.type
          )
          
          if (lastMessageIndex !== -1) {
            // 更新最后一条消息内容
            debateResult.value.messages[lastMessageIndex].content += data.content
          } else {
            // 添加新消息
            debateResult.value.messages.push({
              role: data.role,
              content: data.content,
              type: data.type
            })
          }
          return
        }
      } catch (error) {
        console.error('JSON解析错误:', error)
        this.error.value = '解析消息时出错: ' + error.message
        return
      }
    }

    currentEventSource.addEventListener('message', (event) => {
      try {
        messageHandler(event)
      } catch (error) {
        console.error('处理消息时出错:', error)
        this.error.value = '处理消息时出错: ' + error.message
      }
    })

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
      nextTick(() => {
        try {
          const data = JSON.parse(event.data.content)
          round.value = data.current_round
          maxRounds.value = data.total_rounds
        } catch {
          round.value++
        }
        showContinue.value = true
        showReset.value = true
        isLoading.value = false
        isPaused.value = true
      })
      break
    case 'debate_end':
      nextTick(() => {
        showContinue.value = false
        showReset.value = true
        isLoading.value = false
        isPaused.value = false
        if (currentEventSource) {
          currentEventSource.close()
          currentEventSource = null
        }
        round.value++
      })
      break
  }
}
</script>

<template>
  <div class="max-w-7xl mx-auto p-8 text-center min-h-screen">
    <h1 class="text-4xl font-bold mb-8">{{ title }}</h1>
    
    <div class="mb-8">
      <input 
        v-model="topic"
        placeholder="输入辩论主题"
        class="border p-2 rounded w-full max-w-md"
      />
    </div>

    <SelectionPanel 
      :characters="characters"
      v-model:selected="selectedCharacters"
    />

    <button
      @click="startDebate"
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-8"
      :disabled="isLoading"
    >
      {{ isLoading ? '辩论中...' : '开始辩论' }}
    </button>

    <div v-if="isLoading" class="mb-4 text-blue-500">
      正在辩论中 (第 {{ round }} 轮/共 {{ maxRounds }} 轮)...
    </div>

    <div v-if="debateResult" class="mt-8 text-left">
      <h2 class="text-2xl font-bold mb-4">辩论过程 (第 {{ round + 1 }} 轮)</h2>
      <div v-for="(msg, index) in debateResult.messages" :key="index" class="mb-4 p-4 border rounded">
        <h3 class="font-bold">{{ msg.role }} <span class="text-sm text-gray-500">{{ msg.type }}</span></h3>
        <p class="whitespace-pre-wrap">{{ msg.content }}</p>
      </div>
    </div>

    <div v-if="error" class="mt-4 text-red-500">
      错误: {{ error }}
    </div>

    <div v-if="showReset || showContinue" class="fixed bottom-0 left-0 right-0 flex justify-center gap-4 z-50 p-4 bg-white/90 backdrop-blur-sm border-t border-gray-200 shadow-lg">
      <button
        v-if="showContinue"
        @click="continueDebate"
        class="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 hover:shadow-lg"
      >
        <span class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 1.414L10.586 9H7a1 1 0 100 2h3.586l-1.293 1.293a1 1 0 101.414 1.414l3-3a1 1 0 000-1.414z" clip-rule="evenodd" />
          </svg>
          继续辩论 (剩余 {{ maxRounds - round }} 轮)
        </span>
      </button>
      <button
        v-if="showReset"
        @click="resetDebate"
        class="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 hover:shadow-lg"
      >
        <span class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clip-rule="evenodd" />
          </svg>
          重新开始
        </span>
      </button>
    </div>
  </div>
</template>
