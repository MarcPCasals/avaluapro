import { ImagePlus, Info, Trash2 } from 'lucide-react'
import { imageFileToCompressedDataUrl } from '../../lib/imageFiles'
import { Modal } from '../../components/Modal'

function getChartLabel(halfGroup) {
  return halfGroup === 'all' ? 'Grup sencer' : `Mig grup: ${halfGroup}`
}

export function SeatingChartsModal({ charts, classId, halfGroups, onClose, onDelete, onSave }) {
  const slots = ['all', ...halfGroups]

  const handleUpload = async (halfGroup, file) => {
    if (!file) return

    try {
      const imageData = await imageFileToCompressedDataUrl(file, {
        maxSize: 1400,
        maxOutputBytes: 720 * 1024,
        quality: 0.86,
      })
      await onSave({
        classId,
        halfGroup,
        imageData,
        title: getChartLabel(halfGroup),
      })
    } catch (error) {
      window.alert(error.message)
    }
  }

  return (
    <Modal onClose={onClose} size="xl" title="Llocs fixos">
      <div className="seating-panel">
        <section className="seating-help">
          <Info size={20} />
          <span>Pots pujar i consultar la disposició d’aula del grup sencer i dels mitjos grups creats.</span>
        </section>

        <div className="seating-list">
          {slots.map((halfGroup) => {
            const chart = charts.find((item) => item.halfGroup === halfGroup)
            return (
              <article className="seating-card" key={halfGroup}>
                <header>
                  <div>
                    <strong>{getChartLabel(halfGroup)}</strong>
                    {chart?.updatedAt && (
                      <span>Actualitzat {new Date(chart.updatedAt).toLocaleDateString('ca-ES')}</span>
                    )}
                  </div>
                  <div className="seating-actions">
                    <label className="secondary-action compact">
                      <ImagePlus size={17} />
                      {chart ? 'Canviar' : 'Pujar imatge'}
                      <input
                        accept="image/*"
                        onChange={(event) => handleUpload(halfGroup, event.target.files?.[0])}
                        type="file"
                      />
                    </label>
                    {chart && (
                      <button className="danger-soft" onClick={() => onDelete(chart.id)} title="Eliminar imatge" type="button">
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </header>
                {chart ? (
                  <img alt={getChartLabel(halfGroup)} src={chart.imageData} />
                ) : (
                  <div className="seating-empty">
                    <ImagePlus size={30} />
                    <span>Encara no hi ha cap imatge carregada.</span>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
