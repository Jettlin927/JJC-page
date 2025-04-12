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
  showContinue.value = false
  isLoading.value = true
  // 重新连接继续下一轮
  startDebate()
}

let currentEventSource = null

const resetDebate = () => {
  // 关闭现有连接
  if (currentEventSource) {
    currentEventSource.close()
    currentEventSource = null
  }
  
  // 重置所有状态
  debateResult.value = null
  isLoading.value = false
  error.value = null
  round.value = 0
  showContinue.value = false
  showReset.value = false
}

const startDebate = () => {
  if (round.value >= maxRounds) {
    error.value = `已达到最大辩论轮数 (${maxRounds}轮)`
    return
  }
  
  // 关闭现有连接
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
  
  // 创建新的EventSource前先关闭旧的
  if (currentEventSource) {
    currentEventSource.close()
  }

  currentEventSource = new EventSource(`http://localhost:8000/debate?topic=${encodeURIComponent(topic.value)}&proposer=${encodeURIComponent(selectedCharacters.value.proposer.name)}&challenger=${encodeURIComponent(selectedCharacters.value.challenger.name)}&arbitrator=${encodeURIComponent(selectedCharacters.value.arbitrator.name)}`)

  // 移除所有旧的事件监听器
  currentEventSource.onmessage = null
  currentEventSource.onerror = null

  currentEventSource.onmessage = (event) => {
    console.log('Received message:', event.data) // 调试日志
    if (event.data === '[DONE]') {
      currentEventSource.close()
      currentEventSource = null
      return
    }

    const data = JSON.parse(event.data)
    if (data.type === 'error') {
      error.value = data.content
      isLoading.value = false
      currentEventSource.close()
      currentEventSource = null
      return
    }

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
    } else {
      debateResult.value.messages.push({
        role: data.role,
        content: data.content,
        type: data.type
      })
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

  currentEventSource.addEventListener('pause', () => {
    console.log('Pause event received') // 调试日志
    isLoading.value = false
    showContinue.value = true
    showReset.value = true
    console.log('Pause - states:', {
      showContinue: showContinue.value,
      showReset: showReset.value,
      isLoading: isLoading.value
    })
  })

  currentEventSource.addEventListener('round_end', (event) => {
    console.log('Round end event received:', event) // 调试日志
    // 使用Vue的nextTick确保响应式更新
    nextTick(() => {
      showContinue.value = true
      showReset.value = true
      isLoading.value = false
      console.log('Round end - states:', {
        showContinue: showContinue.value,
        showReset: showReset.value,
        isLoading: isLoading.value
      })
      // 再次强制更新
      nextTick(() => {
        console.log('View should be updated now')
        console.log('Current DOM:', document.querySelector('.fixed.bottom-0')?.outerHTML)
      })
    })
  })
  currentEventSource.addEventListener('debate_end', () => {
    nextTick(() => {
      round.value++
      showContinue.value = false
      showReset.value = true
      isLoading.value = false
      console.log('Debate end - states:', {
        showContinue: showContinue.value,
        showReset: showReset.value,
        isLoading: isLoading.value
      })
      if (currentEventSource) {
        currentEventSource.close()
        currentEventSource = null
      }
      // 再次强制更新
      nextTick(() => {
        console.log('Final view should be updated')
      })
    })
  })
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
      正在辩论中 (第 {{ round + 1 }} 轮/共 {{ maxRounds }} 轮)...
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

    <div v-if="showReset || showContinue" class="fixed bottom-0 left-0 right-0 flex justify-center gap-4 z-50 p-4 bg-white border-t border-gray-200 shadow-lg">
      <div v-if="!showContinue && !showReset" class="text-red-500">
        调试: 按钮应该显示但未显示! showContinue: {{showContinue}}, showReset: {{showReset}}
      </div>
      <button
        v-if="showContinue"
        @click="continueDebate"
        class="bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
      >
        继续辩论 (剩余 {{ maxRounds - round }} 轮)
      </button>
      <button
        v-if="showReset"
        @click="resetDebate"
        class="bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105 shadow-md"
      >
        重新开始
      </button>
    </div>
  </div>
</template>
