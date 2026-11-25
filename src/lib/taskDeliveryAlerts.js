export function getTaskDeliveryAlerts(tasks = [], date = '') {
  if (!date) return []
  return tasks
    .filter((task) => task.date === date && !task.evidenceKey && task.source !== 'classroom')
    .filter((task) => task.reminder?.date !== date)
    .filter((task) => !(task.deliveryAlert?.date === date && task.deliveryAlert.dismissedAt))
    .map((task) => ({
      id: `delivery_${task.id}`,
      kind: 'delivery',
      task,
      reminder: {
        date,
        time: '00:00',
        snoozeUntil: task.deliveryAlert?.date === date ? task.deliveryAlert.snoozeUntil || '' : '',
      },
      title: 'Demana el lliurament de la tasca',
      text: task.title,
    }))
}
