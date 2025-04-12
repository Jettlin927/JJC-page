<script setup>
import { ref } from 'vue'
import CharacterCard from './CharacterCard.vue'

const props = defineProps({
  characters: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['update:selected'])

const roles = ref(['proposer', 'challenger', 'arbitrator'])
const selected = ref({
  proposer: null,
  challenger: null,
  arbitrator: null
})

const selectCharacter = (role, char) => {
  selected.value[role] = char
  emit('update:selected', selected.value)
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
          :class="{ 'ring-2 ring-blue-500': selected[role]?.id === char.id }"
          @click="selectCharacter(role, char)"
        />
      </div>
    </div>
  </div>
</template>
