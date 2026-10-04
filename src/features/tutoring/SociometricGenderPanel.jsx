import { summarizeSociometricGender } from './sociometricGenderUtils.js'
import './SociometricGenderPanel.css'

export function SociometricGenderPanel({ students, rows, hasRelations }) {
  const report = summarizeSociometricGender(students, rows, hasRelations)
  const percent = (count, total) => total ? `${count}/${total} · ${Math.round(count / total * 100)}%` : 'Sense dades'
  return <section className="sociometric-gender-panel">
    <h3>Nois i noies al sociograma</h3>
    <p>Comparació de les categories calculades amb totes les relacions actuals de la classe; els filtres visuals del mapa no canvien aquesta lectura.</p>
    <div className="sociometric-gender-table"><table><thead><tr><th>Alumnat</th><th>Categoria «Rebutjat»</th><th>Categoria «Líder»</th><th>Rebuig rebut mitjà</th></tr></thead>
      <tbody>{report.groups.map((group) => <tr key={group.gender}><th>{group.gender === 'boy' ? 'Nois' : 'Noies'} · {group.total}</th><td>{percent(group.rejected, group.total)}</td><td>{percent(group.leaders, group.total)}</td><td>{group.averageRejection === null ? '—' : group.averageRejection.toLocaleString('ca', { maximumFractionDigits: 1 })}</td></tr>)}</tbody>
    </table></div>
    {report.counts.unknown > 0 && <p>{report.counts.unknown} alumne{report.counts.unknown === 1 ? '' : 's'} sense dada de noi/noia: la comparació és incompleta. Informa-la al perfil individual.</p>}
    {report.counts.other > 0 && <p>{report.counts.other} alumne{report.counts.other === 1 ? '' : 's'} amb una altra identitat: continuen al sociograma i als grups, però no s’inclouen en aquesta comparació entre nois i noies.</p>}
    {!report.hasRelations && <p>Encara no hi ha relacions sociomètriques registrades per interpretar aquestes diferències.</p>}
    {report.comparisons.map((comparison) => <p key={comparison.metric}><strong>{comparison.metric === 'rejected' ? 'Rebuig' : 'Lideratge'}: </strong>
      {!report.eligible ? 'Dades insuficients per valorar un senyal estadístic: cal la dada informada i almenys 5 nois i 5 noies amb lectura sociomètrica.'
        : comparison.signal ? `Senyal exploratori: proporció més alta entre ${comparison.higher === 'boy' ? 'nois' : 'noies'}.`
          : 'No hi ha prou evidència estadística d’una diferència. Això no demostra que les proporcions siguin iguals.'}
      {comparison.adjustedP !== null && <small> p ajustada = {comparison.adjustedP < 0.001 ? '< 0,001' : comparison.adjustedP.toLocaleString('ca', { maximumFractionDigits: 3 })}.</small>}
    </p>)}
    <details><summary>Com s’interpreta aquesta comparació?</summary><p>Es comparen proporcions, no només recomptes. El rebuig mitjà és la intensitat total de rebuig rebuda per alumne segons el sociograma. La comparació exacta considera el repartiment de les etiquetes noi/noia amb les categories fixades (Fisher bilateral), amb correcció per les dues comparacions i llindar de 0,05. El mínim de 5 per grup és un criteri de prudència, no una garantia de potència.</p><p>És una lectura exploratòria d’aquesta classe: les relacions connecten els alumnes i les categories són relatives al grup. Un senyal no estableix la causa ni permet generalitzar a altres classes. Si només una part de la classe ha respost el qüestionari, interpreta els resultats com a provisionals.</p></details>
  </section>
}
