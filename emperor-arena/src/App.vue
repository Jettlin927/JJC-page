<script setup>
import SelectionPanel from './components/SelectionPanel.vue'
import { useDebateStore } from '@/store/debateStore'
import { useDebate } from '@/composables/useDebate'
import { isReactive, reactive, isProxy } from 'vue'

const {
  title,
  topic,
  debateResult,
  isLoading,
  error,
  round,
  maxRounds,
  showContinue,
  showReset,
  characters,
  selectedCharacters
} = useDebateStore()

const {
  continueDebate,
  resetDebate,
  startDebate,
  handleCustomEvent
} = useDebate()
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
    />
    
    <button
      @click="startDebate"
      class="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mb-8"
      :disabled="isLoading"
    >
      {{ isLoading ? '辩论中...' : '开始辩论' }}
    </button>

    <div class="mb-4 p-2 bg-gray-100 rounded">
      <p class="font-mono text-sm">
        isLoading状态: {{ isLoading ? 'true' : 'false' }}
      </p>
    </div>

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

    <div v-if="showReset || showContinue" class="mt-8 flex justify-center gap-4 p-4 bg-white/90 backdrop-blur-sm border border-gray-200 rounded-lg shadow-lg">
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
