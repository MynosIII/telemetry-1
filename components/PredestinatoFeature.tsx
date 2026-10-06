import Link from "next/link";
import { GameLogo } from "./GameLogo";
import { predestinato } from "@/lib/games";

export function PredestinatoFeature({ eyebrow = "MODO CARRERA" }: { eyebrow?: string }) {
  return (
    <section className="predestinato" id="predestinato" aria-labelledby="predestinato-title">
      <div className="predestinato-copy">
        <GameLogo src={predestinato.logo} className="predestinato-logo" />
        <p className="eyebrow eyebrow-yellow">{eyebrow}</p>
        <h2 id="predestinato-title">EL <em>PREDESTINADO</em></h2>
        <p className="predestinato-lede">
          Tomá las decisiones dentro y fuera de la pista. Construí una carrera desde el karting,
          ganá prestigio, gestioná tu equipo y escribí tu propia historia.
        </p>
        <ul>
          <li><span>01</span> Carrera y progresión</li>
          <li><span>02</span> Decisiones y consecuencias</li>
          <li><span>03</span> Temporadas, rivales y legado</li>
        </ul>
        <Link className="button button-yellow" href="/juegos/predestinato">ENTRAR AL JUEGO <span>→</span></Link>
      </div>
      <div className="predestinato-panel" aria-hidden="true">
        <div className="career-header"><span>EJEMPLO DE PARTIDA · TEMPORADA 01</span><b>PRESTIGIO 68</b></div>
        <div className="career-stage">
          <span className="stage-number">07</span>
          <p>PRÓXIMO OBJETIVO</p>
          <h3>GANÁ TU LUGAR EN LA PARRILLA</h3>
          <div className="progress"><i /></div>
          <small>68 / 100 REPUTACIÓN</small>
        </div>
        <div className="career-cards">
          <div><span>ESTADO</span><b>EN ASCENSO</b></div>
          <div><span>PRÓXIMA CITA</span><b>MONZA</b></div>
          <div><span>RIVAL</span><b>A. MORETTI</b></div>
        </div>
      </div>
    </section>
  );
}
