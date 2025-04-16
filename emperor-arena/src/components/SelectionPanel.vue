<script setup>
import { ref } from 'vue'
import { useDebateStore } from '@/store/debateStore'
import CharacterCard from './CharacterCard.vue'

const props = defineProps({
  characters: {
    type: Array,
    required: true
  }
})

const store = useDebateStore()
const selectedCharacters = store.selectedCharacters
const roles = ref(['proposer', 'challenger', 'arbitrator'])

const selectCharacter = (role, char) => {
  try {
    if (!char || !char.id) {
      throw new Error('无效的角色数据')
    }
    console.log('选择角色:', role, JSON.parse(JSON.stringify(char)))
    selectedCharacters[role] = char
    console.log('更新后selectedCharacters:', JSON.parse(JSON.stringify(selectedCharacters)))
  } catch (error) {
    console.error('选择角色时出错:', error)
    store.error.value = '选择角色失败: ' + error.message
  }
}
</script>

<template>
  <div class="mt-8">
    <div v-for="role in roles" :key="role" class="mb-8">
      <h2 class="text-2xl font-bold mb-4">
        {{ 
          role === 'proposer' ? '选择提案者' : 
          role === 'challenger' ? '选择挑战者' : '选择仲裁者' 
        }}
      </h2>
      <div class="flex justify-center flex-wrap">
        <CharacterCard 
          v-for="char in characters"
          :key="char.id"
          :character="char"
          :is-selected="selectedCharacters[role]?.id === char.id"
          @select="selectCharacter(role, char)"
        />
      </div>
    </div>
  </div>
</template>
