<script setup>
defineProps({
  character: {
    type: Object,
    required: true
  }
})
</script>

<template>
  <div class="border border-gray-300 rounded-lg p-4 m-4 w-52 cursor-pointer hover:shadow-md transition-shadow">
    <img :src="character.image" :alt="character.name" class="w-full h-40 object-cover rounded mb-3">
    <h3 class="text-xl font-semibold">{{ character.name }}</h3>
    <p class="text-gray-600">{{ character.description }}</p>
  </div>
</template>
