<script setup>
import { ref } from 'vue'
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

    const startDebate = () => {
      if (round.value >= maxRounds) {
        error.value = `已达到最大辩论轮数 (${maxRounds}轮)`
        return
      }
      
      if (!topic.value || !selectedCharacters.value.proposer || 
          !selectedCharacters.value.challenger || !selectedCharacters.value.arbitrator) {
        error.value = '请填写辩论主题并选择所有角色'
        return
      }

      isLoading.value = true
      error.value = null
      debateResult.value = { messages: [] }
      
      const eventSource = new EventSource(`http://localhost:8000/debate?topic=${encodeURIComponent(topic.value)}&proposer=${encodeURIComponent(selectedCharacters.value.proposer.name)}&challenger=${encodeURIComponent(selectedCharacters.value.challenger.name)}&arbitrator=${encodeURIComponent(selectedCharacters.value.arbitrator.name)}`)

      eventSource.onmessage = (event) => {
        if (event.data === '[DONE]') {
          eventSource.close()
          return
        }

        const data = JSON.parse(event.data)
        if (data.type === 'error') {
          error.value = data.content
          isLoading.value = false
          eventSource.close()
          return
        }

        if (data.type === 'proposal' || data.type === 'challenge' || data.type === 'judement') {
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

      eventSource.onerror = () => {
        error.value = '辩论连接出错，请检查参数是否正确'
        isLoading.value = false
        eventSource.close()
      }

      eventSource.addEventListener('pause', () => {
        isLoading.value = false
        showContinue.value = true
      })

      eventSource.addEventListener('debate_end', () => {
        round.value++
        showContinue.value = false
        isLoading.value = false
        eventSource.close()
      })

      eventSource.addEventListener('round_end', () => {
        showContinue.value = true
        isLoading.value = false
      })
    }

const continueDebate = () => {
  showContinue.value = false
  isLoading.value = true
  // 重新连接继续下一轮
  startDebate()
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

      <button
        v-if="showContinue"
        @click="continueDebate"
        class="mt-4 bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded"
      >
        继续辩论 (剩余 {{ maxRounds - round }} 轮)
      </button>
    </div>

    <div v-if="error" class="mt-4 text-red-500">
      错误: {{ error }}
    </div>
  </div>
</template>
