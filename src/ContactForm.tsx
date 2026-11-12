// Contact — vitrine statique : envoi simulé, aucune donnée ne
// quitte le navigateur. Le bouton ouvre aussi un mailto direct.
//
// ⚠️ CE BLOC EST DANS LE PIED, DONC SUR TOUTES LES PAGES — y compris sur
//    mana.love. L'adresse et la signature viennent donc de l'hôte : écrites
//    en dur, elles annonçaient « Écrire à MANA.bzh » sous un autre domaine.
import { signature, courriel } from "./visage";

export function ContactForm() {
  return (
    <div className="contact-form">
      <p className="apercu-label">Écrire à {signature()}</p>
      <div className="est-actions">
        <a className="btn btn-primary" href={`mailto:${courriel()}`}>
          {courriel()}
        </a>
      </div>
      {/* 🔄 « Réponse rapide. Aucune donnée revendue. » SUPPRIMÉE le
          12/11/2026, demande du fondateur. ⭐ Elle répétait « aucune donnée
          revendue », déjà dit trois lignes plus haut dans le pied — et elle
          promettait en plus une « réponse rapide », c'est-à-dire un
          engagement de délai que rien ne tient. */}
    </div>
  );
}
