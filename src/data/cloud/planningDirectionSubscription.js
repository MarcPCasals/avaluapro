import { collection, doc, onSnapshot } from 'firebase/firestore'
import { firebaseDb } from '../../lib/firebase.js'
import { subscribeDirectionGraph } from '../../domain/planning/liveDirection.js'

export function subscribePlanningDirection(unitId, onChange, onError, options) {
  return subscribeDirectionGraph({ db: firebaseDb, collection, doc, onSnapshot }, unitId, onChange, onError, options)
}
