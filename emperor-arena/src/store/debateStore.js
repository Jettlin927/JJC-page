import { ref, reactive } from 'vue'

// 创建store对象
const store = {
  typingText: ref(''),
  typingInterval: ref(null),
  isTyping: ref(false),
  title: ref('帝王竞技场'),
  topic: ref(''),
  debateResult: ref(null),
  isLoading: ref(false),
  error: ref(null),
  round: ref(0),
  maxRounds: ref(5),
  showContinue: ref(false),
  showReset: ref(false),
  isPaused: ref(false),
  characters: ref([
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
  ]),
  selectedCharacters: reactive({
    proposer: null,
    challenger: null,
    arbitrator: null
  })
}

export const useDebateStore = () => {
  return store
}
