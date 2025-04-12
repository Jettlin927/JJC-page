import { defineStore } from 'pinia'

export const useGameStore = defineStore('game', {
  state: () => ({
    playerCharacter: null,
    opponentCharacter: null,
    battleHistory: []
  }),
  actions: {
    selectPlayerCharacter(character) {
      this.playerCharacter = character
    },
    selectOpponentCharacter(character) {
      this.opponentCharacter = character
    },
    addBattleResult(result) {
      this.battleHistory.push(result)
    }
  }
})
