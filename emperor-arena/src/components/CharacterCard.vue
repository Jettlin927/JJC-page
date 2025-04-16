<script setup>
const props = defineProps({
  character: {
    type: Object,
    required: true,
    validator: (value) => {
      return value && value.id && value.name && value.description && value.image
    }
  },
  isSelected: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['select'])

const handleClick = () => {
  try {
    if (!props.character || !props.character.id) {
      throw new Error('角色数据不完整')
    }
    emit('select', {...props.character})
  } catch (error) {
    console.error('触发选择事件时出错:', error)
  }
}
</script>

<template>
  <div 
    :class="[
      'border rounded-lg p-4 m-4 w-52 cursor-pointer transition-all duration-200',
      isSelected 
        ? 'border-blue-500 ring-2 ring-blue-500 shadow-lg transform scale-105' 
        : 'border-gray-300 hover:shadow-md'
    ]"
    @click="handleClick"
  >
    <img :src="character.image" :alt="character.name" class="w-full h-40 object-cover rounded mb-3">
    <h3 class="text-xl font-semibold">{{ character.name }}</h3>
    <p class="text-gray-600">{{ character.description }}</p>
  </div>
</template>

<style scoped>
.transform {
  transition: transform 0.2s ease-in-out;
}
</style>
