import { ArrowRight, Columns2, UsersRound } from 'lucide-react'
import './GroupToolsMenu.css'

export function GroupToolsMenu({ onOpenCooperative, onOpenHalfGroups }) {
  return <div className="group-tools-menu">
    <div className="group-tools-intro">
      <h3>Com vols organitzar el grup classe?</h3>
      <p>Tria l’eina segons el tipus d’agrupament que necessites.</p>
    </div>
    <div className="group-tools-options">
      <button className="group-tool-card cooperative" onClick={onOpenCooperative} type="button">
        <span className="group-tool-icon" aria-hidden="true"><UsersRound size={30} /></span>
        <span className="group-tool-title">Grups cooperatius</span>
        <span className="group-tool-description">Forma petits equips per treballar junts, tenint en compte les relacions, els rols i el rendiment de l’alumnat.</span>
        <span className="group-tool-preview cooperative-preview" aria-hidden="true">{[0, 1, 2, 3].map((group) => <span key={group}>{[0, 1, 2, 3].map((member) => <i key={member} />)}</span>)}</span>
        <span className="group-tool-features"><span>Equips petits</span><span>Ajustos manuals</span><span>Versions desades</span></span>
        <span className="group-tool-open">Obrir grups cooperatius <ArrowRight aria-hidden="true" size={20} /></span>
      </button>
      <button className="group-tool-card halves" onClick={onOpenHalfGroups} type="button">
        <span className="group-tool-icon" aria-hidden="true"><Columns2 size={30} /></span>
        <span className="group-tool-title">Mitjos grups</span>
        <span className="group-tool-description">Divideix la classe en A i B amb un bon ambient de treball. Revisa les relacions i fixa els alumnes que vols mantenir a cada mig grup.</span>
        <span className="group-tool-preview halves-preview" aria-hidden="true"><span>A</span><span>B</span></span>
        <span className="group-tool-features"><span>Grups A i B</span><span>Bloquejos</span><span>Relacions internes</span></span>
        <span className="group-tool-open">Obrir mitjos grups <ArrowRight aria-hidden="true" size={20} /></span>
      </button>
    </div>
  </div>
}
