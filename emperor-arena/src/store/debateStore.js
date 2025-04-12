import { ref } from 'vue'

export const useDebateStore = () => {
  const typingText = ref('')
  const typingInterval = ref(null)
  const isTyping = ref(false)
  
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

  return {
    typingText,
    typingInterval,
    isTyping,
    title,
    topic,
    debateResult,
    isLoading,
    error,
    round,
    maxRounds,
    showContinue,
    showReset,
    isPaused,
    characters,
    selectedCharacters
  }
}
